package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
)

type LevelBonusService struct {
	configRepo *repository.ConfigRepo
	pairRepo   *repository.PairRepo
}

func NewLevelBonusService(configRepo *repository.ConfigRepo, pairRepo *repository.PairRepo) *LevelBonusService {
	return &LevelBonusService{configRepo: configRepo, pairRepo: pairRepo}
}

// Calculate returns the level bonus percent for a user based on their lifetime pair count
// and the level at which this match occurs relative to the source user.
func (s *LevelBonusService) Calculate(ctx context.Context, userID string, level int) (float64, error) {
	slabs, err := s.configRepo.ListLevelBonusSlabs(ctx)
	if err != nil {
		return 0, err
	}

	lifetimePairs, err := s.pairRepo.GetLifetimePairs(ctx, userID)
	if err != nil {
		lifetimePairs = 0
	}

	// The next pair will be lifetimePairs+1
	nextPair := lifetimePairs + 1

	return s.lookupBonus(slabs, nextPair, level), nil
}

func (s *LevelBonusService) lookupBonus(slabs []*models.LevelBonusSlab, pairNumber, level int) float64 {
	var bestMatch *models.LevelBonusSlab

	for _, slab := range slabs {
		if !slab.IsActive {
			continue
		}
		if pairNumber >= slab.PairNumber && level <= slab.MaxLevel {
			if bestMatch == nil || slab.PairNumber > bestMatch.PairNumber {
				bestMatch = slab
			}
		}
	}

	if bestMatch != nil {
		return bestMatch.BonusPercent
	}

	// Default: after all slabs, 1% for any level
	if pairNumber > 10 {
		return 1.0
	}
	return 0
}
