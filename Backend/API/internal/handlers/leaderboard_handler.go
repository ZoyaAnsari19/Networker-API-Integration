package handlers

import (
	"log"
	"strconv"

	"fmcg-binary/internal/repository"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type LeaderboardHandler struct {
	leaderboardService *services.LeaderboardService
}

func NewLeaderboardHandler(leaderboardService *services.LeaderboardService) *LeaderboardHandler {
	return &LeaderboardHandler{leaderboardService: leaderboardService}
}

// List returns a privacy-safe competitive leaderboard (read-only aggregates).
func (h *LeaderboardHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)

	scope, err := repository.ParseLeaderboardScope(c.Query("scope", "direct"))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "scope must be direct, binary, or team")
	}
	period, err := repository.ParseLeaderboardPeriod(c.Query("period", "all"))
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "period must be all, week, or month")
	}

	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	data, err := h.leaderboardService.List(c.Context(), userID, scope, period, limit, offset)
	if err != nil {
		log.Printf("leaderboard: user=%s scope=%s period=%s err=%v", userID, scope, period, err)
		return response.Error(c, fiber.StatusInternalServerError, "failed to load leaderboard")
	}
	return response.Success(c, fiber.StatusOK, "", data)
}
