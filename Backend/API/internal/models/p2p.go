package models

import "time"

// P2PTransfer is one row of peer-to-peer transfer history. Amounts are in
// paise. The gross `amount` is what was debited from the sender; `net_amount`
// is what was credited to the receiver; `service_charge` is retained by the
// platform (amount = net_amount + service_charge, enforced by DB check).
type P2PTransfer struct {
	TransferID        string    `json:"transfer_id"`
	SenderUserID      string    `json:"sender_user_id"`
	ReceiverUserID    string    `json:"receiver_user_id"`
	SenderSponsorID   string    `json:"sender_sponsor_id"`
	ReceiverSponsorID string    `json:"receiver_sponsor_id"`
	WalletType        string    `json:"wallet_type"`
	Amount            int64     `json:"amount"`
	ServiceCharge     int64     `json:"service_charge"`
	NetAmount         int64     `json:"net_amount"`
	Note              *string   `json:"note,omitempty"`
	DebitLedgerID     *int64    `json:"debit_ledger_id,omitempty"`
	CreditLedgerID    *int64    `json:"credit_ledger_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`

	// Direction is populated when listing history from a specific user's POV:
	//   "OUT" → the current user was the sender
	//   "IN"  → the current user was the receiver
	Direction string `json:"direction,omitempty"`

	// CounterpartyName is the full_name of the counterparty (receiver for
	// outgoing, sender for incoming). Populated by the list query for UX.
	CounterpartyName string `json:"counterparty_name,omitempty"`
}

// P2PLookupResponse is returned by GET /api/v1/p2p/lookup?sponsor_id=SPFxxxxx.
// It tells the sender whether the entered SPF ID resolves to an ACTIVE
// networker eligible to receive P2P funds. FullName is surfaced so the UI
// can populate the "Receiver Name" read-only field shown in the screenshot.
type P2PLookupResponse struct {
	SponsorID string `json:"sponsor_id"`
	FullName  string `json:"full_name"`
	Status    string `json:"status"`
	Eligible  bool   `json:"eligible"`
	Reason    string `json:"reason,omitempty"`
}

// P2PQuoteResponse is returned by GET /api/v1/p2p/quote?amount=N. If `amount`
// is omitted the quote returns only the platform config. Amounts in paise.
type P2PQuoteResponse struct {
	Enabled              bool    `json:"enabled"`
	MinAmountPaise       int64   `json:"min_amount_paise"`
	ServiceChargePercent float64 `json:"service_charge_percent"`
	Amount               int64   `json:"amount,omitempty"`
	ServiceCharge        int64   `json:"service_charge,omitempty"`
	NetAmount            int64   `json:"net_amount,omitempty"`
}

// P2PTransferRequest is the body for POST /api/v1/p2p/transfer. ReceiverSponsorID
// is the SPF ID displayed on the receiver's profile (e.g. SPF00001). Amount is
// in paise. TransactionPassword must match the sender's stored txn password hash.
type P2PTransferRequest struct {
	ReceiverSponsorID   string `json:"receiver_sponsor_id" validate:"required"`
	Amount              int64  `json:"amount" validate:"required,gt=0"`
	TransactionPassword string `json:"transaction_password" validate:"required"`
	Note                string `json:"note,omitempty"`
}

// UpdateEmailRequest / UpdatePhoneRequest are used to change the networker's
// email or phone after OTP verification on the client. OtpVerified is a
// protocol-level acknowledgement from the UI; when a real OTP backend lands
// it will be replaced by a server-signed verification token. LoginPassword
// is ALWAYS required so a stolen session alone cannot silently move contact
// channels (which are recovery channels for the account).
type UpdateEmailRequest struct {
	NewEmail      string `json:"new_email" validate:"required,email"`
	LoginPassword string `json:"login_password" validate:"required"`
	OtpVerified   bool   `json:"otp_verified"`
}

type UpdatePhoneRequest struct {
	NewPhone      string `json:"new_phone" validate:"required"`
	LoginPassword string `json:"login_password" validate:"required"`
	OtpVerified   bool   `json:"otp_verified"`
}

// UpdatePayoutUPIRequest sets the UPI id used for UPI withdrawals (login re-auth).
type UpdatePayoutUPIRequest struct {
	PayoutUPIID   string `json:"payout_upi_id" validate:"required"`
	LoginPassword string `json:"login_password" validate:"required"`
}

const (
	SourceP2PTransfer = "P2P_TRANSFER"
	RefTypeP2P        = "P2P"

	ConfigP2PEnabled              = "p2p_enabled"
	ConfigP2PMinAmountPaise       = "p2p_min_amount_paise"
	ConfigP2PServiceChargePercent = "p2p_service_charge_percent"
)
