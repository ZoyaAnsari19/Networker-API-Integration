package repository

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type LeaderboardScope string
type LeaderboardPeriod string

const (
	LeaderboardScopeDirect LeaderboardScope = "direct"
	LeaderboardScopeBinary LeaderboardScope = "binary"
	LeaderboardScopeTeam   LeaderboardScope = "team"

	LeaderboardPeriodAll   LeaderboardPeriod = "all"
	LeaderboardPeriodWeek  LeaderboardPeriod = "week"
	LeaderboardPeriodMonth LeaderboardPeriod = "month"
)

type LeaderboardRow struct {
	Rank             int
	UserID           string
	FullName         string
	SponsorID        string
	AvatarObjectKey          *string
	AdminTitle               *string
	AdminTitleImageObjectKey *string
	PackageName      *string
	PackageAmount    int64
	PackageActivated *time.Time
	JoinedAt         time.Time
	PlacementLeg     *string
	ScorePaise       int64
	DirectBVAllTime  int64
	DirectLeftBV     int64
	DirectRightBV    int64
	DirectCount      int
	ActiveDirectCount int
	LifetimePairs    int
	TodayPairs       int
	LifetimeMatched  int64
	MatchedInPeriod  int64
	LeftPipeline     int64
	RightPipeline    int64
}

type LeaderboardMyRankResult struct {
	Rank             int
	ScorePaise       int64
	TotalRanked      int
	LeaderScorePaise int64
	GapToNextPaise   int64
}

type LeaderboardRepo struct{ db *pgxpool.Pool }

func NewLeaderboardRepo(db *pgxpool.Pool) *LeaderboardRepo { return &LeaderboardRepo{db: db} }

var istLocation = func() *time.Location {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		return time.FixedZone("IST", 5*3600+30*60)
	}
	return loc
}()

// PeriodBounds returns optional UTC start for filtering and a display label (IST calendar).
func PeriodBounds(period LeaderboardPeriod, now time.Time) (*time.Time, string) {
	n := now.In(istLocation)
	switch period {
	case LeaderboardPeriodMonth:
		start := time.Date(n.Year(), n.Month(), 1, 0, 0, 0, 0, istLocation)
		return &start, n.Format("January 2006")
	case LeaderboardPeriodWeek:
		wd := int(n.Weekday())
		if wd == 0 {
			wd = 7
		}
		daysFromMonday := wd - 1
		start := time.Date(n.Year(), n.Month(), n.Day()-daysFromMonday, 0, 0, 0, 0, istLocation)
		return &start, "This week"
	default:
		return nil, "All time"
	}
}

