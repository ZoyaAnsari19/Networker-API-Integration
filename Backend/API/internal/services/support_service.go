package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/storage"

	"github.com/google/uuid"
)

const (
	maxSupportAttachmentBytes = 20 << 20
	supportPresignTTL         = time.Hour
)

var allowedSupportMimeTypes = map[string]struct{}{
	"image/jpeg":               {},
	"image/png":                {},
	"image/gif":                {},
	"image/webp":               {},
	"application/pdf":          {},
	"application/octet-stream": {},
	"text/plain":               {},
	"application/zip":          {},
	"application/x-zip-compressed": {},
	"application/msword":       {},
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {},
}

// SupportService coordinates ticket lifecycle, message threading, and B2 uploads.
type SupportService struct {
	repo    *repository.SupportRepo
	storage *storage.B2Client
}

func NewSupportService(repo *repository.SupportRepo, b2 *storage.B2Client) *SupportService {
	return &SupportService{repo: repo, storage: b2}
}

func (s *SupportService) storageOK() error {
	if s.storage == nil {
		return fmt.Errorf("file storage is not configured")
	}
	return nil
}

// --- Topics (super-admin CRUD) ---

func (s *SupportService) ListTopicsForUsers(ctx context.Context) ([]models.SupportTopic, error) {
	return s.repo.ListTopics(ctx, true)
}

func (s *SupportService) ListTopicsForAdmin(ctx context.Context) ([]models.SupportTopic, error) {
	return s.repo.ListTopics(ctx, false)
}

func (s *SupportService) CreateTopic(ctx context.Context, body models.CreateSupportTopicRequest) (*models.SupportTopic, error) {
	q := strings.TrimSpace(body.Question)
	if q == "" {
		return nil, fmt.Errorf("question is required")
	}
	if len(q) > 200 {
		return nil, fmt.Errorf("question must be 200 characters or less")
	}
	sortOrder := body.SortOrder
	if sortOrder < 1 {
		sortOrder = 1
	}
	taken, err := s.repo.TopicSortOrderTaken(ctx, sortOrder, 0)
	if err != nil {
		return nil, err
	}
	if taken {
		return nil, fmt.Errorf("display position %d is already used by another topic", sortOrder)
	}
	t := &models.SupportTopic{
		Question:  q,
		Category:  trimPtr(body.Category),
		SortOrder: sortOrder,
		IsActive:  true,
	}
	if body.IsActive != nil {
		t.IsActive = *body.IsActive
	}
	if err := s.repo.InsertTopic(ctx, t); err != nil {
		return nil, err
	}
	return t, nil
}

func (s *SupportService) UpdateTopic(ctx context.Context, id int64, body models.UpdateSupportTopicRequest) (*models.SupportTopic, error) {
	if body.Question != nil {
		trimmed := strings.TrimSpace(*body.Question)
		if trimmed == "" {
			return nil, fmt.Errorf("question cannot be empty")
		}
		body.Question = &trimmed
	}
	if body.Category != nil {
		trimmed := strings.TrimSpace(*body.Category)
		if trimmed == "" {
			// Treat blank as "clear category".
			body.Category = nil
		} else {
			body.Category = &trimmed
		}
	}
	if body.SortOrder != nil {
		if *body.SortOrder < 1 {
			one := 1
			body.SortOrder = &one
		}
		taken, err := s.repo.TopicSortOrderTaken(ctx, *body.SortOrder, id)
		if err != nil {
			return nil, err
		}
		if taken {
			return nil, fmt.Errorf("display position %d is already used by another topic", *body.SortOrder)
		}
	}
	t, err := s.repo.UpdateTopic(ctx, id, body)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("topic not found")
	}
	return t, nil
}

func (s *SupportService) DeleteTopic(ctx context.Context, id int64) error {
	return s.repo.DeleteTopic(ctx, id)
}

// --- User-facing ticket actions ---

