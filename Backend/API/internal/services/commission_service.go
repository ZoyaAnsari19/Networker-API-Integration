package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CommissionService fans a single purchase out into the downstream credits
// (direct / binary / franchise / level). Every credit is funnelled through
// ActivationService.CreditOrHold so the v2 monthly shopping gate decides
// whether each amount lands in wallet_ledger or held_income.
type CommissionService struct {
	db                *pgxpool.Pool
	userRepo          *repository.UserRepo
	ledgerRepo        *repository.LedgerRepo
	configRepo        *repository.ConfigRepo
	binaryService     *BinaryService
	packageActivation *PackageActivationService
	activationSvc     *ActivationService
	placementService  *PlacementService
}

func NewCommissionService(db *pgxpool.Pool, userRepo *repository.UserRepo,
	ledgerRepo *repository.LedgerRepo, configRepo *repository.ConfigRepo,
	binaryService *BinaryService, packageActivation *PackageActivationService,
	activationSvc *ActivationService) *CommissionService {
	return &CommissionService{
		db: db, userRepo: userRepo, ledgerRepo: ledgerRepo,
		configRepo: configRepo, binaryService: binaryService,
		packageActivation: packageActivation,
		activationSvc:     activationSvc,
	}
}

func (s *CommissionService) SetPlacementService(ps *PlacementService) {
	s.placementService = ps
}

// ProcessPurchase is the main entry point called by FMCG platform on every purchase.
func (s *CommissionService) ProcessPurchase(ctx context.Context, event *models.PurchaseEvent) (*models.CommissionResult, error) {
	if event.BVAmount <= 0 {
		return nil, errors.New("bv_amount must be > 0")
	}

	result := &models.CommissionResult{OrderID: event.OrderID}

	// 0. Auto-package activation: for networker purchases, check if the purchase
	// amount matches a package tier and activate / upgrade accordingly. Under
	// the v2 rule we use TotalAmount (actual spend) when present, else BVAmount.
	if event.UserType == "networker" && s.packageActivation != nil {
		pkgAmt := event.TotalAmount
		if pkgAmt <= 0 {
			pkgAmt = event.BVAmount
		}
		if pkgRes, perr := s.packageActivation.ProcessPurchase(ctx, event.UserID, pkgAmt); perr != nil {
			log.Printf("package_activation error: %v", perr)
		} else {
			result.PackageActivation = pkgRes
		}
	}

	// 1. Direct commission to sponsor
	directResult, err := s.processDirectCommission(ctx, event)
	if err != nil {
		log.Printf("direct_commission error: %v", err)
	} else {
		result.DirectCommission = directResult
	}

	// 2. Binary BV distribution + pair matching (only for networker user type purchases)
	if event.UserType == "networker" {
		buyer, _ := s.userRepo.GetByID(ctx, event.UserID)
		if buyer != nil && buyer.PlacementStatus == models.PlacementPending && s.placementService != nil {
			if err := s.placementService.ParkBV(ctx, event.UserID, event.OrderID, event.BVAmount); err != nil {
				log.Printf("park_bv error: %v", err)
			}
			result.BinaryHeld = true
		} else {
			binaryResults, err := s.binaryService.DistributeBVAndMatch(ctx, event.UserID, event.OrderID, event.BVAmount)
			if err != nil {
				log.Printf("binary_commission error: %v", err)
			} else {
				result.BinaryCommissions = binaryResults
			}
		}
	}

	// 3. Franchise commission (if purchase is from a franchise that is sponsored by a networker)
	if event.FranchiseID != "" {
		franchiseResult, err := s.processFranchiseCommission(ctx, event)
		if err != nil {
			log.Printf("franchise_commission error: %v", err)
		} else {
			result.FranchiseCommission = franchiseResult
		}
	}

	return result, nil
}

func (s *CommissionService) processDirectCommission(ctx context.Context, event *models.PurchaseEvent) (*models.DirectCommResult, error) {
	buyer, err := s.userRepo.GetByID(ctx, event.UserID)
	if err != nil {
		return nil, errors.New("buyer not found")
	}

	if buyer.SponsorUserID == nil {
		return nil, nil
	}

	sponsor, err := s.userRepo.GetByID(ctx, *buyer.SponsorUserID)
	if err != nil {
		return nil, errors.New("sponsor not found")
	}

	if sponsor.Status != models.UserStatusActive || sponsor.Role != models.RoleNetworker {
		return &models.DirectCommResult{
			SponsorID: sponsor.UserID,
			Amount:    0,
			Capped:    true,
		}, nil
	}

	directPercent, err := s.configRepo.GetCommissionValue(ctx, "direct_commission_percent")
	if err != nil {
		directPercent = 10
	}

	commission := int64(float64(event.BVAmount) * directPercent / 100)
	if commission <= 0 {
		return &models.DirectCommResult{SponsorID: sponsor.UserID}, nil
	}

	refType := models.RefTypePurchase
	desc := fmt.Sprintf("Direct commission from %s", buyer.FullName)
	orderID := event.OrderID

	decision, err := s.activationSvc.CreditOrHold(ctx, CreditOrHoldInput{
		UserID:        sponsor.UserID,
		WalletType:    models.WalletDirect,
		Source:        models.SourceDirectCommission,
		Amount:        commission,
		ReferenceID:   &orderID,
		ReferenceType: &refType,
		Description:   &desc,
	})
	if err != nil {
		return nil, err
	}
	if decision.Skipped {
		return nil, errors.New("direct commission already processed for this order")
	}

	return &models.DirectCommResult{
		SponsorID:  sponsor.UserID,
		Amount:     decision.Credited,
		Held:       decision.Held,
		HeldAmount: decision.HeldAmount,
	}, nil
}

func (s *CommissionService) processFranchiseCommission(ctx context.Context, event *models.PurchaseEvent) (*models.FranchiseCommResult, error) {
	franchise, err := s.userRepo.GetByID(ctx, event.FranchiseID)
	if err != nil {
		return nil, nil
	}

	if franchise.SponsorUserID == nil {
		return nil, nil
	}

	sponsor, err := s.userRepo.GetByID(ctx, *franchise.SponsorUserID)
	if err != nil || sponsor.Status != models.UserStatusActive || sponsor.Role != models.RoleNetworker {
		return nil, nil
	}

	franchisePercent, err := s.configRepo.GetCommissionValue(ctx, "franchise_commission_percent")
	if err != nil {
		franchisePercent = 10
	}

	commission := int64(float64(event.BVAmount) * franchisePercent / 100)
	if commission <= 0 {
		return nil, nil
	}

	refID := event.OrderID + "-franchise"
	refType := models.RefTypePurchase
	desc := fmt.Sprintf("Franchise commission from %s", franchise.FullName)

	decision, err := s.activationSvc.CreditOrHold(ctx, CreditOrHoldInput{
		UserID:        sponsor.UserID,
		WalletType:    models.WalletDirect,
		Source:        models.SourceFranchiseCommission,
		Amount:        commission,
		ReferenceID:   &refID,
		ReferenceType: &refType,
		Description:   &desc,
	})
	if err != nil {
		return nil, err
	}
	if decision.Skipped {
		return nil, nil
	}

	return &models.FranchiseCommResult{
		SponsorID:  sponsor.UserID,
		Amount:     decision.Credited,
		Held:       decision.Held,
		HeldAmount: decision.HeldAmount,
	}, nil
}
