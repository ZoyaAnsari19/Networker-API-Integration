package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/jwt"
	"strings"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	userRepo   *repository.UserRepo
	jwtManager *jwt.Manager
	rdb        *redis.Client
}

func NewAuthService(userRepo *repository.UserRepo, jwtManager *jwt.Manager, rdb *redis.Client) *AuthService {
	return &AuthService{userRepo: userRepo, jwtManager: jwtManager, rdb: rdb}
}

func (s *AuthService) Login(ctx context.Context, req *models.LoginRequest) (*models.AuthResponse, error) {
	user, err := s.resolveUserByIdentifier(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}
	if user.Status == models.UserStatusBlocked {
		return nil, errors.New("account is blocked")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	accessToken, err := s.jwtManager.GenerateAccessToken(user.UserID, user.Role)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.UserID, user.Role)
	if err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func (s *AuthService) RefreshToken(ctx context.Context, req *models.RefreshRequest) (*models.AuthResponse, error) {
	claims, err := s.jwtManager.ValidateToken(req.RefreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}
	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	accessToken, err := s.jwtManager.GenerateAccessToken(user.UserID, user.Role)
	if err != nil {
		return nil, err
	}
	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.UserID, user.Role)
	if err != nil {
		return nil, err
	}
	return &models.AuthResponse{
		User:         user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// ChangePassword verifies the current login password then rotates it. The
// current-password check is intentional: it blocks anyone with a stolen
// session (but no password knowledge) from silently swapping the password.
func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	if len(newPassword) < 6 {
		return errors.New("new password must be at least 6 characters")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return errors.New("current password is incorrect")
	}
	hash, err := HashPassword(newPassword)
	if err != nil {
		return err
	}
	return s.userRepo.UpdatePasswordHash(ctx, userID, hash)
}

// SetTransactionPassword sets or rotates the networker's transaction password.
// Flow:
//  - first-time set: require correct login password only
//  - change: require correct login password + correct current txn password
// The login password is always required so a stolen session cannot silently
// establish a txn password and then approve P2P transfers.
func (s *AuthService) SetTransactionPassword(ctx context.Context, userID, loginPassword, currentTxnPassword, newTxnPassword string) error {
	if len(newTxnPassword) < 6 {
		return errors.New("new transaction password must be at least 6 characters")
	}
	if loginPassword == newTxnPassword {
		return errors.New("transaction password must be different from your login password")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(loginPassword)); err != nil {
		return errors.New("login password is incorrect")
	}

	existingHash, err := s.userRepo.GetTransactionPasswordHash(ctx, userID)
	if err != nil {
		return errors.New("could not load current transaction password")
	}
	if existingHash != "" {
		if currentTxnPassword == "" {
			return errors.New("current transaction password is required")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(existingHash), []byte(currentTxnPassword)); err != nil {
			return errors.New("current transaction password is incorrect")
		}
	}

	hash, err := HashPassword(newTxnPassword)
	if err != nil {
		return err
	}
	return s.userRepo.UpdateTransactionPasswordHash(ctx, userID, hash)
}

// UpdateEmail verifies the login password (re-auth) and rotates the user's
// email. The caller is expected to have OTP-verified the new address on the
// client; the otpVerified flag is required as a protocol acknowledgement
// until a real OTP backend lands.
func (s *AuthService) UpdateEmail(ctx context.Context, userID, newEmail, loginPassword string, otpVerified bool) error {
	email := strings.TrimSpace(strings.ToLower(newEmail))
	if email == "" || !strings.Contains(email, "@") {
		return errors.New("valid email is required")
	}
	if !otpVerified {
		return errors.New("email OTP must be verified before updating")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(loginPassword)); err != nil {
		return errors.New("login password is incorrect")
	}
	if strings.EqualFold(strings.TrimSpace(user.Email), email) {
		return errors.New("new email must be different from the current one")
	}
	return s.userRepo.UpdateEmail(ctx, userID, email)
}

// UpdatePhone verifies the login password (re-auth) and rotates the user's
// phone. Expects the new value to already include the country code (e.g.
// "+919876543210") since the signup flow stores it that way.
func (s *AuthService) UpdatePhone(ctx context.Context, userID, newPhone, loginPassword string, otpVerified bool) error {
	phone := strings.TrimSpace(newPhone)
	if phone == "" {
		return errors.New("valid phone is required")
	}
	if !otpVerified {
		return errors.New("phone OTP must be verified before updating")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(loginPassword)); err != nil {
		return errors.New("login password is incorrect")
	}
	if user.Phone != nil && strings.TrimSpace(*user.Phone) == phone {
		return errors.New("new phone must be different from the current one")
	}
	return s.userRepo.UpdatePhone(ctx, userID, phone)
}

// UpdatePayoutUPI sets the payout UPI handle after login-password re-auth.
func (s *AuthService) UpdatePayoutUPI(ctx context.Context, userID, upi, loginPassword string) error {
	upi = strings.TrimSpace(upi)
	if upi == "" {
		return errors.New("payout UPI is required")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return errors.New("user not found")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(loginPassword)); err != nil {
		return errors.New("login password is incorrect")
	}
	return s.userRepo.UpdatePayoutUPIID(ctx, userID, upi)
}

// VerifyTransactionPassword returns nil when the supplied txn password matches
// the stored hash. Used by P2P transfer (networker → networker) to authorise
// the movement before debiting the sender wallet.
func (s *AuthService) VerifyTransactionPassword(ctx context.Context, userID, txnPassword string) error {
	if txnPassword == "" {
		return errors.New("transaction password is required")
	}
	hash, err := s.userRepo.GetTransactionPasswordHash(ctx, userID)
	if err != nil {
		return errors.New("could not load transaction password")
	}
	if hash == "" {
		return errors.New("transaction password is not set — please set one in your profile first")
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(txnPassword)); err != nil {
		return errors.New("incorrect transaction password")
	}
	return nil
}

func NewUserID() string {
	return uuid.New().String()
}

// resolveUserByIdentifier accepts an email, SPF ID (SPFxxxxx) or phone number
// and returns the matching networker user. It is intentionally forgiving:
// trims whitespace, detects SPF IDs case-insensitively, and falls back
// across email / phone lookups.
func (s *AuthService) resolveUserByIdentifier(ctx context.Context, raw string) (*models.User, error) {
	id := strings.TrimSpace(raw)
	if id == "" {
		return nil, errors.New("identifier required")
	}

	upper := strings.ToUpper(id)
	if strings.HasPrefix(upper, "SPF") {
		if u, err := s.userRepo.GetBySponsorID(ctx, upper); err == nil {
			return u, nil
		}
	}

	if strings.Contains(id, "@") {
		if u, err := s.userRepo.GetByEmail(ctx, id); err == nil {
			return u, nil
		}
	}

	if u, err := s.userRepo.GetByPhone(ctx, id); err == nil {
		return u, nil
	}

	if u, err := s.userRepo.GetByEmail(ctx, id); err == nil {
		return u, nil
	}

	return nil, errors.New("user not found")
}
