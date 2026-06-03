package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmcg-binary/internal/models"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserRepo owns all I/O against `networker_users`.
//
// Methods that need to run inside a caller-owned transaction take an explicit
// `pgx.Tx`; the convenience methods use the pool directly. This mirrors the
// pattern established by p2p_repo.go and keeps the activation rule atomic —
// see activation_service.BeforeCredit / RecordShopping.
type UserRepo struct{ db *pgxpool.Pool }

func NewUserRepo(db *pgxpool.Pool) *UserRepo { return &UserRepo{db: db} }

// userBaseColumns is the canonical SELECT list for networker_users rows.
// Centralised so we can keep Create / GetByID / GetBy* / ListByStatus in sync
// when the schema evolves.
const userBaseColumns = `
	user_id, sponsor_id, sponsor_user_id, full_name, email, phone, password_hash,
	status, role, current_package_id, package_activated_at,
	monthly_income_paise, monthly_shopping_paise, income_period_ym,
	today_binary_earned, daily_binary_cap,
	placement_status, created_at, updated_at,
	avatar_object_key, payout_upi_id, payout_bank_display,
	secure_wallet_external_id, secure_wallet_balance_paise
`

func applyUserProfileExtras(u *models.User, ak, up, bd, sw sql.NullString, swBal sql.NullInt64) {
	if ak.Valid {
		s := ak.String
		u.AvatarObjectKey = &s
	}
	if up.Valid {
		s := up.String
		u.PayoutUPIID = &s
	}
	if bd.Valid {
		s := bd.String
		u.PayoutBankDisplay = &s
	}
	if sw.Valid {
		s := sw.String
		u.SecureWalletExternalID = &s
	}
	if swBal.Valid {
		v := swBal.Int64
		u.SecureWalletBalancePaise = &v
	}
}

// scanRow populates a User from a pgx.Row / pgx.Rows produced against
// userBaseColumns. The column order MUST match userBaseColumns exactly.
func scanUser(u *models.User, scan func(dest ...any) error) error {
	var ak, up, bd, sw sql.NullString
	var swBal sql.NullInt64
	err := scan(
		&u.UserID, &u.SponsorID, &u.SponsorUserID, &u.FullName, &u.Email, &u.Phone, &u.PasswordHash,
		&u.Status, &u.Role, &u.CurrentPackageID, &u.PackageActivatedAt,
		&u.MonthlyIncomePaise, &u.MonthlyShoppingPaise, &u.IncomePeriodYM,
		&u.TodayBinaryEarned, &u.DailyBinaryCap,
		&u.PlacementStatus, &u.CreatedAt, &u.UpdatedAt,
		&ak, &up, &bd, &sw, &swBal,
	)
	if err != nil {
		return err
	}
	applyUserProfileExtras(u, ak, up, bd, sw, swBal)
	return nil
}

