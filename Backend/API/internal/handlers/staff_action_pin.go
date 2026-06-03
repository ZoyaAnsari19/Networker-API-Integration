package handlers

import (
	"errors"
	"math"
	"strings"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// staffActionPINHTTPError carries a PIN failure without writing the response.
// Callers must route through enforceStaffActionPIN so Fiber handlers stop
// after the 403 body is sent (response.Error returns nil on success).
type staffActionPINHTTPError struct {
	message string
	details map[string]any
}

func (e *staffActionPINHTTPError) Error() string { return e.message }

// enforceStaffActionPIN gates high-risk writes for SUB_ADMIN actors.
// Super admins (ADMIN) bypass entirely. Returns false when the request was
// blocked and the HTTP error response was already written on c.
func enforceStaffActionPIN(c *fiber.Ctx, staffSvc *services.StaffService, pin string) bool {
	if err := checkStaffActionPIN(c, staffSvc, pin); err != nil {
		writeStaffActionPINError(c, err)
		return false
	}
	return true
}

func checkStaffActionPIN(c *fiber.Ctx, staffSvc *services.StaffService, pin string) error {
	if staffSvc == nil {
		return &staffActionPINHTTPError{message: "staff service unavailable"}
	}
	role, _ := c.Locals("role").(string)
	role = strings.ToUpper(strings.TrimSpace(role))
	if role != models.RoleSubAdmin {
		return nil
	}
	pin = strings.TrimSpace(pin)
	if pin == "" || !models.IsValidActionPIN(pin) {
		return &staffActionPINHTTPError{message: "action PIN is required"}
	}
	userID, _ := c.Locals("user_id").(string)
	endpoint := c.Method() + " " + c.Path()
	if err := staffSvc.VerifyActionPIN(c.Context(), userID, pin, endpoint, c.IP(), c.Get(fiber.HeaderUserAgent)); err != nil {
		msg, details := mapActionPINError(err)
		return &staffActionPINHTTPError{message: msg, details: details}
	}
	return nil
}

func writeStaffActionPINError(c *fiber.Ctx, err error) {
	var pinErr *staffActionPINHTTPError
	if !errors.As(err, &pinErr) {
		_ = response.Error(c, fiber.StatusInternalServerError, err.Error())
		return
	}
	if pinErr.message == "staff service unavailable" {
		_ = response.Error(c, fiber.StatusInternalServerError, pinErr.message)
		return
	}
	if pinErr.details != nil {
		_ = response.ErrorWithDetails(c, fiber.StatusForbidden, pinErr.message, pinErr.details)
		return
	}
	_ = response.Error(c, fiber.StatusForbidden, pinErr.message)
}

func mapActionPINError(err error) (message string, details map[string]any) {
	var locked *services.ActionPINLockedError
	if errors.As(err, &locked) {
		sec := int(math.Ceil(locked.RetryAfter.Seconds()))
		if sec < 1 {
			sec = 1
		}
		return "action PIN locked", map[string]any{
			"locked":              true,
			"retry_after_seconds": sec,
			"attempts_remaining":  0,
		}
	}
	var invalid *services.ActionPINInvalidError
	if errors.As(err, &invalid) {
		return "invalid action PIN", map[string]any{
			"locked":             false,
			"attempts_remaining": invalid.AttemptsRemaining,
			"retry_after_seconds": 0,
		}
	}
	return "invalid action PIN", nil
}
