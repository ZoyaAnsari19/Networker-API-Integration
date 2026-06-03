package models

import "time"

// Package is the admin-configurable tier that drives the daily binary cap
// when a user activates / upgrades. Under the v2 activation rule the
// lifetime cap multipliers are gone, so `DailyBinaryCap` is the only
// earning-limit knob on this struct.
type Package struct {
	PackageID      string    `json:"package_id"`
	Name           string    `json:"name"`
	Amount         int64     `json:"amount"`
	DailyBinaryCap int64     `json:"daily_binary_cap"`
	Status         string    `json:"status"`
	SortOrder      int       `json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UserPackage struct {
	ID          int64      `json:"id"`
	UserID      string     `json:"user_id"`
	PackageID   string     `json:"package_id"`
	AmountPaid  int64      `json:"amount_paid"`
	ActivatedAt time.Time  `json:"activated_at"`
	ExpiredAt   *time.Time `json:"expired_at,omitempty"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
}

type CreatePackageRequest struct {
	Name           string `json:"name" validate:"required"`
	Amount         int64  `json:"amount" validate:"required,min=1"`
	DailyBinaryCap int64  `json:"daily_binary_cap" validate:"required,min=0"`
	SortOrder      int    `json:"sort_order"`
}

type UpdatePackageRequest struct {
	Name           *string `json:"name,omitempty"`
	Amount         *int64  `json:"amount,omitempty"`
	DailyBinaryCap *int64  `json:"daily_binary_cap,omitempty"`
	Status         *string `json:"status,omitempty"`
	SortOrder      *int    `json:"sort_order,omitempty"`
}

const (
	PackageStatusActive   = "ACTIVE"
	PackageStatusDisabled = "DISABLED"

	UserPackageActive  = "ACTIVE"
	UserPackageExpired = "EXPIRED"
	UserPackageRenewed = "RENEWED"

	// Package activation actions. Under the v2 rule we can only activate or
	// upgrade — there is no "top-up" any more because lifetime caps no longer
	// exist. Same-tier or lower-tier purchases resolve to NoChange.
	PkgActionNone      = "none"
	PkgActionActivated = "activated"
	PkgActionUpgraded  = "upgraded"
	PkgActionNoChange  = "no_change"
)

// PackageProcessRequest is the payload FMCG sends to auto-activate/upgrade
// a networker's package whenever a purchase is made on Secure-Mart.
type PackageProcessRequest struct {
	UserID  string `json:"user_id" validate:"required"`
	Amount  int64  `json:"amount" validate:"required,min=1"`
	OrderID string `json:"order_id,omitempty"`
}

// PackageActivationResult describes what the activation engine did with a
// purchase. The v2 rule dropped the lifetime cap fields since they no
// longer exist on the schema.
type PackageActivationResult struct {
	Action         string  `json:"action"`
	PackageID      *string `json:"package_id,omitempty"`
	PackageName    *string `json:"package_name,omitempty"`
	PackageAmount  int64   `json:"package_amount,omitempty"`
	DailyBinaryCap int64   `json:"daily_binary_cap"`
	PurchaseAmount int64   `json:"purchase_amount"`
	Message        string  `json:"message"`
}
