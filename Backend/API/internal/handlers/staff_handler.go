package handlers

import (
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// StaffHandler routes /api/v1/admin/staff/* requests into StaffService. All
// endpoints expect SuperAdminRequired middleware to have already accepted
// the caller, but the service performs an extra defence-in-depth role check
// using the actor context.
type StaffHandler struct {
	staffService *services.StaffService
}

func NewStaffHandler(staffService *services.StaffService) *StaffHandler {
	return &StaffHandler{staffService: staffService}
}

func (h *StaffHandler) actorFromCtx(c *fiber.Ctx) services.ActorContext {
	uid, _ := c.Locals("user_id").(string)
	role, _ := c.Locals("role").(string)
	return services.ActorContext{ActorID: uid, ActorRole: role, IP: c.IP()}
}

// List GET /api/v1/admin/staff?status=&page=&limit=
func (h *StaffHandler) List(c *fiber.Ctx) error {
	status := c.Query("status", "")
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	rows, total, err := h.staffService.List(c.Context(), h.actorFromCtx(c), status, page, limit)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return response.Paginated(c, rows, page, limit, total)
}

// ListActivity GET /api/v1/admin/staff/activity — sub-admin audit trail (super admin only).
func (h *StaffHandler) ListActivity(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	filters := models.SubAdminActivityFilters{
		ActorID: strings.TrimSpace(c.Query("actor_id", "")),
		Action:  strings.TrimSpace(c.Query("action", "")),
	}
	if fromStr := strings.TrimSpace(c.Query("from", "")); fromStr != "" {
		t, err := time.Parse(time.RFC3339, fromStr)
		if err != nil {
			if t2, err2 := time.Parse("2006-01-02", fromStr); err2 == nil {
				filters.From = &t2
			} else {
				return response.Error(c, fiber.StatusBadRequest, "invalid from date (use RFC3339 or YYYY-MM-DD)")
			}
		} else {
			filters.From = &t
		}
	}
	if toStr := strings.TrimSpace(c.Query("to", "")); toStr != "" {
		t, err := time.Parse(time.RFC3339, toStr)
		if err != nil {
			if t2, err2 := time.Parse("2006-01-02", toStr); err2 == nil {
				end := t2.Add(24*time.Hour - time.Nanosecond)
				filters.To = &end
			} else {
				return response.Error(c, fiber.StatusBadRequest, "invalid to date (use RFC3339 or YYYY-MM-DD)")
			}
		} else {
			filters.To = &t
		}
	}

	rows, total, err := h.staffService.ListSubAdminActivity(c.Context(), h.actorFromCtx(c), page, limit, filters)
	if err != nil {
		return response.Error(c, fiber.StatusForbidden, err.Error())
	}
	return response.Paginated(c, rows, page, limit, total)
}

// Get GET /api/v1/admin/staff/:id
func (h *StaffHandler) Get(c *fiber.Ctx) error {
	id := c.Params("id")
	row, err := h.staffService.Get(c.Context(), h.actorFromCtx(c), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", row)
}

// Create POST /api/v1/admin/staff
func (h *StaffHandler) Create(c *fiber.Ctx) error {
	var req models.CreateStaffRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	row, err := h.staffService.Create(c.Context(), h.actorFromCtx(c), &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "sub-admin created", row)
}

// Update PATCH /api/v1/admin/staff/:id
func (h *StaffHandler) Update(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.UpdateStaffRequest
	if err := c.BodyParser(&req); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid request body")
	}
	row, err := h.staffService.Update(c.Context(), h.actorFromCtx(c), id, &req)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "sub-admin updated", row)
}

// ClearPinLock POST /api/v1/admin/staff/:id/clear-pin-lock
func (h *StaffHandler) ClearPinLock(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.staffService.ClearActionPINLock(c.Context(), h.actorFromCtx(c), id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "action PIN lock cleared", nil)
}

// Delete DELETE /api/v1/admin/staff/:id
func (h *StaffHandler) Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := h.staffService.Delete(c.Context(), h.actorFromCtx(c), id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "sub-admin removed", nil)
}
