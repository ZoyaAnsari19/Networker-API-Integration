package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PairRepo struct{ db *pgxpool.Pool }

func NewPairRepo(db *pgxpool.Pool) *PairRepo { return &PairRepo{db: db} }

func (r *PairRepo) InsertMatch(ctx context.Context, log *models.PairMatchLog) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO pair_match_log
			(user_id, left_bv_matched, right_bv_matched, matched_bv,
			 carry_forward_bv, carry_forward_leg,
			 commission_amount, level_bonus_amount, total_credited, cap_deducted, order_reference)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
		log.UserID, log.LeftBVMatched, log.RightBVMatched, log.MatchedBV,
		log.CarryForwardBV, log.CarryForwardLeg,
		log.CommissionAmount, log.LevelBonusAmount, log.TotalCredited, log.CapDeducted, log.OrderReference)
	return err
}

func (r *PairRepo) UpsertDailyStats(ctx context.Context, userID string) (*models.DailyPairStats, error) {
	stats := &models.DailyPairStats{}
	err := r.db.QueryRow(ctx, `
		INSERT INTO daily_pair_stats (user_id, stat_date, pairs_today, total_pairs_lifetime)
		VALUES ($1, CURRENT_DATE, 1, 1)
		ON CONFLICT (user_id, stat_date) DO UPDATE
		SET pairs_today = daily_pair_stats.pairs_today + 1,
		    total_pairs_lifetime = daily_pair_stats.total_pairs_lifetime + 1,
		    updated_at = NOW()
		RETURNING id, user_id, stat_date, pairs_today, total_pairs_lifetime, created_at, updated_at`,
		userID,
	).Scan(&stats.ID, &stats.UserID, &stats.StatDate, &stats.PairsToday, &stats.TotalPairsLifetime, &stats.CreatedAt, &stats.UpdatedAt)
	return stats, err
}

func (r *PairRepo) GetDailyStats(ctx context.Context, userID string) (*models.DailyPairStats, error) {
	stats := &models.DailyPairStats{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, stat_date, pairs_today, total_pairs_lifetime, created_at, updated_at
		FROM daily_pair_stats
		WHERE user_id = $1 AND stat_date = CURRENT_DATE`, userID,
	).Scan(&stats.ID, &stats.UserID, &stats.StatDate, &stats.PairsToday, &stats.TotalPairsLifetime, &stats.CreatedAt, &stats.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return stats, nil
}

func (r *PairRepo) GetLifetimePairs(ctx context.Context, userID string) (int, error) {
	var total int
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(MAX(total_pairs_lifetime), 0)
		FROM daily_pair_stats WHERE user_id = $1`, userID).Scan(&total)
	return total, err
}

func (r *PairRepo) ListMatchLog(ctx context.Context, userID string, page, limit int) ([]*models.PairMatchLog, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM pair_match_log WHERE user_id=$1`, userID).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `
		SELECT id, user_id, left_bv_matched, right_bv_matched, matched_bv,
		       carry_forward_bv, carry_forward_leg,
		       commission_amount, level_bonus_amount, total_credited, cap_deducted,
		       order_reference, created_at
		FROM pair_match_log WHERE user_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*models.PairMatchLog
	for rows.Next() {
		l := &models.PairMatchLog{}
		if err := rows.Scan(&l.ID, &l.UserID, &l.LeftBVMatched, &l.RightBVMatched, &l.MatchedBV,
			&l.CarryForwardBV, &l.CarryForwardLeg,
			&l.CommissionAmount, &l.LevelBonusAmount, &l.TotalCredited, &l.CapDeducted,
			&l.OrderReference, &l.CreatedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}
