package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"log"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ActivationService implements the v2 monthly activation rule.
//
// Commission credits walk through `CreditOrHold`:
//   - When the user's current-period income has not yet crossed the Rs 25k
//     threshold, the credit is written to `wallet_ledger` as usual and the
//     monthly income counter is bumped.
//   - When the threshold has been crossed AND the user has not bought
//     Rs 2,500 worth of their own goods this month, the credit is
//     quarantined into `held_income` with status=HELD.
//
// The user's own purchases (non-commission) walk through `RecordShopping`,
// which bumps the monthly shopping counter and, on the exact call that
// flips it from below to at/above the threshold, releases every HELD row
// for the current period.
//
// Month rollover is handled lazily on every write (see the repo methods)
// and a daily-idempotent cron calls `ForfeitPreviousMonthHeld` on day 1 to
// flip any stale HELD rows to FORFEITED.
type ActivationService struct {
	db         *pgxpool.Pool
	userRepo   *repository.UserRepo
	ledgerRepo *repository.LedgerRepo
	heldRepo   *repository.HeldIncomeRepo
	// now is injectable so E2E tests can simulate month rollover without
	// touching the DB clock. Defaults to time.Now.
	now func() time.Time
}

func NewActivationService(db *pgxpool.Pool, userRepo *repository.UserRepo, ledgerRepo *repository.LedgerRepo, heldRepo *repository.HeldIncomeRepo) *ActivationService {
	return &ActivationService{
		db:         db,
		userRepo:   userRepo,
		ledgerRepo: ledgerRepo,
		heldRepo:   heldRepo,
		now:        time.Now,
	}
}

// CreditDecision is the outcome of CreditOrHold. Exactly one of the two
// "payout" fields (LedgerID / HeldID) is non-zero when err == nil and the
// user is eligible for credit.
type CreditDecision struct {
	// Credited is the amount posted to wallet_ledger; zero on a HELD outcome.
	Credited int64
	// Held is true when the amount landed in held_income instead of
	// wallet_ledger because the monthly shopping gate was not satisfied.
	Held bool
	// HeldAmount mirrors the amount quarantined (always equals Amount on
	// HELD, else 0).
	HeldAmount int64
	// LedgerID is the wallet_ledger row id on a successful credit; zero when
	// Held=true or when the call was a no-op (e.g. duplicate reference id).
	LedgerID int64
	// HeldID is the held_income row id on a quarantined credit.
	HeldID int64
	// Skipped=true when the operation was a no-op, e.g. idempotency replay.
	Skipped bool
}

// CreditOrHoldInput bundles the parameters needed to decide whether a
// single commission credit lands in the ledger or in held_income.
type CreditOrHoldInput struct {
	UserID        string
	WalletType    string
	Source        string
	Amount        int64
	ReferenceID   *string
	ReferenceType *string
	Description   *string
	// SkipIdempotencyCheck bypasses the wallet_ledger unique-reference
	// check. Binary matches produce two credits (match + level bonus) that
	// share the same reference_id but differ on source, so the compound
	// unique index is already correct; the flag exists so the release path
	// can re-credit held rows without tripping the dup check.
	SkipIdempotencyCheck bool
}

// CreditOrHold is the single entry point every commission service uses to
// persist a credit. It owns its own transaction (user row locked FOR
// UPDATE) so concurrent credits and shops against the same user converge.
func (s *ActivationService) CreditOrHold(ctx context.Context, in CreditOrHoldInput) (*CreditDecision, error) {
	if in.Amount <= 0 {
		return &CreditDecision{Skipped: true}, nil
	}
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	decision, err := s.creditOrHoldTx(ctx, tx, in)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return decision, nil
}

