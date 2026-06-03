package repository

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PathRankRepo struct{ db *pgxpool.Pool }

func NewPathRankRepo(db *pgxpool.Pool) *PathRankRepo { return &PathRankRepo{db: db} }

func (r *PathRankRepo) ListSlabs(ctx context.Context) ([]*models.PathRankSlab, error) {
	rows, err := r.db.Query(ctx, `
		SELECT rank_level, name, min_direct_bv_paise, min_lifetime_pairs, is_active, updated_at
		FROM path_rank_slabs
		WHERE is_active = TRUE
		ORDER BY rank_level ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*models.PathRankSlab, 0)
	for rows.Next() {
		s := &models.PathRankSlab{}
		if err := rows.Scan(&s.RankLevel, &s.Name, &s.MinDirectBVPaise, &s.MinLifetimePairs, &s.IsActive, &s.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

// DirectTeamBV returns BV credited to the user's tree from their direct referrals only.
func (r *PathRankRepo) DirectTeamBV(ctx context.Context, userID string) (total, left, right int64, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(bl.bv_amount), 0),
			COALESCE(SUM(CASE WHEN bl.leg = 'LEFT'  THEN bl.bv_amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN bl.leg = 'RIGHT' THEN bl.bv_amount ELSE 0 END), 0)
		FROM bv_ledger bl
		WHERE bl.user_id = $1
		  AND bl.source_user_id IN (
		      SELECT u.user_id FROM networker_users u WHERE u.sponsor_user_id = $1
		  )`, userID).Scan(&total, &left, &right)
	return total, left, right, err
}

func (r *PathRankRepo) CountDirectTeam(ctx context.Context, userID string) (total, active int, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*)::int,
			COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END), 0)::int
		FROM networker_users
		WHERE sponsor_user_id = $1`, userID).Scan(&total, &active)
	return total, active, err
}

func (r *PathRankRepo) LifetimeMatchedBV(ctx context.Context, userID string) (int64, error) {
	var total int64
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(matched_bv), 0)
		FROM pair_match_log WHERE user_id = $1`, userID).Scan(&total)
	return total, err
}

func (r *PathRankRepo) TodayPairCount(ctx context.Context, userID string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(pairs_today, 0)
		FROM daily_pair_stats
		WHERE user_id = $1 AND stat_date = CURRENT_DATE`, userID).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return n, err
}

func (r *PathRankRepo) RecentPairs(ctx context.Context, userID string, limit int) ([]*models.PathRankPairRow, error) {
	if limit <= 0 || limit > 50 {
		limit = 10
	}
	rows, err := r.db.Query(ctx, `
		SELECT id, matched_bv, left_bv_matched, right_bv_matched,
		       carry_forward_bv, carry_forward_leg,
		       total_credited, order_reference, created_at
		FROM pair_match_log
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*models.PathRankPairRow, 0)
	for rows.Next() {
		p := &models.PathRankPairRow{}
		var leg *string
		var orderRef *string
		if err := rows.Scan(
			&p.ID, &p.MatchedBVPaise, &p.LeftBVMatchedPaise, &p.RightBVMatchedPaise,
			&p.CarryForwardBVPaise, &leg,
			&p.TotalCreditedPaise, &orderRef, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		p.CarryForwardLeg = leg
		p.OrderReference = orderRef
		out = append(out, p)
	}
	return out, nil
}
