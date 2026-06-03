package handlers

import (
	"mime/multipart"
	"strconv"
	"strings"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/response"

	"github.com/gofiber/fiber/v2"
)

// SupportHandler exposes user + admin support ticket endpoints.
type SupportHandler struct {
	svc       *services.SupportService
	staffSvc  *services.StaffService
}

func NewSupportHandler(svc *services.SupportService, staffSvc *services.StaffService) *SupportHandler {
	return &SupportHandler{svc: svc, staffSvc: staffSvc}
}

func supportTicketAuditDetails(t *models.SupportTicket, extra map[string]any) map[string]any {
	d := map[string]any{}
	if t != nil {
		d["status"] = t.Status
		if t.Subject != nil && strings.TrimSpace(*t.Subject) != "" {
			d["subject"] = strings.TrimSpace(*t.Subject)
		}
		if t.UserFullName != nil && strings.TrimSpace(*t.UserFullName) != "" {
			d["user_name"] = strings.TrimSpace(*t.UserFullName)
		}
		if t.UserSponsorID != nil && strings.TrimSpace(*t.UserSponsorID) != "" {
			d["user_sponsor_id"] = strings.TrimSpace(*t.UserSponsorID)
		}
	}
	for k, v := range extra {
		d[k] = v
	}
	return d
}

func truncateAuditText(s string, max int) string {
	s = strings.TrimSpace(s)
	if len(s) <= max {
		return s
	}
	return s[:max] + "…"
}

// ============================================================
// User endpoints (JWT-only)
// ============================================================

// ListTopicsForMe GET /api/v1/me/support/topics
func (h *SupportHandler) ListTopicsForMe(c *fiber.Ctx) error {
	topics, err := h.svc.ListTopicsForUsers(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load topics")
	}
	if topics == nil {
		topics = []models.SupportTopic{}
	}
	return response.Success(c, fiber.StatusOK, "", topics)
}

// CreateMyTicket POST /api/v1/me/support/tickets
func (h *SupportHandler) CreateMyTicket(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	var body models.CreateSupportTicketRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	detail, err := h.svc.CreateTicket(c.Context(), userID, body)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "ticket created", detail)
}

// ListMyTickets GET /api/v1/me/support/tickets
func (h *SupportHandler) ListMyTickets(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	list, err := h.svc.ListMyTickets(c.Context(), userID, c.Query("status"))
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load tickets")
	}
	if list == nil {
		list = []models.SupportTicket{}
	}
	return response.Success(c, fiber.StatusOK, "", list)
}

// GetMyTicket GET /api/v1/me/support/tickets/:id
func (h *SupportHandler) GetMyTicket(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")
	detail, err := h.svc.GetMyTicket(c.Context(), userID, id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", detail)
}

// PostMyTicketMessage POST /api/v1/me/support/tickets/:id/messages
func (h *SupportHandler) PostMyTicketMessage(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")
	var body models.PostSupportMessageRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	msg, err := h.svc.PostUserMessage(c.Context(), userID, id, body.Message)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "message sent", msg)
}

// UploadMyAttachment POST /api/v1/me/support/tickets/:id/attachments
func (h *SupportHandler) UploadMyAttachment(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")
	file, err := pickFirstFile(c, "file")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	if file.Size > 20<<20 {
		return response.Error(c, fiber.StatusBadRequest, "file too large (max 20 MB)")
	}
	f, err := file.Open()
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "could not read file")
	}
	defer func() { _ = f.Close() }()
	att, err := h.svc.UploadUserAttachment(c.Context(), userID, id, file.Filename, file.Header.Get("Content-Type"), file.Size, f)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "attachment uploaded", att)
}

// CloseMyTicket POST /api/v1/me/support/tickets/:id/close
func (h *SupportHandler) CloseMyTicket(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	id := c.Params("id")
	t, err := h.svc.CloseTicketAsUser(c.Context(), userID, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "ticket closed", t)
}