// CreateTicket creates the ticket plus the first user message in the thread.
// Attachments are uploaded by a separate endpoint after the ticket exists.
func (s *SupportService) CreateTicket(ctx context.Context, userID string, body models.CreateSupportTicketRequest) (*models.SupportTicketDetail, error) {
	msg := strings.TrimSpace(body.Message)
	if msg == "" {
		return nil, fmt.Errorf("message is required")
	}
	if len(msg) > 8000 {
		return nil, fmt.Errorf("message must be 8000 characters or less")
	}
	var subj *string
	if s := strings.TrimSpace(body.Subject); s != "" {
		if len(s) > 200 {
			return nil, fmt.Errorf("subject must be 200 characters or less")
		}
		subj = &s
	}
	if body.PreQuestionID != nil {
		t, err := s.repo.GetTopic(ctx, *body.PreQuestionID)
		if err != nil {
			return nil, err
		}
		if t == nil || !t.IsActive {
			return nil, fmt.Errorf("topic not available")
		}
		if subj == nil {
			q := t.Question
			subj = &q
		}
	}

	ticket, err := s.repo.CreateTicket(ctx, userID, body.PreQuestionID, subj)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.InsertMessage(ctx, ticket.ID, models.SupportSenderUser, &userID, &msg, nil); err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, ticket.ID)
	return s.getDetailWithPresign(ctx, ticket.ID, false)
}

func (s *SupportService) ListMyTickets(ctx context.Context, userID, statusFilter string) ([]models.SupportTicket, error) {
	return s.repo.ListMyTickets(ctx, userID, normalizeStatus(statusFilter))
}

// GetMyTicket loads a ticket the caller owns (returns ErrNotOwned for foreign tickets).
func (s *SupportService) GetMyTicket(ctx context.Context, userID, ticketID string) (*models.SupportTicketDetail, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil || t.UserID != userID {
		return nil, fmt.Errorf("ticket not found")
	}
	return s.getDetailWithPresign(ctx, ticketID, false)
}

// PostUserMessage appends a follow-up message from the ticket owner.
func (s *SupportService) PostUserMessage(ctx context.Context, userID, ticketID, text string) (*models.SupportMessage, error) {
	t, err := s.requireUserOpenTicket(ctx, userID, ticketID)
	if err != nil {
		return nil, err
	}
	body := strings.TrimSpace(text)
	if body == "" {
		return nil, fmt.Errorf("message is required")
	}
	if len(body) > 8000 {
		return nil, fmt.Errorf("message must be 8000 characters or less")
	}
	m, err := s.repo.InsertMessage(ctx, t.ID, models.SupportSenderUser, &userID, &body, nil)
	if err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, t.ID)
	return m, nil
}

// CloseTicketAsUser closes a ticket on behalf of its owner.
func (s *SupportService) CloseTicketAsUser(ctx context.Context, userID, ticketID string) (*models.SupportTicket, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil || t.UserID != userID {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket already closed")
	}
	updated, err := s.repo.CloseTicket(ctx, ticketID, userID)
	if err != nil {
		return nil, err
	}
	sys := models.SupportSystemClosedUser
	if _, err := s.repo.InsertMessage(ctx, ticketID, models.SupportSenderSystem, &userID, &sys, nil); err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, ticketID)
	return updated, nil
}

// UploadUserAttachment uploads a file and appends it as an attachment-only message from the user.
func (s *SupportService) UploadUserAttachment(ctx context.Context, userID, ticketID, filename, mimeType string, size int64, reader io.Reader) (*models.SupportAttachment, error) {
	t, err := s.requireUserOpenTicket(ctx, userID, ticketID)
	if err != nil {
		return nil, err
	}
	att, err := s.uploadAttachment(ctx, t.ID, filename, mimeType, size, reader)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.AppendAttachmentToLastMessage(ctx, t.ID, models.SupportSenderUser, &userID, *att); err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, t.ID)
	out := *att
	out.URL = s.presignOrKey(ctx, att.URL)
	logSupportAttachmentURL("user", ticketID, att.URL, out.URL, filename)
	return &out, nil
}

// --- Admin actions ---

func (s *SupportService) AdminListTickets(ctx context.Context, f repository.AdminTicketFilters) ([]models.SupportTicket, int64, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	f.Status = normalizeStatus(f.Status)
	return s.repo.ListTicketsAdmin(ctx, f)
}

