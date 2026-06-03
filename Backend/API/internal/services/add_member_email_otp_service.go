package services

import (
	"context"
	"crypto/subtle"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"fmcg-binary/internal/emailpolicy"
	"fmcg-binary/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

// Redis keys for sponsor-initiated add-member email OTP (prefix sc:ame*).
const (
	redisAddMemberEmailOTP    = "sc:ameotp:"   // sponsorID:email -> 6-digit OTP
	redisAddMemberEmailRLSE   = "sc:ameotprl:" // hourly send cap per sponsor+email
	redisAddMemberEmailRLIP   = "sc:ameotprlip:"
	redisAddMemberEmailVerRL  = "sc:ameverrl:" // verify attempts per sponsor+email / hour
	redisAddMemberEmailVrfTok = "sc:amevrf:"   // opaque token -> sponsorID|normalizedEmail
)

var (
	ErrAddMemberEmailOTPUnavailable = errors.New("add_member_email_otp_unavailable")
	ErrAddMemberEmailOTPRateLimited = errors.New("add_member_email_otp_rate_limited")
	ErrAddMemberInvalidEmail        = errors.New("add_member_invalid_email")
	ErrAddMemberEmailInvalidOTP     = errors.New("add_member_email_invalid_otp")
	ErrAddMemberEmailInUse          = errors.New("add_member_email_in_use")
)

// AddMemberEmailOTPConfig mirrors phone OTP service tuning.
type AddMemberEmailOTPConfig struct {
	AppEnv string

	OTPTTL                 time.Duration
	VerifyTokenTTL         time.Duration
	OTPPerSponsorEmailHour int
	OTPPerIPHour           int
	VerifyPerHour          int
	LogOTPInDev            bool
}

// AddMemberEmailOTPService sends email OTP to verify a new downline email
// before POST /users/create (JWT sponsor).
type AddMemberEmailOTPService struct {
	users *repository.UserRepo
	rdb   *redis.Client
	smtp  *SMTPClient
	cfg   AddMemberEmailOTPConfig
}

func NewAddMemberEmailOTPService(
	users *repository.UserRepo,
	rdb *redis.Client,
	smtp *SMTPClient,
	cfg AddMemberEmailOTPConfig,
) *AddMemberEmailOTPService {
	if cfg.OTPTTL <= 0 {
		cfg.OTPTTL = 10 * time.Minute
	}
	if cfg.VerifyTokenTTL <= 0 {
		cfg.VerifyTokenTTL = 15 * time.Minute
	}
	if cfg.OTPPerSponsorEmailHour <= 0 {
		cfg.OTPPerSponsorEmailHour = 8
	}
	if cfg.OTPPerIPHour <= 0 {
		cfg.OTPPerIPHour = 40
	}
	if cfg.VerifyPerHour <= 0 {
		cfg.VerifyPerHour = 24
	}
	return &AddMemberEmailOTPService{users: users, rdb: rdb, smtp: smtp, cfg: cfg}
}

func (s *AddMemberEmailOTPService) Available() bool {
	return s != nil && s.rdb != nil && s.smtp != nil && s.smtp.Configured()
}

// AddMemberEmailVerifyPayload is stored in Redis after a successful verify.
type AddMemberEmailVerifyPayload struct {
	SponsorUserID string
	Email         string // normalized lowercase trimmed
}

// SendEmailOTP sends OTP to email after duplicate-email check + rate limits.
func (s *AddMemberEmailOTPService) SendEmailOTP(ctx context.Context, sponsorUserID, email, clientIP string) error {
	if !s.Available() {
		return ErrAddMemberEmailOTPUnavailable
	}
	sponsorUserID = strings.TrimSpace(sponsorUserID)
	if sponsorUserID == "" {
		return ErrAddMemberEmailOTPUnavailable
	}
	norm, err := normalizeEmail(email)
	if err != nil {
		return ErrAddMemberInvalidEmail
	}

	start := time.Now()
	defer enforceMinLatency(start, 220*time.Millisecond, 100*time.Millisecond)

	if _, err := s.users.GetByID(ctx, sponsorUserID); err != nil {
		log.Printf("[add-member-email-otp] send: sponsor not found id=%s: %v", sponsorUserID, err)
		return ErrAddMemberEmailOTPUnavailable
	}

	if !emailpolicy.AllowsDuplicateAccounts(norm) {
		u, err := s.users.GetByEmail(ctx, norm)
		if err == nil && u != nil {
			return ErrAddMemberEmailInUse
		}
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("[add-member-email-otp] send: db email lookup %s: %v", redactEmail(norm), err)
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
	otpKey := redisAddMemberEmailOTP + sponsorUserID + ":" + norm
	if err := s.rdb.Set(ctx, otpKey, otp, s.cfg.OTPTTL).Err(); err != nil {
		log.Printf("[add-member-email-otp] send: redis SET %v", err)
		return err
	}

	if s.cfg.LogOTPInDev && strings.ToLower(strings.TrimSpace(s.cfg.AppEnv)) != "production" {
		log.Printf("[add-member-email-otp] dev OTP sponsor=%s email=%s code=%s", sponsorUserID, redactEmail(norm), otp)
	}

	subject := "Your Secure Networker verification code"
	textBody := fmt.Sprintf(
		"Your Secure Networker verification code is %s.\n\nIt is valid for 10 minutes. Do not share this code with anyone.\n\nIf you did not request this, you can ignore this email.",
		otp,
	)
	htmlBody := buildOTPHTML(otp)
	if sErr := s.smtp.Send(norm, subject, textBody, htmlBody); sErr != nil {
		log.Printf("[add-member-email-otp] SMTP send failed sponsor=%s email=%s: %v", sponsorUserID, redactEmail(norm), sErr)
		_ = s.rdb.Del(ctx, otpKey).Err()
		return sErr
	}
	return nil
}

// VerifyEmailOTP checks OTP and returns an opaque token for POST /users/create.
func (s *AddMemberEmailOTPService) VerifyEmailOTP(ctx context.Context, sponsorUserID, email, code string) (token string, expiresInSec int, err error) {
	if !s.Available() {
		return "", 0, ErrAddMemberEmailOTPUnavailable
	}
	sponsorUserID = strings.TrimSpace(sponsorUserID)
	norm, err := normalizeEmail(email)
	if err != nil {
		return "", 0, ErrAddMemberInvalidEmail
	}
	code = strings.TrimSpace(code)
	if len(code) != 6 {
		return "", 0, ErrAddMemberEmailInvalidOTP
	}

	start := time.Now()
	defer enforceMinLatency(start, 200*time.Millisecond, 90*time.Millisecond)

	if err := s.incrHourlyCap(ctx, redisAddMemberEmailVerRL+sponsorUserID+":"+norm, s.cfg.VerifyPerHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return "", 0, ErrAddMemberEmailOTPRateLimited
		}
		return "", 0, err
	}

	otpKey := redisAddMemberEmailOTP + sponsorUserID + ":" + norm
	stored, rerr := s.rdb.Get(ctx, otpKey).Result()
	if rerr == redis.Nil || stored == "" {
		return "", 0, ErrAddMemberEmailInvalidOTP
	}
	if rerr != nil {
		log.Printf("[add-member-email-otp] verify: redis GET %v", rerr)
		return "", 0, ErrAddMemberEmailInvalidOTP
	}
	if subtle.ConstantTimeCompare([]byte(stored), []byte(code)) != 1 {
		return "", 0, ErrAddMemberEmailInvalidOTP
	}
	_ = s.rdb.Del(ctx, otpKey).Err()

	rawTok, err := randomHexToken(32)
	if err != nil {
		return "", 0, err
	}
	payload := sponsorUserID + "|" + norm
	tokKey := redisAddMemberEmailVrfTok + rawTok
	if err := s.rdb.Set(ctx, tokKey, payload, s.cfg.VerifyTokenTTL).Err(); err != nil {
		log.Printf("[add-member-email-otp] verify: redis SET token %v", err)
		return "", 0, err
	}
	return rawTok, int(s.cfg.VerifyTokenTTL / time.Second), nil
}

// TakeEmailVerificationToken atomically consumes the opaque token and returns
// payload (sponsorID + normalized email). Caller must compare to the create body.
func (s *AddMemberEmailOTPService) TakeEmailVerificationToken(ctx context.Context, token string) (*AddMemberEmailVerifyPayload, error) {
	if !s.Available() {
		return nil, ErrAddMemberEmailOTPUnavailable
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return nil, ErrAddMemberEmailInvalidOTP
	}
	key := redisAddMemberEmailVrfTok + token
	val, err := s.rdb.GetDel(ctx, key).Result()
	if err == redis.Nil || strings.TrimSpace(val) == "" {
		return nil, ErrAddMemberEmailInvalidOTP
	}
	if err != nil {
		log.Printf("[add-member-email-otp] take token: redis %v", err)
		return nil, ErrAddMemberEmailInvalidOTP
	}
	parts := strings.SplitN(val, "|", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[0]) == "" || strings.TrimSpace(parts[1]) == "" {
		return nil, ErrAddMemberEmailInvalidOTP
	}
	return &AddMemberEmailVerifyPayload{SponsorUserID: strings.TrimSpace(parts[0]), Email: strings.TrimSpace(parts[1])}, nil
}

func (s *AddMemberEmailOTPService) incrHourlyCap(ctx context.Context, key string, max int) error {
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

func (s *AddMemberEmailOTPService) checkSendRateLimits(ctx context.Context, sponsorUserID, email, clientIP string) error {
	seKey := redisAddMemberEmailRLSE + sponsorUserID + ":" + email
	if err := s.incrHourlyCap(ctx, seKey, s.cfg.OTPPerSponsorEmailHour); err != nil {
		if errors.Is(err, errRateLimited) {
			return ErrAddMemberEmailOTPRateLimited
		}
		return err
	}
	ip := strings.TrimSpace(clientIP)
	if ip != "" && ip != "0.0.0.0" {
		if err := s.incrHourlyCap(ctx, redisAddMemberEmailRLIP+ip, s.cfg.OTPPerIPHour); err != nil {
			if errors.Is(err, errRateLimited) {
				return ErrAddMemberEmailOTPRateLimited
			}
			return err
		}
	}
	return nil
}

// normalizeEmail validates and lowercases a single email address.
// Used by the OTP service so the same key is hit on send/verify regardless of
// case differences typed by the user.
func normalizeEmail(raw string) (string, error) {
	s := strings.ToLower(strings.TrimSpace(raw))
	if s == "" {
		return "", errors.New("empty email")
	}
	at := strings.IndexByte(s, '@')
	if at <= 0 || at == len(s)-1 {
		return "", errors.New("missing @")
	}
	local := s[:at]
	domain := s[at+1:]
	if strings.Contains(local, " ") || strings.Contains(domain, " ") {
		return "", errors.New("contains space")
	}
	if !strings.Contains(domain, ".") {
		return "", errors.New("missing tld")
	}
	if len(s) > 254 {
		return "", errors.New("too long")
	}
	return s, nil
}

// redactEmail masks the local part for logs (alice@x.com -> a***e@x.com).
func redactEmail(s string) string {
	at := strings.IndexByte(s, '@')
	if at <= 0 {
		return "***"
	}
	local := s[:at]
	dom := s[at:]
	if len(local) <= 2 {
		return "*" + dom
	}
	return string(local[0]) + "***" + string(local[len(local)-1]) + dom
}

// buildOTPHTML renders a tiny OTP card for the email body.
func buildOTPHTML(otp string) string {
	return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Inter,Arial,sans-serif">` +
		`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:24px 0">` +
		`<tr><td align="center"><table role="presentation" cellspacing="0" cellpadding="0" width="520" style="background:#ffffff;border-radius:14px;border:1px solid #e5e7eb">` +
		`<tr><td style="padding:28px 28px 8px 28px"><div style="font-size:14px;color:#6b7280;letter-spacing:.08em;text-transform:uppercase">Secure Networker</div>` +
		`<h1 style="margin:6px 0 0 0;font-size:20px;color:#111827">Your verification code</h1></td></tr>` +
		`<tr><td style="padding:8px 28px 0 28px;color:#374151;font-size:14px;line-height:22px">` +
		`Use the code below to verify your email address. It is valid for <b>10 minutes</b>. Do not share it with anyone.` +
		`</td></tr>` +
		`<tr><td style="padding:18px 28px"><div style="display:inline-block;padding:14px 18px;border-radius:10px;background:#0ea5e90f;border:1px solid #0ea5e933;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:28px;letter-spacing:.5em;color:#0369a1;font-weight:700">` + otp + `</div></td></tr>` +
		`<tr><td style="padding:0 28px 24px 28px;color:#6b7280;font-size:12px;line-height:18px">If you didn't request this, you can ignore this email. Your account stays safe.</td></tr>` +
		`</table></td></tr></table></body></html>`
}
