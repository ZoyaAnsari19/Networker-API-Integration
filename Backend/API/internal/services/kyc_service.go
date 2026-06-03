package services

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/storage"

	"github.com/google/uuid"
)

const maxKYCUploadBytes = 15 << 20

var allowedMimeTypes = map[string]struct{}{
	"image/jpeg":      {},
	"image/png":       {},
	"application/pdf": {},
}

var allowedDocTypes = func() map[string]struct{} {
	m := make(map[string]struct{}, len(models.ValidKYCDocumentTypes))
	for _, t := range models.ValidKYCDocumentTypes {
		m[t] = struct{}{}
	}
	return m
}()

type KYCService struct {
	repo    *repository.KYCRepo
	storage *storage.B2Client
}

func NewKYCService(repo *repository.KYCRepo, b2 *storage.B2Client) *KYCService {
	return &KYCService{repo: repo, storage: b2}
}

func (s *KYCService) storageOK() error {
	if s.storage == nil {
		return fmt.Errorf("file storage is not configured")
	}
	return nil
}

// GetMine returns the user's KYC request + docs (one-per-user due to UNIQUE).
func (s *KYCService) GetMine(ctx context.Context, userID string) (*models.KYCRequest, error) {
	req, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, nil
	}
	docs, err := s.repo.ListDocuments(ctx, req.KYCID)
	if err != nil {
		return nil, err
	}
	out := *req
	out.Documents = make([]models.KYCDocument, len(docs))
	for i, d := range docs {
		out.Documents[i] = d
		// Never leak the B2 object key to the user — they only need the
		// metadata (file_name, mime_type, etc).
		out.Documents[i].DocumentURL = ""
	}
	return &out, nil
}

// UploadDocument stores one file in B2 and attaches it to the user's KYC request
// (creates one if none or resets after rejection so the user can re-upload).
func (s *KYCService) UploadDocument(ctx context.Context, userID, documentType, filename, mimeType string, size int64, r io.Reader) (*models.KYCDocument, error) {
	if err := s.storageOK(); err != nil {
		return nil, err
	}
	if _, ok := allowedDocTypes[documentType]; !ok {
		return nil, fmt.Errorf("invalid document_type")
	}
	if size <= 0 || size > maxKYCUploadBytes {
		return nil, fmt.Errorf("file must be between 1 byte and 15 MB")
	}
	mt := strings.TrimSpace(strings.ToLower(mimeType))
	if mt == "" {
		mt = "application/octet-stream"
	}
	if _, ok := allowedMimeTypes[mt]; !ok {
		return nil, fmt.Errorf("unsupported file type (use jpeg, png, or pdf)")
	}

	req, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		req, err = s.repo.CreateRequest(ctx, userID)
		if err != nil {
			return nil, err
		}
	}
	if req.Status == models.KYCStatusApproved {
		return nil, fmt.Errorf("KYC is already approved")
	}
	if req.Status == models.KYCStatusSubmitted {
		return nil, fmt.Errorf("KYC is under review, cannot upload new documents")
	}
	if req.Status == models.KYCStatusRejected {
		if err := s.repo.DeleteDocumentsByKYCID(ctx, req.KYCID); err != nil {
			return nil, err
		}
		if err := s.repo.ResetForResubmission(ctx, req.KYCID); err != nil {
			return nil, err
		}
	}

	// Prefix with fmcg-binary/ so the bucket can be shared with Secure-Coin
	// without key collisions.
	objectKey := fmt.Sprintf("fmcg-binary/kyc/%s/%s/%s_%s", userID, req.KYCID, uuid.NewString(), sanitizeFilename(filename))
	if err := s.storage.Put(ctx, objectKey, r, size, mimeType); err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}

	fn := filename
	doc := &models.KYCDocument{
		KYCID:        req.KYCID,
		DocumentType: documentType,
		DocumentURL:  objectKey,
		FileName:     &fn,
		FileSize:     &size,
		MimeType:     &mt,
	}
	if err := s.repo.InsertDocument(ctx, doc); err != nil {
		return nil, err
	}
	out := *doc
	out.DocumentURL = ""
	return &out, nil
}

