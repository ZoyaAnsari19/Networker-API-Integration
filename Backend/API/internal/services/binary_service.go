package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type BinaryService struct {
	db                *pgxpool.Pool
	treeRepo          *repository.TreeRepo
	bvRepo            *repository.BVRepo
	pairRepo          *repository.PairRepo
	ledgerRepo        *repository.LedgerRepo
	userRepo          *repository.UserRepo
	configRepo        *repository.ConfigRepo
	levelBonusService *LevelBonusService
	activationSvc     *ActivationService
}

func NewBinaryService(db *pgxpool.Pool, treeRepo *repository.TreeRepo, bvRepo *repository.BVRepo,
	pairRepo *repository.PairRepo, ledgerRepo *repository.LedgerRepo, userRepo *repository.UserRepo,
	configRepo *repository.ConfigRepo, levelBonusService *LevelBonusService,
	activationSvc *ActivationService) *BinaryService {
	return &BinaryService{
		db: db, treeRepo: treeRepo, bvRepo: bvRepo, pairRepo: pairRepo,
		ledgerRepo: ledgerRepo, userRepo: userRepo, configRepo: configRepo,
		levelBonusService: levelBonusService,
		activationSvc:     activationSvc,
	}
}

// DistributeBVAndMatch walks up the tree from sourceUserID, adds BV to each
// ancestor's appropriate leg, then runs pair matching for each affected ancestor.
func (s *BinaryService) DistributeBVAndMatch(ctx context.Context, sourceUserID, orderRef string, bvAmount int64) ([]models.BinaryCommResult, error) {
	binaryPercent, err := s.configRepo.GetCommissionValue(ctx, "binary_match_percent")
	if err != nil {
		binaryPercent = 10
	}

	ancestors, err := s.treeRepo.GetAncestors(ctx, sourceUserID, 100)
	if err != nil {
		return nil, err
	}

	sourceNode, err := s.treeRepo.GetByUserID(ctx, sourceUserID)
	if err != nil {
		return nil, err
	}

	sourceName := ""
	if u, uerr := s.userRepo.GetByID(ctx, sourceUserID); uerr == nil && u != nil {
		sourceName = u.FullName
	}

	var results []models.BinaryCommResult
	currentNodeID := sourceUserID
	currentLeg := ""
	if sourceNode.Leg != nil {
		currentLeg = *sourceNode.Leg
	}

	for i, ancestor := range ancestors {
		leg := currentLeg

		bvEntry := &models.BVEntry{
			UserID:         ancestor.UserID,
			SourceUserID:   sourceUserID,
			Leg:            leg,
			BVAmount:       bvAmount,
			OrderReference: &orderRef,
			Status:         models.BVStatusUnmatched,
		}
		if err := s.bvRepo.Insert(ctx, bvEntry); err != nil {
			log.Printf("bv_insert error user=%s: %v", ancestor.UserID, err)
			continue
		}

		if leg == models.LegLeft {
			_ = s.treeRepo.AddLeftBV(ctx, ancestor.UserID, bvAmount)
		} else {
			_ = s.treeRepo.AddRightBV(ctx, ancestor.UserID, bvAmount)
		}

		result, err := s.matchPair(ctx, ancestor.UserID, orderRef, binaryPercent, i+1, sourceName)
		if err != nil {
			log.Printf("pair_match error user=%s: %v", ancestor.UserID, err)
		} else if result != nil {
			results = append(results, *result)
		}

		_ = currentNodeID
		currentNodeID = ancestor.UserID
		if ancestor.Leg != nil {
			currentLeg = *ancestor.Leg
		}
	}

	return results, nil
}

