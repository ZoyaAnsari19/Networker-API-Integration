package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type PlacementHandler struct {
	placementService *services.PlacementService
}

func NewPlacementHandler(placementService *services.PlacementService) *PlacementHandler {
	return &PlacementHandler{placementService: placementService}
}

func (h *PlacementHandler) ListMyRequests(c *fiber.Ctx) error {
	sponsorID := c.Locals("user_id").(string)
	list, err := h.placementService.ListPendingRequests(c.Context(), sponsorID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	if list == nil {
		list = []*models.PlacementRequest{}
	}
	return response.Success(c, fiber.StatusOK, "", list)
}

func (h *PlacementHandler) DecideMyRequest(c *fiber.Ctx) error {
	sponsorID := c.Locals("user_id").(string)
	requestID := c.Params("id")

	var req models.PlacementDecideRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Leg != models.LegLeft && req.Leg != models.LegRight {
		return response.Error(c, fiber.StatusBadRequest, "leg must be LEFT or RIGHT")
	}

	if err := h.placementService.Decide(c.Context(), requestID, sponsorID, req.Leg, false); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "user placed successfully", nil)
}

func (h *PlacementHandler) AdminListRequests(c *fiber.Ctx) error {
	status := c.Query("status")
	list, err := h.placementService.ListAllRequests(c.Context(), status)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	if list == nil {
		list = []*models.PlacementRequest{}
	}
	return response.Success(c, fiber.StatusOK, "", list)
}

func (h *PlacementHandler) AdminDecideRequest(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	requestID := c.Params("id")

	var req models.PlacementDecideRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Leg != models.LegLeft && req.Leg != models.LegRight {
		return response.Error(c, fiber.StatusBadRequest, "leg must be LEFT or RIGHT")
	}

	if err := h.placementService.Decide(c.Context(), requestID, adminID, req.Leg, true); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "user placed by admin", nil)
}
