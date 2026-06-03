package handlers

import (
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type WalletHandler struct {
	walletService *services.WalletService
}

func NewWalletHandler(walletService *services.WalletService) *WalletHandler {
	return &WalletHandler{walletService: walletService}
}

func (h *WalletHandler) GetBalances(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	balances, err := h.walletService.GetBalances(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get balances")
	}
	return response.Success(c, fiber.StatusOK, "", balances)
}

func (h *WalletHandler) GetLedger(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	walletType := c.Params("type")
	if walletType != "DIRECT" && walletType != "TEAM" {
		return response.Error(c, fiber.StatusBadRequest, "wallet type must be DIRECT or TEAM")
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	entries, total, err := h.walletService.GetLedger(c.Context(), userID, walletType, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get ledger")
	}
	return response.Paginated(c, entries, page, limit, total)
}
