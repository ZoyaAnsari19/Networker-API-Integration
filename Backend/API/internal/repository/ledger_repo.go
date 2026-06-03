package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type LedgerRepo struct{ db *pgxpool.Pool }

func NewLedgerRepo(db *pgxpool.Pool) *LedgerRepo { return &LedgerRepo{db: db} }

func (r *LedgerRepo) Credit(ctx context.Context, entry *models.LedgerEntry) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, 'CREDIT'::entry_type, $4::commission_source, $5, $6::reference_type, $7)`,
		entry.UserID, entry.WalletType, entry.Amount, entry.Source, entry.ReferenceID, entry.ReferenceType, entry.Description)
	return err
}

// CreditTx inserts a CREDIT row inside the caller's transaction and returns
// the generated id. Used by the activation service so it can link released
// held_income rows back to the paying ledger entry via `released_ledger_id`.
func (r *LedgerRepo) CreditTx(ctx context.Context, tx pgx.Tx, entry *models.LedgerEntry) (int64, error) {
	var id int64
	err := tx.QueryRow(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, 'CREDIT'::entry_type, $4::commission_source, $5, $6::reference_type, $7)
		RETURNING id`,
		entry.UserID, entry.WalletType, entry.Amount, entry.Source, entry.ReferenceID, entry.ReferenceType, entry.Description,
	).Scan(&id)
	return id, err
}

// HasReferenceTx is the tx-scoped variant of HasReference; used so the
// activation rule's idempotency check runs against the same snapshot as
// the subsequent INSERT.
func (r *LedgerRepo) HasReferenceTx(ctx context.Context, tx pgx.Tx, userID, walletType, source, referenceID string) (bool, error) {
	var exists bool
	err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM wallet_ledger
			WHERE user_id=$1 AND wallet_type=$2::wallet_type AND source=$3::commission_source AND reference_id=$4
		)`, userID, walletType, source, referenceID).Scan(&exists)
	return exists, err
}

func (r *LedgerRepo) Debit(ctx context.Context, entry *models.LedgerEntry) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, 'DEBIT'::entry_type, $4::commission_source, $5, $6::reference_type, $7)`,
		entry.UserID, entry.WalletType, entry.Amount, entry.Source, entry.ReferenceID, entry.ReferenceType, entry.Description)
	return err
}

func (r *LedgerRepo) GetBalance(ctx context.Context, userID, walletType string) (int64, error) {
	var balance int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(
			SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE -amount END), 0
		)
		FROM wallet_ledger
		WHERE user_id = $1 AND wallet_type = $2::wallet_type`, userID, walletType).Scan(&balance)
	return balance, err
}

func (r *LedgerRepo) GetBothBalances(ctx context.Context, userID string) (*models.WalletSummary, error) {
	ws := &models.WalletSummary{}
	rows, err := r.db.Query(ctx, `
		SELECT wallet_type,
		       COALESCE(SUM(CASE WHEN entry_type='CREDIT' THEN amount ELSE -amount END), 0)
		FROM wallet_ledger
		WHERE user_id = $1
		GROUP BY wallet_type`, userID)
	if err != nil {
		return ws, err
	}
	defer rows.Close()

	for rows.Next() {
		var wt string
		var bal int64
		if err := rows.Scan(&wt, &bal); err != nil {
			return ws, err
		}
		switch wt {
		case models.WalletDirect:
			ws.DirectBalance = bal
		case models.WalletTeam:
			ws.TeamBalance = bal
		}
	}
	ws.TotalBalance = ws.DirectBalance + ws.TeamBalance
	return ws, nil
}

func (r *LedgerRepo) GetMonthlyIncome(ctx context.Context, userID string, year int, month int) (int64, error) {
	var income int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0)
		FROM wallet_ledger
		WHERE user_id = $1
		  AND entry_type = 'CREDIT'
		  AND EXTRACT(YEAR FROM created_at) = $2
		  AND EXTRACT(MONTH FROM created_at) = $3`, userID, year, month).Scan(&income)
	return income, err
}

func (r *LedgerRepo) ListByWallet(ctx context.Context, userID, walletType string, page, limit int) ([]*models.LedgerEntry, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM wallet_ledger WHERE user_id=$1 AND wallet_type=$2::wallet_type`, userID, walletType).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT
			wl.id, wl.user_id, wl.wallet_type, wl.amount, wl.entry_type, wl.source,
			wl.reference_id, wl.reference_type, wl.description, payer.payer_name, wl.created_at
		FROM wallet_ledger wl
		LEFT JOIN LATERAL (
			SELECT nu.full_name AS payer_name
			FROM bv_ledger bl
			JOIN networker_users nu ON nu.user_id = bl.source_user_id
			WHERE bl.order_reference = regexp_replace(COALESCE(wl.reference_id, ''), '-franchise$', '')
			ORDER BY bl.created_at DESC
			LIMIT 1
		) payer ON true
		WHERE wl.user_id = $1 AND wl.wallet_type = $2::wallet_type
		ORDER BY wl.created_at DESC
		LIMIT $3 OFFSET $4`, userID, walletType, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []*models.LedgerEntry
	for rows.Next() {
		e := &models.LedgerEntry{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.WalletType, &e.Amount, &e.EntryType, &e.Source, &e.ReferenceID, &e.ReferenceType, &e.Description, &e.PayerName, &e.CreatedAt); err != nil {
			return nil, 0, err
		}
		entries = append(entries, e)
	}
	return entries, total, nil
}

func (r *LedgerRepo) HasReference(ctx context.Context, userID, walletType, source, referenceID string) (bool, error) {
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM wallet_ledger
			WHERE user_id=$1 AND wallet_type=$2::wallet_type AND source=$3::commission_source AND reference_id=$4
		)`, userID, walletType, source, referenceID).Scan(&exists)
	return exists, err
}
