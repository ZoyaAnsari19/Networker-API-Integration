package repository

import (
	"context"
	"fmcg-binary/internal/models"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PlacementRepo struct{ db *pgxpool.Pool }

func NewPlacementRepo(db *pgxpool.Pool) *PlacementRepo { return &PlacementRepo{db: db} }

func (r *PlacementRepo) CreateRequest(ctx context.Context, pr *models.PlacementRequest) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO placement_requests (id, user_id, sponsor_user_id, status, expires_at)
		VALUES ($1, $2, $3, $4, $5)`,
		pr.ID, pr.UserID, pr.SponsorUserID, pr.Status, pr.ExpiresAt)
	return err
}

func (r *PlacementRepo) GetByID(ctx context.Context, id string) (*models.PlacementRequest, error) {
	pr := &models.PlacementRequest{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, sponsor_user_id, status, decided_leg, decided_by,
		       expires_at, decided_at, created_at
		FROM placement_requests WHERE id = $1`, id,
	).Scan(&pr.ID, &pr.UserID, &pr.SponsorUserID, &pr.Status, &pr.DecidedLeg,
		&pr.DecidedBy, &pr.ExpiresAt, &pr.DecidedAt, &pr.CreatedAt)
	if err != nil {
		return nil, err
	}
	return pr, nil
}

func (r *PlacementRepo) ListBySponsor(ctx context.Context, sponsorID, status string) ([]*models.PlacementRequest, error) {
	q := `SELECT id, user_id, sponsor_user_id, status, decided_leg, decided_by,
	             expires_at, decided_at, created_at
	      FROM placement_requests
	      WHERE sponsor_user_id = $1`
	args := []any{sponsorID}
	if status != "" {
		q += ` AND status = $2::placement_request_status`
		args = append(args, status)
	}
	q += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.PlacementRequest
	for rows.Next() {
		pr := &models.PlacementRequest{}
		if err := rows.Scan(&pr.ID, &pr.UserID, &pr.SponsorUserID, &pr.Status,
			&pr.DecidedLeg, &pr.DecidedBy, &pr.ExpiresAt, &pr.DecidedAt, &pr.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, pr)
	}
	return list, nil
}

func (r *PlacementRepo) ListAll(ctx context.Context, status string) ([]*models.PlacementRequest, error) {
	q := `SELECT id, user_id, sponsor_user_id, status, decided_leg, decided_by,
	             expires_at, decided_at, created_at
	      FROM placement_requests`
	var args []any
	if status != "" {
		q += ` WHERE status = $1::placement_request_status`
		args = append(args, status)
	}
	q += ` ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.PlacementRequest
	for rows.Next() {
		pr := &models.PlacementRequest{}
		if err := rows.Scan(&pr.ID, &pr.UserID, &pr.SponsorUserID, &pr.Status,
			&pr.DecidedLeg, &pr.DecidedBy, &pr.ExpiresAt, &pr.DecidedAt, &pr.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, pr)
	}
	return list, nil
}

func (r *PlacementRepo) Decide(ctx context.Context, id, leg, decidedBy, status string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE placement_requests
		SET status = $2::placement_request_status, decided_leg = $3::tree_leg,
		    decided_by = $4, decided_at = $5
		WHERE id = $1`, id, status, leg, decidedBy, now)
	return err
}

func (r *PlacementRepo) FindExpired(ctx context.Context) ([]*models.PlacementRequest, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, sponsor_user_id, status, decided_leg, decided_by,
		       expires_at, decided_at, created_at
		FROM placement_requests
		WHERE status = 'PENDING' AND expires_at <= NOW()
		ORDER BY expires_at ASC
		FOR UPDATE SKIP LOCKED`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.PlacementRequest
	for rows.Next() {
		pr := &models.PlacementRequest{}
		if err := rows.Scan(&pr.ID, &pr.UserID, &pr.SponsorUserID, &pr.Status,
			&pr.DecidedLeg, &pr.DecidedBy, &pr.ExpiresAt, &pr.DecidedAt, &pr.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, pr)
	}
	return list, nil
}

func (r *PlacementRepo) InsertBVHold(ctx context.Context, h *models.PendingBVHold) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO pending_bv_hold (source_user_id, order_reference, bv_amount, status)
		VALUES ($1, $2, $3, $4)`,
		h.SourceUserID, h.OrderReference, h.BVAmount, h.Status)
	return err
}

func (r *PlacementRepo) GetHeldBV(ctx context.Context, sourceUserID string) ([]*models.PendingBVHold, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, source_user_id, order_reference, bv_amount, status, created_at, released_at
		FROM pending_bv_hold
		WHERE source_user_id = $1 AND status = 'HELD'
		ORDER BY id ASC`, sourceUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []*models.PendingBVHold
	for rows.Next() {
		h := &models.PendingBVHold{}
		if err := rows.Scan(&h.ID, &h.SourceUserID, &h.OrderReference, &h.BVAmount,
			&h.Status, &h.CreatedAt, &h.ReleasedAt); err != nil {
			return nil, err
		}
		list = append(list, h)
	}
	return list, nil
}

func (r *PlacementRepo) ReleaseBVHold(ctx context.Context, id int64) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE pending_bv_hold
		SET status = 'RELEASED', released_at = $2
		WHERE id = $1`, id, now)
	return err
}

func (r *PlacementRepo) CumulativeSubtreeBV(ctx context.Context, rootUserID string) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `
		WITH RECURSIVE subtree AS (
			SELECT user_id, left_bv, right_bv
			FROM binary_tree WHERE user_id = $1
			UNION ALL
			SELECT t.user_id, t.left_bv, t.right_bv
			FROM binary_tree t
			JOIN subtree s ON t.parent_id = s.user_id
		)
		SELECT COALESCE(SUM(left_bv + right_bv), 0) FROM subtree`, rootUserID).Scan(&total)
	return total, err
}
