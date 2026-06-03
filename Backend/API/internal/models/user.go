package models

import "time"

type User struct {
	UserID             string     `json:"user_id"`
	// sponsor_id is the user's unique sponsor code like SPF00001
	SponsorID          string     `json:"sponsor_id"`
	// sponsor_user_id is internal only (UUID of sponsor/upline)
	SponsorUserID      *string    `json:"-"`
	FullName           string     `json:"full_name"`
	Email              string     `json:"email"`
	Phone              *string    `json:"phone,omitempty"`
	PasswordHash       string     `json:"-"`
	Status             string     `json:"status"`
	Role               string     `json:"role"`
	CurrentPackageID   *string    `json:"current_package_id,omitempty"`
	PackageActivatedAt *time.Time `json:"package_activated_at,omitempty"`
	// Monthly activation-rule counters (v2). MonthlyIncomePaise sums every
	// CREDIT that went through ActivationService.BeforeCredit in the current
	// period, MonthlyShoppingPaise sums this user's OWN purchase events, and
	// IncomePeriodYM (YYYY*100+MM) lets writers detect month rollover without
	// depending on a scheduled cron.
	MonthlyIncomePaise   int64 `json:"monthly_income_paise"`
	MonthlyShoppingPaise int64 `json:"monthly_shopping_paise"`
	IncomePeriodYM       int   `json:"income_period_ym"`
	TodayBinaryEarned    int64 `json:"today_binary_earned"`
	DailyBinaryCap       int64 `json:"daily_binary_cap"`
	PlacementStatus    string     `json:"placement_status"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	// avatar_object_key is a private B2 object key (fmcg-binary/avatars/...); never
	// returned verbatim to clients — GetProfile presigns it into UserProfile.AvatarURL.
	AvatarObjectKey *string `json:"-"`
	// payout_upi_id is the UPI handle used for withdrawals (user-maintained; shown read-only on withdraw UI).
	PayoutUPIID *string `json:"payout_upi_id,omitempty"`
	// payout_bank_display is a single masked line for bank details (admin/sync later; optional).
	PayoutBankDisplay *string `json:"payout_bank_display,omitempty"`
	// secure_wallet_external_id is the linked Secure Wallet user id when connected (optional until integration).
	SecureWalletExternalID *string `json:"secure_wallet_external_id,omitempty"`
	// secure_wallet_balance_paise is a cached display balance for Secure Wallet (nil until linked / synced).
	SecureWalletBalancePaise *int64 `json:"secure_wallet_balance_paise,omitempty"`
}

type UserProfile struct {
	User
	PackageName             *string `json:"package_name,omitempty"`
	PackageAmount           *int64  `json:"package_amount,omitempty"`
	DirectBalance           int64   `json:"direct_wallet_balance"`
	TeamBalance             int64   `json:"team_wallet_balance"`
	DirectCount             int     `json:"direct_referral_count"`
	SponsorName             *string `json:"sponsor_name,omitempty"`
	SponsorSponsorID        *string `json:"sponsor_sponsor_id,omitempty"`
	HasTransactionPassword  bool    `json:"has_transaction_password"`
	KYCStatus               *string `json:"kyc_status,omitempty"`
	KYCRejectionReason      *string `json:"kyc_rejection_reason,omitempty"`
	// AvatarURL is a short-lived presigned HTTPS URL when B2 is configured; otherwise nil.
	AvatarURL *string `json:"avatar_url,omitempty"`
}

// DirectReferral is a compact view of a direct referral (downline whose
// sponsor_user_id == me) used by the Invite & Earn page. It also includes the
// leg (LEFT/RIGHT) where the user was placed in the binary tree, when known.
type DirectReferral struct {
	UserID            string    `json:"user_id"`
	SponsorID         string    `json:"sponsor_id"`
	FullName          string    `json:"full_name"`
	Email             string    `json:"email"`
	Phone             *string   `json:"phone,omitempty"`
	Status            string    `json:"status"`
	PlacementStatus   string    `json:"placement_status"`
	Leg               *string   `json:"leg,omitempty"`
	PackageName       *string   `json:"package_name,omitempty"`
	TotalDirectEarned int64     `json:"total_direct_earned"`
	CreatedAt         time.Time `json:"created_at"`
}

const (
	RoleNetworker = "NETWORKER"
	RoleAdmin     = "ADMIN"
	RoleSubAdmin  = "SUB_ADMIN"

	UserStatusActive   = "ACTIVE"
	UserStatusInactive = "INACTIVE"
	UserStatusBlocked  = "BLOCKED"

	PlacementPlaced  = "PLACED"
	PlacementPending = "PENDING_PLACEMENT"
)

type LoginRequest struct {
	// Identifier can be email, SPF ID (e.g. SPF00001) or phone.
	// Kept as `email` in JSON for backward compatibility with existing clients.
	Email    string `json:"email" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type RegisterRequest struct {
	SponsorID string `json:"sponsor_id" validate:"required"`
	FullName  string `json:"full_name" validate:"required,min=2"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone,omitempty"`
	Password  string `json:"password" validate:"required,min=6"`
	Leg       string `json:"leg" validate:"required,oneof=LEFT RIGHT"`
	PackageID string `json:"package_id" validate:"required"`
}

type FMCGRegisterRequest struct {
	SponsorID string `json:"sponsor_id"`
	FullName  string `json:"full_name" validate:"required"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone,omitempty"`
	Password  string `json:"password" validate:"required,min=6"`
	Leg       string `json:"leg,omitempty"`
	// PackageID is optional for FMCG self-signup. When omitted the user is
	// created as INACTIVE and a later purchase can auto-activate a package.
	PackageID string `json:"package_id,omitempty"`
}

type UserSyncRequest struct {
	UserID   string  `json:"user_id" validate:"required"`
	FullName string  `json:"full_name,omitempty"`
	Email    string  `json:"email,omitempty"`
	Phone    *string `json:"phone,omitempty"`
}

type AuthResponse struct {
	User         *User  `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// ChangePasswordRequest is used by POST /api/v1/me/password to rotate the
// networker's login password. CurrentPassword must match the user's current
// password_hash so a stolen session alone cannot silently change the password.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=6"`
}

// SetTransactionPasswordRequest is used by POST /api/v1/me/transaction-password
// to set (first-time) or change the networker's transaction password. The
// transaction password is used to authorise high-risk actions such as
// P2P transfers (networker → networker). The user's LOGIN password is
// required so a stolen session cannot set a txn password silently.
// CurrentTransactionPassword is required only when the user already has a
// txn password (change flow) — on first-time set it may be empty.
type SetTransactionPasswordRequest struct {
	LoginPassword              string `json:"login_password" validate:"required"`
	CurrentTransactionPassword string `json:"current_transaction_password,omitempty"`
	NewTransactionPassword     string `json:"new_transaction_password" validate:"required,min=6"`
}

type CreateUserRequest struct {
	FullName  string `json:"full_name" validate:"required,min=2"`
	Email     string `json:"email" validate:"required,email"`
	Phone     string `json:"phone,omitempty"`
	Password  string `json:"password" validate:"required,min=6"`
	Leg       string `json:"leg" validate:"required,oneof=LEFT RIGHT"`
	// PackageID is optional when creating from the dashboard.
	// If omitted the user is created as INACTIVE and their package is
	// auto-activated by the FMCG platform based on first purchase volume.
	PackageID string `json:"package_id,omitempty"`
}

// ---------------------------------------------------------------------------
// User lookup (FMCG → Binary)
//
// Returned by GET /api/v1/fmcg/users/lookup. FMCG sends exactly one of
// `email`, `phone`, `sponsor_id`, or `user_id` to identify the networker and
// gets back a combined view that includes profile, current package, sponsor,
// wallets, KYC, placement (leg), and recent directs so support / checkout
// flows do not have to glue together multiple endpoints.
// ---------------------------------------------------------------------------

// UserLookupResponse is the top-level payload.
type UserLookupResponse struct {
	User            User                 `json:"user"`
	Package         *UserLookupPackage   `json:"package,omitempty"`
	Sponsor         *UserLookupSponsor   `json:"sponsor,omitempty"`
	Wallets         UserLookupWallets    `json:"wallets"`
	DirectCount     int                  `json:"direct_referral_count"`
	KYC             *UserLookupKYC       `json:"kyc,omitempty"`
	Placement       UserLookupPlacement  `json:"placement"`
	AvatarURL       *string              `json:"avatar_url,omitempty"`
	RecentReferrals []*DirectReferral    `json:"recent_referrals,omitempty"`
}

// UserLookupPackage is the user's current (active) package snapshot.
// Under the v2 activation rule the package only drives daily_binary_cap;
// the old lifetime max_direct_cap / max_binary_cap fields were removed.
type UserLookupPackage struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Amount         int64      `json:"amount"`
	DailyBinaryCap int64      `json:"daily_binary_cap"`
	ActivatedAt    *time.Time `json:"activated_at,omitempty"`
}

// UserLookupSponsor is a compact sponsor card (direct upline).
type UserLookupSponsor struct {
	UserID    string  `json:"user_id"`
	SponsorID string  `json:"sponsor_id"`
	FullName  string  `json:"full_name"`
	Email     string  `json:"email"`
	Phone     *string `json:"phone,omitempty"`
	Status    string  `json:"status"`
}

// UserLookupWallets carries the user's current wallet balances in paise.
type UserLookupWallets struct {
	Direct int64 `json:"direct_balance"`
	Team   int64 `json:"team_balance"`
	Total  int64 `json:"total_balance"`
}

// UserLookupKYC echoes the user's KYC request state; nil when the user has
// never started a KYC submission.
type UserLookupKYC struct {
	Status          string     `json:"status"`
	SubmittedAt     *time.Time `json:"submitted_at,omitempty"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
}

// UserLookupPlacement is the user's binary-tree placement summary.
// `Leg` is nil while the user is still in PENDING_PLACEMENT or if they are a
// root/admin node with no tree row yet.
type UserLookupPlacement struct {
	Status string  `json:"status"`
	Leg    *string `json:"leg,omitempty"`
}
