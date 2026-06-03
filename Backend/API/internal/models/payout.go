package models

import "time"

type PayoutRequest struct {
	PayoutID            string     `json:"payout_id"`
	UserID              string     `json:"user_id"`
	WalletType          string     `json:"wallet_type"`
	RequestedAmount     int64      `json:"requested_amount"`
	ServiceChargePaise  int64      `json:"service_charge_paise"`
	TDSPaise            int64      `json:"tds_paise"`
	NetPayoutPaise      int64      `json:"net_payout_paise"`
	PaymentMethod       string     `json:"payment_method"`
	ApprovedAmount      *int64     `json:"approved_amount,omitempty"`
	Status              string     `json:"status"`
	AdminID             *string    `json:"admin_id,omitempty"`
	AdminNote           *string    `json:"admin_note,omitempty"`
	SCTxReference       *string    `json:"sc_tx_reference,omitempty"`
	SCUserEmail         *string    `json:"sc_user_email,omitempty"`
	RequestedAt         time.Time  `json:"requested_at"`
	ProcessedAt         *time.Time `json:"processed_at,omitempty"`
}

type CreatePayoutRequest struct {
	WalletType            string `json:"wallet_type" validate:"required,oneof=DIRECT TEAM"`
	Amount                int64  `json:"amount" validate:"required,min=1"`
	TransactionPassword   string `json:"transaction_password" validate:"required"`
	// Payouts are issued to the Secure Wallet only; omit or send SECURE_WALLET.
	PaymentMethod string `json:"payment_method" validate:"omitempty,oneof=SECURE_WALLET"`
}

// WithdrawalScheduleResponse is returned by GET /api/v1/payouts/schedule for the
// withdraw UI (allowed calendar days, IST time window, fee percents, min amount).
type WithdrawalScheduleResponse struct {
	ServerNowIST               string  `json:"server_now_ist"`
	ISTStartHour               int     `json:"ist_start_hour"`
	ISTEndHour                 int     `json:"ist_end_hour"`
	WithinTimeWindow           bool    `json:"within_time_window"`
	MinWithdrawalPaise         int64   `json:"min_withdrawal_paise"`
	ServiceChargePercent       float64 `json:"service_charge_percent"`
	TDSPercent                 float64 `json:"tds_percent"`
	AllowedDatesDirect         []int   `json:"allowed_dates_direct"`
	AllowedDatesTeam           []int   `json:"allowed_dates_team"`
	TodayAllowedForDirect      bool    `json:"today_allowed_for_direct"`
	TodayAllowedForTeam        bool    `json:"today_allowed_for_team"`
	MaxPercentOfMonthlyIncome  int     `json:"max_percent_of_monthly_income"`
}

type ApprovePayoutRequest struct {
	Amount    *int64  `json:"amount,omitempty"`
	AdminNote *string `json:"admin_note,omitempty"`
}

type RejectPayoutRequest struct {
	AdminNote string `json:"admin_note"`
}

const (
	PayoutPending    = "PENDING"
	PayoutApproved   = "APPROVED"
	PayoutRejected   = "REJECTED"
	PayoutProcessing = "PROCESSING"
	PayoutCompleted  = "COMPLETED"
	PayoutFailed     = "FAILED"
)
