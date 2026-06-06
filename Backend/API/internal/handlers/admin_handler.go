package handlers

import (
	"encoding/json"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type AdminHandler struct {
	packageService  *services.PackageService
	configService   *services.ConfigService
	payoutService   *services.PayoutService
	userRepo        *repository.UserRepo
	adminUserService *services.AdminUserService
}

func NewAdminHandler(packageService *services.PackageService, configService *services.ConfigService,
	payoutService *services.PayoutService, userRepo *repository.UserRepo,
	adminUserService *services.AdminUserService) *AdminHandler {
	return &AdminHandler{
		packageService:   packageService,
		configService:    configService,
		payoutService:    payoutService,
		userRepo:         userRepo,
		adminUserService: adminUserService,
	}
}

// --- Packages ---

func (h *AdminHandler) CreatePackage(c *fiber.Ctx) error {
	var req models.CreatePackageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	pkg, err := h.packageService.Create(c.Context(), &req)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "package created", pkg)
}

func (h *AdminHandler) ListPackages(c *fiber.Ctx) error {
	pkgs, err := h.packageService.ListAll(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", pkgs)
}

func (h *AdminHandler) UpdatePackage(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.UpdatePackageRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := h.packageService.Update(c.Context(), id, &req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "package updated", nil)
}

// --- Commission Config ---

func (h *AdminHandler) ListCommissionConfigs(c *fiber.Ctx) error {
	configs, err := h.configService.ListCommissionConfigs(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", configs)
}

func (h *AdminHandler) UpdateCommissionConfig(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	var req models.UpdateConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := h.configService.UpdateCommissionConfig(c.Context(), req.ConfigKey, req.ConfigValue, adminID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "config updated", nil)
}

// --- Level Bonus Slabs ---

func (h *AdminHandler) ListLevelBonusSlabs(c *fiber.Ctx) error {
	slabs, err := h.configService.ListLevelBonusSlabs(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", slabs)
}

func (h *AdminHandler) UpsertLevelBonusSlab(c *fiber.Ctx) error {
	var req models.UpdateLevelBonusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	slab := &models.LevelBonusSlab{
		PairNumber:   req.PairNumber,
		BonusPercent: req.BonusPercent,
		MaxLevel:     req.MaxLevel,
		IsActive:     req.IsActive,
	}
	if err := h.configService.UpsertLevelBonusSlab(c.Context(), slab); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "level bonus slab updated", nil)
}

// --- Payout Config ---

func (h *AdminHandler) ListPayoutConfigs(c *fiber.Ctx) error {
	configs, err := h.configService.ListPayoutConfigs(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", configs)
}

func (h *AdminHandler) UpdatePayoutConfig(c *fiber.Ctx) error {
	var req struct {
		ConfigKey   string          `json:"config_key"`
		ConfigValue json.RawMessage `json:"config_value"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if err := h.configService.UpdatePayoutConfig(c.Context(), req.ConfigKey, req.ConfigValue); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "payout config updated", nil)
}

// --- Users ---

func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	status := c.Query("status", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}

	users, total, err := h.userRepo.ListByStatus(c.Context(), status, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Paginated(c, users, page, limit, total)
}

func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	user, err := h.adminUserService.GetNetworker(c.Context(), c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", user)
}

func (h *AdminHandler) UpdateUserStatus(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	var req models.AdminUpdateUserStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	user, err := h.adminUserService.UpdateStatus(
		c.Context(), adminID, c.Params("id"), &req, c.IP(), c.Get(fiber.HeaderUserAgent),
	)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	logSubAdminActivity(c, nil, models.AuditActionSubAdminUserStatus, models.AuditTargetTypeUser, user.UserID, map[string]any{
		"status": user.Status,
	})
	return response.Success(c, fiber.StatusOK, "user status updated", user)
}

func (h *AdminHandler) GetUserWallets(c *fiber.Ctx) error {
	wallets, err := h.adminUserService.GetWallets(c.Context(), c.Params("id"))
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", wallets)
}

func (h *AdminHandler) GetUserWalletLedger(c *fiber.Ctx) error {
	walletType := c.Params("type")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	entries, total, err := h.adminUserService.ListLedger(c.Context(), c.Params("id"), walletType, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Paginated(c, entries, page, limit, total)
}

func (h *AdminHandler) AdjustUserWallet(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	var req models.AdminWalletAdjustRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	result, err := h.adminUserService.AdjustWallet(
		c.Context(), adminID, c.Params("id"), &req, c.IP(), c.Get(fiber.HeaderUserAgent),
	)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	logSubAdminActivity(c, nil, models.AuditActionSubAdminWalletAdjustment, models.AuditTargetTypeUser, result.UserID, map[string]any{
		"wallet_type": result.WalletType,
		"entry_type":  result.EntryType,
		"amount":      result.Amount,
		"ledger_id":   result.LedgerID,
	})
	return response.Success(c, fiber.StatusOK, "wallet adjusted", result)
}

// --- Payouts ---

func (h *AdminHandler) ListPayouts(c *fiber.Ctx) error {
	status := c.Query("status", "PENDING")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}

	payouts, total, err := h.payoutService.ListByStatus(c.Context(), status, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Paginated(c, payouts, page, limit, total)
}

func (h *AdminHandler) ApprovePayout(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	payoutID := c.Params("id")
	var req models.ApprovePayoutRequest
	_ = c.BodyParser(&req)

	if err := h.payoutService.ApprovePayout(c.Context(), payoutID, adminID, &req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "payout approved and processed", nil)
}

func (h *AdminHandler) RejectPayout(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	payoutID := c.Params("id")
	var req models.RejectPayoutRequest
	_ = c.BodyParser(&req)

	if err := h.payoutService.RejectPayout(c.Context(), payoutID, adminID, &req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "payout rejected", nil)
}
