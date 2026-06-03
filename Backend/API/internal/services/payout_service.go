package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PayoutService struct {
	db          *pgxpool.Pool
	payoutRepo  *repository.PayoutRepo
	ledgerRepo  *repository.LedgerRepo
	userRepo    *repository.UserRepo
	configRepo  *repository.ConfigRepo
	scClient    *SecureCoinClient
	authService *AuthService
}

func NewPayoutService(db *pgxpool.Pool, payoutRepo *repository.PayoutRepo, ledgerRepo *repository.LedgerRepo,
	userRepo *repository.UserRepo, configRepo *repository.ConfigRepo, scClient *SecureCoinClient,
	authService *AuthService) *PayoutService {
	return &PayoutService{
		db: db, payoutRepo: payoutRepo, ledgerRepo: ledgerRepo,
		userRepo: userRepo, configRepo: configRepo, scClient: scClient, authService: authService,
	}
}

// WithdrawalSchedule returns calendar / IST window / fee knobs for the withdraw UI.
func (s *PayoutService) WithdrawalSchedule(ctx context.Context) (*models.WithdrawalScheduleResponse, error) {
	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)
	directDates, _ := s.getWalletAllowedDates(ctx, "withdrawal_allowed_dates_direct")
	teamDates, _ := s.getWalletAllowedDates(ctx, "withdrawal_allowed_dates_team")
	if len(directDates) == 0 {
		directDates, _ = s.getAllowedDatesLegacy(ctx)
	}
	if len(teamDates) == 0 {
		teamDates = directDates
	}
	startH := s.getIntPayoutCfg(ctx, "withdrawal_ist_start_hour", 10)
	endH := s.getIntPayoutCfg(ctx, "withdrawal_ist_end_hour", 17)
	hour := now.Hour()
	within := hour >= startH && hour < endH
	minAmt, _ := s.getMinWithdrawalPaise(ctx)
	svcPct := s.getFloatPayoutCfg(ctx, "withdrawal_service_charge_percent", 0.5)
	tdsPct := s.getFloatPayoutCfg(ctx, "withdrawal_tds_percent", 1.0)
	maxPct, _ := s.getMaxPercentOfMonthlyIncome(ctx)
	today := now.Day()
	return &models.WithdrawalScheduleResponse{
		ServerNowIST:              now.Format(time.RFC3339),
		ISTStartHour:              startH,
		ISTEndHour:                endH,
		WithinTimeWindow:          within,
		MinWithdrawalPaise:        minAmt,
		ServiceChargePercent:      svcPct,
		TDSPercent:                tdsPct,
		AllowedDatesDirect:        directDates,
		AllowedDatesTeam:          teamDates,
		TodayAllowedForDirect:     dayInList(today, directDates),
		TodayAllowedForTeam:       dayInList(today, teamDates),
		MaxPercentOfMonthlyIncome: maxPct,
	}, nil
}

func dayInList(day int, list []int) bool {
	for _, d := range list {
		if d == day {
			return true
		}
	}
	return false
}