// AdminGetTicket loads any ticket (no ownership check).
func (s *SupportService) AdminGetTicket(ctx context.Context, ticketID string) (*models.SupportTicketDetail, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	return s.getDetailWithPresign(ctx, ticketID, true)
}

// AssignToSelf flips assignment to the actor and sets status to in_progress.
func (s *SupportService) AssignToSelf(ctx context.Context, actorUserID, ticketID string) (*models.SupportTicket, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket is already closed")
	}
	if t.AssignedTo != nil && *t.AssignedTo == actorUserID && t.Status == models.SupportTicketStatusInProgress {
		return t, nil
	}
	if t.AssignedTo != nil && *t.AssignedTo != actorUserID {
		return nil, fmt.Errorf("ticket is already assigned to another staff member")
	}
	updated, err := s.repo.AssignTicket(ctx, ticketID, actorUserID)
	if err != nil {
		return nil, err
	}
	msg := models.SupportSystemAssigned
	_, _ = s.repo.InsertMessage(ctx, ticketID, models.SupportSenderSystem, &actorUserID, &msg, nil)
	_ = s.repo.TouchLastMessage(ctx, ticketID)
	return updated, nil
}

// Reassign sets `assigned_to` to any staff user (or NULL to clear). ADMIN only — enforced by caller.
func (s *SupportService) Reassign(ctx context.Context, actorUserID, ticketID string, newAssignee *string) (*models.SupportTicket, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket is closed")
	}
	if newAssignee != nil && strings.TrimSpace(*newAssignee) == "" {
		newAssignee = nil
	}
	updated, err := s.repo.SetAssignee(ctx, ticketID, newAssignee)
	if err != nil {
		return nil, err
	}
	// Adjust status: keep in_progress when assigned, fall back to open when cleared.
	if newAssignee == nil && updated.Status == models.SupportTicketStatusInProgress {
		_ = s.repo.SetStatus(ctx, ticketID, models.SupportTicketStatusOpen)
		updated.Status = models.SupportTicketStatusOpen
	} else if newAssignee != nil && updated.Status == models.SupportTicketStatusOpen {
		_ = s.repo.SetStatus(ctx, ticketID, models.SupportTicketStatusInProgress)
		updated.Status = models.SupportTicketStatusInProgress
	}
	msg := models.SupportSystemReassigned
	_, _ = s.repo.InsertMessage(ctx, ticketID, models.SupportSenderSystem, &actorUserID, &msg, nil)
	_ = s.repo.TouchLastMessage(ctx, ticketID)
	return updated, nil
}

// PostAdminMessage appends an admin reply. Caller must already have enforced role/permission/assignment rules.
func (s *SupportService) PostAdminMessage(ctx context.Context, adminUserID, ticketID, text string) (*models.SupportMessage, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket is closed")
	}
	body := strings.TrimSpace(text)
	if body == "" {
		return nil, fmt.Errorf("message is required")
	}
	if len(body) > 8000 {
		return nil, fmt.Errorf("message must be 8000 characters or less")
	}
	m, err := s.repo.InsertMessage(ctx, ticketID, models.SupportSenderAdmin, &adminUserID, &body, nil)
	if err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, ticketID)
	return m, nil
}

// UploadAdminAttachment uploads a file as an admin reply attachment.
func (s *SupportService) UploadAdminAttachment(ctx context.Context, adminUserID, ticketID, filename, mimeType string, size int64, reader io.Reader) (*models.SupportAttachment, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket is closed")
	}
	att, err := s.uploadAttachment(ctx, t.ID, filename, mimeType, size, reader)
	if err != nil {
		return nil, err
	}
	if _, err := s.repo.AppendAttachmentToLastMessage(ctx, t.ID, models.SupportSenderAdmin, &adminUserID, *att); err != nil {
		return nil, err
	}
	_ = s.repo.TouchLastMessage(ctx, t.ID)
	out := *att
	out.URL = s.presignOrKey(ctx, att.URL)
	logSupportAttachmentURL("admin", ticketID, att.URL, out.URL, filename)
	return &out, nil
}

