package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// HeldIncomeRepo owns all I/O against `held_income`. HELD rows are created
// inside the same tx as the triggering purchase event so the book is
// internally consistent at every commit boundary.
type HeldIncomeRepo struct{ db *pgxpool.Pool }

func NewHeldIncomeRepo(db *pgxpool.Pool) *HeldIncomeRepo { return &HeldIncomeRepo{db: db} }

// InsertTx creates a new HELD row. `row.ID` and `row.CreatedAt` /
// `row.UpdatedAt` are populated via RETURNING so callers have a stable
// handle for audit logging.
func (r *HeldIncomeRepo) InsertTx(ctx context.Context, tx pgx.Tx, row *models.HeldIncome) error {
	if row.Status == "" {
		row.Status = models.HeldStatusHeld
	}
	return tx.QueryRow(ctx, `
		INSERT INTO held_income (
			user_id, wallet_type, source, amount,
			reference_id, reference_type, description,
			period_ym, status
		) VALUES (
			$1, $2::wallet_type, $3::commission_source, $4,
			$5, $6::reference_type, $7,
			$8, $9::held_income_status
		)
		RETURNING id, created_at, updated_at`,
		row.UserID, row.WalletType, row.Source, row.Amount,
		row.ReferenceID, row.ReferenceType, row.Description,
		row.PeriodYM, row.Status,
	).Scan(&row.ID, &row.CreatedAt, &row.UpdatedAt)
}

// ListHeldForReleaseTx returns all HELD rows for a user in the given
// period, already locked FOR UPDATE so the caller can safely iterate and
// flip each row to RELEASED without racing with another shopping call.
// Results are ordered by `id` (insertion order) so the ledger CREDIT rows
// written on release mirror the chronological order of the commission
// events that produced them.
func (r *HeldIncomeRepo) ListHeldForReleaseTx(ctx context.Context, tx pgx.Tx, userID string, periodYM int) ([]*models.HeldIncome, error) {
	rows, err := tx.Query(ctx, `
		SELECT id, user_id, wallet_type, source, amount,
		       reference_id, reference_type, description,
		       period_ym, status, released_ledger_id,
		       created_at, updated_at
		FROM held_income
		WHERE user_id = $1
		  AND period_ym = $2
		  AND status = 'HELD'::held_income_status
		ORDER BY id
		FOR UPDATE`, userID, periodYM)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*models.HeldIncome, 0)
	for rows.Next() {
		h := &models.HeldIncome{}
		if err := rows.Scan(
			&h.ID, &h.UserID, &h.WalletType, &h.Source, &h.Amount,
			&h.ReferenceID, &h.ReferenceType, &h.Description,
			&h.PeriodYM, &h.Status, &h.ReleasedLedgerID,
			&h.CreatedAt, &h.UpdatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, rows.Err()
}

// MarkReleasedTx flips a single held_income row to RELEASED and records the
// ledger id that paid it out. Caller is expected to have inserted the
// corresponding wallet_ledger CREDIT within the same tx.
func (r *HeldIncomeRepo) MarkReleasedTx(ctx context.Context, tx pgx.Tx, id, ledgerID int64) error {
	_, err := tx.Exec(ctx, `
		UPDATE held_income
		SET status = 'RELEASED'::held_income_status,
		    released_ledger_id = $2,
		    updated_at = NOW()
		WHERE id = $1`, id, ledgerID)
	return err
}

// ForfeitStale is the monthly reaper. It flips every remaining HELD row
// whose period_ym is strictly less than `currentYM` to FORFEITED in one
// bulk UPDATE. Returns the number of rows flipped so the cron can log it.
func (r *HeldIncomeRepo) ForfeitStale(ctx context.Context, currentYM int) (int64, error) {
	tag, err := r.db.Exec(ctx, `
		UPDATE held_income
		SET status = 'FORFEITED'::held_income_status,
		    updated_at = NOW()
		WHERE status = 'HELD'::held_income_status
		  AND period_ym < $1`, currentYM)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// CountForUser is a read-only helper that the /me profile and E2E tests
// can use to show the user how many rows are currently held / released /
// forfeited for the current month.
func (r *HeldIncomeRepo) CountForUser(ctx context.Context, userID string, periodYM int) (held, released, forfeited int, heldAmount int64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT
		  COUNT(*) FILTER (WHERE status = 'HELD'::held_income_status),
		  COUNT(*) FILTER (WHERE status = 'RELEASED'::held_income_status),
		  COUNT(*) FILTER (WHERE status = 'FORFEITED'::held_income_status),
		  COALESCE(SUM(amount) FILTER (WHERE status = 'HELD'::held_income_status), 0)
		FROM held_income
		WHERE user_id = $1 AND period_ym = $2`, userID, periodYM,
	).Scan(&held, &released, &forfeited, &heldAmount)
	return
}