// creditOrHoldTx is the inner body; exported variant (CreditOrHold) owns
// the transaction lifecycle.
func (s *ActivationService) creditOrHoldTx(ctx context.Context, tx pgx.Tx, in CreditOrHoldInput) (*CreditDecision, error) {
	periodYM := models.CurrentPeriodYMFromTime(s.now())

	user, err := s.userRepo.GetByIDForUpdateTx(ctx, tx, in.UserID)
	if err != nil {
		return nil, err
	}

	// Non-networker / inactive users cannot earn. Note that the v2 rule
	// leaves status untouched across month rollovers; legitimate users
	// stay ACTIVE, and inactive/blocked accounts simply never accrue.
	if user.Role != models.RoleNetworker || user.Status != models.UserStatusActive {
		return &CreditDecision{Skipped: true}, nil
	}

	// Idempotency: if a ledger row already exists for this (user, wallet,
	// source, ref) tuple, the credit must not be applied twice. The
	// held_income table has no equivalent uniqueness constraint by design
	// (the ref_id can repeat across different sources), so the check is
	// scoped to wallet_ledger which is the outcome we care about.
	if in.ReferenceID != nil && !in.SkipIdempotencyCheck {
		exists, err := s.ledgerRepo.HasReferenceTx(ctx, tx, in.UserID, in.WalletType, in.Source, *in.ReferenceID)
		if err != nil {
			return nil, err
		}
		if exists {
			return &CreditDecision{Skipped: true}, nil
		}
	}

	// Mirror the user's in-memory struct with any rollover the next write
	// is about to perform on disk — so the threshold check sees correct
	// values even if this is the first write of a new month.
	if user.IncomePeriodYM != periodYM {
		user.MonthlyIncomePaise = 0
		user.MonthlyShoppingPaise = 0
		user.IncomePeriodYM = periodYM
	}

	thresholdCrossed := user.MonthlyIncomePaise > models.MonthlyIncomeThresholdPaise
	shoppingDone := user.MonthlyShoppingPaise >= models.MonthlyShoppingThresholdPaise

	if thresholdCrossed && !shoppingDone {
		held := &models.HeldIncome{
			UserID:        in.UserID,
			WalletType:    in.WalletType,
			Source:        in.Source,
			Amount:        in.Amount,
			ReferenceID:   in.ReferenceID,
			ReferenceType: in.ReferenceType,
			Description:   in.Description,
			PeriodYM:      periodYM,
			Status:        models.HeldStatusHeld,
		}
		if err := s.heldRepo.InsertTx(ctx, tx, held); err != nil {
			return nil, err
		}
		return &CreditDecision{
			Held:       true,
			HeldAmount: in.Amount,
			HeldID:     held.ID,
		}, nil
	}

	// Normal path: post to ledger, tick the monthly income counter.
	entry := &models.LedgerEntry{
		UserID:        in.UserID,
		WalletType:    in.WalletType,
		Amount:        in.Amount,
		Source:        in.Source,
		ReferenceID:   in.ReferenceID,
		ReferenceType: in.ReferenceType,
		Description:   in.Description,
	}
	ledgerID, err := s.ledgerRepo.CreditTx(ctx, tx, entry)
	if err != nil {
		return nil, err
	}
	if err := s.userRepo.AddMonthlyIncomeTx(ctx, tx, in.UserID, in.Amount, periodYM); err != nil {
		return nil, err
	}
	return &CreditDecision{
		Credited: in.Amount,
		LedgerID: ledgerID,
	}, nil
}

