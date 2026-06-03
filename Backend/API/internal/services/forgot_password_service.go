package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

// Forgot-password Redis keys (prefix sc:fp* per product convention).
const (
	redisForgotOTP          = "sc:fpotp:"      // + value: 6-digit OTP, TTL 10m
	redisForgotRLPhone    = "sc:fpotprl:"    // INCR hourly cap per phone
	redisForgotRLIP       = "sc:fpotprlip:"  // INCR hourly cap per client IP
	redisForgotRLVerify   = "sc:fpverrl:"    // verify attempts per phone / hour
	redisForgotResetToken = "sc:fptok:"      // opaque token -> user_id, TTL 10–15m
)

var (
	// ErrForgotUnavailable is returned when Redis or WCLI is not configured.
	ErrForgotUnavailable = errors.New("password_reset_unavailable")
	// ErrForgotRateLimited is returned when OTP send or verify rate limits hit.
	ErrForgotRateLimited = errors.New("password_reset_rate_limited")
	// ErrForgotInvalidPhone is returned for bad E.164 input.
	ErrForgotInvalidPhone = errors.New("password_reset_invalid_phone")
	// ErrForgotInvalidOTP is a generic invalid/expired OTP (anti-enumeration).
	ErrForgotInvalidOTP = errors.New("password_reset_invalid_otp")
	// ErrForgotInvalidResetToken is returned for bad/expired/used reset token.
	ErrForgotInvalidResetToken = errors.New("password_reset_invalid_token")
	// ErrForgotWeakPassword mirrors login password rules.
	ErrForgotWeakPassword = errors.New("password_reset_weak_password")
)

// ForgotPasswordConfig tunes OTP, rate limits, and reset token TTL.
type ForgotPasswordConfig struct {
	AppEnv string

	OTPTTL          time.Duration
	ResetTokenTTL   time.Duration
	OTPPerPhoneHour int
	OTPPerIPHour    int
	VerifyPerHour   int

	LogOTPInDev bool // LOG_FORGOT_OTP=true and non-production only
}

// ForgotPasswordService implements WhatsApp OTP + opaque reset token flow.
type ForgotPasswordService struct {
	users *repository.UserRepo
	rdb   *redis.Client
	wcli  *WCLIClient
	fmcg  *FMCGClient
	cfg   ForgotPasswordConfig
}

func NewForgotPasswordService(
	users *repository.UserRepo,
	rdb *redis.Client,
	wcli *WCLIClient,
	fmcg *FMCGClient,
	cfg ForgotPasswordConfig,
) *ForgotPasswordService {
	if cfg.OTPTTL <= 0 {
		cfg.OTPTTL = 10 * time.Minute
	}
	if cfg.ResetTokenTTL <= 0 {
		cfg.ResetTokenTTL = 12 * time.Minute
	}
	if cfg.OTPPerPhoneHour <= 0 {
		cfg.OTPPerPhoneHour = 8
	}
	if cfg.OTPPerIPHour <= 0 {
		cfg.OTPPerIPHour = 40
	}
	if cfg.VerifyPerHour <= 0 {
		cfg.VerifyPerHour = 24
	}
	return &ForgotPasswordService{users: users, rdb: rdb, wcli: wcli, fmcg: fmcg, cfg: cfg}
}

func (s *ForgotPasswordService) Available() bool {
	return s != nil && s.rdb != nil && s.wcli != nil && s.wcli.Configured()
}

// SendWhatsAppOTP validates phone, rate-limits, stores OTP in Redis, and sends
// via WCLI when a matching account exists. Response semantics are caller-owned;
// this method returns nil on success paths including "no such user" (no WCLI).
func (s *ForgotPasswordService) SendWhatsAppOTP(ctx context.Context, phone, clientIP string) error {
	if !s.Available() {
		return ErrForgotUnavailable
	}
	norm, err := normalizeE164Phone(phone)
	if err != nil {
		return ErrForgotInvalidPhone
	}

	start := time.Now()
	defer enforceMinLatency(start, 280*time.Millisecond, 120*time.Millisecond)

	if err := s.checkSendRateLimits(ctx, norm, clientIP); err != nil {
		return err
	}

	u, dbErr := s.findUserByPhone(ctx, norm)
	if dbErr != nil {
		log.Printf("[forgot-password] send: db error phone=%s: %v", redactPhone(norm), dbErr)
		return fmt.Errorf("db: %w", dbErr)
	}

	if u == nil {
		// Anti-enumeration: no OTP, no WCLI; same outer success path as caller.
		return nil
	}

	otp, err := randomOTP6()
	if err != nil {
		return err
	}
	otpKey := redisForgotOTP + norm
	if err := s.rdb.Set(ctx, otpKey, otp, s.cfg.OTPTTL).Err(); err != nil {
		log.Printf("[forgot-password] send: redis SET otp failed phone=%s: %v", redactPhone(norm), err)
		return err
	}

	if s.cfg.LogOTPInDev && strings.ToLower(strings.TrimSpace(s.cfg.AppEnv)) != "production" {
		log.Printf("[forgot-password] dev OTP phone=%s code=%s (LOG_FORGOT_OTP; disable in shared dev)", redactPhone(norm), otp)
	}

	msg := fmt.Sprintf("Your Secure Networker password reset code is %s. Valid for 10 minutes. Do not share this code.", otp)
	reqID := uuid.NewString()
	if wErr := s.wcli.SendOTP(ctx, reqID, norm, msg); wErr != nil {
		log.Printf("[forgot-password] WCLI send failed request_id=%s phone=%s: %v", reqID, redactPhone(norm), wErr)
		_ = s.rdb.Del(ctx, otpKey).Err()
		// Do not surface WCLI vs unknown-user distinction to clients.
		return nil
	}
	return nil
}