// CloseTicketAsAdmin closes any ticket. Role/assignment checks live in the handler.
func (s *SupportService) CloseTicketAsAdmin(ctx context.Context, adminUserID, ticketID string) (*models.SupportTicket, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket already closed")
	}
	updated, err := s.repo.CloseTicket(ctx, ticketID, adminUserID)
	if err != nil {
		return nil, err
	}
	sys := models.SupportSystemClosedAdmn
	_, _ = s.repo.InsertMessage(ctx, ticketID, models.SupportSenderSystem, &adminUserID, &sys, nil)
	_ = s.repo.TouchLastMessage(ctx, ticketID)
	return updated, nil
}

// --- Internal helpers ---

func (s *SupportService) requireUserOpenTicket(ctx context.Context, userID, ticketID string) (*models.SupportTicket, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil || t.UserID != userID {
		return nil, fmt.Errorf("ticket not found")
	}
	if t.Status == models.SupportTicketStatusClosed {
		return nil, fmt.Errorf("ticket is closed")
	}
	return t, nil
}

func (s *SupportService) uploadAttachment(ctx context.Context, ticketID, filename, mimeType string, size int64, reader io.Reader) (*models.SupportAttachment, error) {
	if err := s.storageOK(); err != nil {
		return nil, err
	}
	if size <= 0 || size > maxSupportAttachmentBytes {
		return nil, fmt.Errorf("file must be between 1 byte and 20 MB")
	}
	mt := strings.TrimSpace(strings.ToLower(mimeType))
	if mt == "" {
		mt = "application/octet-stream"
	}
	if _, ok := allowedSupportMimeTypes[mt]; !ok {
		return nil, fmt.Errorf("unsupported file type")
	}

	objectKey := storage.ObjectKey("support-tickets", ticketID, uuid.NewString()+"-"+sanitizeFilename(filename))
	if err := s.storage.Put(ctx, objectKey, reader, size, mt); err != nil {
		return nil, fmt.Errorf("upload failed: %w", err)
	}
	displayName := strings.TrimSpace(filename)
	if displayName == "" {
		displayName = "attachment"
	}
	return &models.SupportAttachment{
		URL:      objectKey,
		Type:     mt,
		Filename: displayName,
	}, nil
}

// getDetailWithPresign returns the joined ticket + message thread with presigned URLs
// substituted for stored object keys. `forAdmin` controls whether the admin/system
// system-message strings are exposed (always true today; reserved for future tuning).
func (s *SupportService) getDetailWithPresign(ctx context.Context, ticketID string, _forAdmin bool) (*models.SupportTicketDetail, error) {
	t, err := s.repo.GetTicket(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, fmt.Errorf("ticket not found")
	}
	msgs, err := s.repo.ListMessages(ctx, ticketID)
	if err != nil {
		return nil, err
	}
	for i := range msgs {
		for j := range msgs[i].AttachmentURLs {
			msgs[i].AttachmentURLs[j].URL = s.presignOrKey(ctx, msgs[i].AttachmentURLs[j].URL)
		}
	}
	return &models.SupportTicketDetail{Ticket: *t, Messages: msgs}, nil
}

// logSupportAttachmentURL logs the B2 object key and presigned download URL returned in the upload API response.
func logSupportAttachmentURL(actor, ticketID, objectKey, presignedURL, filename string) {
	log.Printf(
		"[support] attachment uploaded actor=%s ticket=%s file=%q object_key=%s presigned_url=%s",
		actor, ticketID, filename, objectKey, presignedURL,
	)
}

func (s *SupportService) presignOrKey(ctx context.Context, objectKey string) string {
	if s.storage == nil || objectKey == "" {
		return objectKey
	}
	url, err := s.storage.PresignedGetURL(ctx, objectKey, supportPresignTTL)
	if err != nil {
		return objectKey
	}
	return url
}

func trimPtr(p *string) *string {
	if p == nil {
		return nil
	}
	t := strings.TrimSpace(*p)
	if t == "" {
		return nil
	}
	return &t
}

func normalizeStatus(s string) string {
	v := strings.TrimSpace(strings.ToLower(s))
	switch v {
	case models.SupportTicketStatusOpen, models.SupportTicketStatusInProgress, models.SupportTicketStatusClosed:
		return v
	}
	return ""
}