// ============================================================
// Admin endpoints (Staff + permission gated by routes file)
// ============================================================

// AdminListTickets GET /api/v1/admin/support/tickets
func (h *SupportHandler) AdminListTickets(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 200 {
		limit = 50
	}
	f := repository.AdminTicketFilters{
		Status:     c.Query("status"),
		Assigned:   strings.ToLower(strings.TrimSpace(c.Query("assigned"))),
		AssignedTo: strings.TrimSpace(c.Query("assigned_to")),
		Search:     strings.TrimSpace(c.Query("search")),
		DateFrom:   strings.TrimSpace(c.Query("date_from")),
		DateTo:     strings.TrimSpace(c.Query("date_to")),
		Limit:      limit,
		Offset:     (page - 1) * limit,
	}
	if f.Assigned == "me" {
		f.AssignedTo = actor
		f.Assigned = ""
	}
	if f.Assigned != "" && f.Assigned != "unassigned" {
		f.Assigned = ""
	}
	list, total, err := h.svc.AdminListTickets(c.Context(), f)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to list tickets")
	}
	return response.Paginated(c, list, page, limit, total)
}

// AdminGetTicket GET /api/v1/admin/support/tickets/:id
func (h *SupportHandler) AdminGetTicket(c *fiber.Ctx) error {
	id := c.Params("id")
	detail, err := h.svc.AdminGetTicket(c.Context(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "", detail)
}

// AdminAssignToMe POST /api/v1/admin/support/tickets/:id/assign-to-me
func (h *SupportHandler) AdminAssignToMe(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	id := c.Params("id")
	t, err := h.svc.AssignToSelf(c.Context(), actor, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	logSubAdminActivity(c, h.staffSvc, models.AuditActionSubAdminSupportAssign, models.AuditTargetTypeSupport, id,
		supportTicketAuditDetails(t, nil))
	return response.Success(c, fiber.StatusOK, "ticket assigned", t)
}

// AdminPostMessage POST /api/v1/admin/support/tickets/:id/messages
func (h *SupportHandler) AdminPostMessage(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	id := c.Params("id")
	if err := h.requireReplyPermission(c, actor, id); err != nil {
		return err
	}
	var body models.PostSupportMessageRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	msg, err := h.svc.PostAdminMessage(c.Context(), actor, id, body.Message)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "message sent", msg)
}

// AdminUploadAttachment POST /api/v1/admin/support/tickets/:id/attachments
func (h *SupportHandler) AdminUploadAttachment(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	id := c.Params("id")
	if err := h.requireReplyPermission(c, actor, id); err != nil {
		return err
	}
	file, err := pickFirstFile(c, "file")
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	if file.Size > 20<<20 {
		return response.Error(c, fiber.StatusBadRequest, "file too large (max 20 MB)")
	}
	f, err := file.Open()
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "could not read file")
	}
	defer func() { _ = f.Close() }()
	att, err := h.svc.UploadAdminAttachment(c.Context(), actor, id, file.Filename, file.Header.Get("Content-Type"), file.Size, f)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	detail, _ := h.svc.AdminGetTicket(c.Context(), id)
	var ticket *models.SupportTicket
	if detail != nil {
		ticket = &detail.Ticket
	}
	logSubAdminActivity(c, h.staffSvc, models.AuditActionSubAdminSupportAttachment, models.AuditTargetTypeSupport, id,
		supportTicketAuditDetails(ticket, map[string]any{"filename": file.Filename}))
	return response.Success(c, fiber.StatusCreated, "attachment uploaded", att)
}