func (s *BinaryService) matchPair(ctx context.Context, userID, orderRef string, binaryPercent float64, level int, sourceName string) (*models.BinaryCommResult, error) {
	node, err := s.treeRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	leftBV := node.LeftBV
	rightBV := node.RightBV

	if leftBV <= 0 || rightBV <= 0 {
		return nil, nil
	}

	matchedBV := leftBV
	if rightBV < leftBV {
		matchedBV = rightBV
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if user.Status != models.UserStatusActive {
		return nil, nil
	}

	commission := int64(float64(matchedBV) * binaryPercent / 100)

	levelBonusPercent, _ := s.levelBonusService.Calculate(ctx, userID, level)
	levelBonus := int64(float64(matchedBV) * levelBonusPercent / 100)

	totalIncome := commission + levelBonus

	// v2 activation rule: the ONLY earnings cap that still applies here is
	// the daily binary cap. Anything above `daily_binary_cap -
	// today_binary_earned` is dropped (not held — per locked spec daily-cap
	// excess behaves exactly as before the rule change). The monthly
	// shopping gate is applied per-credit inside activationSvc.CreditOrHold.
	remainingDaily := user.DailyBinaryCap - user.TodayBinaryEarned
	capDeducted := int64(0)
	credited := totalIncome
	if user.DailyBinaryCap > 0 {
		if remainingDaily <= 0 {
			capDeducted = totalIncome
			credited = 0
		} else if credited > remainingDaily {
			capDeducted = credited - remainingDaily
			credited = remainingDaily
		}
	}

	_ = s.treeRepo.ConsumeBV(ctx, userID, matchedBV, matchedBV)
	_ = s.bvRepo.MarkMatched(ctx, userID, models.LegLeft, matchedBV)
	_ = s.bvRepo.MarkMatched(ctx, userID, models.LegRight, matchedBV)

	carryForwardBV := int64(0)
	carryForwardLeg := ""
	if leftBV > rightBV {
		carryForwardBV = leftBV - matchedBV
		carryForwardLeg = models.LegLeft
	} else if rightBV > leftBV {
		carryForwardBV = rightBV - matchedBV
		carryForwardLeg = models.LegRight
	}

	// Split the "credited" headroom between binary match and level bonus in
	// the same order as before: match first, then whatever is left for the
	// level bonus. Each portion is fed through activationSvc.CreditOrHold
	// which decides whether it lands in wallet_ledger or held_income.
	var heldAmt int64
	var anyHeld bool
	if credited > 0 {
		matchPortion := min64(commission, credited)
		if matchPortion > 0 {
			refType := models.RefTypePurchase
			desc := fmt.Sprintf("Binary commission from %s", sourceName)
			decision, err := s.activationSvc.CreditOrHold(ctx, CreditOrHoldInput{
				UserID:        userID,
				WalletType:    models.WalletTeam,
				Source:        models.SourceBinaryMatch,
				Amount:        matchPortion,
				ReferenceID:   &orderRef,
				ReferenceType: &refType,
				Description:   &desc,
			})
			if err != nil {
				log.Printf("binary_match credit_or_hold error user=%s: %v", userID, err)
			} else if decision != nil {
				if decision.Held {
					heldAmt += decision.HeldAmount
					anyHeld = true
				}
			}
		}

		bonusPortion := credited - matchPortion
		if levelBonus > 0 && bonusPortion > 0 {
			bonusCredit := min64(levelBonus, bonusPortion)
			refType := models.RefTypePurchase
			desc := fmt.Sprintf("Level %d income from %s", level, sourceName)
			decision, err := s.activationSvc.CreditOrHold(ctx, CreditOrHoldInput{
				UserID:        userID,
				WalletType:    models.WalletTeam,
				Source:        models.SourceLevelBonus,
				Amount:        bonusCredit,
				ReferenceID:   &orderRef,
				ReferenceType: &refType,
				Description:   &desc,
			})
			if err != nil {
				log.Printf("level_bonus credit_or_hold error user=%s: %v", userID, err)
			} else if decision != nil {
				if decision.Held {
					heldAmt += decision.HeldAmount
					anyHeld = true
				}
			}
		}

		// today_binary_earned ticks for the full daily-cap-allowed amount —
		// including rows that are currently held. That matches the spec's
		// "daily cap stays as-is" requirement: a user whose credits are
		// parked in held_income still has their daily cap counted against
		// them so the cap cannot be dodged by the shopping gate.
		_ = s.userRepo.IncrTodayBinaryEarned(ctx, userID, credited)
	}

	_, _ = s.pairRepo.UpsertDailyStats(ctx, userID)

	pml := &models.PairMatchLog{
		UserID:           userID,
		LeftBVMatched:    matchedBV,
		RightBVMatched:   matchedBV,
		MatchedBV:        matchedBV,
		CarryForwardBV:   carryForwardBV,
		CarryForwardLeg:  strPtr(carryForwardLeg),
		CommissionAmount: commission,
		LevelBonusAmount: levelBonus,
		TotalCredited:    credited,
		CapDeducted:      capDeducted,
		OrderReference:   &orderRef,
	}
	_ = s.pairRepo.InsertMatch(ctx, pml)

	return &models.BinaryCommResult{
		UserID:          userID,
		MatchedBV:       matchedBV,
		Commission:      commission,
		LevelBonus:      levelBonus,
		TotalCredited:   credited,
		CapDeducted:     capDeducted,
		CarryForwardBV:  carryForwardBV,
		CarryForwardLeg: carryForwardLeg,
		Held:            anyHeld,
		HeldAmount:      heldAmt,
	}, nil
}

func min64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
