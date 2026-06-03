package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SupportRepo owns the support_* tables.
type SupportRepo struct {
	db *pgxpool.Pool
}

func NewSupportRepo(db *pgxpool.Pool) *SupportRepo {
	return &SupportRepo{db: db}
}

// --- Topics ("pre-questions") ---

func (r *SupportRepo) ListTopics(ctx context.Context, activeOnly bool) ([]models.SupportTopic, error) {
	q := `SELECT id, question, category, sort_order, is_active, created_at, updated_at
		FROM support_pre_questions`
	args := []any{}
	if activeOnly {
		q += ` WHERE is_active = TRUE`
	}
	q += ` ORDER BY sort_order ASC, id ASC`
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []models.SupportTopic
	for rows.Next() {
		var t models.SupportTopic
		if err := rows.Scan(&t.ID, &t.Question, &t.Category, &t.SortOrder, &t.IsActive, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

// TopicSortOrderTaken reports whether another topic already uses sort_order (excludeID 0 on create).
func (r *SupportRepo) TopicSortOrderTaken(ctx context.Context, sortOrder int, excludeID int64) (bool, error) {
	q := `SELECT EXISTS(
		SELECT 1 FROM support_pre_questions
		WHERE sort_order = $1 AND ($2::bigint = 0 OR id <> $2)
	)`
	var taken bool
	err := r.db.QueryRow(ctx, q, sortOrder, excludeID).Scan(&taken)
	return taken, err
}

func (r *SupportRepo) GetTopic(ctx context.Context, id int64) (*models.SupportTopic, error) {
	q := `SELECT id, question, category, sort_order, is_active, created_at, updated_at
		FROM support_pre_questions WHERE id = $1`
	var t models.SupportTopic
	err := r.db.QueryRow(ctx, q, id).Scan(&t.ID, &t.Question, &t.Category, &t.SortOrder, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *SupportRepo) InsertTopic(ctx context.Context, t *models.SupportTopic) error {
	q := `INSERT INTO support_pre_questions (question, category, sort_order, is_active)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at`
	return r.db.QueryRow(ctx, q, t.Question, t.Category, t.SortOrder, t.IsActive).
		Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
}

// UpdateTopic performs a partial update. Any nil field on the model is treated as "leave as-is".
func (r *SupportRepo) UpdateTopic(ctx context.Context, id int64, body models.UpdateSupportTopicRequest) (*models.SupportTopic, error) {
	sets := []string{}
	args := []any{id}
	i := 2
	if body.Question != nil {
		sets = append(sets, fmt.Sprintf("question = $%d", i))
		args = append(args, *body.Question)
		i++
	}
	if body.Category != nil {
		sets = append(sets, fmt.Sprintf("category = $%d", i))
		args = append(args, *body.Category)
		i++
	}
	if body.SortOrder != nil {
		sets = append(sets, fmt.Sprintf("sort_order = $%d", i))
		args = append(args, *body.SortOrder)
		i++
	}
	if body.IsActive != nil {
		sets = append(sets, fmt.Sprintf("is_active = $%d", i))
		args = append(args, *body.IsActive)
		i++
	}
	if len(sets) == 0 {
		return r.GetTopic(ctx, id)
	}
	q := fmt.Sprintf(`UPDATE support_pre_questions SET %s, updated_at = NOW() WHERE id = $1
		RETURNING id, question, category, sort_order, is_active, created_at, updated_at`, strings.Join(sets, ", "))
	var t models.SupportTopic
	err := r.db.QueryRow(ctx, q, args...).Scan(&t.ID, &t.Question, &t.Category, &t.SortOrder, &t.IsActive, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *SupportRepo) DeleteTopic(ctx context.Context, id int64) error {
	cmd, err := r.db.Exec(ctx, `DELETE FROM support_pre_questions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("topic not found")
	}
	return nil
}

// --- Ticket header CRUD ---

// ticketSelectColumns is the joined SELECT used by GetTicket / ListTickets.
// Pulls user + topic + assignee names for the admin UI without a second query.
const ticketSelectColumns = `
	t.id, t.user_id, u.full_name, u.sponsor_id, u.email,
	t.pre_question_id, q.question,
	t.subject, t.status,
	t.assigned_to, a.full_name,
	t.closed_at, t.closed_by_user_id,
	t.last_message_at, t.created_at, t.updated_at`

const ticketJoins = `
	FROM support_tickets t
	LEFT JOIN networker_users u ON u.user_id = t.user_id
	LEFT JOIN support_pre_questions q ON q.id = t.pre_question_id
	LEFT JOIN networker_users a ON a.user_id = t.assigned_to`

func scanTicket(row pgx.Row) (*models.SupportTicket, error) {
	var t models.SupportTicket
	err := row.Scan(
		&t.ID, &t.UserID, &t.UserFullName, &t.UserSponsorID, &t.UserEmail,
		&t.PreQuestionID, &t.PreQuestion,
		&t.Subject, &t.Status,
		&t.AssignedTo, &t.AssignedToName,
		&t.ClosedAt, &t.ClosedByUserID,
		&t.LastMessageAt, &t.CreatedAt, &t.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *SupportRepo) GetTicket(ctx context.Context, id string) (*models.SupportTicket, error) {
	q := `SELECT ` + ticketSelectColumns + ticketJoins + ` WHERE t.id = $1`
	return scanTicket(r.db.QueryRow(ctx, q, id))
}

// CreateTicket inserts a new ticket and returns the joined header.
func (r *SupportRepo) CreateTicket(ctx context.Context, userID string, preQuestionID *int64, subject *string) (*models.SupportTicket, error) {
	q := `INSERT INTO support_tickets (user_id, pre_question_id, subject)
		VALUES ($1, $2, $3) RETURNING id`
	var id string
	if err := r.db.QueryRow(ctx, q, userID, preQuestionID, subject).Scan(&id); err != nil {
		return nil, err
	}
	return r.GetTicket(ctx, id)
}

// ListMyTickets returns tickets owned by `userID`, optionally filtered by status.
func (r *SupportRepo) ListMyTickets(ctx context.Context, userID, statusFilter string) ([]models.SupportTicket, error) {
	q := `SELECT ` + ticketSelectColumns + ticketJoins + ` WHERE t.user_id = $1`
	args := []any{userID}
	if statusFilter != "" {
		q += ` AND t.status = $2::support_ticket_status`
		args = append(args, statusFilter)
	}
	q += ` ORDER BY t.created_at DESC`
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.SupportTicket{}
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, err
		}
		if t != nil {
			out = append(out, *t)
		}
	}
	return out, rows.Err()
}

// AdminTicketFilters bundles the filter parameters accepted by the admin list endpoint.
type AdminTicketFilters struct {
	Status         string
	AssignedTo     string // exact user_id
	Assigned       string // "me" handled by caller (rewrites AssignedTo); "unassigned" filters NULL
	Search         string // matches subject, name, sponsor_id, email, ticket id prefix
	DateFrom       string // YYYY-MM-DD (UTC)
	DateTo         string // YYYY-MM-DD (UTC, inclusive end)
	Limit, Offset  int
}

// ListTicketsAdmin returns a paginated, filterable set of tickets (admin).
func (r *SupportRepo) ListTicketsAdmin(ctx context.Context, f AdminTicketFilters) ([]models.SupportTicket, int64, error) {
	whereParts := []string{"TRUE"}
	args := []any{}
	add := func(cond string, val any) {
		args = append(args, val)
		whereParts = append(whereParts, fmt.Sprintf(cond, len(args)))
	}
	if f.Status != "" {
		add("t.status = $%d::support_ticket_status", f.Status)
	}
	switch f.Assigned {
	case "unassigned":
		whereParts = append(whereParts, "t.assigned_to IS NULL")
	}
	if f.AssignedTo != "" {
		add("t.assigned_to = $%d", f.AssignedTo)
	}
	if f.Search != "" {
		needle := "%" + strings.ToLower(f.Search) + "%"
		// Coalesce nullable columns to '' so ILIKE on NULL doesn't drop rows.
		args = append(args, needle)
		ph := len(args)
		whereParts = append(whereParts, fmt.Sprintf(
			"(LOWER(COALESCE(t.subject,'')) LIKE $%d OR LOWER(COALESCE(u.full_name,'')) LIKE $%d OR LOWER(COALESCE(u.sponsor_id,'')) LIKE $%d OR LOWER(COALESCE(u.email,'')) LIKE $%d OR t.id::text LIKE $%d)",
			ph, ph, ph, ph, ph,
		))
	}
	if f.DateFrom != "" {
		add("t.created_at >= ($%d::date)", f.DateFrom)
	}
	if f.DateTo != "" {
		add("t.created_at <  ($%d::date + INTERVAL '1 day')", f.DateTo)
	}
	where := strings.Join(whereParts, " AND ")

	// Count
	countQ := `SELECT COUNT(*) ` + ticketJoins + ` WHERE ` + where
	var total int64
	if err := r.db.QueryRow(ctx, countQ, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQ := `SELECT ` + ticketSelectColumns + ticketJoins + ` WHERE ` + where + ` ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d`
	args = append(args, f.Limit, f.Offset)
	listQ = fmt.Sprintf(listQ, len(args)-1, len(args))
	rows, err := r.db.Query(ctx, listQ, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []models.SupportTicket{}
	for rows.Next() {
		t, err := scanTicket(rows)
		if err != nil {
			return nil, 0, err
		}
		if t != nil {
			out = append(out, *t)
		}
	}
	return out, total, rows.Err()
}

// AssignTicket assigns the ticket to a staff user and flips status to in_progress.
// `previousAssignedTo` is read inside the same call so the caller can audit the change.
// Returns the updated joined ticket.
func (r *SupportRepo) AssignTicket(ctx context.Context, ticketID, newAssignee string) (*models.SupportTicket, error) {
	cmd, err := r.db.Exec(ctx,
		`UPDATE support_tickets SET assigned_to = $2, status = 'in_progress'::support_ticket_status, updated_at = NOW()
		 WHERE id = $1 AND status <> 'closed'::support_ticket_status`,
		ticketID, newAssignee,
	)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, fmt.Errorf("ticket not found or already closed")
	}
	return r.GetTicket(ctx, ticketID)
}

// SetAssignee allows ADMIN to set assigned_to to any staff user (or NULL to clear).
// Does NOT touch status when assignee is NULL — clearing the assignee while still
// in_progress is fine; the service layer decides whether to flip back to open.
func (r *SupportRepo) SetAssignee(ctx context.Context, ticketID string, assignee *string) (*models.SupportTicket, error) {
	cmd, err := r.db.Exec(ctx,
		`UPDATE support_tickets SET assigned_to = $2, updated_at = NOW()
		 WHERE id = $1 AND status <> 'closed'::support_ticket_status`,
		ticketID, assignee,
	)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, fmt.Errorf("ticket not found or already closed")
	}
	return r.GetTicket(ctx, ticketID)
}

// SetStatus sets status; convenience for the "assign to me but already in_progress" edge case.
func (r *SupportRepo) SetStatus(ctx context.Context, ticketID, newStatus string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE support_tickets SET status = $2::support_ticket_status, updated_at = NOW() WHERE id = $1`,
		ticketID, newStatus,
	)
	return err
}

// CloseTicket marks the ticket closed and stamps closer + timestamp.
func (r *SupportRepo) CloseTicket(ctx context.Context, ticketID, closedBy string) (*models.SupportTicket, error) {
	cmd, err := r.db.Exec(ctx,
		`UPDATE support_tickets
		 SET status = 'closed'::support_ticket_status, closed_at = NOW(), closed_by_user_id = $2, updated_at = NOW()
		 WHERE id = $1 AND status <> 'closed'::support_ticket_status`,
		ticketID, closedBy,
	)
	if err != nil {
		return nil, err
	}
	if cmd.RowsAffected() == 0 {
		return nil, fmt.Errorf("ticket already closed or not found")
	}
	return r.GetTicket(ctx, ticketID)
}

// TouchLastMessage updates the cached last_message_at column (used for sorting).
func (r *SupportRepo) TouchLastMessage(ctx context.Context, ticketID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE support_tickets SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1`,
		ticketID,
	)
	return err
}

// --- Messages ---

func encodeAttachments(att []models.SupportAttachment) ([]byte, error) {
	if att == nil {
		att = []models.SupportAttachment{}
	}
	return json.Marshal(att)
}

func decodeAttachments(raw []byte) ([]models.SupportAttachment, error) {
	if len(raw) == 0 {
		return []models.SupportAttachment{}, nil
	}
	var out []models.SupportAttachment
	if err := json.Unmarshal(raw, &out); err != nil {
		return []models.SupportAttachment{}, nil // tolerate legacy / unexpected shapes
	}
	if out == nil {
		out = []models.SupportAttachment{}
	}
	return out, nil
}

// InsertMessage appends a thread message. attachments may be nil.
func (r *SupportRepo) InsertMessage(ctx context.Context, ticketID, senderType string, senderUserID *string, messageText *string, attachments []models.SupportAttachment) (*models.SupportMessage, error) {
	jsonBytes, err := encodeAttachments(attachments)
	if err != nil {
		return nil, err
	}
	q := `INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_user_id, message_text, attachment_urls)
		VALUES ($1, $2::support_sender_type, $3, $4, $5::jsonb)
		RETURNING id, created_at`
	var m models.SupportMessage
	if err := r.db.QueryRow(ctx, q, ticketID, senderType, senderUserID, messageText, jsonBytes).Scan(&m.ID, &m.CreatedAt); err != nil {
		return nil, err
	}
	m.TicketID = ticketID
	m.SenderType = senderType
	m.SenderUserID = senderUserID
	m.MessageText = messageText
	m.AttachmentURLs = attachments
	if m.AttachmentURLs == nil {
		m.AttachmentURLs = []models.SupportAttachment{}
	}
	return &m, nil
}

// AppendAttachmentToLastUserMessage tries to append an attachment to the most-recent
// message of the actor on this ticket. If no such message exists (or it isn't from the
// same sender within a short window) a fresh attachment-only message is created.
// Returns the message that received the attachment.
func (r *SupportRepo) AppendAttachmentToLastMessage(ctx context.Context, ticketID, senderType string, senderUserID *string, att models.SupportAttachment) (*models.SupportMessage, error) {
	// We always append as its own attachment-only message. This is the
	// simplest model — keeps ordering trivial, avoids races with parallel
	// text+attachment uploads, and matches the UI which renders one bubble
	// per server message anyway.
	return r.InsertMessage(ctx, ticketID, senderType, senderUserID, nil, []models.SupportAttachment{att})
}

// ListMessages returns the conversation thread enriched with sender display names.
func (r *SupportRepo) ListMessages(ctx context.Context, ticketID string) ([]models.SupportMessage, error) {
	q := `SELECT m.id, m.ticket_id, m.sender_type, m.sender_user_id, u.full_name,
		m.message_text, m.attachment_urls, m.created_at
		FROM support_ticket_messages m
		LEFT JOIN networker_users u ON u.user_id = m.sender_user_id
		WHERE m.ticket_id = $1
		ORDER BY m.created_at ASC, m.id ASC`
	rows, err := r.db.Query(ctx, q, ticketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []models.SupportMessage{}
	for rows.Next() {
		var m models.SupportMessage
		var raw []byte
		if err := rows.Scan(&m.ID, &m.TicketID, &m.SenderType, &m.SenderUserID, &m.SenderName, &m.MessageText, &raw, &m.CreatedAt); err != nil {
			return nil, err
		}
		atts, _ := decodeAttachments(raw)
		m.AttachmentURLs = atts
		out = append(out, m)
	}
	return out, rows.Err()
}
