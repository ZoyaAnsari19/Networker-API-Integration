package services

import (
	"context"
	"encoding/json"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
)

type ConfigService struct {
	configRepo *repository.ConfigRepo
}

func NewConfigService(configRepo *repository.ConfigRepo) *ConfigService {
	return &ConfigService{configRepo: configRepo}
}

func (s *ConfigService) ListCommissionConfigs(ctx context.Context) ([]*models.CommissionConfig, error) {
	return s.configRepo.ListAllCommission(ctx)
}

func (s *ConfigService) UpdateCommissionConfig(ctx context.Context, key string, value json.RawMessage, adminID string) error {
	return s.configRepo.UpsertCommission(ctx, key, value, adminID)
}

func (s *ConfigService) ListLevelBonusSlabs(ctx context.Context) ([]*models.LevelBonusSlab, error) {
	return s.configRepo.ListLevelBonusSlabs(ctx)
}

func (s *ConfigService) UpsertLevelBonusSlab(ctx context.Context, slab *models.LevelBonusSlab) error {
	return s.configRepo.UpsertLevelBonusSlab(ctx, slab)
}

func (s *ConfigService) ListPayoutConfigs(ctx context.Context) ([]*models.PayoutConfig, error) {
	return s.configRepo.ListAllPayoutConfig(ctx)
}

func (s *ConfigService) UpdatePayoutConfig(ctx context.Context, key string, value json.RawMessage) error {
	return s.configRepo.UpsertPayoutConfig(ctx, key, value)
}
