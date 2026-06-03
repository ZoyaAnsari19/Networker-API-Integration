package models

import (
	"encoding/json"
	"time"
)

type CommissionConfig struct {
	ID          int             `json:"id"`
	ConfigKey   string          `json:"config_key"`
	ConfigValue json.RawMessage `json:"config_value"`
	UpdatedBy   *string         `json:"updated_by,omitempty"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type LevelBonusSlab struct {
	ID           int       `json:"id"`
	PairNumber   int       `json:"pair_number"`
	BonusPercent float64   `json:"bonus_percent"`
	MaxLevel     int       `json:"max_level"`
	IsActive     bool      `json:"is_active"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type PayoutConfig struct {
	ID          int             `json:"id"`
	ConfigKey   string          `json:"config_key"`
	ConfigValue json.RawMessage `json:"config_value"`
	UpdatedAt   time.Time       `json:"updated_at"`
}

type FMCGAPIKey struct {
	ID        int       `json:"id"`
	AppName   string    `json:"app_name"`
	APIKey    string    `json:"api_key"`
	APISecret string    `json:"-"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type PurchaseEvent struct {
	UserID         string `json:"user_id" validate:"required"`
	OrderID        string `json:"order_id" validate:"required"`
	BVAmount       int64  `json:"bv_amount" validate:"required,min=1"`
	TotalAmount    int64  `json:"total_amount"`
	UserType       string `json:"user_type" validate:"required"`
	FranchiseID    string `json:"franchise_id,omitempty"`
}

type CommissionResult struct {
	OrderID             string                   `json:"order_id"`
	PackageActivation   *PackageActivationResult `json:"package_activation,omitempty"`
	DirectCommission    *DirectCommResult        `json:"direct_commission,omitempty"`
	BinaryCommissions   []BinaryCommResult       `json:"binary_commissions,omitempty"`
	BinaryHeld          bool                     `json:"binary_held,omitempty"`
	FranchiseCommission *FranchiseCommResult     `json:"franchise_commission,omitempty"`
	// Shopping reports what the v2 activation rule did with the buyer's own
	// purchase (monthly shopping counter tick + any held_income rows that
	// were released as a result). Populated only when the event's user is
	// a networker and total_amount > 0.
	Shopping *ShoppingResult `json:"shopping,omitempty"`
}

// ShoppingResult is the post-purchase summary for the buyer's activation
// state. Exposed on CommissionResult and also on the FMCG purchase
// response so the UI can toast a "Rs X released" message.
type ShoppingResult struct {
	MonthlyIncomePaise   int64 `json:"monthly_income_paise"`
	MonthlyShoppingPaise int64 `json:"monthly_shopping_paise"`
	PeriodYM             int   `json:"period_ym"`
	ReleasedCount        int   `json:"released_count"`
	ReleasedAmount       int64 `json:"released_amount"`
}

// DirectCommResult reports what happened when we tried to credit a direct
// commission to the sponsor. Under the v2 activation rule lifetime caps
// are gone — `Held` / `HeldAmount` take their place, representing cases
// where the credit was quarantined into held_income pending monthly
// shopping. `Capped` is retained for callers that still distinguish an
// inactive sponsor but always goes with `Amount=0` now.
type DirectCommResult struct {
	SponsorID  string `json:"sponsor_id"`
	Amount     int64  `json:"amount"`
	Capped     bool   `json:"capped"`
	CapRemain  int64  `json:"cap_remaining"`
	Held       bool   `json:"held,omitempty"`
	HeldAmount int64  `json:"held_amount,omitempty"`
}

type BinaryCommResult struct {
	UserID          string `json:"user_id"`
	MatchedBV       int64  `json:"matched_bv"`
	Commission      int64  `json:"commission"`
	LevelBonus      int64  `json:"level_bonus"`
	TotalCredited   int64  `json:"total_credited"`
	CapDeducted     int64  `json:"cap_deducted"`
	CarryForwardBV  int64  `json:"carry_forward_bv"`
	CarryForwardLeg string `json:"carry_forward_leg"`
	Held            bool   `json:"held,omitempty"`
	HeldAmount      int64  `json:"held_amount,omitempty"`
}

type FranchiseCommResult struct {
	SponsorID  string `json:"sponsor_id"`
	Amount     int64  `json:"amount"`
	Held       bool   `json:"held,omitempty"`
	HeldAmount int64  `json:"held_amount,omitempty"`
}

type UpdateConfigRequest struct {
	ConfigKey   string          `json:"config_key" validate:"required"`
	ConfigValue json.RawMessage `json:"config_value" validate:"required"`
}

type UpdateLevelBonusRequest struct {
	PairNumber   int     `json:"pair_number" validate:"required,min=1"`
	BonusPercent float64 `json:"bonus_percent" validate:"required,min=0"`
	MaxLevel     int     `json:"max_level" validate:"required,min=0"`
	IsActive     bool    `json:"is_active"`
}
