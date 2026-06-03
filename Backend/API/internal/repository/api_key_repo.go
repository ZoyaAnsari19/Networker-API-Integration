package repository

import (
	"context"
	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5/pgxpool"
)

type APIKeyRepo struct{ db *pgxpool.Pool }

func NewAPIKeyRepo(db *pgxpool.Pool) *APIKeyRepo { return &APIKeyRepo{db: db} }

func (r *APIKeyRepo) GetByKey(ctx context.Context, apiKey string) (*models.FMCGAPIKey, error) {
	k := &models.FMCGAPIKey{}
	err := r.db.QueryRow(ctx, `
		SELECT id, app_name, api_key, api_secret, status, created_at
		FROM fmcg_api_keys WHERE api_key = $1 AND status = 'ACTIVE'`, apiKey,
	).Scan(&k.ID, &k.AppName, &k.APIKey, &k.APISecret, &k.Status, &k.CreatedAt)
	if err != nil {
		return nil, err
	}
	return k, nil
}

func (r *APIKeyRepo) UpsertActiveKey(ctx context.Context, appName, apiKey, apiSecret string) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO fmcg_api_keys (app_name, api_key, api_secret, status)
		VALUES ($1, $2, $3, 'ACTIVE')
		ON CONFLICT (api_key) DO UPDATE
		SET app_name = EXCLUDED.app_name,
		    api_secret = EXCLUDED.api_secret,
		    status = 'ACTIVE'`, appName, apiKey, apiSecret,
	)
	return err
}