func (r *UserRepo) Create(ctx context.Context, u *models.User) error {
	if u.PlacementStatus == "" {
		u.PlacementStatus = models.PlacementPlaced
	}
	// Stamp income_period_ym so new users receive the current month; the DB
	// default is sufficient on INSERT, but keeping it explicit here documents
	// the contract that every user always has a period set.
	if u.IncomePeriodYM == 0 {
		u.IncomePeriodYM = models.CurrentPeriodYMFromTime(time.Now())
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO networker_users
			(user_id, sponsor_user_id, full_name, email, phone, password_hash, status, role,
			 current_package_id, package_activated_at,
			 monthly_income_paise, monthly_shopping_paise, income_period_ym,
			 daily_binary_cap, placement_status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
		u.UserID, u.SponsorUserID, u.FullName, u.Email, u.Phone, u.PasswordHash,
		u.Status, u.Role, u.CurrentPackageID, u.PackageActivatedAt,
		u.MonthlyIncomePaise, u.MonthlyShoppingPaise, u.IncomePeriodYM,
		u.DailyBinaryCap, u.PlacementStatus,
	)
	return err
}

func (r *UserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	u := &models.User{}
	row := r.db.QueryRow(ctx, `SELECT `+userBaseColumns+` FROM networker_users WHERE user_id = $1`, id)
	if err := scanUser(u, row.Scan); err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) GetBySponsorID(ctx context.Context, sponsorID string) (*models.User, error) {
	u := &models.User{}
	row := r.db.QueryRow(ctx, `SELECT `+userBaseColumns+` FROM networker_users WHERE sponsor_id = $1`, sponsorID)
	if err := scanUser(u, row.Scan); err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	u := &models.User{}
	row := r.db.QueryRow(ctx, `SELECT `+userBaseColumns+` FROM networker_users WHERE email = $1`, email)
	if err := scanUser(u, row.Scan); err != nil {
		return nil, err
	}
	return u, nil
}

func (r *UserRepo) GetByPhone(ctx context.Context, phone string) (*models.User, error) {
	u := &models.User{}
	row := r.db.QueryRow(ctx, `SELECT `+userBaseColumns+` FROM networker_users WHERE phone = $1`, phone)
	if err := scanUser(u, row.Scan); err != nil {
		return nil, err
	}
	return u, nil
}

// GetByIDForUpdateTx reads a user row under a SELECT ... FOR UPDATE lock
// within the caller-provided transaction. Used by the activation rule to
// safely read-modify-write the monthly counters without racing with other
// commission credits or shopping events.
func (r *UserRepo) GetByIDForUpdateTx(ctx context.Context, tx pgx.Tx, id string) (*models.User, error) {
	u := &models.User{}
	row := tx.QueryRow(ctx, `SELECT `+userBaseColumns+` FROM networker_users WHERE user_id = $1 FOR UPDATE`, id)
	if err := scanUser(u, row.Scan); err != nil {
		return nil, err
	}
	return u, nil
}

// ActivatePackage is the v2 replacement for UpdateCaps / TopUpCaps /
// UpgradeCaps. It flips the user to the given package tier, sets
// daily_binary_cap, activates the account, and resets the day's binary
// ticker (so a freshly upgraded user does not inherit today_binary_earned
// from the old tier). Monthly counters are intentionally NOT reset here —
// income from a lower tier still counts toward the Rs 25k monthly threshold.
func (r *UserRepo) ActivatePackage(ctx context.Context, userID, pkgID string, dailyCap int64, now time.Time) error {
	_, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET current_package_id = $2,
		    package_activated_at = $3,
		    daily_binary_cap = $4,
		    today_binary_earned = 0,
		    status = 'ACTIVE',
		    updated_at = NOW()
		WHERE user_id = $1`, userID, pkgID, now, dailyCap)
	return err
}

// AddMonthlyIncomeTx adds `amount` to monthly_income_paise after folding in
// month rollover inside the same statement: if the stored `income_period_ym`
// is stale, the counters are zeroed first. The CASE / WHEN keeps this
// branchless so even concurrent callers (each with their own FOR UPDATE row
// lock) converge to the same final state.
//
// `periodYM` must be the caller's `models.CurrentPeriodYMFromTime(now)` so
// tests can fake the clock via a dedicated parameter.
func (r *UserRepo) AddMonthlyIncomeTx(ctx context.Context, tx pgx.Tx, userID string, amount int64, periodYM int) error {
	_, err := tx.Exec(ctx, `
		UPDATE networker_users
		SET monthly_income_paise = CASE
		        WHEN income_period_ym = $3 THEN monthly_income_paise + $2
		        ELSE $2
		    END,
		    monthly_shopping_paise = CASE
		        WHEN income_period_ym = $3 THEN monthly_shopping_paise
		        ELSE 0
		    END,
		    income_period_ym = $3,
		    updated_at = NOW()
		WHERE user_id = $1`, userID, amount, periodYM)
	return err
}

// AddMonthlyShoppingTx adds to monthly_shopping_paise with the same rollover
// semantics as AddMonthlyIncomeTx. Returns `crossedThreshold=true` only when
// the call flipped the counter from `< MonthlyShoppingThreshold` to `>=
// MonthlyShoppingThreshold` within the current period (strictly on this
// update; counter rollover cases return false so the caller does not try to
// release held rows that belong to a previous period).
func (r *UserRepo) AddMonthlyShoppingTx(ctx context.Context, tx pgx.Tx, userID string, amount int64, periodYM int) (crossedThreshold bool, err error) {
	// RETURNING pre/post counters keeps the threshold decision server-side
	// so we avoid a second round-trip. `same_period` distinguishes the
	// rollover path (stored period was stale — pre value on disk is
	// irrelevant) from the hot path (same period — we crossed if and only
	// if pre was below the threshold and post is at or above it).
	var samePeriod bool
	var preShopping, postShopping int64
	err = tx.QueryRow(ctx, `
		WITH prev AS (
		    SELECT monthly_shopping_paise AS old_shopping,
		           income_period_ym = $3 AS same_period
		    FROM networker_users
		    WHERE user_id = $1
		    FOR UPDATE
		),
		updated AS (
		    UPDATE networker_users u
		    SET monthly_income_paise = CASE
		            WHEN u.income_period_ym = $3 THEN u.monthly_income_paise
		            ELSE 0
		        END,
		        monthly_shopping_paise = CASE
		            WHEN u.income_period_ym = $3 THEN u.monthly_shopping_paise + $2
		            ELSE $2
		        END,
		        income_period_ym = $3,
		        updated_at = NOW()
		    WHERE u.user_id = $1
		    RETURNING u.monthly_shopping_paise AS new_shopping
		)
		SELECT prev.same_period,
		       CASE WHEN prev.same_period THEN prev.old_shopping ELSE 0 END,
		       updated.new_shopping
		FROM prev, updated`,
		userID, amount, periodYM,
	).Scan(&samePeriod, &preShopping, &postShopping)
	if err != nil {
		return false, err
	}
	// A rollover path refreshes the stored period to `periodYM` and starts
	// the counter from this one shop; any HELD rows must belong to previous
	// periods and will be reaped by the monthly cron, so we do NOT fire a
	// release here even if the shop itself >= threshold.
	if !samePeriod {
		return false, nil
	}
	return preShopping < models.MonthlyShoppingThresholdPaise && postShopping >= models.MonthlyShoppingThresholdPaise, nil
}

// GetMonthlyStateTx is a convenience readback used by the activation service
// after a write to return the authoritative monthly counters to the caller.
// Runs on the provided tx so the read sees the same snapshot as the UPDATE.
func (r *UserRepo) GetMonthlyStateTx(ctx context.Context, tx pgx.Tx, userID string) (incomePaise, shoppingPaise int64, periodYM int, err error) {
	err = tx.QueryRow(ctx,
		`SELECT monthly_income_paise, monthly_shopping_paise, income_period_ym
		 FROM networker_users WHERE user_id = $1`, userID,
	).Scan(&incomePaise, &shoppingPaise, &periodYM)
	return
}

// GetMonthlyState returns the same info as GetMonthlyStateTx using the pool
// (no row lock). Used by read-only callers such as the /me profile handler.
func (r *UserRepo) GetMonthlyState(ctx context.Context, userID string) (incomePaise, shoppingPaise int64, periodYM int, err error) {
	err = r.db.QueryRow(ctx,
		`SELECT monthly_income_paise, monthly_shopping_paise, income_period_ym
		 FROM networker_users WHERE user_id = $1`, userID,
	).Scan(&incomePaise, &shoppingPaise, &periodYM)
	return
}

// IncrTodayBinaryEarnedTx bumps today_binary_earned inside the caller's tx.
// Split out from the old IncrBinaryEarned so the lifetime counter is gone.
func (r *UserRepo) IncrTodayBinaryEarnedTx(ctx context.Context, tx pgx.Tx, userID string, amount int64) error {
	_, err := tx.Exec(ctx, `
		UPDATE networker_users
		SET today_binary_earned = today_binary_earned + $2, updated_at = NOW()
		WHERE user_id = $1`, userID, amount)
	return err
}

// IncrTodayBinaryEarned is the pool-based variant used by the binary service
// when a credit is posted outside of an activation-rule transaction (e.g.
// the daily cap logic still counts binary wins against today's ticker even
// when the credit itself is held).
func (r *UserRepo) IncrTodayBinaryEarned(ctx context.Context, userID string, amount int64) error {
	_, err := r.db.Exec(ctx, `
		UPDATE networker_users
		SET today_binary_earned = today_binary_earned + $2, updated_at = NOW()
		WHERE user_id = $1`, userID, amount)
	return err
}

func (r *UserRepo) SetStatus(ctx context.Context, userID, status string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE networker_users SET status = $2, updated_at = NOW() WHERE user_id = $1`, userID, status)
	return err
}

func (r *UserRepo) UpdateProfile(ctx context.Context, userID, fullName, email string, phone *string) error {
	tag, err := r.db.Exec(ctx, `
		UPDATE networker_users SET full_name=$2, email=$3, phone=$4, updated_at=NOW()
		WHERE user_id=$1`, userID, fullName, email, phone)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (r *UserRepo) ListByStatus(ctx context.Context, status string, page, limit int) ([]*models.User, int64, error) {
	var total int64
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM networker_users WHERE ($1 = '' OR status = $1::user_status)`, status).Scan(&total)

	offset := (page - 1) * limit
	rows, err := r.db.Query(ctx, `SELECT `+userBaseColumns+`
		FROM networker_users
		WHERE ($1 = '' OR status = $1::user_status)
		ORDER BY created_at DESC LIMIT $2 OFFSET $3`, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := scanUser(u, rows.Scan); err != nil {
			return nil, 0, err
		}
		users = append(users, u)
	}
	return users, total, nil
}

func (r *UserRepo) CountDirectReferrals(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM networker_users WHERE sponsor_user_id = $1`, userID).Scan(&count)
	return count, err
}

// ListDirectReferrals returns networker users whose sponsor_user_id matches the
// given sponsor. The binary_tree.leg is LEFT joined so the UI can show where
// each referral was placed (nil when placement is still pending).
func (r *UserRepo) ListDirectReferrals(ctx context.Context, sponsorUserID string, limit, offset int) ([]*models.DirectReferral, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	// total_direct_earned is no longer tracked. We fall back to the user's
	// current monthly income figure for the directs list since that is the
	// closest user-relevant metric remaining on the schema.
	rows, err := r.db.Query(ctx, `
		SELECT u.user_id, u.sponsor_id, u.full_name, u.email, u.phone,
		       u.status, u.placement_status, bt.leg, p.name,
		       u.monthly_income_paise, u.created_at
		FROM networker_users u
		LEFT JOIN binary_tree bt ON bt.user_id = u.user_id
		LEFT JOIN packages p ON p.package_id = u.current_package_id
		WHERE u.sponsor_user_id = $1
		ORDER BY u.created_at DESC
		LIMIT $2 OFFSET $3`, sponsorUserID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]*models.DirectReferral, 0)
	for rows.Next() {
		d := &models.DirectReferral{}
		if err := rows.Scan(
			&d.UserID, &d.SponsorID, &d.FullName, &d.Email, &d.Phone,
			&d.Status, &d.PlacementStatus, &d.Leg, &d.PackageName,
			&d.TotalDirectEarned, &d.CreatedAt,
		); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, nil
}

func (r *UserRepo) SetPlacementStatus(ctx context.Context, userID, status string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE networker_users SET placement_status = $2::placement_status, updated_at = NOW()
		WHERE user_id = $1`, userID, status)
	return err
}

