package models

import (
	"time"
)

// Support ticket constants. Lifecycle stays simple:
//   open        — newly raised; not yet assigned.
//   in_progress — a staff user has clicked "assign to me".
//   closed      — terminal; new messages and uploads are rejected by the API.
const (
	SupportTicketStatusOpen       = "open"
	SupportTicketStatusInProgress = "in_progress"
	SupportTicketStatusClosed     = "closed"

	SupportSenderUser   = "user"
	SupportSenderAdmin  = "admin"
	SupportSenderSystem = "system"
)

// Permission keys: models.PermSupportView / models.PermSupportManage (staff.go).
// Mirrored in Frontend/Admin/lib/admin-permissions.ts and sub-admin-permissions.ts.

// System message templates used for assignment / reassign / close audit lines.
const (
	SupportSystemAssigned   = "Ticket assigned"
	SupportSystemReassigned = "Ticket reassigned"
	SupportSystemReopened   = "Ticket re-opened"
	SupportSystemClosedUser = "Ticket closed by user"
	SupportSystemClosedAdmn = "Ticket closed by admin"
)

// SupportTopic is a row from `support_pre_questions` (the "Topics" list).
type SupportTopic struct {
	ID         int64     `json:"id"`
	Question   string    `json:"question"`
	Category   *string   `json:"category"`
	SortOrder  int       `json:"sort_order"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at,omitempty"`
	UpdatedAt  time.Time `json:"updated_at,omitempty"`
}

// SupportAttachment is one entry of the JSONB `attachment_urls` array.
type SupportAttachment struct {
	URL      string `json:"url"`
	Type     string `json:"type"`
	Filename string `json:"filename"`
}

// SupportMessage is one row of `support_ticket_messages`.
type SupportMessage struct {
	ID             int64               `json:"id"`
	TicketID       string              `json:"ticket_id"`
	SenderType     string              `json:"sender_type"`
	SenderUserID   *string             `json:"sender_user_id"`
	SenderName     *string             `json:"sender_name,omitempty"`
	MessageText    *string             `json:"message_text"`
	AttachmentURLs []SupportAttachment `json:"attachment_urls"`
	CreatedAt      time.Time           `json:"created_at"`
}

// SupportTicket is one row of `support_tickets` enriched with optional join
// columns (networker name / sponsor / assignee name) for list and detail.
type SupportTicket struct {
	ID              string     `json:"id"`
	UserID          string     `json:"user_id"`
	UserFullName    *string    `json:"user_full_name,omitempty"`
	UserSponsorID   *string    `json:"user_sponsor_id,omitempty"`
	UserEmail       *string    `json:"user_email,omitempty"`
	PreQuestionID   *int64     `json:"pre_question_id"`
	PreQuestion     *string    `json:"pre_question,omitempty"`
	Subject         *string    `json:"subject"`
	Status          string     `json:"status"`
	AssignedTo      *string    `json:"assigned_to"`
	AssignedToName  *string    `json:"assigned_to_name,omitempty"`
	ClosedAt        *time.Time `json:"closed_at"`
	ClosedByUserID  *string    `json:"closed_by_user_id"`
	LastMessageAt   *time.Time `json:"last_message_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// SupportTicketDetail bundles a ticket header with its conversation thread.
type SupportTicketDetail struct {
	Ticket   SupportTicket    `json:"ticket"`
	Messages []SupportMessage `json:"messages"`
}

// Request bodies ----------------------------------------------------------

type CreateSupportTicketRequest struct {
	PreQuestionID *int64 `json:"pre_question_id,omitempty"`
	Subject       string `json:"subject,omitempty"`
	Message       string `json:"message"`
}

type PostSupportMessageRequest struct {
	Message string `json:"message"`
}

type ReassignSupportTicketRequest struct {
	AssignedTo *string `json:"assigned_to"`
}

type CreateSupportTopicRequest struct {
	Question  string  `json:"question"`
	Category  *string `json:"category"`
	SortOrder int     `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}

type UpdateSupportTopicRequest struct {
	Question  *string `json:"question"`
	Category  *string `json:"category"`
	SortOrder *int    `json:"sort_order"`
	IsActive  *bool   `json:"is_active"`
}
