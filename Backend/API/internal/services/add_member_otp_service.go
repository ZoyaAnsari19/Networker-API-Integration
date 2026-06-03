package services

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"fmcg-binary/internal/phonepolicy"
	"fmcg-binary/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

// Redis keys for sponsor-initiated add-member WhatsApp OTP (prefix sc:am*).
const (
	redisAddMemberOTP    = "sc:amotp:"    // sponsorID:phone -> 6-digit OTP
	redisAddMemberRLSP   = "sc:amotprl:"  // hourly send cap per sponsor+phone
	redisAddMemberRLIP   = "sc:amotprlip:"
	redisAddMemberVerRL  = "sc:amverrl:" // verify attempts per sponsor+phone / hour
	redisAddMemberVrfTok = "sc:amvrf:"   // opaque token -> sponsorID|normalizedPhone
)

var (
	ErrAddMemberOTPUnavailable = errors.New("add_member_otp_unavailable")
	ErrAddMemberOTPRateLimited = errors.New("add_member_otp_rate_limited")
	ErrAddMemberInvalidPhone   = errors.New("add_member_invalid_phone")
	ErrAddMemberInvalidOTP     = errors.New("add_member_invalid_otp")
	ErrAddMemberPhoneInUse     = errors.New("add_member_phone_in_use")
)

// AddMemberOTPConfig mirrors forgot-password tuning for OTP + rate limits.
type AddMemberOTPConfig struct {
	AppEnv string

	OTPTTL                 time.Duration
	VerifyTokenTTL         time.Duration
	OTPPerSponsorPhoneHour int
	OTPPerIPHour           int
	VerifyPerHour          int
	LogOTPInDev            bool
}

// AddMemberOTPService sends WhatsApp OTP for verifying a new downline phone
// before POST /users/create (JWT sponsor).
type AddMemberOTPService struct {
	users *repository.UserRepo
	rdb   *redis.Client
	wcli  *WCLIClient
	cfg   AddMemberOTPConfig
}

func NewAddMemberOTPService(
	users *repository.UserRepo,
	rdb *redis.Client,
	wcli *WCLIClient,
	cfg AddMemberOTPConfig,
) *AddMemberOTPService {
	if cfg.OTPTTL <= 0 {
		cfg.OTPTTL = 10 * time.Minute
	}
	if cfg.VerifyTokenTTL <= 0 {
		cfg.VerifyTokenTTL = 15 * time.Minute
	}
	if cfg.OTPPerSponsorPhoneHour <= 0 {
		cfg.OTPPerSponsorPhoneHour = 8
	}
	if cfg.OTPPerIPHour <= 0 {
		cfg.OTPPerIPHour = 40
	}
	if cfg.VerifyPerHour <= 0 {
		cfg.VerifyPerHour = 24
	}
	return &AddMemberOTPService{users: users, rdb: rdb, wcli: wcli, cfg: cfg}
}

func (s *AddMemberOTPService) Available() bool {
	return s != nil && s.rdb != nil && s.wcli != nil && s.wcli.Configured()
}

// AddMemberVerifyPayload is stored in Redis after successful OTP verify.
type AddMemberVerifyPayload struct {
	SponsorUserID string
	Phone         string // normalized E.164
}

// SendWhatsAppOTP sends OTP to phone after checks (not already registered, rate limits).
func (s *AddMemberOTPService) SendWhatsAppOTP(ctx context.Context, sponsorUserID, phone, clientIP string) error {
	if !s.Available() {
		return ErrAddMemberOTPUnavailable
	}
	sponsorUserID = strings.TrimSpace(sponsorUserID)
	if sponsorUserID == "" {
		return ErrAddMemberOTPUnavailable
	}
	norm, err := normalizeE164Phone(phone)
	if err != nil {
		return ErrAddMemberInvalidPhone
	}

	start := time.Now()
	defer enforceMinLatency(start, 220*time.Millisecond, 100*time.Millisecond)

	if _, err := s.users.GetByID(ctx, sponsorUserID); err != nil {
		log.Printf("[add-member-otp] send: sponsor not found id=%s: %v", sponsorUserID, err)
		return ErrAddMemberOTPUnavailable
	}

	if !phonepolicy.AllowsDuplicateUserRows(norm) {
		u, err := s.users.GetByPhone(ctx, norm)
		if err == nil && u != nil {
			return ErrAddMemberPhoneInUse
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[add-member-otp] send: db phone lookup %s: %v", redactPhone(norm), err)
			return fmt.Errorf("db: %w", err)
		}
	}

	if err := s.checkSendRateLimits(ctx, sponsorUserID, norm, clientIP); err != nil {
		return err
	}

	otp, err := randomOTP6()
	if err != nil {
		return err
	}
	otpKey := redisAddMemberOTP + sponsorUserID + ":" + norm
	if err := s.rdb.Set(ctx, otpKey, otp, s.cfg.OTPTTL).Err(); err != nil {
		log.Printf("[add-member-otp] send: redis SET %v", err)
		return err
	}

	if s.cfg.LogOTPInDev && strings.ToLower(strings.TrimSpace(s.cfg.AppEnv)) != "production" {
		log.Printf("[add-member-otp] dev OTP sponsor=%s phone=%s code=%s", sponsorUserID, redactPhone(norm), otp)
	}

	msg := fmt.Sprintf("Your Secure Networker verification code for adding a team member is %s. Valid for 10 minutes. Do not share this code.", otp)
	reqID := uuid.NewString()
	if wErr := s.wcli.SendOTP(ctx, reqID, norm, msg); wErr != nil {
		log.Printf("[add-member-otp] WCLI send failed request_id=%s sponsor=%s phone=%s: %v", reqID, sponsorUserID, redactPhone(norm), wErr)
		_ = s.rdb.Del(ctx, otpKey).Err()
		return wErr
	}
	return nil
}

