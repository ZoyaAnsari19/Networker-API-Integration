package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AdminUserService handles admin networker management (status, wallets, adjustments).
type AdminUserService struct {
	db         *pgxpool.Pool
	userRepo   *repository.UserRepo
	ledgerRepo *repository.LedgerRepo
	auditRepo  *repository.AuditRepo
}

func NewAdminUserService(
	db *pgxpool.Pool,
	userRepo *repository.UserRepo,
	ledgerRepo *repository.LedgerRepo,
	auditRepo *repository.AuditRepo,
) *AdminUserService {
	return &AdminUserService{
		db:         db,
		userRepo:   userRepo,
		ledgerRepo: ledgerRepo,
		auditRepo:  auditRepo,
	}
}

func (s *AdminUserService) GetNetworker(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.requireNetworker(ctx, userID)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *AdminUserService) GetWallets(ctx context.Context, userID string) (*models.AdminUserWalletSummary, error) {
	user, err := s.requireNetworker(ctx, userID)
	if err != nil {
		return nil, err
	}
	direct, err := s.ledgerRepo.GetBalance(ctx, userID, models.WalletDirect)
	if err != nil {
		return nil, err
	}
	team, err := s.ledgerRepo.GetBalance(ctx, userID, models.WalletTeam)
	if err != nil {
		return nil, err
	}
	return &models.AdminUserWalletSummary{
		UserID:        user.UserID,
		SponsorID:     user.SponsorID,
		DirectBalance: direct,
		TeamBalance:   team,
		TotalBalance:  direct + team,
	}, nil
}

func (s *AdminUserService) ListLedger(
	ctx context.Context,
	userID, walletType string,
	page, limit int,
) ([]*models.LedgerEntry, int64, error) {
	if _, err := s.requireNetworker(ctx, userID); err != nil {
		return nil, 0, err
	}
	if walletType != models.WalletDirect && walletType != models.WalletTeam {
		return nil, 0, errors.New("wallet_type must be DIRECT or TEAM")
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.ledgerRepo.ListByWallet(ctx, userID, walletType, page, limit)
}

func (s *AdminUserService) UpdateStatus(
	ctx context.Context,
	adminID, userID string,
	req *models.AdminUpdateUserStatusRequest,
	ipAddress, userAgent string,
) (*models.User, error) {
	user, err := s.requireNetworker(ctx, userID)
	if err != nil {
		return nil, err
	}
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if err := validateUserStatus(status); err != nil {
		return nil, err
	}
	if user.Status == status {
		return user, nil
	}
	prev := user.Status
	if err := s.userRepo.SetStatus(ctx, userID, status); err != nil {
		return nil, err
	}
	user.Status = status
	s.writeAudit(ctx, adminID, models.AuditActionAdminUserStatus, models.AuditTargetTypeUser, userID, map[string]any{
		"previous_status": prev,
		"new_status":      status,
		"admin_note":      trimOptional(req.AdminNote),
	}, ipAddress, userAgent)
	return user, nil
}

func (s *AdminUserService) AdjustWallet(
	ctx context.Context,
	adminID, userID string,
	req *models.AdminWalletAdjustRequest,
	ipAddress, userAgent string,
) (*models.AdminWalletAdjustResult, error) {
	user, err := s.requireNetworker(ctx, userID)
	if err != nil {
		return nil, err
	}

	walletType := strings.ToUpper(strings.TrimSpace(req.WalletType))
	entryType := strings.ToUpper(strings.TrimSpace(req.EntryType))
	reason := strings.TrimSpace(req.Reason)

	if walletType != models.WalletDirect && walletType != models.WalletTeam {
		return nil, errors.New("wallet_type must be DIRECT or TEAM")
	}
	if entryType != models.EntryCredit && entryType != models.EntryDebit {
		return nil, errors.New("entry_type must be CREDIT or DEBIT")
	}
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than zero")
	}
	if reason == "" {
		return nil, errors.New("reason is required")
	}
	if len(reason) > 500 {
		return nil, errors.New("reason must be at most 500 characters")
	}

	refID := fmt.Sprintf("admin-adj-%d", time.Now().UnixNano())
	refType := models.RefTypeAdmin
	desc := fmt.Sprintf("Admin adjustment: %s", reason)
	if note := trimOptional(req.AdminNote); note != nil {
		desc = fmt.Sprintf("%s (%s)", desc, *note)
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('admin-wallet:' || $1))`, userID); err != nil {
		return nil, err
	}

	if entryType == models.EntryDebit {
		var balance int64
		if err := tx.QueryRow(ctx, `
			SELECT COALESCE(SUM(CASE WHEN entry_type='CREDIT' THEN amount ELSE -amount END), 0)
			FROM wallet_ledger WHERE user_id = $1 AND wallet_type = $2::wallet_type`,
			userID, walletType,
		).Scan(&balance); err != nil {
			return nil, err
		}
		if balance < req.Amount {
			return nil, errors.New("insufficient wallet balance for debit")
		}
	}

	var ledgerID int64
	err = tx.QueryRow(ctx, `
		INSERT INTO wallet_ledger (user_id, wallet_type, amount, entry_type, source, reference_id, reference_type, description)
		VALUES ($1, $2::wallet_type, $3, $4::entry_type, $5::commission_source, $6, $7::reference_type, $8)
		RETURNING id`,
		userID, walletType, req.Amount, entryType, models.SourceAdminAdjustment,
		refID, refType, desc,
	).Scan(&ledgerID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	direct, _ := s.ledgerRepo.GetBalance(ctx, userID, models.WalletDirect)
	team, _ := s.ledgerRepo.GetBalance(ctx, userID, models.WalletTeam)

	s.writeAudit(ctx, adminID, models.AuditActionAdminWalletAdjustment, models.AuditTargetTypeUser, userID, map[string]any{
		"ledger_id":   ledgerID,
		"sponsor_id":  user.SponsorID,
		"wallet_type": walletType,
		"entry_type":  entryType,
		"amount":      req.Amount,
		"reason":      reason,
		"admin_note":  trimOptional(req.AdminNote),
		"reference_id": refID,
	}, ipAddress, userAgent)

	return &models.AdminWalletAdjustResult{
		LedgerID:      ledgerID,
		UserID:        userID,
		WalletType:    walletType,
		EntryType:     entryType,
		Amount:        req.Amount,
		DirectBalance: direct,
		TeamBalance:   team,
		TotalBalance:  direct + team,
	}, nil
}

func (s *AdminUserService) requireNetworker(ctx context.Context, userID string) (*models.User, error) {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, errors.New("user id is required")
	}
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	if user.Role != models.RoleNetworker {
		return nil, errors.New("only networker accounts can be managed")
	}
	return user, nil
}

func validateUserStatus(status string) error {
	switch status {
	case models.UserStatusActive, models.UserStatusInactive, models.UserStatusBlocked:
		return nil
	default:
		return errors.New("status must be ACTIVE, INACTIVE, or BLOCKED")
	}
}

func trimOptional(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func (s *AdminUserService) writeAudit(
	ctx context.Context,
	actorID, action, targetType, targetID string,
	details map[string]any,
	ipAddress, userAgent string,
) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.Write(ctx, actorID, action, targetType, targetID, details, ipAddress, userAgent)
}