func (r *LeaderboardRepo) ListTop(
	ctx context.Context,
	scope LeaderboardScope,
	period LeaderboardPeriod,
	periodStart *time.Time,
	limit, offset int,
) ([]LeaderboardRow, error) {
	join, scoreExpr, periodCol := scopeSQLParts(scope)
	periodFilter := ""
	var args []any
	limitParam, offsetParam := 1, 2
	if periodStart != nil {
		periodFilter = fmt.Sprintf(" AND %s.created_at >= $1", periodCol)
		args = []any{periodStart.UTC(), limit, offset}
		limitParam, offsetParam = 2, 3
	} else {
		args = []any{limit, offset}
	}

	matchedPeriodFilter := matchedBVPeriodFilter(periodStart)

	query := fmt.Sprintf(`
		WITH scores AS (
			SELECT
				u.user_id,
				u.full_name,
				u.sponsor_id,
				u.avatar_object_key,
				u.admin_title,
				u.admin_title_image_object_key,
				u.created_at AS joined_at,
				u.package_activated_at,
				p.name AS package_name,
				COALESCE(p.amount, 0) AS package_amount_paise,
				bt.leg AS placement_leg,
				COALESCE(bt.left_bv, 0) AS left_pipeline_paise,
				COALESCE(bt.right_bv, 0) AS right_pipeline_paise,
				%s AS score_paise,
				(
					SELECT COALESCE(SUM(bl2.bv_amount), 0)
					FROM bv_ledger bl2
					WHERE bl2.user_id = u.user_id
					  AND bl2.source_user_id IN (
					      SELECT d.user_id FROM networker_users d WHERE d.sponsor_user_id = u.user_id
					  )
				) AS direct_bv_alltime,
				(
					SELECT COALESCE(SUM(CASE WHEN bl2.leg = 'LEFT'  THEN bl2.bv_amount ELSE 0 END), 0)
					FROM bv_ledger bl2
					WHERE bl2.user_id = u.user_id
					  AND bl2.source_user_id IN (
					      SELECT d.user_id FROM networker_users d WHERE d.sponsor_user_id = u.user_id
					  )
				) AS direct_left_bv_alltime,
				(
					SELECT COALESCE(SUM(CASE WHEN bl2.leg = 'RIGHT' THEN bl2.bv_amount ELSE 0 END), 0)
					FROM bv_ledger bl2
					WHERE bl2.user_id = u.user_id
					  AND bl2.source_user_id IN (
					      SELECT d.user_id FROM networker_users d WHERE d.sponsor_user_id = u.user_id
					  )
				) AS direct_right_bv_alltime,
				(
					SELECT COUNT(*)::int FROM networker_users d WHERE d.sponsor_user_id = u.user_id
				) AS direct_count,
				(
					SELECT COALESCE(SUM(CASE WHEN d.status = 'ACTIVE' THEN 1 ELSE 0 END), 0)::int
					FROM networker_users d WHERE d.sponsor_user_id = u.user_id
				) AS active_direct_count,
				(
					SELECT COALESCE(MAX(dps.total_pairs_lifetime), 0)
					FROM daily_pair_stats dps
					WHERE dps.user_id = u.user_id
				) AS lifetime_pairs,
				COALESCE((
					SELECT dps.pairs_today
					FROM daily_pair_stats dps
					WHERE dps.user_id = u.user_id AND dps.stat_date = CURRENT_DATE
				), 0) AS today_pairs,
				(
					SELECT COALESCE(SUM(pml.matched_bv), 0)
					FROM pair_match_log pml
					WHERE pml.user_id = u.user_id
				) AS lifetime_matched_bv,
				(
					SELECT COALESCE(SUM(pml.matched_bv), 0)
					FROM pair_match_log pml
					WHERE pml.user_id = u.user_id
					%s
				) AS matched_bv_in_period
			FROM networker_users u
			LEFT JOIN packages p ON p.package_id = u.current_package_id
			LEFT JOIN binary_tree bt ON bt.user_id = u.user_id
			%s
			WHERE u.status = 'ACTIVE'
			  AND u.current_package_id IS NOT NULL
			  AND u.role = 'NETWORKER'
			%s
			GROUP BY u.user_id, u.full_name, u.sponsor_id, u.avatar_object_key,
				u.admin_title, u.admin_title_image_object_key,
				u.created_at, u.package_activated_at, p.name, p.amount,
				bt.leg, bt.left_bv, bt.right_bv
			HAVING %s > 0
		)
		SELECT
			(ROW_NUMBER() OVER (ORDER BY score_paise DESC) + %d)::int AS rank,
			user_id, full_name, sponsor_id, avatar_object_key, admin_title, admin_title_image_object_key,
			package_name,
			package_amount_paise, package_activated_at, joined_at, placement_leg,
			score_paise, direct_bv_alltime, direct_left_bv_alltime, direct_right_bv_alltime,
			direct_count, active_direct_count, lifetime_pairs, today_pairs,
			lifetime_matched_bv, matched_bv_in_period,
			left_pipeline_paise, right_pipeline_paise
		FROM scores
		ORDER BY rank
		LIMIT $%d OFFSET $%d`,
		scoreExpr, matchedPeriodFilter, join, periodFilter, scoreExpr,
		offset, limitParam, offsetParam,
	)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]LeaderboardRow, 0)
	for rows.Next() {
		var row LeaderboardRow
		var pkg *string
		var leg *string
		if err := rows.Scan(
			&row.Rank, &row.UserID, &row.FullName, &row.SponsorID,
			&row.AvatarObjectKey, &row.AdminTitle, &row.AdminTitleImageObjectKey,
			&pkg, &row.PackageAmount, &row.PackageActivated,
			&row.JoinedAt, &leg, &row.ScorePaise,
			&row.DirectBVAllTime, &row.DirectLeftBV, &row.DirectRightBV,
			&row.DirectCount, &row.ActiveDirectCount, &row.LifetimePairs, &row.TodayPairs,
			&row.LifetimeMatched, &row.MatchedInPeriod,
			&row.LeftPipeline, &row.RightPipeline,
		); err != nil {
			return nil, err
		}
		row.PackageName = pkg
		row.PlacementLeg = leg
		out = append(out, row)
	}
	return out, rows.Err()
}