// AdminCloseTicket POST /api/v1/admin/support/tickets/:id/close
// Rules: ADMIN can close any non-closed ticket. SUB_ADMIN must be the assigned staff.
func (h *SupportHandler) AdminCloseTicket(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	role, _ := c.Locals("role").(string)
	id := c.Params("id")
	if role != models.RoleAdmin {
		// SUB_ADMIN: must be assigned.
		t, err := h.svc.AdminGetTicket(c.Context(), id)
		if err != nil {
			return response.Error(c, fiber.StatusNotFound, err.Error())
		}
		if t.Ticket.AssignedTo == nil || *t.Ticket.AssignedTo != actor {
			return response.Error(c, fiber.StatusForbidden, "only the assigned staff can close this ticket")
		}
	}
	t, err := h.svc.CloseTicketAsAdmin(c.Context(), actor, id)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	logSubAdminActivity(c, h.staffSvc, models.AuditActionSubAdminSupportClose, models.AuditTargetTypeSupport, id,
		supportTicketAuditDetails(t, nil))
	return response.Success(c, fiber.StatusOK, "ticket closed", t)
}

// AdminReassignTicket POST /api/v1/admin/support/tickets/:id/reassign  (ADMIN only via route guard)
func (h *SupportHandler) AdminReassignTicket(c *fiber.Ctx) error {
	actor := c.Locals("user_id").(string)
	id := c.Params("id")
	detail, err := h.svc.AdminGetTicket(c.Context(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	if detail.Ticket.AssignedTo != nil {
		return response.Error(c, fiber.StatusForbidden, "ticket is already assigned")
	}
	var body models.ReassignSupportTicketRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	t, err := h.svc.Reassign(c.Context(), actor, id, body.AssignedTo)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "ticket reassigned", t)
}

// --- Topics admin (ADMIN only via route guard) ---

func (h *SupportHandler) AdminListTopics(c *fiber.Ctx) error {
	topics, err := h.svc.ListTopicsForAdmin(c.Context())
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load topics")
	}
	if topics == nil {
		topics = []models.SupportTopic{}
	}
	return response.Success(c, fiber.StatusOK, "", topics)
}

func (h *SupportHandler) AdminCreateTopic(c *fiber.Ctx) error {
	var body models.CreateSupportTopicRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	t, err := h.svc.CreateTopic(c.Context(), body)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusCreated, "topic created", t)
}

func (h *SupportHandler) AdminUpdateTopic(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid topic id")
	}
	var body models.UpdateSupportTopicRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	t, err := h.svc.UpdateTopic(c.Context(), id, body)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "topic updated", t)
}

func (h *SupportHandler) AdminDeleteTopic(c *fiber.Ctx) error {
	id, err := strconv.ParseInt(c.Params("id"), 10, 64)
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid topic id")
	}
	if err := h.svc.DeleteTopic(c.Context(), id); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "topic deleted", nil)
}

// --- helpers ---

// requireReplyPermission enforces that the actor is assigned to the ticket
// (via Assign to me or reassign). ADMIN and SUB_ADMIN must both assign first.
func (h *SupportHandler) requireReplyPermission(c *fiber.Ctx, actor, ticketID string) error {
	t, err := h.svc.AdminGetTicket(c.Context(), ticketID)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, err.Error())
	}
	if t.Ticket.AssignedTo == nil || *t.Ticket.AssignedTo != actor {
		return response.Error(c, fiber.StatusForbidden, "assign the ticket to yourself before replying")
	}
	return nil
}

// pickFirstFile mirrors the multipart-parsing logic used elsewhere (KYC, avatar).
func pickFirstFile(c *fiber.Ctx, field string) (*multipart.FileHeader, error) {
	ct := strings.ToLower(c.Get(fiber.HeaderContentType))
	if strings.HasPrefix(ct, fiber.MIMEMultipartForm) {
		form, err := c.MultipartForm()
		if err != nil {
			return nil, fiber.NewError(fiber.StatusBadRequest, "invalid multipart form")
		}
		files := form.File[field]
		if len(files) == 0 {
			return nil, fiber.NewError(fiber.StatusBadRequest, "file is required")
		}
		return files[0], nil
	}
	file, err := c.FormFile(field)
	if err != nil || file == nil {
		return nil, fiber.NewError(fiber.StatusBadRequest, "file is required")
	}
	return file, nil
}
