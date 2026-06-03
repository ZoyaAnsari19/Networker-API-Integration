package handlers

import (
	"net/http/httptest"
	"testing"

	"fmcg-binary/internal/models"

	"github.com/gofiber/fiber/v2"
)

func TestLogSubAdminActivitySkipsAdminRole(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	called := false
	app.Get("/t", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleAdmin)
		c.Locals("user_id", "admin-1")
		logSubAdminActivity(c, nil, models.AuditActionSubAdminUserStatus, models.AuditTargetTypeUser, "u1", nil)
		called = true
		return c.SendStatus(fiber.StatusOK)
	})
	req := httptest.NewRequest("GET", "/t", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if !called {
		t.Fatal("handler did not run")
	}
}

func TestLogSubAdminActivityWithNilService(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Get("/t", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleSubAdmin)
		c.Locals("user_id", "sub-1")
		logSubAdminActivity(c, nil, models.AuditActionSubAdminUserStatus, models.AuditTargetTypeUser, "u1", nil)
		return c.SendStatus(fiber.StatusOK)
	})
	req := httptest.NewRequest("GET", "/t", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("status=%d", resp.StatusCode)
	}
}