func matchedBVPeriodFilter(periodStart *time.Time) string {
	if periodStart == nil {
		return ""
	}
	return " AND pml.created_at >= $1"
}

func (r *LeaderboardRepo) GetMyRank(
	ctx context.Context,
	viewerID string,
	scope LeaderboardScope,
	period LeaderboardPeriod,
	periodStart *time.Time,
) (*LeaderboardMyRankResult, error) {
	join, scoreExpr, periodCol := scopeSQLParts(scope)
	periodFilter := ""
	args := []any{viewerID}
	if periodStart != nil {
		periodFilter = fmt.Sprintf(" AND %s.created_at >= $2", periodCol)
		args = append(args, periodStart.UTC())
	}

	query := fmt.Sprintf(`
		WITH scores AS (
			SELECT
				u.user_id,
				%s AS score_paise
			FROM networker_users u
			%s
			WHERE u.status = 'ACTIVE'
			  AND u.current_package_id IS NOT NULL
			  AND u.role = 'NETWORKER'
			%s
			GROUP BY u.user_id
			HAVING %s > 0
		),
		totals AS (
			SELECT COUNT(*)::int AS total FROM scores
		),
		mine AS (
			SELECT score_paise FROM scores WHERE user_id = $1
		),
		leader AS (
			SELECT COALESCE(MAX(score_paise), 0) AS v FROM scores
		),
		above AS (
			SELECT MIN(s.score_paise) AS v
			FROM scores s, mine m
			WHERE s.score_paise > m.score_paise
		)
		SELECT
			CASE WHEN (SELECT score_paise FROM mine) IS NULL THEN 0
			     ELSE (SELECT COUNT(*)::int + 1 FROM scores s, mine m WHERE s.score_paise > m.score_paise)
			END,
			COALESCE((SELECT score_paise FROM mine), 0),
			(SELECT total FROM totals),
			(SELECT v FROM leader),
			GREATEST(
				COALESCE((SELECT v FROM above), 0) - COALESCE((SELECT score_paise FROM mine), 0),
				0
			)`,
		scoreExpr, join, periodFilter, scoreExpr,
	)

	res := &LeaderboardMyRankResult{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&res.Rank, &res.ScorePaise, &res.TotalRanked, &res.LeaderScorePaise, &res.GapToNextPaise,
	)
	if err != nil {
		return nil, err
	}
	return res, nil
}

func scopeSQLParts(scope LeaderboardScope) (join, scoreExpr, periodCol string) {
	switch scope {
	case LeaderboardScopeBinary:
		join = `LEFT JOIN pair_match_log bl ON bl.user_id = u.user_id`
		scoreExpr = `COALESCE(SUM(bl.matched_bv), 0)`
		periodCol = "bl"
	case LeaderboardScopeTeam:
		join = `LEFT JOIN bv_ledger bl ON bl.user_id = u.user_id`
		scoreExpr = `COALESCE(SUM(bl.bv_amount), 0)`
		periodCol = "bl"
	default:
		join = `LEFT JOIN bv_ledger bl ON bl.user_id = u.user_id
			AND bl.source_user_id IN (
			    SELECT d.user_id FROM networker_users d WHERE d.sponsor_user_id = u.user_id
			)`
		scoreExpr = `COALESCE(SUM(bl.bv_amount), 0)`
		periodCol = "bl"
	}
	return join, scoreExpr, periodCol
}

func ParseLeaderboardScope(s string) (LeaderboardScope, error) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "direct", "":
		return LeaderboardScopeDirect, nil
	case "binary":
		return LeaderboardScopeBinary, nil
	case "team":
		return LeaderboardScopeTeam, nil
	default:
		return "", fmt.Errorf("invalid scope")
	}
}

func ParseLeaderboardPeriod(s string) (LeaderboardPeriod, error) {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "all", "":
		return LeaderboardPeriodAll, nil
	case "week":
		return LeaderboardPeriodWeek, nil
	case "month":
		return LeaderboardPeriodMonth, nil
	default:
		return "", fmt.Errorf("invalid period")
	}
}
