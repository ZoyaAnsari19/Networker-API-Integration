package handlers

import (
	"mime/multipart"
	"strconv"
	"strings"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	userService    *services.UserService
	packageService *services.PackageService
}

func NewUserHandler(userService *services.UserService, packageService *services.PackageService) *UserHandler {
	return &UserHandler{userService: userService, packageService: packageService}
}

// ListActivePackages returns packages available for selection when a networker
// creates a user or renews a package. Exposed under JWT (not admin-only).
func (h *UserHandler) ListActivePackages(c *fiber.Ctx) error {
	if h.packageService == nil {
		return response.Error(c, fiber.StatusInternalServerError, "package service unavailable")
	}
	pkgs, err := h.packageService.ListActive(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", pkgs)
}

func (h *UserHandler) GetProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	profile, err := h.userService.GetProfile(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to get profile")
	}
	return response.Success(c, fiber.StatusOK, "", profile)
}

// UploadAvatar POST /api/v1/me/avatar (multipart: file)
func (h *UserHandler) UploadAvatar(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var file *multipart.FileHeader
	ct := strings.ToLower(c.Get(fiber.HeaderContentType))
	if strings.HasPrefix(ct, fiber.MIMEMultipartForm) {
		form, err := c.MultipartForm()
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "invalid multipart form")
		}
		if files := form.File["file"]; len(files) > 0 {
			file = files[0]
		}
	} else {
		var err error
		file, err = c.FormFile("file")
		if err != nil {
			file = nil
		}
	}
	if file == nil {
		return response.Error(c, fiber.StatusBadRequest, "file is required")
	}
	f, err := file.Open()
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "could not read file")
	}
	defer func() { _ = f.Close() }()
	mimeType := file.Header.Get("Content-Type")
	if err := h.userService.UploadProfilePhoto(c.Context(), userID, file.Filename, mimeType, file.Size, f); err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "not configured"):
			return response.Error(c, fiber.StatusServiceUnavailable, msg)
		default:
			return response.Error(c, fiber.StatusBadRequest, msg)
		}
	}
	return response.Success(c, fiber.StatusOK, "profile photo updated", nil)
}

func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	sponsorID := c.Locals("user_id").(string)
	var req models.CreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	if req.FullName == "" || req.Email == "" || req.Password == "" || req.Leg == "" {
		return response.Error(c, fiber.StatusBadRequest, "full_name, email, password, and leg are required")
	}

	user, err := h.userService.CreateFromDashboard(c.Context(), sponsorID, &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "user created", user)
}

// ListDirectReferrals returns the caller's direct referrals (users sponsored
// by the caller). Used by the Invite & Earn page to show real data.
func (h *UserHandler) ListDirectReferrals(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	list, err := h.userService.ListDirectReferrals(c.Context(), userID, limit, offset)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load referrals")
	}
	if list == nil {
		list = []*models.DirectReferral{}
	}
	return response.Success(c, fiber.StatusOK, "", list)
}

func (h *UserHandler) RenewPackage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var req struct {
		PackageID string `json:"package_id"`
	}
	if err := c.BodyParser(&req); err != nil || req.PackageID == "" {
		return response.Error(c, fiber.StatusBadRequest, "package_id is required")
	}
	if err := h.userService.RenewPackage(c.Context(), userID, req.PackageID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "package renewed", nil)
}
