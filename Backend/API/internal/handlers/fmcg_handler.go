package handlers

import (
	"fmt"
	"strings"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type FMCGHandler struct {
	commissionService        *services.CommissionService
	binaryService            *services.BinaryService
	userService              *services.UserService
	packageActivationService *services.PackageActivationService
	activationService        *services.ActivationService
}

func NewFMCGHandler(commissionService *services.CommissionService, binaryService *services.BinaryService,
	userService *services.UserService, packageActivationService *services.PackageActivationService,
	activationService *services.ActivationService) *FMCGHandler {
	return &FMCGHandler{
		commissionService:        commissionService,
		binaryService:            binaryService,
		userService:              userService,
		packageActivationService: packageActivationService,
		activationService:        activationService,
	}
}

func (h *FMCGHandler) RegisterUser(c *fiber.Ctx) error {
	var req models.FMCGRegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.Email == "" || req.FullName == "" || req.Password == "" || req.SponsorID == "" {
		return response.Error(c, fiber.StatusBadRequest, "full_name, email, password, sponsor_id are required")
	}
	user, err := h.userService.RegisterFromFMCG(c.Context(), &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "networker registered", user)
}

func (h *FMCGHandler) SyncUser(c *fiber.Ctx) error {
	var req models.UserSyncRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.UserID == "" {
		return response.Error(c, fiber.StatusBadRequest, "user_id is required")
	}
	if err := h.userService.SyncProfile(c.Context(), &req); err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "user synced", nil)
}

func (h *FMCGHandler) ProcessPurchase(c *fiber.Ctx) error {
	var event models.PurchaseEvent
	if err := c.BodyParser(&event); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if event.UserID == "" || event.OrderID == "" || event.BVAmount <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "user_id, order_id, bv_amount are required")
	}
	if event.UserType == "" {
		event.UserType = "customer"
	}

	result, err := h.commissionService.ProcessPurchase(c.Context(), &event)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}

	// v2 activation rule: tick the buyer's own monthly shopping counter and
	// release any HELD rows when they cross Rs 2,500 in the same month.
	// Only networker buyers contribute to this counter (customers and
	// franchises don't have an activation state), and we use TotalAmount —
	// the real rupee spend — not BVAmount.
	if event.UserType == "networker" && event.TotalAmount > 0 && h.activationService != nil {
		if shopping, serr := h.activationService.RecordShopping(c.Context(), event.UserID, event.TotalAmount); serr != nil {
			// Surface the error shape but don't fail the whole purchase —
			// the commission side already succeeded.
			result.Shopping = &models.ShoppingResult{}
		} else {
			result.Shopping = shopping
		}
	}
	return response.Success(c, fiber.StatusOK, "purchase processed", result)
}

// ProcessPackage evaluates a purchase amount for auto package activation on the
// networker's account. Called by FMCG on any Secure-Mart purchase made by a
// networker user (in addition to /purchase which processes commissions).
// The handler is idempotent-friendly for "none" cases but each successful
// activation / upgrade / top-up inserts a user_packages row so callers should
// invoke it at most once per purchase.
func (h *FMCGHandler) ProcessPackage(c *fiber.Ctx) error {
	var req models.PackageProcessRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.UserID == "" || req.Amount <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "user_id and amount (>0) are required")
	}

	res, err := h.packageActivationService.ProcessPurchase(c.Context(), req.UserID, req.Amount)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "package processed", res)
}

// MatchPackage is a read-only helper: given an amount, return the best matching
// package tier (if any) without modifying any state. Useful for FMCG to show a
// preview or validate cart contents before purchase.
func (h *FMCGHandler) MatchPackage(c *fiber.Ctx) error {
	amtStr := c.Query("amount")
	if amtStr == "" {
		return response.Error(c, fiber.StatusBadRequest, "amount query param required")
	}
	var amount int64
	if _, err := fmt.Sscanf(amtStr, "%d", &amount); err != nil || amount <= 0 {
		return response.Error(c, fiber.StatusBadRequest, "amount must be a positive integer")
	}
	pkg, err := h.packageActivationService.MatchPackage(c.Context(), amount)
	if err != nil {
		return response.Success(c, fiber.StatusOK, "no matching package", fiber.Map{
			"matched": false,
			"amount":  amount,
		})
	}
	return response.Success(c, fiber.StatusOK, "match found", fiber.Map{
		"matched":          true,
		"amount":           amount,
		"package_id":       pkg.PackageID,
		"package_name":     pkg.Name,
		"package_amount":   pkg.Amount,
		"daily_binary_cap": pkg.DailyBinaryCap,
	})
}

func (h *FMCGHandler) CheckUser(c *fiber.Ctx) error {
	userID := c.Params("userId")
	profile, err := h.userService.GetProfile(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "user not found")
	}
	return response.Success(c, fiber.StatusOK, "", fiber.Map{
		"is_networker":  profile.Role == models.RoleNetworker,
		"user_id":       profile.UserID,
		"sponsor_id":    profile.SponsorID,
		"status":        profile.Status,
		"package_name":  profile.PackageName,
	})
}

// LookupUser resolves a networker by ONE of: email, phone, sponsor_id, or
// user_id and returns a rich aggregate (profile, package, sponsor, wallets,
// KYC, placement, recent directs). Designed for FMCG support / checkout flows
// so they don't have to stitch together /users/:userId/check + /me responses.
//
//	GET /api/v1/fmcg/users/lookup?email=ravi@example.com
//	GET /api/v1/fmcg/users/lookup?phone=+919876543210
//	GET /api/v1/fmcg/users/lookup?sponsor_id=SPF00001
//	GET /api/v1/fmcg/users/lookup?user_id=<uuid>
func (h *FMCGHandler) LookupUser(c *fiber.Ctx) error {
	email := strings.TrimSpace(c.Query("email"))
	phone := strings.TrimSpace(c.Query("phone"))
	sponsorID := strings.TrimSpace(c.Query("sponsor_id"))
	userID := strings.TrimSpace(c.Query("user_id"))

	provided := 0
	var key, value string
	if email != "" {
		key, value = "email", email
		provided++
	}
	if phone != "" {
		key, value = "phone", phone
		provided++
	}
	if sponsorID != "" {
		key, value = "sponsor_id", sponsorID
		provided++
	}
	if userID != "" {
		key, value = "user_id", userID
		provided++
	}

	if provided == 0 {
		return response.Error(c, fiber.StatusBadRequest,
			"one of email, phone, sponsor_id, or user_id is required")
	}
	if provided > 1 {
		return response.Error(c, fiber.StatusBadRequest,
			"provide only one of email, phone, sponsor_id, or user_id")
	}

	res, err := h.userService.LookupUser(c.Context(), key, value)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "user not found")
	}
	return response.Success(c, fiber.StatusOK, "", res)
}
