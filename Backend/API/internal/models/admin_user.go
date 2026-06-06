package models

// AdminUpdateUserStatusRequest changes a networker's account status.
type AdminUpdateUserStatusRequest struct {
	Status    string  `json:"status"`
	AdminNote *string `json:"admin_note,omitempty"`
}

// AdminWalletAdjustRequest credits or debits a networker wallet (ADMIN_ADJUSTMENT).
type AdminWalletAdjustRequest struct {
	WalletType string  `json:"wallet_type"`
	EntryType  string  `json:"entry_type"`
	Amount     int64   `json:"amount"`
	Reason     string  `json:"reason"`
	AdminNote  *string `json:"admin_note,omitempty"`
}

// AdminUserWalletSummary is returned by GET /admin/users/:id/wallets.
type AdminUserWalletSummary struct {
	UserID        string `json:"user_id"`
	SponsorID     string `json:"sponsor_id"`
	DirectBalance int64  `json:"direct_balance"`
	TeamBalance   int64  `json:"team_balance"`
	TotalBalance  int64  `json:"total_balance"`
}

// AdminWalletAdjustResult is returned after a successful adjustment.
type AdminWalletAdjustResult struct {
	LedgerID      int64  `json:"ledger_id"`
	UserID        string `json:"user_id"`
	WalletType    string `json:"wallet_type"`
	EntryType     string `json:"entry_type"`
	Amount        int64  `json:"amount"`
	DirectBalance int64  `json:"direct_balance"`
	TeamBalance   int64  `json:"team_balance"`
	TotalBalance  int64  `json:"total_balance"`
}
