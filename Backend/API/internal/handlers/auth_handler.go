package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Email == "" || req.Password == "" {
		return response.Error(c, fiber.StatusBadRequest, "identifier and password are required")
	}

	result, err := h.authService.Login(c.Context(), &req)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "login successful", result)
}

func (h *AuthHandler) RefreshToken(c *fiber.Ctx) error {
	var req models.RefreshRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	result, err := h.authService.RefreshToken(c.Context(), &req)
	if err != nil {
		return response.Error(c, fiber.StatusUnauthorized, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "token refreshed", result)
}

// ChangePassword POST /api/v1/me/password
// Rotates the networker's login password. Requires the current password so
// a stolen session alone cannot silently replace it.
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return response.Error(c, fiber.StatusBadRequest, "current_password and new_password are required")
	}
	if err := h.authService.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "password updated", nil)
}

// SetTransactionPassword POST /api/v1/me/transaction-password
// Sets or rotates the networker's transaction password (used to authorise
// P2P transfers and other high-risk wallet actions).
func (h *AuthHandler) SetTransactionPassword(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.SetTransactionPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.LoginPassword == "" || req.NewTransactionPassword == "" {
		return response.Error(c, fiber.StatusBadRequest, "login_password and new_transaction_password are required")
	}
	if err := h.authService.SetTransactionPassword(c.Context(), userID, req.LoginPassword, req.CurrentTransactionPassword, req.NewTransactionPassword); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "transaction password saved", nil)
}

// ChangeEmail POST /api/v1/me/email
// Updates the networker's email after OTP verification (client-side today;
// server-signed tokens once the real OTP backend lands) and login-password
// re-auth. Returns 400 with the specific error so the UI can show it.
func (h *AuthHandler) ChangeEmail(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.UpdateEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.NewEmail == "" || req.LoginPassword == "" {
		return response.Error(c, fiber.StatusBadRequest, "new_email and login_password are required")
	}
	if err := h.authService.UpdateEmail(c.Context(), userID, req.NewEmail, req.LoginPassword, req.OtpVerified); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "email updated", nil)
}

// ChangePhone POST /api/v1/me/phone
// Updates the networker's phone after OTP verification + login-password
// re-auth. Phone is expected to include country code (e.g. +919876543210).
func (h *AuthHandler) ChangePhone(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.UpdatePhoneRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.NewPhone == "" || req.LoginPassword == "" {
		return response.Error(c, fiber.StatusBadRequest, "new_phone and login_password are required")
	}
	if err := h.authService.UpdatePhone(c.Context(), userID, req.NewPhone, req.LoginPassword, req.OtpVerified); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "phone updated", nil)
}

// ChangePayoutUPI POST /api/v1/me/payout-upi
func (h *AuthHandler) ChangePayoutUPI(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req models.UpdatePayoutUPIRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.PayoutUPIID == "" || req.LoginPassword == "" {
		return response.Error(c, fiber.StatusBadRequest, "payout_upi_id and login_password are required")
	}
	if err := h.authService.UpdatePayoutUPI(c.Context(), userID, req.PayoutUPIID, req.LoginPassword); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "payout UPI saved", nil)
}
