package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PackageRepo struct{ db *pgxpool.Pool }

func NewPackageRepo(db *pgxpool.Pool) *PackageRepo { return &PackageRepo{db: db} }

// packageColumns is the canonical SELECT list for the `packages` table
// under the v2 schema (lifetime cap multipliers are gone).
const packageColumns = `
	package_id, name, amount, daily_binary_cap,
	status, sort_order, created_at, updated_at
`

func scanPackage(p *models.Package, scan func(dest ...any) error) error {
	return scan(
		&p.PackageID, &p.Name, &p.Amount, &p.DailyBinaryCap,
		&p.Status, &p.SortOrder, &p.CreatedAt, &p.UpdatedAt,
	)
}

func (r *PackageRepo) Create(ctx context.Context, p *models.Package) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO packages (name, amount, daily_binary_cap, status, sort_order)
		VALUES ($1,$2,$3,$4,$5)
		RETURNING package_id, created_at, updated_at`,
		p.Name, p.Amount, p.DailyBinaryCap, p.Status, p.SortOrder,
	).Scan(&p.PackageID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *PackageRepo) GetByID(ctx context.Context, id string) (*models.Package, error) {
	p := &models.Package{}
	row := r.db.QueryRow(ctx, `SELECT `+packageColumns+` FROM packages WHERE package_id = $1`, id)
	if err := scanPackage(p, row.Scan); err != nil {
		return nil, err
	}
	return p, nil
}

// FindBestForAmount returns the highest-value ACTIVE package whose amount
// is <= the given purchase amount. Returns pgx.ErrNoRows when no package
// fits (purchase below smallest tier).
func (r *PackageRepo) FindBestForAmount(ctx context.Context, amount int64) (*models.Package, error) {
	p := &models.Package{}
	row := r.db.QueryRow(ctx, `SELECT `+packageColumns+`
		FROM packages
		WHERE status = 'ACTIVE' AND amount <= $1
		ORDER BY amount DESC
		LIMIT 1`, amount)
	if err := scanPackage(p, row.Scan); err != nil {
		return nil, err
	}
	return p, nil
}

func (r *PackageRepo) ListActive(ctx context.Context) ([]*models.Package, error) {
	rows, err := r.db.Query(ctx, `SELECT `+packageColumns+`
		FROM packages WHERE status = 'ACTIVE'
		ORDER BY sort_order ASC, amount ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pkgs []*models.Package
	for rows.Next() {
		p := &models.Package{}
		if err := scanPackage(p, rows.Scan); err != nil {
			return nil, err
		}
		pkgs = append(pkgs, p)
	}
	return pkgs, nil
}

func (r *PackageRepo) ListAll(ctx context.Context) ([]*models.Package, error) {
	rows, err := r.db.Query(ctx, `SELECT `+packageColumns+`
		FROM packages ORDER BY sort_order ASC, amount ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var pkgs []*models.Package
	for rows.Next() {
		p := &models.Package{}
		if err := scanPackage(p, rows.Scan); err != nil {
			return nil, err
		}
		pkgs = append(pkgs, p)
	}
	return pkgs, nil
}

func (r *PackageRepo) Update(ctx context.Context, id string, req *models.UpdatePackageRequest) error {
	_, err := r.db.Exec(ctx, `
		UPDATE packages SET
			name = COALESCE($2, name),
			amount = COALESCE($3, amount),
			daily_binary_cap = COALESCE($4, daily_binary_cap),
			status = COALESCE($5, status)::package_status,
			sort_order = COALESCE($6, sort_order),
			updated_at = NOW()
		WHERE package_id = $1`,
		id, req.Name, req.Amount, req.DailyBinaryCap, req.Status, req.SortOrder)
	return err
}

func (r *PackageRepo) InsertUserPackage(ctx context.Context, up *models.UserPackage) error {
	return r.db.QueryRow(ctx, `
		INSERT INTO user_packages (user_id, package_id, amount_paid, status)
		VALUES ($1,$2,$3,$4)
		RETURNING id, activated_at, created_at`,
		up.UserID, up.PackageID, up.AmountPaid, up.Status,
	).Scan(&up.ID, &up.ActivatedAt, &up.CreatedAt)
}

func (r *PackageRepo) ExpireUserPackage(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE user_packages SET status = 'RENEWED', expired_at = NOW()
		WHERE user_id = $1 AND status = 'ACTIVE'`, userID)
	return err
}