func (r *UserRepo) ResetDailyBinary(ctx context.Context) error {
	_, err := r.db.Exec(ctx, `UPDATE networker_users SET today_binary_earned = 0, updated_at = NOW()`)
	return err
}

// UpdatePasswordHash rotates the login password bcrypt hash.
func (r *UserRepo) UpdatePasswordHash(ctx context.Context, userID, hash string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET password_hash = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// GetTransactionPasswordHash returns the bcrypt hash of the networker's
// transaction password, or an empty string if it has never been set.
func (r *UserRepo) GetTransactionPasswordHash(ctx context.Context, userID string) (string, error) {
	var hash *string
	err := r.db.QueryRow(ctx,
		`SELECT transaction_password_hash FROM networker_users WHERE user_id = $1`, userID,
	).Scan(&hash)
	if err != nil {
		return "", err
	}
	if hash == nil {
		return "", nil
	}
	return *hash, nil
}

// UpdateTransactionPasswordHash sets or rotates the transaction password.
func (r *UserRepo) UpdateTransactionPasswordHash(ctx context.Context, userID, hash string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET transaction_password_hash = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// HasTransactionPassword returns true when transaction_password_hash is set
// (used by /me to drive the UI state between "Set" and "Change").
func (r *UserRepo) HasTransactionPassword(ctx context.Context, userID string) (bool, error) {
	var has bool
	err := r.db.QueryRow(ctx,
		`SELECT transaction_password_hash IS NOT NULL AND transaction_password_hash <> ''
		 FROM networker_users WHERE user_id = $1`, userID,
	).Scan(&has)
	if err != nil {
		return false, err
	}
	return has, nil
}

// UpdateEmail rotates the networker's email. Caller is responsible for
// OTP-verifying the new address and re-authenticating the session. Returns
// an error if the address is already in use by another user.
func (r *UserRepo) UpdateEmail(ctx context.Context, userID, newEmail string) error {
	var inUse bool
	if err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM networker_users WHERE email = $1 AND user_id <> $2)`,
		newEmail, userID,
	).Scan(&inUse); err != nil {
		return err
	}
	if inUse {
		return errors.New("email is already in use by another account")
	}
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET email = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, newEmail)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// UpdatePhone rotates the networker's phone number. Same rules as UpdateEmail.
func (r *UserRepo) UpdatePhone(ctx context.Context, userID, newPhone string) error {
	var inUse bool
	if err := r.db.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM networker_users WHERE phone = $1 AND user_id <> $2)`,
		newPhone, userID,
	).Scan(&inUse); err != nil {
		return err
	}
	if inUse {
		return errors.New("phone number is already in use by another account")
	}
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET phone = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, newPhone)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// UpdateAvatarObjectKey stores the B2 object key for the networker's profile photo.
func (r *UserRepo) UpdateAvatarObjectKey(ctx context.Context, userID, objectKey string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET avatar_object_key = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, objectKey)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}

// UpdatePayoutUPIID stores the UPI id shown read-only on the withdrawal form.
func (r *UserRepo) UpdatePayoutUPIID(ctx context.Context, userID, upi string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE networker_users SET payout_upi_id = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, upi)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("user not found")
	}
	return nil
}
