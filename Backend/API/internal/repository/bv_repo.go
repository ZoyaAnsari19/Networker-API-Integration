package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BVRepo struct{ db *pgxpool.Pool }

func NewBVRepo(db *pgxpool.Pool) *BVRepo { return &BVRepo{db: db} }

func (r *BVRepo) Insert(ctx context.Context, entry *models.BVEntry) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO bv_ledger (user_id, source_user_id, leg, bv_amount, order_reference, status)
		VALUES ($1,$2,$3::tree_leg,$4,$5,$6::bv_status)`,
		entry.UserID, entry.SourceUserID, entry.Leg, entry.BVAmount, entry.OrderReference, entry.Status)
	return err
}

func (r *BVRepo) MarkMatched(ctx context.Context, userID string, leg string, amount int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE bv_ledger SET status = 'MATCHED', matched_at = NOW()
		WHERE id IN (
			SELECT id FROM bv_ledger
			WHERE user_id = $1 AND leg = $2::tree_leg AND status = 'UNMATCHED'
			ORDER BY created_at ASC
			LIMIT (
				SELECT COUNT(*) FROM (
					SELECT id, SUM(bv_amount) OVER (ORDER BY created_at ASC) AS running
					FROM bv_ledger
					WHERE user_id = $1 AND leg = $2::tree_leg AND status = 'UNMATCHED'
				) sub WHERE sub.running <= $3
			)
		)`, userID, leg, amount)
	return err
}

func (r *BVRepo) GetUnmatchedTotal(ctx context.Context, userID, leg string) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(bv_amount), 0)
		FROM bv_ledger
		WHERE user_id = $1 AND leg = $2::tree_leg AND status = 'UNMATCHED'`, userID, leg).Scan(&total)
	return total, err
}
