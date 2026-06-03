package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// P2PService handles peer-to-peer (networker → networker) transfers.
//
// Invariants enforced in every transfer:
//   - sender & receiver are both ACTIVE networker users and not the same user
//   - p2p_enabled config is true
//   - gross amount ≥ configured minimum
//   - sender has a stored transaction password and the supplied one matches
//   - sender's DIRECT (Main) wallet balance ≥ amount at the moment of debit
//   - debit(sender), credit(receiver) and p2p_transfers insert happen in the
//     same pg transaction; a per-sender advisory lock serializes concurrent
//     transfers from the same sender so two parallel requests cannot both
//     pass the balance check and overdraft
type P2PService struct {
	db          *pgxpool.Pool
	p2pRepo     *repository.P2PRepo
	ledgerRepo  *repository.LedgerRepo
	userRepo    *repository.UserRepo
	configRepo  *repository.ConfigRepo
	authService *AuthService
}

func NewP2PService(
	db *pgxpool.Pool,
	p2pRepo *repository.P2PRepo,
	ledgerRepo *repository.LedgerRepo,
	userRepo *repository.UserRepo,
	configRepo *repository.ConfigRepo,
	authService *AuthService,
) *P2PService {
	return &P2PService{
		db:          db,
		p2pRepo:     p2pRepo,
		ledgerRepo:  ledgerRepo,
		userRepo:    userRepo,
		configRepo:  configRepo,
		authService: authService,
	}
}

// Lookup resolves a receiver by sponsor_id (SPF code) and reports whether the
// target is eligible to receive P2P funds. Sender self-transfer is rejected
// here so the UI can show an inline error before the user fills the amount.
func (s *P2PService) Lookup(ctx context.Context, senderUserID, receiverSponsorID string) (*models.P2PLookupResponse, error) {
	spf := strings.TrimSpace(strings.ToUpper(receiverSponsorID))
	if spf == "" {
		return nil, errors.New("receiver_sponsor_id is required")
	}
	receiver, err := s.userRepo.GetBySponsorID(ctx, spf)
	if err != nil {
		return &models.P2PLookupResponse{
			SponsorID: spf,
			Eligible:  false,
			Reason:    "receiver not found",
		}, nil
	}

	resp := &models.P2PLookupResponse{
		SponsorID: receiver.SponsorID,
		FullName:  receiver.FullName,
		Status:    receiver.Status,
		Eligible:  true,
	}
	if receiver.Role != models.RoleNetworker {
		resp.Eligible = false
		resp.Reason = "receiver is not a networker"
		return resp, nil
	}
	if receiver.UserID == senderUserID {
		resp.Eligible = false
		resp.Reason = "you cannot transfer to yourself"
		return resp, nil
	}
	if receiver.Status != models.UserStatusActive {
		resp.Eligible = false
		resp.Reason = "receiver account is not active"
		return resp, nil
	}
	return resp, nil
}

// Quote returns the platform P2P config and, if amount > 0, the computed
// fee and net credited. The UI calls this to render the service-charge line
// before the user confirms.
func (s *P2PService) Quote(ctx context.Context, amount int64) (*models.P2PQuoteResponse, error) {
	enabled, _ := s.getEnabled(ctx)
	minAmt, _ := s.getMinAmountPaise(ctx)
	pct, _ := s.getServiceChargePercent(ctx)

	out := &models.P2PQuoteResponse{
		Enabled:              enabled,
		MinAmountPaise:       minAmt,
		ServiceChargePercent: pct,
	}
	if amount > 0 {
		charge := calcServiceCharge(amount, pct)
		out.Amount = amount
		out.ServiceCharge = charge
		out.NetAmount = amount - charge
	}
	return out, nil
}

