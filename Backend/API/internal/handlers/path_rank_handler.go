package handlers

import (
	"log"
	"strings"

	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type PathRankHandler struct {
	pathRankService *services.PathRankService
}

func NewPathRankHandler(pathRankService *services.PathRankService) *PathRankHandler {
	return &PathRankHandler{pathRankService: pathRankService}
}

// GetMyPathRank returns career path rank progress, direct-team BV, leg ratios, and recent pairs.
func (h *PathRankHandler) GetMyPathRank(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit, _ := strconv.Atoi(c.Query("pair_limit", "10"))

	summary, err := h.pathRankService.GetSummary(c.Context(), userID, limit)
	if err != nil {
		log.Printf("path_rank: user=%s err=%v", userID, err)
		msg := "failed to load path rank"
		if strings.Contains(err.Error(), "path_rank_slabs") {
			msg = "path rank is not configured yet (run database migration 017_path_rank_slabs.sql)"
		}
		return response.Error(c, fiber.StatusInternalServerError, msg)
	}
	return response.Success(c, fiber.StatusOK, "", summary)
}