// Submit marks the KYC request as SUBMITTED (user says "I'm done uploading").
func (s *KYCService) Submit(ctx context.Context, userID string) error {
	req, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return err
	}
	if req == nil {
		return fmt.Errorf("no KYC request found")
	}
	if req.Status != models.KYCStatusPending {
		return fmt.Errorf("KYC cannot be submitted in current state (%s)", req.Status)
	}
	docs, err := s.repo.ListDocuments(ctx, req.KYCID)
	if err != nil {
		return err
	}
	if len(docs) == 0 {
		return fmt.Errorf("upload at least one document before submitting")
	}
	return s.repo.SetSubmitted(ctx, req.KYCID)
}

// AdminList paginates KYC requests.
func (s *KYCService) AdminList(ctx context.Context, page, limit int, statusFilter string) ([]models.KYCRequest, int64, error) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit
	valid := map[string]struct{}{
		models.KYCStatusPending:   {},
		models.KYCStatusSubmitted: {},
		models.KYCStatusApproved:  {},
		models.KYCStatusRejected:  {},
	}
	if _, ok := valid[statusFilter]; !ok {
		statusFilter = ""
	}
	return s.repo.ListRequests(ctx, statusFilter, limit, offset)
}

// AdminGet returns one request with presigned download URLs.
func (s *KYCService) AdminGet(ctx context.Context, kycID string) (*models.KYCRequest, error) {
	req, err := s.repo.GetByID(ctx, kycID)
	if err != nil {
		return nil, err
	}
	if req == nil {
		return nil, fmt.Errorf("not found")
	}
	docs, err := s.repo.ListDocuments(ctx, kycID)
	if err != nil {
		return nil, err
	}
	out := *req
	out.Documents = make([]models.KYCDocument, len(docs))
	for i, d := range docs {
		out.Documents[i] = d
		if s.storage != nil {
			url, err := s.storage.PresignedGetURL(ctx, d.DocumentURL, time.Hour)
			if err == nil {
				out.Documents[i].DownloadURL = &url
			}
		}
	}
	return &out, nil
}

// AdminUpdate sets APPROVED or REJECTED.
// Rejection reason is REQUIRED when status == REJECTED so the user knows
// what to fix; it is always cleared when approving.
func (s *KYCService) AdminUpdate(ctx context.Context, adminUserID, kycID string, body models.AdminUpdateKYCRequest) error {
	if body.Status != models.KYCStatusApproved && body.Status != models.KYCStatusRejected {
		return fmt.Errorf("status must be APPROVED or REJECTED")
	}
	req, err := s.repo.GetByID(ctx, kycID)
	if err != nil {
		return err
	}
	if req == nil {
		return fmt.Errorf("not found")
	}
	if req.Status != models.KYCStatusSubmitted {
		return fmt.Errorf("only SUBMITTED requests can be reviewed")
	}

	var reason *string
	if body.Status == models.KYCStatusRejected {
		if body.RejectionReason == nil || strings.TrimSpace(*body.RejectionReason) == "" {
			return fmt.Errorf("rejection_reason is required when rejecting a KYC request")
		}
		trimmed := strings.TrimSpace(*body.RejectionReason)
		reason = &trimmed
	}
	return s.repo.UpdateStatus(ctx, kycID, body.Status, reason, adminUserID)
}

func sanitizeFilename(name string) string {
	base := filepath.Base(name)
	if base == "." || base == "/" {
		base = "file"
	}
	var b strings.Builder
	for _, r := range base {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '.' || r == '-' || r == '_' {
			b.WriteRune(r)
		} else {
			b.WriteRune('_')
		}
	}
	s := b.String()
	if s == "" {
		return "file"
	}
	if len(s) > 120 {
		s = s[len(s)-120:]
	}
	return s
}
