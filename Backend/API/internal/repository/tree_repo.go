package repository

import (
	"context"
	"fmcg-binary/internal/models"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type TreeRepo struct{ db *pgxpool.Pool }

func NewTreeRepo(db *pgxpool.Pool) *TreeRepo { return &TreeRepo{db: db} }

func (r *TreeRepo) Insert(ctx context.Context, node *models.TreeNode) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO binary_tree (user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv)
		VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		node.UserID, node.ParentID, node.Leg, node.LeftChildID, node.RightChildID, node.LeftBV, node.RightBV)
	return err
}

func (r *TreeRepo) GetByUserID(ctx context.Context, userID string) (*models.TreeNode, error) {
	n := &models.TreeNode{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at
		FROM binary_tree WHERE user_id = $1`, userID,
	).Scan(&n.ID, &n.UserID, &n.ParentID, &n.Leg, &n.LeftChildID, &n.RightChildID, &n.LeftBV, &n.RightBV, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *TreeRepo) SetLeftChild(ctx context.Context, parentID, childID string) error {
	_, err := r.db.Exec(ctx, `UPDATE binary_tree SET left_child_id = $2 WHERE user_id = $1`, parentID, childID)
	return err
}

func (r *TreeRepo) SetRightChild(ctx context.Context, parentID, childID string) error {
	_, err := r.db.Exec(ctx, `UPDATE binary_tree SET right_child_id = $2 WHERE user_id = $1`, parentID, childID)
	return err
}

func (r *TreeRepo) AddLeftBV(ctx context.Context, userID string, bv int64) error {
	_, err := r.db.Exec(ctx, `UPDATE binary_tree SET left_bv = left_bv + $2 WHERE user_id = $1`, userID, bv)
	return err
}

func (r *TreeRepo) AddRightBV(ctx context.Context, userID string, bv int64) error {
	_, err := r.db.Exec(ctx, `UPDATE binary_tree SET right_bv = right_bv + $2 WHERE user_id = $1`, userID, bv)
	return err
}

func (r *TreeRepo) ConsumeBV(ctx context.Context, userID string, leftConsume, rightConsume int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE binary_tree
		SET left_bv = left_bv - $2, right_bv = right_bv - $3
		WHERE user_id = $1`, userID, leftConsume, rightConsume)
	return err
}

func (r *TreeRepo) FlushAllBV(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `UPDATE binary_tree SET left_bv = 0, right_bv = 0`)
	return err
}

