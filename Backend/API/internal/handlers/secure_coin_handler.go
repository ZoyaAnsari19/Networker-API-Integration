//go:build securecoin
// +build securecoin

package handlers

import (
	"log"
	"strings"

	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// SecureCoinHandler exposes the wallet-connect flow:
//
//   GET /api/v1/account/secure-coin/connect      (JWT-protected redirect)
//   GET /api/v1/secure-coin/callback              (public; Secure-Coin returns here)
//   GET /api/v1/me/secure-coin-balance            (JWT-protected balance read)
//
// The handler is a thin shim — all CSRF / verify / DB persistence lives
// in services.SecureCoinService so the same logic can be exercised by
// other transports (CLI tests, server-side cron, etc.).
type SecureCoinHandler struct {
	scService *services.SecureCoinService
}

func NewSecureCoinHandler(scService *services.SecureCoinService) *SecureCoinHandler {
	return &SecureCoinHandler{scService: scService}
}

// Connect handles GET /api/v1/account/secure-coin/connect. The route is
// behind AuthRequired middleware; we read the user id from JWT locals,
// build the dashboard.securecoin.co.in URL with a fresh CSRF token, and
// either 302 the browser there OR return the URL as JSON so the SPA
// can `window.location.href = url` (the SPA cannot send Authorization
// headers on a top-level navigation, hence the JSON path).
//
// Negotiation rules:
//   * `Accept: application/json` (or `?format=json`) → JSON envelope
//   * anything else (e.g. plain browser navigation) → 302 redirect
func (h *SecureCoinHandler) Connect(c *fiber.Ctx) error {
	if h.scService == nil || !h.scService.Configured() {
		msg := "Secure Coin connect is not configured"
		if h.scService != nil {
			if d := h.scService.MissingConfigurationDetails(); d != "" {
				msg = msg + ": " + d
			}
		}
		return response.Error(c, fiber.StatusServiceUnavailable, msg)
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || strings.TrimSpace(userID) == "" {
		return response.Error(c, fiber.StatusUnauthorized, "missing user id")
	}
	url, err := h.scService.BuildConnectURL(c.Context(), userID, c.Get(fiber.HeaderUserAgent))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	wantsJSON := strings.EqualFold(c.Query("format"), "json") ||
		strings.Contains(strings.ToLower(c.Get(fiber.HeaderAccept)), "application/json")
	if wantsJSON {
		return response.Success(c, fiber.StatusOK, "", fiber.Map{"redirect_url": url})
	}
	return c.Redirect(url, fiber.StatusFound)
}

// Callback handles GET /api/v1/secure-coin/callback. This route MUST be
// public (no JWT) because the Secure Coin redirect is a top-level
// browser navigation and we cannot attach Authorization headers to it.
// The state token (issued in Connect, consumed once here) is what
// authenticates the callback to a specific user_id.
//
// On success we either 302 the user back to the SPA (when
// SECURE_COIN_FRONTEND_RETURN_URL is set) or render a minimal JSON
// envelope so server-to-server tests still work.
func (h *SecureCoinHandler) Callback(c *fiber.Ctx) error {
	if h.scService == nil || !h.scService.Configured() {
		msg := "Secure Coin is not configured on the server"
		if h.scService != nil {
			if d := h.scService.MissingConfigurationDetails(); d != "" {
				msg = msg + ": " + d
			}
		}
		return response.Error(c, fiber.StatusServiceUnavailable, msg)
	}

	state := c.Query("state")
	connectToken := c.Query("connect_token")
	if errCode := strings.TrimSpace(c.Query("error")); errCode != "" {
		log.Printf("secure_coin_callback: upstream error code=%s desc=%s", errCode, c.Query("error_description"))
		return h.redirectOrJSON(c, "error", map[string]string{
			"reason": errCode,
		}, fiber.StatusBadRequest, errCode)
	}

	res, err := h.scService.HandleCallback(c.Context(), state, connectToken)
	if err != nil {
		log.Printf("secure_coin_callback: %v", err)
		return h.redirectOrJSON(c, "error", map[string]string{
			"reason": err.Error(),
		}, fiber.StatusBadRequest, err.Error())
	}
	return h.redirectOrJSON(c, "connected", map[string]string{
		"wallet_code": res.WalletCode,
	}, fiber.StatusOK, "Secure Coin wallet connected")
}

func (h *SecureCoinHandler) redirectOrJSON(c *fiber.Ctx, status string, extra map[string]string, jsonStatus int, msg string) error {
	if url := h.scService.FrontendReturnURL(status, extra); url != "" {
		return c.Redirect(url, fiber.StatusFound)
	}
	if status == "connected" {
		return response.Success(c, jsonStatus, msg, extra)
	}
	return response.Error(c, jsonStatus, msg)
}

// Balance handles GET /api/v1/me/secure-coin-balance. Always returns a
// 200 with `linked: false` (instead of 4xx) when the wallet is not
// connected, so the SPA can render the unlinked CTA without a separate
// error path.
func (h *SecureCoinHandler) Balance(c *fiber.Ctx) error {
	if h.scService == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "Secure Coin is not configured on the server")
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || strings.TrimSpace(userID) == "" {
		return response.Error(c, fiber.StatusUnauthorized, "missing user id")
	}
	res, err := h.scService.RefreshBalance(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", res)
}

// Disconnect handles POST /api/v1/me/secure-coin/disconnect. It clears the
// local linkage so the SPA can show the Connect CTA again. This does NOT
// revoke the connection inside Secure Coin — users can do that from their
// Secure Coin dashboard (Connected Apps).
func (h *SecureCoinHandler) Disconnect(c *fiber.Ctx) error {
	if h.scService == nil {
		return response.Error(c, fiber.StatusServiceUnavailable, "Secure Coin is not configured on the server")
	}
	userID, ok := c.Locals("user_id").(string)
	if !ok || strings.TrimSpace(userID) == "" {
		return response.Error(c, fiber.StatusUnauthorized, "missing user id")
	}
	if err := h.scService.ClearLinkage(c.Context(), userID); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "Secure Coin wallet disconnected", fiber.Map{"linked": false})
}
