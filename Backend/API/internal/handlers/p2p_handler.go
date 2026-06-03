package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type P2PHandler struct {
	p2pService *services.P2PService
}

func NewP2PHandler(p2pService *services.P2PService) *P2PHandler {
	return &P2PHandler{p2pService: p2pService}
}

// Lookup GET /api/v1/p2p/lookup?sponsor_id=SPFxxxxx
// Returns the receiver's full_name + eligibility so the UI can populate the
// "Receiver Name" read-only field and gate the Transfer button.
func (h *P2PHandler) Lookup(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	sponsorID := c.Query("sponsor_id")
	if sponsorID == "" {
		return response.Error(c, fiber.StatusBadRequest, "sponsor_id is required")
	}
	res, err := h.p2pService.Lookup(c.Context(), userID, sponsorID)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", res)
}

// Quote GET /api/v1/p2p/quote?amount=N
// Returns platform config (min_amount, service_charge_percent, enabled) and,
// when amount is supplied, the computed fee and net credited. Amount is in paise.
func (h *P2PHandler) Quote(c *fiber.Ctx) error {
	amount, _ := strconv.ParseInt(c.Query("amount", "0"), 10, 64)
	if amount < 0 {
		amount = 0
	}
	res, err := h.p2pService.Quote(c.Context(), amount)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", res)
}

// Transfer POST /api/v1/p2p/transfer
// Executes a validated peer-to-peer transfer. Idempotency is not modelled
// yet (the UI disables the button during the request); if needed we'll add
// a client-generated idempotency key and uniqueness on p2p_transfers later.
func (h *P2PHandler) Transfer(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.P2PTransferRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	res, err := h.p2pService.Transfer(c.Context(), userID, &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "transfer successful", res)
}

// ListMine GET /api/v1/p2p/transfers?page=&limit=
// Paginated history across both directions (IN + OUT).
func (h *P2PHandler) ListMine(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	items, total, err := h.p2pService.ListForUser(c.Context(), userID, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Paginated(c, items, page, limit, total)
}
