package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"time"
)

// PackageActivationService implements the v2 auto-package rules triggered
// by FMCG whenever a networker makes a Secure-Mart purchase.
//
// Under the v2 activation rule packages only drive `daily_binary_cap` — the
// old 7x/10x lifetime caps are gone, so there is no longer a "top-up"
// action (top-ups only ever extended those lifetime caps).  The branching
// matrix is now:
//
//  1. Purchase below the smallest tier → action = none.
//  2. User has no current package              → ACTIVATE (set daily_binary_cap, flip to ACTIVE).
//  3. Matched package amount  >  current amount → UPGRADE (swap to higher tier's daily_binary_cap).
//  4. Matched package amount  <= current amount → NO_CHANGE (record user_package row for audit, nothing else).
//
// Monthly income / shopping counters are NOT reset here — they are driven
// exclusively by ActivationService.
type PackageActivationService struct {
	userRepo    *repository.UserRepo
	packageRepo *repository.PackageRepo
}

func NewPackageActivationService(userRepo *repository.UserRepo, packageRepo *repository.PackageRepo) *PackageActivationService {
	return &PackageActivationService{userRepo: userRepo, packageRepo: packageRepo}
}

// MatchPackage is a read-only lookup: returns the best-fit ACTIVE package
// for the given purchase amount, or an error if the amount is below all
// tiers.
func (s *PackageActivationService) MatchPackage(ctx context.Context, amount int64) (*models.Package, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}
	return s.packageRepo.FindBestForAmount(ctx, amount)
}

// ProcessPurchase evaluates a purchase amount against the package tiers
// and applies the appropriate action (none / activated / upgraded /
// no_change).
func (s *PackageActivationService) ProcessPurchase(ctx context.Context, userID string, amount int64) (*models.PackageActivationResult, error) {
	if amount <= 0 {
		return nil, errors.New("amount must be > 0")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if user.Role != models.RoleNetworker {
		return &models.PackageActivationResult{
			Action:         models.PkgActionNone,
			PurchaseAmount: amount,
			Message:        "user is not a networker; package activation skipped",
		}, nil
	}

	best, err := s.packageRepo.FindBestForAmount(ctx, amount)
	if err != nil {
		return &models.PackageActivationResult{
			Action:         models.PkgActionNone,
			PurchaseAmount: amount,
			DailyBinaryCap: user.DailyBinaryCap,
			Message:        "purchase amount below smallest package tier; no package activated",
		}, nil
	}

	now := time.Now()

	// Case 1: no current package → activate fresh.
	if user.CurrentPackageID == nil {
		if err := s.userRepo.ActivatePackage(ctx, userID, best.PackageID, best.DailyBinaryCap, now); err != nil {
			return nil, err
		}
		_ = s.packageRepo.InsertUserPackage(ctx, &models.UserPackage{
			UserID: userID, PackageID: best.PackageID, AmountPaid: amount, Status: models.UserPackageActive,
		})
		return &models.PackageActivationResult{
			Action:         models.PkgActionActivated,
			PackageID:      &best.PackageID,
			PackageName:    &best.Name,
			PackageAmount:  best.Amount,
			DailyBinaryCap: best.DailyBinaryCap,
			PurchaseAmount: amount,
			Message:        "package activated",
		}, nil
	}

	current, err := s.packageRepo.GetByID(ctx, *user.CurrentPackageID)
	if err != nil {
		return nil, errors.New("current package not found")
	}

	// Case 2: matched package is a higher tier → UPGRADE to new daily cap.
	if best.Amount > current.Amount {
		_ = s.packageRepo.ExpireUserPackage(ctx, userID)
		if err := s.userRepo.ActivatePackage(ctx, userID, best.PackageID, best.DailyBinaryCap, now); err != nil {
			return nil, err
		}
		_ = s.packageRepo.InsertUserPackage(ctx, &models.UserPackage{
			UserID: userID, PackageID: best.PackageID, AmountPaid: amount, Status: models.UserPackageActive,
		})
		return &models.PackageActivationResult{
			Action:         models.PkgActionUpgraded,
			PackageID:      &best.PackageID,
			PackageName:    &best.Name,
			PackageAmount:  best.Amount,
			DailyBinaryCap: best.DailyBinaryCap,
			PurchaseAmount: amount,
			Message:        "package upgraded to higher tier (daily cap updated)",
		}, nil
	}

	// Case 3: matched package is same or lower tier → NO_CHANGE. Lifetime
	// caps no longer exist, so buying an equal-or-smaller tier is a pure
	// audit-trail event. We still record the user_packages row so admin
	// history remains complete.
	_ = s.packageRepo.InsertUserPackage(ctx, &models.UserPackage{
		UserID: userID, PackageID: best.PackageID, AmountPaid: amount, Status: models.UserPackageActive,
	})
	return &models.PackageActivationResult{
		Action:         models.PkgActionNoChange,
		PackageID:      user.CurrentPackageID,
		PackageName:    &current.Name,
		PackageAmount:  current.Amount,
		DailyBinaryCap: user.DailyBinaryCap,
		PurchaseAmount: amount,
		Message:        "matched tier is not higher than current; daily cap unchanged",
	}, nil
}