// Transfer executes a full P2P transfer atomically. Returns the persisted
// P2PTransfer row (with transfer_id + ledger ids populated) on success.
func (s *P2PService) Transfer(ctx context.Context, senderUserID string, req *models.P2PTransferRequest) (*models.P2PTransfer, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than zero")
	}

	enabled, err := s.getEnabled(ctx)
	if err == nil && !enabled {
		return nil, errors.New("P2P transfers are currently disabled")
	}
	minAmt, _ := s.getMinAmountPaise(ctx)
	if req.Amount < minAmt {
		return nil, errors.New("amount is below the minimum P2P transfer limit")
	}

	pct, _ := s.getServiceChargePercent(ctx)
	charge := calcServiceCharge(req.Amount, pct)
	netAmount := req.Amount - charge
	if netAmount <= 0 {
		return nil, errors.New("amount too small after service charge")
	}

	sender, err := s.userRepo.GetByID(ctx, senderUserID)
	if err != nil {
		return nil, errors.New("sender not found")
	}
	if sender.Status != models.UserStatusActive {
		return nil, errors.New("your account must be ACTIVE to send P2P transfers")
	}

	receiverSPF := strings.TrimSpace(strings.ToUpper(req.ReceiverSponsorID))
	if receiverSPF == "" {
		return nil, errors.New("receiver sponsor id is required")
	}
	receiver, err := s.userRepo.GetBySponsorID(ctx, receiverSPF)
	if err != nil {
		return nil, errors.New("receiver not found")
	}
	if receiver.UserID == senderUserID {
		return nil, errors.New("you cannot transfer to yourself")
	}
	if receiver.Role != models.RoleNetworker {
		return nil, errors.New("receiver is not a networker")
	}
	if receiver.Status != models.UserStatusActive {
		return nil, errors.New("receiver account is not active")
	}

	if err := s.authService.VerifyTransactionPassword(ctx, senderUserID, req.TransactionPassword); err != nil {
		return nil, err
	}

	walletType := models.WalletDirect

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Per-sender advisory lock keeps concurrent transfers from the same
	// sender serialized; receivers can still get credited in parallel.
	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('p2p:' || $1))`, senderUserID); err != nil {
		return nil, err
	}

	var senderBalance int64
	if err := tx.QueryRow(ctx, `
		SELECT COALESCE(SUM(CASE WHEN entry_type='CREDIT' THEN amount ELSE -amount END), 0)
		FROM wallet_ledger WHERE user_id = $1 AND wallet_type = $2::wallet_type`,
		senderUserID, walletType,
	).Scan(&senderBalance); err != nil {
		return nil, err
	}
	if senderBalance < req.Amount {
		return nil, errors.New("insufficient wallet balance")
	}

	transferPlaceholder := "pending"
	description := "P2P transfer to " + receiver.SponsorID
	var debitID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, 'DEBIT'::entry_type, $4::commission_source, $5, $6::reference_type, $7)
		RETURNING id`,
		senderUserID, walletType, req.Amount, models.SourceP2PTransfer,
		transferPlaceholder, models.RefTypeP2P, description,
	).Scan(&debitID); err != nil {
		return nil, err
	}

	creditDesc := "P2P transfer from " + sender.SponsorID
	var creditID int64
	if err := tx.QueryRow(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, 'CREDIT'::entry_type, $4::commission_source, $5, $6::reference_type, $7)
		RETURNING id`,
		receiver.UserID, walletType, netAmount, models.SourceP2PTransfer,
		transferPlaceholder, models.RefTypeP2P, creditDesc,
	).Scan(&creditID); err != nil {
		return nil, err
	}

	note := strings.TrimSpace(req.Note)
	var notePtr *string
	if note != "" {
		notePtr = &note
	}

	t := &models.P2PTransfer{
		SenderUserID:      senderUserID,
		ReceiverUserID:    receiver.UserID,
		SenderSponsorID:   sender.SponsorID,
		ReceiverSponsorID: receiver.SponsorID,
		WalletType:        walletType,
		Amount:            req.Amount,
		ServiceCharge:     charge,
		NetAmount:         netAmount,
		Note:              notePtr,
		DebitLedgerID:     &debitID,
		CreditLedgerID:    &creditID,
	}
	if err := s.p2pRepo.InsertTx(ctx, tx, t); err != nil {
		return nil, err
	}

	// Now that transfer_id is known, patch the ledger rows to point back
	// to it (so admin UIs can follow the link).
	if _, err := tx.Exec(ctx,
		`UPDATE wallet_ledger SET reference_id = $1 WHERE id IN ($2, $3)`,
		t.TransferID, debitID, creditID,
	); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	t.Direction = "OUT"
	t.CounterpartyName = receiver.FullName
	return t, nil
}

// ListForUser returns paginated P2P history for the current user (both IN
// and OUT), newest first.
func (s *P2PService) ListForUser(ctx context.Context, userID string, page, limit int) ([]*models.P2PTransfer, int64, error) {
	return s.p2pRepo.ListForUser(ctx, userID, page, limit)
}

// calcServiceCharge uses integer math on paise so we never produce a
// fractional charge. Rounds half-to-even (banker's rounding) via int
// truncation; for e.g. amount=12345 at 2.5% → 12345*25/1000=308 paise.
func calcServiceCharge(amount int64, pct float64) int64 {
	if pct <= 0 || amount <= 0 {
		return 0
	}
	// Convert to basis points (1/100 of a percent) and do pure int math
	// to avoid float drift: 2.5% → 250 bp; charge = amount*bp/10000.
	bp := int64(pct * 100)
	if bp <= 0 {
		return 0
	}
	return amount * bp / 10000
}

func (s *P2PService) getEnabled(ctx context.Context) (bool, error) {
	cfg, err := s.configRepo.GetCommission(ctx, models.ConfigP2PEnabled)
	if err != nil {
		return true, nil
	}
	var v struct {
		Value bool `json:"value"`
	}
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return true, nil
	}
	return v.Value, nil
}

func (s *P2PService) getMinAmountPaise(ctx context.Context) (int64, error) {
	cfg, err := s.configRepo.GetCommission(ctx, models.ConfigP2PMinAmountPaise)
	if err != nil {
		return 10000, nil
	}
	var v struct {
		Value int64 `json:"value"`
	}
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return 10000, nil
	}
	return v.Value, nil
}

func (s *P2PService) getServiceChargePercent(ctx context.Context) (float64, error) {
	cfg, err := s.configRepo.GetCommission(ctx, models.ConfigP2PServiceChargePercent)
	if err != nil {
		return 2, nil
	}
	var v struct {
		Value float64 `json:"value"`
	}
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return 2, nil
	}
	return v.Value, nil
}
