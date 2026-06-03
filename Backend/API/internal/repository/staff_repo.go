package repository

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// StaffRepo owns reads and writes for sub-admin (delegated staff) accounts.
// Staff rows live in networker_users with role = 'SUB_ADMIN' and their
// per-permission grants live in admin_staff_permissions. Both tables are
// joined for list/detail responses but mutations are kept transactional so
// permission writes can never out-live a failed user write.
type StaffRepo struct{ db *pgxpool.Pool }

func NewStaffRepo(db *pgxpool.Pool) *StaffRepo { return &StaffRepo{db: db} }

// staffSelectColumns is the canonical SELECT list for sub-admin rows. Only
// the fields surfaced by StaffResponse are loaded — the full user row
// (binary tree, wallets, etc.) is not relevant for staff.
const staffSelectColumns = `
	u.user_id, u.full_name, u.email, u.status, u.role,
	u.staff_created_by, u.staff_last_login_at,
	u.created_at, u.updated_at,
	(u.staff_action_pin_hash IS NOT NULL AND u.staff_action_pin_hash <> '') AS has_action_pin,
	creator.full_name AS created_by_name
`

const staffFromJoin = `
	FROM networker_users u
	LEFT JOIN networker_users creator ON creator.user_id = u.staff_created_by
`

// StaffRow is the flat scan target for joined staff queries. Permissions are
// loaded separately to keep the SELECT simple and to avoid GROUP_CONCAT
// gymnastics that would obscure ordering.
type StaffRow struct {
	models.StaffResponse
}

func scanStaffRow(row pgx.Row) (*models.StaffResponse, error) {
	var s models.StaffResponse
	if err := row.Scan(
		&s.UserID, &s.FullName, &s.Email, &s.Status, &s.Role,
		&s.CreatedByUserID, &s.LastLoginAt,
		&s.CreatedAt, &s.UpdatedAt,
		&s.HasActionPin,
		&s.CreatedByName,
	); err != nil {
		return nil, err
	}
	return &s, nil
}

// GetByID returns a sub-admin row plus its permissions, or pgx.ErrNoRows
// when no SUB_ADMIN user with that id exists.
func (r *StaffRepo) GetByID(ctx context.Context, id string) (*models.StaffResponse, error) {
	row := r.db.QueryRow(ctx, `SELECT `+staffSelectColumns+staffFromJoin+`
		WHERE u.user_id = $1 AND u.role = 'SUB_ADMIN'`, id)
	s, err := scanStaffRow(row)
	if err != nil {
		return nil, err
	}
	perms, err := r.GetPermissions(ctx, s.UserID)
	if err != nil {
		return nil, err
	}
	s.Permissions = perms
	return s, nil
}

// List returns paginated sub-admin rows ordered by most recently created.
// Pass an empty status to include every status, or one of ACTIVE / INACTIVE
// / BLOCKED to filter. Permissions are batched in a single follow-up query
// so the page size N drives 1 + 1 queries instead of 1 + N.
func (r *StaffRepo) List(ctx context.Context, status string, page, limit int) ([]*models.StaffResponse, int64, error) {
	var total int64
	if err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM networker_users
		WHERE role = 'SUB_ADMIN' AND ($1 = '' OR status = $1::user_status)`, status).Scan(&total); err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `SELECT `+staffSelectColumns+staffFromJoin+`
		WHERE u.role = 'SUB_ADMIN' AND ($1 = '' OR u.status = $1::user_status)
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var out []*models.StaffResponse
	var ids []string
	for rows.Next() {
		s, err := scanStaffRow(rows)
		if err != nil {
			return nil, 0, err
		}
		s.Permissions = []string{}
		out = append(out, s)
		ids = append(ids, s.UserID)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if len(ids) == 0 {
		return out, total, nil
	}

	permRows, err := r.db.Query(ctx, `
		SELECT user_id, permission_key
		FROM admin_staff_permissions
		WHERE user_id = ANY($1)
		ORDER BY permission_key`, ids)
	if err != nil {
		return nil, 0, err
	}
	defer permRows.Close()

	byID := make(map[string]*models.StaffResponse, len(out))
	for _, s := range out {
		byID[s.UserID] = s
	}
	for permRows.Next() {
		var uid, key string
		if err := permRows.Scan(&uid, &key); err != nil {
			return nil, 0, err
		}
		if s, ok := byID[uid]; ok {
			s.Permissions = append(s.Permissions, key)
		}
	}
	if err := permRows.Err(); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

// Create inserts a sub-admin row and its initial permission set inside a
// single transaction. The sponsor_id column is left to its DB default
// (sponsor_code_seq) so a fresh SPF code is allocated for the staff row,
// keeping the column NOT NULL contract without polluting the MLM tree.
func (r *StaffRepo) Create(
	ctx context.Context,
	userID, fullName, email, password, actionPinHash, status string,
	permissions []string,
	createdBy string,
) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, `
		INSERT INTO networker_users
			(user_id, full_name, email, password_hash, staff_action_pin_hash, status, role,
			 placement_status, staff_created_by)
		VALUES ($1, $2, $3, $4, $5, $6::user_status, 'SUB_ADMIN', 'PLACED', $7)`,
		userID, fullName, email, password, actionPinHash, status, createdBy,
	); err != nil {
		return err
	}

	if err := insertPermissions(ctx, tx, userID, permissions, createdBy); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

// UpdateProfile rotates the name and/or email on a sub-admin row in a single
// statement. Pass nil for either argument to leave it untouched. Email
// uniqueness is enforced by the partial unique index on networker_users.
func (r *StaffRepo) UpdateProfile(ctx context.Context, userID string, fullName, email *string) error {
	if fullName == nil && email == nil {
		return nil
	}
	tag, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET full_name = COALESCE($2, full_name),
		    email     = COALESCE($3, email),
		    updated_at = NOW()
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID, fullName, email)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sub-admin not found")
	}
	return nil
}