// VerifyWhatsAppOTP checks OTP and issues a one-time opaque reset token (stored in Redis).
func (s *ForgotPasswordService) VerifyWhatsAppOTP(ctx context.Context, phone, code string) (resetToken string, expiresInSec int, err error) {
	if !s.Available() {
		return "", 0, ErrForgotUnavailable
	}
	norm, err := normalizeE164Phone(phone)
	if err != nil {
		return "", 0, ErrForgotInvalidPhone
	}
	code = strings.TrimSpace(code)
	if len(code) != 6 {
		return "", 0, ErrForgotInvalidOTP
	}

	start := time.Now()
	defer enforceMinLatency(start, 220*time.Millisecond, 100*time.Millisecond)

	if err := s.incrHourlyCap(ctx, redisForgotRLVerify+norm, s.cfg.VerifyPerHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return "", 0, ErrForgotRateLimited
		}
		return "", 0, err
	}

	otpKey := redisForgotOTP + norm
	stored, rerr := s.rdb.Get(ctx, otpKey).Result()
	if rerr == redis.Nil || stored == "" {
		return "", 0, ErrForgotInvalidOTP
	}
	if rerr != nil {
		log.Printf("[forgot-password] verify: redis GET otp failed phone=%s: %v", redactPhone(norm), rerr)
		return "", 0, ErrForgotInvalidOTP
	}
	if subtle.ConstantTimeCompare([]byte(stored), []byte(code)) != 1 {
		return "", 0, ErrForgotInvalidOTP
	}

	u, dbErr := s.findUserByPhone(ctx, norm)
	if dbErr != nil {
		log.Printf("[forgot-password] verify: db error phone=%s: %v", redactPhone(norm), dbErr)
		return "", 0, ErrForgotInvalidOTP
	}
	if u == nil {
		return "", 0, ErrForgotInvalidOTP
	}

	_ = s.rdb.Del(ctx, otpKey).Err()

	rawTok, err := randomHexToken(32)
	if err != nil {
		return "", 0, err
	}
	tokKey := redisForgotResetToken + rawTok
	if err := s.rdb.Set(ctx, tokKey, u.UserID, s.cfg.ResetTokenTTL).Err(); err != nil {
		log.Printf("[forgot-password] verify: redis SET reset token failed user=%s: %v", u.UserID, err)
		return "", 0, err
	}
	exp := int(s.cfg.ResetTokenTTL / time.Second)
	return rawTok, exp, nil
}

// ResetPasswordWithToken consumes the opaque reset token and updates the stored login password (plaintext).
func (s *ForgotPasswordService) ResetPasswordWithToken(ctx context.Context, resetToken, newPassword string) error {
	if !s.Available() {
		return ErrForgotUnavailable
	}
	resetToken = strings.TrimSpace(resetToken)
	if resetToken == "" {
		return ErrForgotInvalidResetToken
	}
	if len(newPassword) < 6 {
		return ErrForgotWeakPassword
	}

	start := time.Now()
	defer enforceMinLatency(start, 200*time.Millisecond, 80*time.Millisecond)

	tokKey := redisForgotResetToken + resetToken
	userID, err := s.rdb.Get(ctx, tokKey).Result()
	if err == redis.Nil || strings.TrimSpace(userID) == "" {
		return ErrForgotInvalidResetToken
	}
	if err != nil {
		log.Printf("[forgot-password] reset: redis GET token: %v", err)
		return ErrForgotInvalidResetToken
	}

	if err := s.users.UpdatePasswordHash(ctx, userID, newPassword); err != nil {
		log.Printf("[forgot-password] reset: UpdatePasswordHash user=%s: %v", userID, err)
		return err
	}
	_ = s.rdb.Del(ctx, tokKey).Err()

	// Best-effort mirror password to FMCG/Secure Pharma if configured.
	// IMPORTANT: never log the plaintext password.
	if s.fmcg != nil && strings.TrimSpace(s.fmcg.baseURL) != "" {
		if u, gErr := s.users.GetByID(ctx, userID); gErr == nil && u != nil {
			if syncErr := s.fmcg.SyncNewUser(ctx, u, &FMCGSyncNewUserOpts{PlaintextPassword: newPassword}); syncErr != nil {
				log.Printf("[forgot-password] WARNING: FMCG password sync failed user=%s: %v", userID, syncErr)
			}
		} else if gErr != nil {
			log.Printf("[forgot-password] WARNING: FMCG password sync skipped (GetByID failed) user=%s: %v", userID, gErr)
		}
	}
	return nil
}