func (s *PayoutService) RequestPayout(ctx context.Context, userID string, req *models.CreatePayoutRequest) (*models.PayoutRequest, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if err := s.authService.VerifyTransactionPassword(ctx, userID, req.TransactionPassword); err != nil {
		return nil, err
	}

	loc, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		loc = time.UTC
	}
	now := time.Now().In(loc)

	startH := s.getIntPayoutCfg(ctx, "withdrawal_ist_start_hour", 10)
	endH := s.getIntPayoutCfg(ctx, "withdrawal_ist_end_hour", 17)
	hour := now.Hour()
	if hour < startH || hour >= endH {
		return nil, errors.New("withdrawals are only allowed between configured IST hours")
	}

	var allowedDates []int
	if req.WalletType == models.WalletDirect {
		allowedDates, _ = s.getWalletAllowedDates(ctx, "withdrawal_allowed_dates_direct")
	} else {
		allowedDates, _ = s.getWalletAllowedDates(ctx, "withdrawal_allowed_dates_team")
	}
	if len(allowedDates) == 0 {
		allowedDates, _ = s.getAllowedDatesLegacy(ctx)
	}
	todayDay := now.Day()
	if !dayInList(todayDay, allowedDates) {
		return nil, errors.New("withdrawals are not allowed today for the selected wallet type")
	}

	hasPending, _ := s.payoutRepo.HasOpenPendingPayout(ctx, userID)
	if hasPending {
		return nil, errors.New("you already have a pending withdrawal request")
	}

	minAmt, err := s.getMinWithdrawalPaise(ctx)
	if err != nil {
		minAmt = 50000
	}
	if req.Amount < minAmt {
		return nil, errors.New("amount is below the minimum withdrawal limit")
	}

	balance, err := s.ledgerRepo.GetBalance(ctx, userID, req.WalletType)
	if err != nil {
		return nil, err
	}
	if req.Amount > balance {
		return nil, errors.New("insufficient wallet balance")
	}

	maxPercent, err := s.getMaxPercentOfMonthlyIncome(ctx)
	if err != nil {
		maxPercent = 100
	}
	if maxPercent < 100 {
		monthlyIncome, _ := s.ledgerRepo.GetMonthlyIncome(ctx, userID, now.Year(), int(now.Month()))
		maxWithdrawable := monthlyIncome * int64(maxPercent) / 100
		if req.Amount > maxWithdrawable {
			return nil, errors.New("amount exceeds allowed percentage of monthly income")
		}
	}

	svcPct := s.getFloatPayoutCfg(ctx, "withdrawal_service_charge_percent", 0.5)
	tdsPct := s.getFloatPayoutCfg(ctx, "withdrawal_tds_percent", 1.0)
	sc := calcWithdrawalFeePaise(req.Amount, svcPct)
	tds := calcWithdrawalFeePaise(req.Amount, tdsPct)
	net := req.Amount - sc - tds
	if net <= 0 {
		return nil, errors.New("amount too small after service charge and TDS")
	}
	if sc+tds > req.Amount {
		return nil, errors.New("invalid fee configuration")
	}

	pm := strings.TrimSpace(strings.ToUpper(req.PaymentMethod))
	if pm == "" {
		pm = "SECURE_WALLET"
	}
	if pm != "SECURE_WALLET" {
		return nil, errors.New("withdrawals are paid to your Secure Wallet only (payment_method must be SECURE_WALLET)")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	payout := &models.PayoutRequest{
		UserID:             userID,
		WalletType:         req.WalletType,
		RequestedAmount:    req.Amount,
		ServiceChargePaise: sc,
		TDSPaise:           tds,
		NetPayoutPaise:     net,
		PaymentMethod:      pm,
		SCUserEmail:        &user.Email,
	}
	if err := s.payoutRepo.Create(ctx, payout); err != nil {
		return nil, err
	}
	return payout, nil
}

func calcWithdrawalFeePaise(amount int64, pct float64) int64 {
	if pct <= 0 || amount <= 0 {
		return 0
	}
	bp := int64(pct * 100)
	if bp <= 0 {
		return 0
	}
	return amount * bp / 10000
}

func (s *PayoutService) ApprovePayout(ctx context.Context, payoutID, adminID string, req *models.ApprovePayoutRequest) error {
	payout, err := s.payoutRepo.GetByID(ctx, payoutID)
	if err != nil {
		return errors.New("payout not found")
	}
	if payout.Status != models.PayoutPending {
		return errors.New("payout is not in pending status")
	}

	approvedAmt := payout.RequestedAmount
	if req.Amount != nil && *req.Amount > 0 {
		approvedAmt = *req.Amount
	}

	debitEntry := &models.LedgerEntry{
		UserID:        payout.UserID,
		WalletType:    payout.WalletType,
		Amount:        approvedAmt,
		Source:        models.SourceWithdrawal,
		ReferenceID:   &payout.PayoutID,
		ReferenceType: strPtr(models.RefTypePayout),
	}
	if err := s.ledgerRepo.Debit(ctx, debitEntry); err != nil {
		return err
	}

	scRef := ""
	if s.scClient != nil && payout.SCUserEmail != nil {
		ref, err := s.scClient.IssueReward(ctx, *payout.SCUserEmail, approvedAmt, "MLM Payout: "+payout.PayoutID)
		if err != nil {
			reverseEntry := &models.LedgerEntry{
				UserID:        payout.UserID,
				WalletType:    payout.WalletType,
				Amount:        approvedAmt,
				Source:        models.SourceAdminAdjustment,
				ReferenceID:   &payout.PayoutID,
				ReferenceType: strPtr(models.RefTypePayout),
			}
			_ = s.ledgerRepo.Credit(ctx, reverseEntry)

			_ = s.payoutRepo.UpdateStatus(ctx, payoutID, models.PayoutFailed, &adminID, strPtr("SC API failed: "+err.Error()), nil, nil)
			return errors.New("secure-coin payout failed: " + err.Error())
		}
		scRef = ref
	}

	return s.payoutRepo.UpdateStatus(ctx, payoutID, models.PayoutCompleted, &adminID, req.AdminNote, &approvedAmt, &scRef)
}

