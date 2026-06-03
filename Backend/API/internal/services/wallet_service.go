package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
)

type WalletService struct {
	ledgerRepo *repository.LedgerRepo
}

func NewWalletService(ledgerRepo *repository.LedgerRepo) *WalletService {
	return &WalletService{ledgerRepo: ledgerRepo}
}

func (s *WalletService) GetBalances(ctx context.Context, userID string) (*models.WalletSummary, error) {
	return s.ledgerRepo.GetBothBalances(ctx, userID)
}

func (s *WalletService) GetLedger(ctx context.Context, userID, walletType string, page, limit int) ([]*models.LedgerEntry, int64, error) {
	return s.ledgerRepo.ListByWallet(ctx, userID, walletType, page, limit)
}