// RecordShopping is invoked after FMCG commits a networker's own purchase.
// It bumps the monthly shopping counter and, if the call pushed the user
// past the Rs 2,500 threshold for the first time this month, releases
// every HELD row for the current period into wallet_ledger and bumps the
// income counter accordingly.
//
// Idempotency: callers pass a stable `orderRef`; when `orderRef` is
// non-empty we first check for a "SHOPPING:<orderRef>" marker in
// `monthly_shopping_log`-less book-keeping. Since we don't yet have a
// dedicated shopping ledger, the `fmcg_handler` is expected to call us
// exactly once per unique order (the upstream idempotency check on
// `wallet_ledger` is enough for the commission path; here we simply
// document the assumption).
func (s *ActivationService) RecordShopping(ctx context.Context, userID string, amount int64) (*models.ShoppingResult, error) {
	if amount <= 0 {
		return nil, errors.New("shopping amount must be > 0")
	}
	now := s.now()
	periodYM := models.CurrentPeriodYMFromTime(now)

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// Row-lock the user so concurrent credits / shops serialize.
	if _, err := s.userRepo.GetByIDForUpdateTx(ctx, tx, userID); err != nil {
		return nil, err
	}

	crossed, err := s.userRepo.AddMonthlyShoppingTx(ctx, tx, userID, amount, periodYM)
	if err != nil {
		return nil, err
	}

	incomePaise, shoppingPaise, _, err := s.userRepo.GetMonthlyStateTx(ctx, tx, userID)
	if err != nil {
		return nil, err
	}

	result := &models.ShoppingResult{
		MonthlyIncomePaise:   incomePaise,
		MonthlyShoppingPaise: shoppingPaise,
		PeriodYM:             periodYM,
	}

	// Release HELD rows only on the exact call that crossed the shopping
	// threshold. Once a user is "over", subsequent credits skip the HELD
	// path entirely (see creditOrHoldTx shoppingDone guard), so there is
	// nothing left to release for them this month until the next rollover.
	if crossed {
		held, err := s.heldRepo.ListHeldForReleaseTx(ctx, tx, userID, periodYM)
		if err != nil {
			return nil, err
		}
		for _, h := range held {
			entry := &models.LedgerEntry{
				UserID:        h.UserID,
				WalletType:    h.WalletType,
				Amount:        h.Amount,
				Source:        h.Source,
				ReferenceID:   h.ReferenceID,
				ReferenceType: h.ReferenceType,
				Description:   h.Description,
			}
			ledgerID, err := s.ledgerRepo.CreditTx(ctx, tx, entry)
			if err != nil {
				return nil, err
			}
			if err := s.userRepo.AddMonthlyIncomeTx(ctx, tx, userID, h.Amount, periodYM); err != nil {
				return nil, err
			}
			if err := s.heldRepo.MarkReleasedTx(ctx, tx, h.ID, ledgerID); err != nil {
				return nil, err
			}
			result.ReleasedCount++
			result.ReleasedAmount += h.Amount
		}
		// Re-read so the caller sees the post-release income value.
		newIncome, _, _, err := s.userRepo.GetMonthlyStateTx(ctx, tx, userID)
		if err != nil {
			return nil, err
		}
		result.MonthlyIncomePaise = newIncome
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return result, nil
}

// ForfeitPreviousMonthHeld is the monthly cron entrypoint. It flips every
// HELD row whose period_ym is strictly less than the current period to
// FORFEITED in one bulk UPDATE and logs the count.
func (s *ActivationService) ForfeitPreviousMonthHeld(ctx context.Context) (int64, error) {
	periodYM := models.CurrentPeriodYMFromTime(s.now())
	n, err := s.heldRepo.ForfeitStale(ctx, periodYM)
	if err != nil {
		return 0, err
	}
	if n > 0 {
		log.Printf("activation_rule: forfeited %d stale HELD rows (period < %d)", n, periodYM)
	}
	return n, nil
}

// CurrentPeriodYM exposes the service's clock to callers that need to read
// the current period identifier (tests + profile handlers).
func (s *ActivationService) CurrentPeriodYM() int {
	return models.CurrentPeriodYMFromTime(s.now())
}

// SetClock is test-only; production code should never touch the clock.
func (s *ActivationService) SetClock(now func() time.Time) {
	if now != nil {
		s.now = now
	}
}

// RunMonthlyForfeit is a thin wrapper suitable for cron bindings that do
// not want to shuttle context through themselves.
func RunMonthlyForfeit(ctx context.Context, svc *ActivationService) {
	if svc == nil {
		return
	}
	if _, err := svc.ForfeitPreviousMonthHeld(ctx); err != nil {
		log.Printf("activation_rule: forfeit cron error: %v", err)
	}
}
