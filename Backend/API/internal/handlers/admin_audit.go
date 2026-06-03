package handlers

import (
	"strings"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"

	"github.com/gofiber/fiber/v2"
)

// logSubAdminActivity records a successful high-risk write performed by a
// SUB_ADMIN actor. Super-admin actions are not logged here.
func logSubAdminActivity(
	c *fiber.Ctx,
	staffSvc *services.StaffService,
	action, targetType, targetID string,
	details map[string]any,
) {
	if staffSvc == nil {
		return
	}
	role, _ := c.Locals("role").(string)
	if strings.ToUpper(strings.TrimSpace(role)) != models.RoleSubAdmin {
		return
	}
	actorID, _ := c.Locals("user_id").(string)
	staffSvc.LogSubAdminActivity(c.Context(), actorID, action, targetType, targetID, details, c.IP(), c.Get(fiber.HeaderUserAgent))
}
