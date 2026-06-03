package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type PayoutHandler struct {
	payoutService *services.PayoutService
}

func NewPayoutHandler(payoutService *services.PayoutService) *PayoutHandler {
	return &PayoutHandler{payoutService: payoutService}
}

// WithdrawalSchedule GET /api/v1/payouts/schedule
func (h *PayoutHandler) WithdrawalSchedule(c *fiber.Ctx) error {
	res, err := h.payoutService.WithdrawalSchedule(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", res)
}

func (h *PayoutHandler) RequestPayout(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.CreatePayoutRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.WalletType == "" || req.Amount <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "wallet_type and amount are required")
	}
	if strings.TrimSpace(req.PaymentMethod) == "" {
		req.PaymentMethod = "SECURE_WALLET"
	}

	payout, err := h.payoutService.RequestPayout(c.Context(), userID, &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "payout request created", payout)
}

func (h *PayoutHandler) ListPayouts(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}

	payouts, total, err := h.payoutService.ListByUser(c.Context(), userID, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to list payouts")
	}
	return response.Paginated(c, payouts, page, limit, total)
}
