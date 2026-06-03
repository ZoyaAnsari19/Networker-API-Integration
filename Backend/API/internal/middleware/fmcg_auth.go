package middleware

import (
	"crypto/subtle"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

func FMCGAPIKeyAuth(apiKeyRepo *repository.APIKeyRepo) fiber.Handler {
	return func(c *fiber.Ctx) error {
		apiKey := c.Get("X-API-Key")
		apiSecret := c.Get("X-API-Secret")

		if apiKey == "" || apiSecret == "" {
			return response.Error(c, fiber.StatusUnauthorized, "missing API key or secret")
		}

		record, err := apiKeyRepo.GetByKey(c.Context(), apiKey)
		if err != nil {
			return response.Error(c, fiber.StatusUnauthorized, "invalid API key")
		}

		if subtle.ConstantTimeCompare([]byte(record.APISecret), []byte(apiSecret)) != 1 {
			return response.Error(c, fiber.StatusUnauthorized, "invalid API secret")
		}

		c.Locals("fmcg_app_name", record.AppName)
		c.Locals("fmcg_app_id", record.ID)
		return c.Next()
	}
}
