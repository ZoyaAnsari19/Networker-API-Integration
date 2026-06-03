package repository

import (
	"context"
	"encoding/json"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ConfigRepo struct{ db *pgxpool.Pool }

func NewConfigRepo(db *pgxpool.Pool) *ConfigRepo { return &ConfigRepo{db: db} }

func (r *ConfigRepo) GetCommission(ctx context.Context, key string) (*models.CommissionConfig, error) {
	c := &models.CommissionConfig{}
	err := r.db.QueryRow(ctx, `
		SELECT id, config_key, config_value, updated_by, updated_at
		FROM commission_config WHERE config_key = $1`, key,
	).Scan(&c.ID, &c.ConfigKey, &c.ConfigValue, &c.UpdatedBy, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *ConfigRepo) GetCommissionValue(ctx context.Context, key string) (float64, error) {
	cfg, err := r.GetCommission(ctx, key)
	if err != nil {
		return 0, err
	}
	var v struct{ Value float64 `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return 0, err
	}
	return v.Value, nil
}

func (r *ConfigRepo) GetCommissionBool(ctx context.Context, key string) (bool, error) {
	cfg, err := r.GetCommission(ctx, key)
	if err != nil {
		return false, err
	}
	var v struct{ Value bool `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return false, err
	}
	return v.Value, nil
}

func (r *ConfigRepo) ListAllCommission(ctx context.Context) ([]*models.CommissionConfig, error) {
	rows, err := r.db.Query(ctx, `SELECT id, config_key, config_value, updated_by, updated_at FROM commission_config ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var configs []*models.CommissionConfig
	for rows.Next() {
		c := &models.CommissionConfig{}
		if err := rows.Scan(&c.ID, &c.ConfigKey, &c.ConfigValue, &c.UpdatedBy, &c.UpdatedAt); err != nil {
			return nil, err
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (r *ConfigRepo) UpsertCommission(ctx context.Context, key string, value json.RawMessage, updatedBy string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO commission_config (config_key, config_value, updated_by, updated_at)
		VALUES ($1, $2, $3, NOW())
		ON CONFLICT (config_key) DO UPDATE
		SET config_value = $2, updated_by = $3, updated_at = NOW()`, key, value, updatedBy)
	return err
}

// Level bonus slabs
func (r *ConfigRepo) ListLevelBonusSlabs(ctx context.Context) ([]*models.LevelBonusSlab, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, pair_number, bonus_percent, max_level, is_active, updated_at
		FROM level_bonus_slabs ORDER BY pair_number ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var slabs []*models.LevelBonusSlab
	for rows.Next() {
		s := &models.LevelBonusSlab{}
		if err := rows.Scan(&s.ID, &s.PairNumber, &s.BonusPercent, &s.MaxLevel, &s.IsActive, &s.UpdatedAt); err != nil {
			return nil, err
		}
		slabs = append(slabs, s)
	}
	return slabs, nil
}

func (r *ConfigRepo) UpsertLevelBonusSlab(ctx context.Context, slab *models.LevelBonusSlab) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO level_bonus_slabs (pair_number, bonus_percent, max_level, is_active, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (pair_number) DO UPDATE
		SET bonus_percent = $2, max_level = $3, is_active = $4, updated_at = NOW()`,
		slab.PairNumber, slab.BonusPercent, slab.MaxLevel, slab.IsActive)
	return err
}

// Payout config
func (r *ConfigRepo) GetPayoutConfig(ctx context.Context, key string) (*models.PayoutConfig, error) {
	c := &models.PayoutConfig{}
	err := r.db.QueryRow(ctx, `
		SELECT id, config_key, config_value, updated_at
		FROM payout_config WHERE config_key = $1`, key,
	).Scan(&c.ID, &c.ConfigKey, &c.ConfigValue, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return c, nil
}

func (r *ConfigRepo) ListAllPayoutConfig(ctx context.Context) ([]*models.PayoutConfig, error) {
	rows, err := r.db.Query(ctx, `SELECT id, config_key, config_value, updated_at FROM payout_config ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var configs []*models.PayoutConfig
	for rows.Next() {
		c := &models.PayoutConfig{}
		if err := rows.Scan(&c.ID, &c.ConfigKey, &c.ConfigValue, &c.UpdatedAt); err != nil {
			return nil, err
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (r *ConfigRepo) UpsertPayoutConfig(ctx context.Context, key string, value json.RawMessage) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO payout_config (config_key, config_value, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (config_key) DO UPDATE
		SET config_value = $2, updated_at = NOW()`, key, value)
	return err
}
