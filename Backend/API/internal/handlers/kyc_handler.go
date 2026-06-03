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

type KYCHandler struct {
	svc *services.KYCService
}

func NewKYCHandler(svc *services.KYCService) *KYCHandler {
	return &KYCHandler{svc: svc}
}

// GetMine GET /api/v1/kyc/me
func (h *KYCHandler) GetMine(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	req, err := h.svc.GetMine(c.Context(), userID)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to load KYC")
	}
	if req == nil {
		return response.Success(c, fiber.StatusOK, "", fiber.Map{"request": nil})
	}
	return response.Success(c, fiber.StatusOK, "", fiber.Map{"request": req})
}

// UploadDocument POST /api/v1/kyc/documents (multipart: document_type + file)
func (h *KYCHandler) UploadDocument(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	// Prefer multipart form fields over c.FormValue: fasthttp's default FormValue
	// checks the query string before the multipart body, so a stray ?document_type=
	// could override the real upload type or yield confusing validation errors.
	var docType string
	var file *multipart.FileHeader
	ct := strings.ToLower(c.Get(fiber.HeaderContentType))
	if strings.HasPrefix(ct, fiber.MIMEMultipartForm) {
		form, err := c.MultipartForm()
		if err != nil {
			return response.Error(c, fiber.StatusBadRequest, "invalid multipart form")
		}
		if vals := form.Value["document_type"]; len(vals) > 0 {
			docType = strings.TrimSpace(strings.ToUpper(vals[0]))
		}
		if files := form.File["file"]; len(files) > 0 {
			file = files[0]
		}
	} else {
		docType = strings.TrimSpace(strings.ToUpper(c.FormValue("document_type")))
		var err error
		file, err = c.FormFile("file")
		if err != nil {
			file = nil
		}
	}
	if docType == "" {
		return response.Error(c, fiber.StatusBadRequest, "document_type is required")
	}
	if file == nil {
		return response.Error(c, fiber.StatusBadRequest, "file is required")
	}
	if file.Size > 15<<20 {
		return response.Error(c, fiber.StatusBadRequest, "file too large (max 15 MB)")
	}

	f, err := file.Open()
	if err != nil {
		return response.Error(c, fiber.StatusBadRequest, "could not read file")
	}
	defer func() { _ = f.Close() }()

	mimeType := file.Header.Get("Content-Type")
	doc, err := h.svc.UploadDocument(c.Context(), userID, docType, file.Filename, mimeType, file.Size, f)
	if err != nil {
		msg := err.Error()
		switch {
		case strings.Contains(msg, "not configured"):
			return response.Error(c, fiber.StatusServiceUnavailable, msg)
		case strings.Contains(msg, "already approved"):
			return response.Error(c, fiber.StatusConflict, msg)
		case strings.Contains(msg, "under review"):
			return response.Error(c, fiber.StatusConflict, msg)
		default:
			return response.Error(c, fiber.StatusBadRequest, msg)
		}
	}
	return response.Success(c, fiber.StatusCreated, "document uploaded", doc)
}

// Submit POST /api/v1/kyc/submit
func (h *KYCHandler) Submit(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(string)
	if err := h.svc.Submit(c.Context(), userID); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "KYC submitted for review", nil)
}

// AdminList GET /api/v1/admin/kyc/requests
func (h *KYCHandler) AdminList(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	status := strings.TrimSpace(strings.ToUpper(c.Query("status", "")))
	list, total, err := h.svc.AdminList(c.Context(), page, limit, status)
	if err != nil {
		return response.Error(c, fiber.StatusInternalServerError, "failed to list KYC requests")
	}
	return response.Paginated(c, list, page, limit, total)
}

// AdminGet GET /api/v1/admin/kyc/requests/:kycId
func (h *KYCHandler) AdminGet(c *fiber.Ctx) error {
	id := c.Params("kycId")
	req, err := h.svc.AdminGet(c.Context(), id)
	if err != nil {
		return response.Error(c, fiber.StatusNotFound, "not found")
	}
	return response.Success(c, fiber.StatusOK, "", req)
}

// AdminUpdate PATCH /api/v1/admin/kyc/requests/:kycId
func (h *KYCHandler) AdminUpdate(c *fiber.Ctx) error {
	adminID := c.Locals("user_id").(string)
	id := c.Params("kycId")
	var body models.AdminUpdateKYCRequest
	if err := c.BodyParser(&body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, "invalid JSON body")
	}
	body.Status = strings.TrimSpace(strings.ToUpper(body.Status))
	if err := h.svc.AdminUpdate(c.Context(), adminID, id, body); err != nil {
		return response.Error(c, fiber.StatusBadRequest, err.Error())
	}
	return response.Success(c, fiber.StatusOK, "KYC updated", nil)
}