// VerifyWhatsAppOTP checks OTP and returns an opaque token for POST /users/create.
func (s *AddMemberOTPService) VerifyWhatsAppOTP(ctx context.Context, sponsorUserID, phone, code string) (token string, expiresInSec int, err error) {
	if !s.Available() {
		return "", 0, ErrAddMemberOTPUnavailable
	}
	sponsorUserID = strings.TrimSpace(sponsorUserID)
	norm, err := normalizeE164Phone(phone)
	if err != nil {
		return "", 0, ErrAddMemberInvalidPhone
	}
	code = strings.TrimSpace(code)
	if len(code) != 6 {
		return "", 0, ErrAddMemberInvalidOTP
	}

	start := time.Now()
	defer enforceMinLatency(start, 200*time.Millisecond, 90*time.Millisecond)

	if err := s.incrHourlyCap(ctx, redisAddMemberVerRL+sponsorUserID+":"+norm, s.cfg.VerifyPerHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return "", 0, ErrAddMemberOTPRateLimited
		}
		return "", 0, err
	}

	otpKey := redisAddMemberOTP + sponsorUserID + ":" + norm
	stored, rerr := s.rdb.Get(ctx, otpKey).Result()
	if rerr == redis.Nil || stored == "" {
		return "", 0, ErrAddMemberInvalidOTP
	}
	if rerr != nil {
		log.Printf("[add-member-otp] verify: redis GET %v", rerr)
		return "", 0, ErrAddMemberInvalidOTP
	}
	if subtle.ConstantTimeCompare([]byte(stored), []byte(code)) != 1 {
		return "", 0, ErrAddMemberInvalidOTP
	}
	_ = s.rdb.Del(ctx, otpKey).Err()

	rawTok, err := randomHexToken(32)
	if err != nil {
		return "", 0, err
	}
	payload := sponsorUserID + "|" + norm
	tokKey := redisAddMemberVrfTok + rawTok
	if err := s.rdb.Set(ctx, tokKey, payload, s.cfg.VerifyTokenTTL).Err(); err != nil {
		log.Printf("[add-member-otp] verify: redis SET token %v", err)
		return "", 0, err
	}
	return rawTok, int(s.cfg.VerifyTokenTTL / time.Second), nil
}

// TakeVerificationToken atomically consumes the opaque token and returns payload
// if it matches. Caller must compare sponsor + phone to the create request.
func (s *AddMemberOTPService) TakeVerificationToken(ctx context.Context, token string) (*AddMemberVerifyPayload, error) {
	if !s.Available() {
		return nil, ErrAddMemberOTPUnavailable
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrAddMemberInvalidOTP
	}
	key := redisAddMemberVrfTok + token
	val, err := s.rdb.GetDel(ctx, key).Result()
	if err == redis.Nil || strings.TrimSpace(val) == "" {
		return nil, ErrAddMemberInvalidOTP
	}
	if err != nil {
		log.Printf("[add-member-otp] take token: redis %v", err)
		return nil, ErrAddMemberInvalidOTP
	}
	parts := strings.SplitN(val, "|", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[1]) == "" {
		return nil, ErrAddMemberInvalidOTP
	}
	return &AddMemberVerifyPayload{SponsorUserID: strings.TrimSpace(parts[0]), Phone: strings.TrimSpace(parts[1])}, nil
}

func (s *AddMemberOTPService) incrHourlyCap(ctx context.Context, key string, max int) error {
	n, err := s.rdb.Incr(ctx, key).Result()
	if err != nil {
		return err
	}
	if n == 1 {
		_ = s.rdb.Expire(ctx, key, time.Hour).Err()
	}
	if int(n) > max {
		return errRateLimited
	}
	return nil
}

func (s *AddMemberOTPService) checkSendRateLimits(ctx context.Context, sponsorUserID, phone, clientIP string) error {
	spKey := redisAddMemberRLSP + sponsorUserID + ":" + phone
	if err := s.incrHourlyCap(ctx, spKey, s.cfg.OTPPerSponsorPhoneHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return ErrAddMemberOTPRateLimited
		}
		return err
	}
	ip := strings.TrimSpace(clientIP)
	if ip != "" && ip != "0.0.0.0" {
		if err := s.incrHourlyCap(ctx, redisAddMemberRLIP+ip, s.cfg.OTPPerIPHour); err != nil {
			if errors.Is(err, errRateLimited) {
				return ErrAddMemberOTPRateLimited
			}
			return err
		}
	}
	return nil
}