// SetStatus flips a sub-admin's status. It refuses to operate on rows that
// are not SUB_ADMIN so a misrouted call cannot accidentally block a real
// admin or networker.
func (r *StaffRepo) SetStatus(ctx context.Context, userID, status string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET status = $2::user_status, updated_at = NOW()
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID, status)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sub-admin not found")
	}
	return nil
}

// SetActionPinHash stores a sub-admin's 6-digit step-up PIN (plain text in staff_action_pin_hash).
func (r *StaffRepo) SetActionPinHash(ctx context.Context, userID, hash string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET staff_action_pin_hash = $2, updated_at = NOW()
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sub-admin not found")
	}
	return nil
}

// GetActionPinHash returns the stored step-up PIN for a sub-admin, or an
// empty string when no PIN has been provisioned yet.
func (r *StaffRepo) GetActionPinHash(ctx context.Context, userID string) (string, error) {
	var hash *string
	err := r.db.QueryRow(ctx, `
		SELECT staff_action_pin_hash FROM networker_users
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID).Scan(&hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", pgx.ErrNoRows
		}
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

// SetPassword rotates the login password for a sub-admin. Stored as
// plaintext to match the existing auth_service convention (verifyStoredPassword
// transparently handles legacy bcrypt rows).
func (r *StaffRepo) SetPassword(ctx context.Context, userID, password string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET password_hash = $2, updated_at = NOW()
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID, password)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sub-admin not found")
	}
	return nil
}

// ReplacePermissions atomically wipes the staff member's grants and writes
// the new set. Empty `permissions` is allowed — it revokes everything.
func (r *StaffRepo) ReplacePermissions(ctx context.Context, userID string, permissions []string, grantedBy string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	if _, err := tx.Exec(ctx, `DELETE FROM admin_staff_permissions WHERE user_id = $1`, userID); err != nil {
		return err
	}
	if err := insertPermissions(ctx, tx, userID, permissions, grantedBy); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// GetPermissions returns the (possibly empty) permission set for a user.
// Used by both the staff handler (response shape) and the request
// middleware (authorisation check).
func (r *StaffRepo) GetPermissions(ctx context.Context, userID string) ([]string, error) {
	rows, err := r.db.Query(ctx, `
		SELECT permission_key FROM admin_staff_permissions
		WHERE user_id = $1
		ORDER BY permission_key`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]string, 0)
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		out = append(out, k)
	}
	return out, rows.Err()
}

// Delete removes a sub-admin row. ON DELETE CASCADE on
// admin_staff_permissions wipes the grants alongside it. Callers should
// prefer SetStatus('BLOCKED') for audit-friendly off-boarding; Delete is
// available for accidental rows or never-logged-in entries.
func (r *StaffRepo) Delete(ctx context.Context, userID string) error {
	tag, err := r.db.Exec(ctx, `
		DELETE FROM networker_users
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("sub-admin not found")
	}
	return nil
}

// TouchLastLogin bumps staff_last_login_at after a successful auth so the
// admin UI can show "Last seen". Failures here are non-fatal for login —
// the caller is expected to log and continue.
func (r *StaffRepo) TouchLastLogin(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET staff_last_login_at = NOW()
		WHERE user_id = $1 AND role = 'SUB_ADMIN'`, userID)
	return err
}

// EmailInUseByOther reports whether the email is claimed by any networker_users
// row other than `excludeUserID`. The dev allow-list isn't honoured here on
// purpose: staff accounts shouldn't share a mailbox with the QA mailbox.
//
// When excludeUserID is empty (e.g. staff create before a user_id exists), the
// caller must not pass "" into `user_id <> $2` — PostgreSQL rejects casting an
// empty string to uuid (22P02). Bind NULL instead so the clause is skipped.
func (r *StaffRepo) EmailInUseByOther(ctx context.Context, email, excludeUserID string) (bool, error) {
	var inUse bool
	var exclude any
	if strings.TrimSpace(excludeUserID) != "" {
		exclude = excludeUserID
	}
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM networker_users
			WHERE lower(trim(email)) = lower(trim($1))
			  AND ($2::uuid IS NULL OR user_id <> $2::uuid)
		)`, email, exclude).Scan(&inUse)
	return inUse, err
}

// insertPermissions writes the given keys for a user. Unknown keys MUST be
// filtered by the caller; this helper trusts its input so duplicates surface
// as PK violations.
func insertPermissions(ctx context.Context, tx pgx.Tx, userID string, keys []string, grantedBy string) error {
	if len(keys) == 0 {
		return nil
	}
	for _, k := range keys {
		if _, err := tx.Exec(ctx, `
			INSERT INTO admin_staff_permissions (user_id, permission_key, granted_by)
			VALUES ($1, $2, $3)
			ON CONFLICT (user_id, permission_key) DO NOTHING`, userID, k, grantedBy); err != nil {
			return err
		}
	}
	return nil
}
