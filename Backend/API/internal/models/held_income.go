package models

import "time"

// HeldIncome is a quarantined commission row produced by the v2 activation
// rule. When a networker's cumulative monthly income crosses
// `MonthlyIncomeThresholdPaise` without meeting
// `MonthlyShoppingThresholdPaise` of personal shopping in the same month,
// subsequent commission credits are written here with Status=HELD instead
// of being posted to `wallet_ledger`.
//
// A HELD row transitions to:
//   - RELEASED — user shops enough this month; ReleasedLedgerID points at
//     the paid-out wallet_ledger CREDIT for one-to-one traceability.
//   - FORFEITED — monthly cron on day 1 reaps every HELD row whose
//     period_ym is strictly less than the current period.
type HeldIncome struct {
	ID                int64     `json:"id"`
	UserID            string    `json:"user_id"`
	WalletType        string    `json:"wallet_type"`
	Source            string    `json:"source"`
	Amount            int64     `json:"amount"`
	ReferenceID       *string   `json:"reference_id,omitempty"`
	ReferenceType     *string   `json:"reference_type,omitempty"`
	Description       *string   `json:"description,omitempty"`
	PeriodYM          int       `json:"period_ym"`
	Status            string    `json:"status"`
	ReleasedLedgerID  *int64    `json:"released_ledger_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

const (
	HeldStatusHeld      = "HELD"
	HeldStatusReleased  = "RELEASED"
	HeldStatusForfeited = "FORFEITED"

	// MonthlyIncomeThresholdPaise (Rs 25,000) is the cumulative month-to-date
	// commission income above which the shopping gate kicks in. The rule uses
	// a STRICTLY-GREATER-THAN check (`> MonthlyIncomeThresholdPaise`), so the
	// exact 25,000 rupee credit itself still lands in the ledger; only
	// earnings beyond that are subject to the gate.
	MonthlyIncomeThresholdPaise int64 = 2_500_000

	// MonthlyShoppingThresholdPaise (Rs 2,500) is the minimum personal
	// shopping a user must do in the same month once they have crossed the
	// income threshold. Reaching this value flips held rows to RELEASED.
	MonthlyShoppingThresholdPaise int64 = 250_000
)

// CurrentPeriodYMFromTime returns the YYYY*100+MM period identifier used
// by the monthly activation rule. Kept on the model layer so tests, repos,
// and services all agree on the format without importing a services pkg.
func CurrentPeriodYMFromTime(t time.Time) int {
	return t.Year()*100 + int(t.Month())
}
