package models

import "time"

type LedgerEntry struct {
	ID            int64     `json:"id"`
	UserID        string    `json:"user_id"`
	WalletType    string    `json:"wallet_type"`
	Amount        int64     `json:"amount"`
	EntryType     string    `json:"entry_type"`
	Source        string    `json:"source"`
	ReferenceID   *string   `json:"reference_id,omitempty"`
	ReferenceType *string   `json:"reference_type,omitempty"`
	Description   *string   `json:"description,omitempty"`
	PayerName     *string   `json:"payer_name,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
}

type WalletBalance struct {
	WalletType string `json:"wallet_type"`
	Balance    int64  `json:"balance"`
}

type WalletSummary struct {
	DirectBalance int64 `json:"direct_balance"`
	TeamBalance   int64 `json:"team_balance"`
	TotalBalance  int64 `json:"total_balance"`
}

const (
	WalletDirect = "DIRECT"
	WalletTeam   = "TEAM"

	EntryCredit = "CREDIT"
	EntryDebit  = "DEBIT"

	SourceDirectCommission    = "DIRECT_COMMISSION"
	SourceBinaryMatch         = "BINARY_MATCH"
	SourceLevelBonus          = "LEVEL_BONUS"
	SourceFranchiseCommission = "FRANCHISE_COMMISSION"
	SourceWithdrawal          = "WITHDRAWAL"
	SourceAdminAdjustment     = "ADMIN_ADJUSTMENT"
	// SourceP2PTransfer tags ledger entries produced by peer-to-peer
	// transfers (networker → networker). See models/p2p.go for details.

	RefTypePurchase          = "PURCHASE"
	RefTypePayout            = "PAYOUT"
	RefTypeAdmin             = "ADMIN"
	RefTypePackageActivation = "PACKAGE_ACTIVATION"
	// RefTypeP2P links a ledger row back to a p2p_transfers row.
)