func (r *TreeRepo) GetAncestors(ctx context.Context, userID string, maxDepth int) ([]*models.TreeNode, error) {
	rows, err := r.db.Query(ctx, `
		WITH RECURSIVE chain AS (
			SELECT id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at, 1 AS depth
			FROM binary_tree WHERE user_id = $1
			UNION ALL
			SELECT t.id, t.user_id, t.parent_id, t.leg, t.left_child_id, t.right_child_id, t.left_bv, t.right_bv, t.created_at, c.depth + 1
			FROM binary_tree t
			JOIN chain c ON t.user_id = c.parent_id
			WHERE c.depth < $2
		)
		SELECT id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at
		FROM chain
		WHERE user_id != $1
		ORDER BY depth ASC`, userID, maxDepth+1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []*models.TreeNode
	for rows.Next() {
		n := &models.TreeNode{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.ParentID, &n.Leg, &n.LeftChildID, &n.RightChildID, &n.LeftBV, &n.RightBV, &n.CreatedAt); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}

// GetTeamSide returns every descendant of `sponsorID` that sits on the given
// `leg` (LEFT or RIGHT) relative to that sponsor. `volume` on each row is the
// BV flowing under that member (`binary_tree.left_bv + right_bv`).
func (r *TreeRepo) GetTeamSide(ctx context.Context, sponsorID, leg string, limit, offset int) ([]*models.TeamMember, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	var childCol string
	switch leg {
	case models.LegLeft:
		childCol = "left_child_id"
	case models.LegRight:
		childCol = "right_child_id"
	default:
		return nil, fmt.Errorf("leg must be LEFT or RIGHT")
	}

	query := fmt.Sprintf(`
		WITH RECURSIVE subtree AS (
			SELECT bt.user_id, bt.parent_id, bt.left_child_id, bt.right_child_id,
			       bt.left_bv, bt.right_bv, 1 AS depth
			FROM binary_tree bt
			WHERE bt.user_id = (SELECT %s FROM binary_tree WHERE user_id = $1)
			UNION ALL
			SELECT c.user_id, c.parent_id, c.left_child_id, c.right_child_id,
			       c.left_bv, c.right_bv, s.depth + 1
			FROM binary_tree c
			JOIN subtree s ON c.parent_id = s.user_id
		)
		SELECT u.user_id, u.sponsor_id, u.full_name, u.email,
		       u.status, p.name AS package_name,
		       (u.sponsor_user_id = $1) AS is_direct,
		       (s.left_bv + s.right_bv) AS volume,
		       s.depth, u.created_at
		FROM subtree s
		JOIN networker_users u ON u.user_id = s.user_id
		LEFT JOIN packages p ON p.package_id = u.current_package_id
		ORDER BY s.depth ASC, u.created_at DESC
		LIMIT $2 OFFSET $3`, childCol)

	rows, err := r.db.Query(ctx, query, sponsorID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*models.TeamMember, 0)
	for rows.Next() {
		m := &models.TeamMember{Leg: leg}
		if err := rows.Scan(
			&m.UserID, &m.SponsorID, &m.FullName, &m.Email,
			&m.Status, &m.PackageName,
			&m.IsDirect, &m.Volume, &m.Depth, &m.JoinedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, nil
}

// GetTeamStats aggregates counts across the full downline (both legs) and
// reads the caller's own `left_bv`/`right_bv` for volume totals.
func (r *TreeRepo) GetTeamStats(ctx context.Context, sponsorID string) (*models.TeamStatsView, error) {
	stats := &models.TeamStatsView{}
	// Own left/right BV from the caller's binary_tree row (0s if not yet placed).
	_ = r.db.QueryRow(ctx, `SELECT left_bv, right_bv FROM binary_tree WHERE user_id = $1`, sponsorID).
		Scan(&stats.LeftVolume, &stats.RightVolume)
	stats.TotalVolume = stats.LeftVolume + stats.RightVolume

	err := r.db.QueryRow(ctx, `
		WITH RECURSIVE subtree AS (
			SELECT user_id, parent_id, left_child_id, right_child_id, 'LEFT'::text AS leg
			FROM binary_tree
			WHERE user_id = (SELECT left_child_id FROM binary_tree WHERE user_id = $1)
			UNION ALL
			SELECT user_id, parent_id, left_child_id, right_child_id, 'RIGHT'::text AS leg
			FROM binary_tree
			WHERE user_id = (SELECT right_child_id FROM binary_tree WHERE user_id = $1)
			UNION ALL
			SELECT c.user_id, c.parent_id, c.left_child_id, c.right_child_id, s.leg
			FROM binary_tree c
			JOIN subtree s ON c.parent_id = s.user_id
		)
		SELECT
			COUNT(*)                                                            AS total_members,
			COALESCE(SUM(CASE WHEN u.status = 'ACTIVE'              THEN 1 ELSE 0 END), 0) AS active_members,
			COALESCE(SUM(CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END), 0) AS new_this_week,
			COALESCE(SUM(CASE WHEN s.leg = 'LEFT'                   THEN 1 ELSE 0 END), 0) AS left_count,
			COALESCE(SUM(CASE WHEN s.leg = 'RIGHT'                  THEN 1 ELSE 0 END), 0) AS right_count
		FROM subtree s
		JOIN networker_users u ON u.user_id = s.user_id`, sponsorID,
	).Scan(&stats.TotalMembers, &stats.ActiveMembers, &stats.NewThisWeek, &stats.LeftCount, &stats.RightCount)
	if err != nil {
		return stats, err
	}
	return stats, nil
}

func (r *TreeRepo) GetChildren(ctx context.Context, userID string, maxDepth int) ([]*models.TreeNode, error) {
	rows, err := r.db.Query(ctx, `
		WITH RECURSIVE tree AS (
			SELECT id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at, 0 AS depth
			FROM binary_tree WHERE user_id = $1
			UNION ALL
			SELECT t.id, t.user_id, t.parent_id, t.leg, t.left_child_id, t.right_child_id, t.left_bv, t.right_bv, t.created_at, tr.depth + 1
			FROM binary_tree t
			JOIN tree tr ON t.parent_id = tr.user_id
			WHERE tr.depth < $2
		)
		SELECT id, user_id, parent_id, leg, left_child_id, right_child_id, left_bv, right_bv, created_at
		FROM tree
		ORDER BY depth ASC`, userID, maxDepth)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var nodes []*models.TreeNode
	for rows.Next() {
		n := &models.TreeNode{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.ParentID, &n.Leg, &n.LeftChildID, &n.RightChildID, &n.LeftBV, &n.RightBV, &n.CreatedAt); err != nil {
			return nil, err
		}
		nodes = append(nodes, n)
	}
	return nodes, nil
}
