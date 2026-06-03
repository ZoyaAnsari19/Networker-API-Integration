package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AuditRepo writes single rows into audit_logs. The schema (Migration 011)
// pre-dates Go usage; this repo is the first caller, so its surface stays
// intentionally small until other services need it.
type AuditRepo struct{ db *pgxpool.Pool }

func NewAuditRepo(db *pgxpool.Pool) *AuditRepo { return &AuditRepo{db: db} }

// Write records a single audit log entry. `details` is marshalled to JSONB;
// passing nil writes a SQL NULL into the column. `ipAddress` accepts the
// empty string, which is also stored as NULL so the INET column never sees
// invalid input.
func (r *AuditRepo) Write(
	ctx context.Context,
	actorID, action, targetType, targetID string,
	details map[string]any,
	ipAddress, userAgent string,
) error {
	var detailsJSON []byte
	if details != nil {
		b, err := json.Marshal(details)
		if err != nil {
			return err
		}
		detailsJSON = b
	}

	var ipArg any
	if ipAddress != "" {
		ipArg = ipAddress
	}
	var uaArg any
	if ua := trimAuditUserAgent(userAgent); ua != "" {
		uaArg = ua
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO audit_logs (actor_id, action, target_type, target_id, details, ip_address, user_agent)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::inet, $7)`,
		actorID, action, targetType, targetID, detailsJSON, ipArg, uaArg,
	)
	return err
}

// ListSubAdminActivity returns audit rows where the actor is a SUB_ADMIN user.
func (r *AuditRepo) ListSubAdminActivity(
	ctx context.Context,
	page, limit int,
	filters models.SubAdminActivityFilters,
) ([]models.AuditLogEntry, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var conds []string
	var args []any
	n := 1

	conds = append(conds, "u.role = 'SUB_ADMIN'")

	if filters.ActorID != "" {
		conds = append(conds, fmt.Sprintf("a.actor_id = $%d", n))
		args = append(args, filters.ActorID)
		n++
	}
	if filters.Action != "" {
		conds = append(conds, fmt.Sprintf("a.action = $%d", n))
		args = append(args, filters.Action)
		n++
	}
	if filters.From != nil {
		conds = append(conds, fmt.Sprintf("a.created_at >= $%d", n))
		args = append(args, *filters.From)
		n++
	}
	if filters.To != nil {
		conds = append(conds, fmt.Sprintf("a.created_at <= $%d", n))
		args = append(args, *filters.To)
		n++
	}

	where := strings.Join(conds, " AND ")

	countSQL := `
		SELECT COUNT(*)
		FROM audit_logs a
		INNER JOIN networker_users u ON u.user_id = a.actor_id
		WHERE ` + where

	var total int64
	if err := r.db.QueryRow(ctx, countSQL, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listSQL := `
		SELECT a.log_id::text, a.actor_id::text, u.full_name, u.email,
		       a.action, a.target_type, a.target_id,
		       ` + auditTargetLabelSQL() + ` AS target_label,
		       ` + auditTargetSublabelSQL() + ` AS target_sublabel,
		       a.details, a.ip_address::text, a.user_agent, a.created_at
		FROM audit_logs a
		INNER JOIN networker_users u ON u.user_id = a.actor_id
		LEFT JOIN networker_users tu ON a.target_type = 'USER' AND tu.user_id::text = a.target_id
		LEFT JOIN networker_users ts ON a.target_type = 'STAFF' AND ts.user_id::text = a.target_id
		LEFT JOIN packages pkg ON a.target_type = 'PACKAGE' AND pkg.package_id::text = a.target_id
		LEFT JOIN kyc_requests kr ON a.target_type = 'KYC' AND kr.kyc_id::text = a.target_id
		LEFT JOIN networker_users ku ON kr.user_id = ku.user_id
		LEFT JOIN payout_requests pr ON a.target_type = 'PAYOUT' AND pr.payout_id::text = a.target_id
		LEFT JOIN networker_users pu ON pr.user_id = pu.user_id
		LEFT JOIN placement_requests pl ON a.target_type = 'PLACEMENT' AND pl.id::text = a.target_id
		LEFT JOIN networker_users plu ON pl.user_id = plu.user_id
		LEFT JOIN support_tickets st ON a.target_type = 'SUPPORT' AND st.id::text = a.target_id
		LEFT JOIN networker_users stu ON st.user_id = stu.user_id
		WHERE ` + where + `
		ORDER BY a.created_at DESC
		LIMIT $` + fmt.Sprint(n) + ` OFFSET $` + fmt.Sprint(n+1)

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, listSQL, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := make([]models.AuditLogEntry, 0, limit)
	for rows.Next() {
		var e models.AuditLogEntry
		var detailsJSON []byte
		var ip *string
		var ua *string
		if err := rows.Scan(
			&e.LogID, &e.ActorID, &e.ActorName, &e.ActorEmail,
			&e.Action, &e.TargetType, &e.TargetID,
			&e.TargetLabel, &e.TargetSublabel,
			&detailsJSON, &ip, &ua, &e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if len(detailsJSON) > 0 {
			_ = json.Unmarshal(detailsJSON, &e.Details)
		}
		e.IPAddress = ip
		e.UserAgent = ua
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// ErrAuditNotFound is unused today but reserved for future single-row fetch.
var ErrAuditNotFound = pgx.ErrNoRows

func trimAuditUserAgent(ua string) string {
	ua = strings.TrimSpace(ua)
	if len(ua) > 512 {
		return ua[:512]
	}
	return ua
}

// auditTargetLabelSQL builds a human-readable label for the audit target column.
func auditTargetLabelSQL() string {
	return `CASE
		WHEN a.action = 'SUB_ADMIN_LEVEL_BONUS_UPDATE' THEN 'Level bonus · level ' || COALESCE(a.details->>'level_number', a.target_id)
		WHEN a.target_type = 'CONFIG' THEN replace(a.target_id, '_', ' ')
		WHEN a.target_type = 'USER' THEN COALESCE(NULLIF(trim(tu.full_name), ''), NULLIF(trim(tu.email), ''), 'Networker')
		WHEN a.target_type = 'STAFF' THEN COALESCE(NULLIF(trim(ts.full_name), ''), NULLIF(trim(u.full_name), ''), 'Sub-admin') || ' (PIN)'
		WHEN a.target_type = 'KYC' THEN COALESCE(NULLIF(trim(ku.full_name), ''), 'Member') || ' · KYC'
		WHEN a.target_type = 'PAYOUT' THEN COALESCE(NULLIF(trim(pu.full_name), ''), 'Member') || ' · withdrawal'
		WHEN a.target_type = 'PLACEMENT' THEN COALESCE(NULLIF(trim(plu.full_name), ''), 'Member') || ' · placement'
		WHEN a.target_type = 'PACKAGE' THEN COALESCE(NULLIF(trim(pkg.name), ''), 'Package')
		WHEN a.target_type = 'SUPPORT' THEN COALESCE(NULLIF(trim(st.subject), ''), 'Support ticket')
		ELSE left(a.target_id, 12)
	END`
}

func auditTargetSublabelSQL() string {
	return `CASE
		WHEN a.target_type = 'USER' THEN COALESCE(NULLIF(trim(tu.sponsor_id), ''), NULLIF(trim(tu.email), ''))
		WHEN a.target_type = 'KYC' THEN COALESCE(NULLIF(trim(ku.email), ''), NULLIF(trim(ku.sponsor_id), ''))
		WHEN a.target_type = 'PAYOUT' AND pr.requested_amount IS NOT NULL THEN
			'₹' || trim(to_char(pr.requested_amount::numeric / 100, 'FM999,999,990.00')) || ' · ' || pr.status::text
		WHEN a.target_type = 'PLACEMENT' AND pl.decided_leg IS NOT NULL THEN pl.decided_leg::text || ' leg'
		WHEN a.target_type = 'PACKAGE' AND pkg.amount IS NOT NULL THEN
			'₹' || trim(to_char(pkg.amount::numeric / 100, 'FM999,999,990.00'))
		WHEN a.target_type = 'STAFF' THEN COALESCE(NULLIF(trim(ts.email), ''), NULLIF(trim(u.email), ''))
		WHEN a.target_type = 'SUPPORT' THEN
			COALESCE(NULLIF(trim(stu.full_name), ''), NULLIF(trim(stu.email), ''), 'Networker')
			|| CASE WHEN st.status IS NOT NULL THEN ' · ' || st.status::text ELSE '' END
		WHEN a.action IN ('STAFF_PIN_DENIED', 'STAFF_PIN_LOCKED') AND a.details->>'endpoint' IS NOT NULL THEN a.details->>'endpoint'
		ELSE NULL
	END`
}
