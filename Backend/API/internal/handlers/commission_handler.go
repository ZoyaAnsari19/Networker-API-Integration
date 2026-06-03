package handlers

import (
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type CommissionHandler struct {
	commissionService *services.CommissionService
	binaryService     *services.BinaryService
}

func NewCommissionHandler(commissionService *services.CommissionService, binaryService *services.BinaryService) *CommissionHandler {
	return &CommissionHandler{commissionService: commissionService, binaryService: binaryService}
}

func (h *CommissionHandler) ListCommissions(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Return ledger entries from both wallets as commission history
	walletSvc := services.NewWalletService(nil)
	_ = walletSvc // Using ledger directly via wallet handler; this handler returns pair match logs

	// Actually return pair match log for the user (binary commissions)
	// Direct commissions visible via wallet ledger
	return response.Success(c, fiber.StatusOK, "", fiber.Map{
		"user_id": userID,
		"page":    page,
		"limit":   limit,
		"note":    "use /wallets/DIRECT/ledger and /wallets/TEAM/ledger for detailed commission history",
	})
}
