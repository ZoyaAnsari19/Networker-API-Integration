package middleware

import (
	"encoding/json"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type updateConfigBody struct {
	ConfigKey string `json:"config_key"`
}

// CommissionConfigUpdateRequired checks the JSON body config_key and requires
// platform_config.p2p.manage for p2p_* keys, else commission_placement.manage.
func CommissionConfigUpdateRequired(staffService *services.StaffService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		if role == models.RoleAdmin {
			return c.Next()
		}
		if role != models.RoleSubAdmin {
			return response.Error(c, fiber.StatusForbidden, "admin access required")
		}
		userID, _ := c.Locals("user_id").(string)
		if userID == "" {
			return response.Error(c, fiber.StatusUnauthorized, "missing actor")
		}
		raw := append([]byte(nil), c.Body()...)
		var body updateConfigBody
		if err := json.Unmarshal(raw, &body); err != nil || body.ConfigKey == "" {
			return response.Error(c, fiber.StatusBadRequest, "invalid request body")
		}
		required := models.RequiredPermissionForCommissionConfigKey(body.ConfigKey)
		perms, err := staffService.LoadPermissionsForRequest(c.Context(), userID)
		if err != nil {
			return response.Error(c, fiber.StatusInternalServerError, "could not resolve permissions")
		}
		c.Locals("permissions", perms)
		for _, p := range perms {
			if p == required {
				c.Request().SetBody(raw)
				return c.Next()
			}
		}
		return response.Error(c, fiber.StatusForbidden, "missing required permission")
	}
}
