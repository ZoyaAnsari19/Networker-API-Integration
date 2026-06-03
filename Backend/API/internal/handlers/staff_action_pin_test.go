package handlers

import (
	"errors"
	"net/http/httptest"
	"testing"
	"time"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"

	"github.com/gofiber/fiber/v2"
)

func TestMapActionPINErrorLocked(t *testing.T) {
	t.Parallel()
	msg, details := mapActionPINError(&services.ActionPINLockedError{RetryAfter: 90 * time.Second})
	if msg != "action PIN locked" {
		t.Fatalf("message: got %q", msg)
	}
	if details["locked"] != true {
		t.Fatalf("locked: got %v", details["locked"])
	}
	if details["retry_after_seconds"] != 90 {
		t.Fatalf("retry_after_seconds: got %v", details["retry_after_seconds"])
	}
	if details["attempts_remaining"] != 0 {
		t.Fatalf("attempts_remaining: got %v", details["attempts_remaining"])
	}
}

func TestMapActionPINErrorInvalid(t *testing.T) {
	t.Parallel()
	msg, details := mapActionPINError(&services.ActionPINInvalidError{AttemptsRemaining: 2})
	if msg != "invalid action PIN" {
		t.Fatalf("message: got %q", msg)
	}
	if details["locked"] != false {
		t.Fatalf("locked: got %v", details["locked"])
	}
	if details["attempts_remaining"] != 2 {
		t.Fatalf("attempts_remaining: got %v", details["attempts_remaining"])
	}
}

func TestMapActionPINErrorUnknown(t *testing.T) {
	t.Parallel()
	msg, details := mapActionPINError(errors.New("other"))
	if msg != "invalid action PIN" || details != nil {
		t.Fatalf("got msg=%q details=%v", msg, details)
	}
}

// Ensures enforceStaffActionPIN stops the handler after writing an error
// (Fiber response.Error returns nil; returning that nil must not continue).
func TestEnforceStaffActionPINStopsHandler(t *testing.T) {
	t.Parallel()
	app := fiber.New()
	app.Patch("/t", func(c *fiber.Ctx) error {
		c.Locals("role", models.RoleSubAdmin)
		if !enforceStaffActionPIN(c, nil, "123456") {
			return nil
		}
		return c.SendStatus(fiber.StatusOK)
	})
	req := httptest.NewRequest("PATCH", "/t", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == fiber.StatusOK {
		t.Fatalf("expected error response, got 200")
	}
}