func (s *ForgotPasswordService) findUserByPhone(ctx context.Context, e164 string) (*models.User, error) {
	for _, p := range forgotPhoneLookupCandidates(e164) {
		u, err := s.users.GetByPhone(ctx, p)
		if err == nil {
			return u, nil
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
	}
	return nil, nil
}

func (s *ForgotPasswordService) checkSendRateLimits(ctx context.Context, phone, clientIP string) error {
	if err := s.incrHourlyCap(ctx, redisForgotRLPhone+phone, s.cfg.OTPPerPhoneHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return ErrForgotRateLimited
		}
		return err
	}
	ip := strings.TrimSpace(clientIP)
	if ip != "" && ip != "0.0.0.0" {
		if err := s.incrHourlyCap(ctx, redisForgotRLIP+ip, s.cfg.OTPPerIPHour); err != nil {
			if errors.Is(err, errRateLimited) {
				return ErrForgotRateLimited
			}
			return err
		}
	}
	return nil
}

var errRateLimited = errors.New("rate_limited")

func (s *ForgotPasswordService) incrHourlyCap(ctx context.Context, key string, max int) error {
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

func enforceMinLatency(started time.Time, base, jitterMax time.Duration) {
	min := base
	if jitterMax > 0 {
		jm := uint64(jitterMax)
		var b [8]byte
		_, _ = rand.Read(b[:])
		min += time.Duration(binary.BigEndian.Uint64(b[:]) % jm)
	}
	if d := time.Since(started); d < min {
		time.Sleep(min - d)
	}
}

func normalizeE164Phone(s string) (string, error) {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "+") {
		return "", errors.New("must start with +")
	}
	core := s[1:]
	if len(core) < 7 || len(core) > 15 {
		return "", errors.New("bad length")
	}
	for _, r := range core {
		if r < '0' || r > '9' {
			return "", errors.New("non-digit")
		}
	}
	if core[0] == '0' {
		return "", errors.New("leading zero")
	}
	return s, nil
}

// forgotPhoneLookupCandidates mirrors login phone matching so DB rows stored
// as +91…, 10-digit local, etc. still resolve.
func forgotPhoneLookupCandidates(raw string) []string {
	id := strings.TrimSpace(raw)
	if id == "" || strings.Contains(id, "@") {
		return nil
	}
	seen := map[string]struct{}{}
	var out []string
	add := func(s string) {
		s = strings.TrimSpace(s)
		if s == "" {
			return
		}
		if _, ok := seen[s]; ok {
			return
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	add(id)
	digits := make([]rune, 0, len(id))
	for _, r := range id {
		if r >= '0' && r <= '9' {
			digits = append(digits, r)
		}
	}
	if len(digits) == 10 {
		add("+" + string(append([]rune{'9', '1'}, digits...)))
		add(string(digits))
	}
	if len(digits) == 12 && digits[0] == '9' && digits[1] == '1' {
		add("+" + string(digits))
	}
	return out
}

func randomOTP6() (string, error) {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	n := binary.BigEndian.Uint32(b[:]) % 1_000_000
	return fmt.Sprintf("%06d", n), nil
}

func randomHexToken(nBytes int) (string, error) {
	b := make([]byte, nBytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func redactPhone(p string) string {
	p = strings.TrimSpace(p)
	if len(p) <= 5 {
		return "***"
	}
	return p[:3] + "…" + p[len(p)-2:]
}

// ValidateForgotPasswordPhoneFormat is used by tests and documents rules.
func ValidateForgotPasswordPhoneFormat(s string) error {
	_, err := normalizeE164Phone(s)
	return err
}

// NormalizeE164PhoneForAPI validates international phone (+E.164) for HTTP handlers.
func NormalizeE164PhoneForAPI(s string) (string, error) {
	return normalizeE164Phone(s)
}
