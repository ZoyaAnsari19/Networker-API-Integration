package repository

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardHomeRepo struct{ db *pgxpool.Pool }

func NewDashboardHomeRepo(db *pgxpool.Pool) *DashboardHomeRepo {
	return &DashboardHomeRepo{db: db}
}

// Get returns stored JSON; empty slices if row missing (should not happen after migration).
func (r *DashboardHomeRepo) Get(ctx context.Context) (*models.DashboardHomeResponse, error) {
	var slidesRaw, noticesRaw []byte
	var updatedAt time.Time
	err := r.db.QueryRow(ctx, `
		SELECT slider_slides, notices, updated_at
		FROM dashboard_home_content WHERE id = 1`,
	).Scan(&slidesRaw, &noticesRaw, &updatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &models.DashboardHomeResponse{
				DashboardHomePayload: models.DashboardHomePayload{
					Slides:  []models.DashboardHomeSlide{},
					Notices: []models.DashboardHomeNotice{},
				},
				UpdatedAt: time.Time{},
			}, nil
		}
		return nil, err
	}
	out := &models.DashboardHomeResponse{UpdatedAt: updatedAt}
	if len(slidesRaw) > 0 && string(slidesRaw) != "null" {
		_ = json.Unmarshal(slidesRaw, &out.Slides)
	}
	if len(noticesRaw) > 0 && string(noticesRaw) != "null" {
		_ = json.Unmarshal(noticesRaw, &out.Notices)
	}
	if out.Slides == nil {
		out.Slides = []models.DashboardHomeSlide{}
	}
	if out.Notices == nil {
		out.Notices = []models.DashboardHomeNotice{}
	}
	return out, nil
}

func (r *DashboardHomeRepo) Save(ctx context.Context, payload *models.DashboardHomePayload) (time.Time, error) {
	slidesJSON, err := json.Marshal(payload.Slides)
	if err != nil {
		return time.Time{}, err
	}
	noticesJSON, err := json.Marshal(payload.Notices)
	if err != nil {
		return time.Time{}, err
	}
	var updatedAt time.Time
	err = r.db.QueryRow(ctx, `
		INSERT INTO dashboard_home_content (id, slider_slides, notices, updated_at)
		VALUES (1, $1::jsonb, $2::jsonb, now())
		ON CONFLICT (id) DO UPDATE SET
			slider_slides = EXCLUDED.slider_slides,
			notices = EXCLUDED.notices,
			updated_at = now()
		RETURNING updated_at`,
		slidesJSON, noticesJSON,
	).Scan(&updatedAt)
	return updatedAt, err
}