func (s *PayoutService) RejectPayout(ctx context.Context, payoutID, adminID string, req *models.RejectPayoutRequest) error {
	payout, err := s.payoutRepo.GetByID(ctx, payoutID)
	if err != nil {
		return errors.New("payout not found")
	}
	if payout.Status != models.PayoutPending {
		return errors.New("payout is not in pending status")
	}
	return s.payoutRepo.UpdateStatus(ctx, payoutID, models.PayoutRejected, &adminID, &req.AdminNote, nil, nil)
}

func (s *PayoutService) ListByUser(ctx context.Context, userID string, page, limit int) ([]*models.PayoutRequest, int64, error) {
	return s.payoutRepo.ListByUser(ctx, userID, page, limit)
}

func (s *PayoutService) ListByStatus(ctx context.Context, status string, page, limit int) ([]*models.PayoutRequest, int64, error) {
	return s.payoutRepo.ListByStatus(ctx, status, page, limit)
}

func (s *PayoutService) getAllowedDatesLegacy(ctx context.Context) ([]int, error) {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, "allowed_dates")
	if err != nil {
		return []int{5, 15, 25}, nil
	}
	var v struct{ Value []int `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return []int{5, 15, 25}, nil
	}
	return v.Value, nil
}

func (s *PayoutService) getWalletAllowedDates(ctx context.Context, key string) ([]int, error) {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, key)
	if err != nil {
		return nil, err
	}
	var v struct{ Value []int `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return nil, err
	}
	return v.Value, nil
}

func (s *PayoutService) getMinWithdrawalPaise(ctx context.Context) (int64, error) {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, "min_withdrawal_amount")
	if err != nil {
		return 50000, err
	}
	var v struct{ Value int64 `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return 50000, err
	}
	return v.Value, nil
}

func (s *PayoutService) getIntPayoutCfg(ctx context.Context, key string, def int) int {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, key)
	if err != nil {
		return def
	}
	var v struct{ Value int `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return def
	}
	return v.Value
}

func (s *PayoutService) getFloatPayoutCfg(ctx context.Context, key string, def float64) float64 {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, key)
	if err != nil {
		return def
	}
	var v struct{ Value float64 `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return def
	}
	return v.Value
}

func (s *PayoutService) getMaxPercentOfMonthlyIncome(ctx context.Context) (int, error) {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, "withdrawal_max_percent_of_monthly_income")
	if err != nil {
		return s.getMaxPercentOfMonthlyIncomeLegacy(ctx)
	}
	var v struct{ Value int `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return s.getMaxPercentOfMonthlyIncomeLegacy(ctx)
	}
	return v.Value, nil
}

func (s *PayoutService) getMaxPercentOfMonthlyIncomeLegacy(ctx context.Context) (int, error) {
	cfg, err := s.configRepo.GetPayoutConfig(ctx, "max_percent_of_monthly_income")
	if err != nil {
		return 100, nil
	}
	var v struct{ Value int `json:"value"` }
	if err := json.Unmarshal(cfg.ConfigValue, &v); err != nil {
		return 100, nil
	}
	return v.Value, nil
}
