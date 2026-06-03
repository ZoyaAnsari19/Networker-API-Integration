package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type TreeHandler struct {
	treeService *services.TreeService
}

func NewTreeHandler(treeService *services.TreeService) *TreeHandler {
	return &TreeHandler{treeService: treeService}
}

func (h *TreeHandler) GetTree(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	depth, _ := strconv.Atoi(c.Query("depth", "3"))

	tree, err := h.treeService.GetTreeView(c.Context(), userID, depth)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get tree")
	}
	return response.Success(c, fiber.StatusOK, "", tree)
}

// ListTeamSide returns every downline member on the given leg (LEFT | RIGHT)
// relative to the authenticated networker.
func (h *TreeHandler) ListTeamSide(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	leg := strings.ToUpper(c.Query("side", models.LegLeft))
	if leg != models.LegLeft && leg != models.LegRight {
		return response.Error(c, fiber.StatusBadRequest, "side must be LEFT or RIGHT")
	}
	limit, _ := strconv.Atoi(c.Query("limit", "100"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	members, err := h.treeService.GetTeamSide(c.Context(), userID, leg, limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to list team")
	}
	return response.Success(c, fiber.StatusOK, "", fiber.Map{
		"side":    leg,
		"members": members,
		"count":   len(members),
	})
}

// GetTeamStats summarises the caller's full downline (both legs).
func (h *TreeHandler) GetTeamStats(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	stats, err := h.treeService.GetTeamStats(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load team stats")
	}
	return response.Success(c, fiber.StatusOK, "", stats)
}
