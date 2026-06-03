package middleware

import (
	"fmcg-binary/pkg/jwt"
	"fmcg-binary/pkg/response"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func AuthRequired(jwtManager *jwt.Manager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			return response.Error(c, fiber.StatusUnauthorized, "missing or invalid authorization header")
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		claims, err := jwtManager.ValidateToken(token)
		if err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "invalid or expired token")
		}
		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		return c.Next()
	}
}

func AdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, _ := c.Locals("role").(string)
		if role != "ADMIN" {
			return response.Error(c, fiber.StatusForbidden, "admin access required")
		}
		return c.Next()
	}
}
