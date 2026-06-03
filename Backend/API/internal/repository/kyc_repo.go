package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"fmcg-binary/internal/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type KYCRepo struct {
	db *pgxpool.Pool
}

func NewKYCRepo(db *pgxpool.Pool) *KYCRepo {
	return &KYCRepo{db: db}
}

func (r *KYCRepo) CreateRequest(ctx context.Context, userID string) (*models.KYCRequest, error) {
	q := `INSERT INTO kyc_requests (user_id) VALUES ($1)
		RETURNING kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at`
	req := &models.KYCRequest{}
	err := r.db.QueryRow(ctx, q, userID).Scan(
		&req.KYCID, &req.UserID, &req.Status, &req.RejectionReason, &req.AdminID,
		&req.SubmittedAt, &req.ReviewedAt, &req.CreatedAt, &req.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *KYCRepo) GetByUserID(ctx context.Context, userID string) (*models.KYCRequest, error) {
	q := `SELECT kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at
		FROM kyc_requests WHERE user_id = $1`
	return r.scanOne(ctx, q, userID)
}

func (r *KYCRepo) GetByID(ctx context.Context, kycID string) (*models.KYCRequest, error) {
	q := `SELECT kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at
		FROM kyc_requests WHERE kyc_id = $1`
	return r.scanOne(ctx, q, kycID)
}

func (r *KYCRepo) scanOne(ctx context.Context, query string, args ...any) (*models.KYCRequest, error) {
	req := &models.KYCRequest{}
	err := r.db.QueryRow(ctx, query, args...).Scan(
		&req.KYCID, &req.UserID, &req.Status, &req.RejectionReason, &req.AdminID,
		&req.SubmittedAt, &req.ReviewedAt, &req.CreatedAt, &req.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

func (r *KYCRepo) ListDocuments(ctx context.Context, kycID string) ([]models.KYCDocument, error) {
	q := `SELECT document_id, kyc_id, document_type, document_url, file_name, file_size, mime_type, uploaded_at
		FROM kyc_documents WHERE kyc_id = $1 ORDER BY uploaded_at ASC`
	rows, err := r.db.Query(ctx, q, kycID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []models.KYCDocument
	for rows.Next() {
		var d models.KYCDocument
		if err := rows.Scan(&d.DocumentID, &d.KYCID, &d.DocumentType, &d.DocumentURL,
			&d.FileName, &d.FileSize, &d.MimeType, &d.UploadedAt); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}

func (r *KYCRepo) InsertDocument(ctx context.Context, d *models.KYCDocument) error {
	q := `INSERT INTO kyc_documents (kyc_id, document_type, document_url, file_name, file_size, mime_type)
		VALUES ($1, $2::kyc_document_type, $3, $4, $5, $6)
		RETURNING document_id, uploaded_at`
	return r.db.QueryRow(ctx, q, d.KYCID, d.DocumentType, d.DocumentURL, d.FileName, d.FileSize, d.MimeType).
		Scan(&d.DocumentID, &d.UploadedAt)
}

func (r *KYCRepo) SetSubmitted(ctx context.Context, kycID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE kyc_requests SET status = 'SUBMITTED'::kyc_status, submitted_at = NOW(), updated_at = NOW()
		 WHERE kyc_id = $1 AND status = 'PENDING'::kyc_status`, kycID)
	return err
}

func (r *KYCRepo) UpdateStatus(ctx context.Context, kycID, status string, rejectionReason *string, adminID string) error {
	cmd, err := r.db.Exec(ctx,
		`UPDATE kyc_requests SET status = $2::kyc_status, rejection_reason = $3, admin_id = $4, reviewed_at = NOW(), updated_at = NOW()
		 WHERE kyc_id = $1`,
		kycID, status, rejectionReason, adminID,
	)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return fmt.Errorf("kyc request not found")
	}
	return nil
}

// ResetForResubmission resets a REJECTED request so the user can upload again.
func (r *KYCRepo) ResetForResubmission(ctx context.Context, kycID string) error {
	_, err := r.db.Exec(ctx,
		`UPDATE kyc_requests SET status = 'PENDING'::kyc_status, rejection_reason = NULL, admin_id = NULL,
		 submitted_at = NULL, reviewed_at = NULL, updated_at = NOW()
		 WHERE kyc_id = $1 AND status = 'REJECTED'::kyc_status`, kycID)
	return err
}

func (r *KYCRepo) DeleteDocumentsByKYCID(ctx context.Context, kycID string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM kyc_documents WHERE kyc_id = $1`, kycID)
	return err
}

func (r *KYCRepo) ListRequests(ctx context.Context, statusFilter string, limit, offset int) ([]models.KYCRequest, int64, error) {
	var total int64
	var err error
	if statusFilter == "" {
		err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM kyc_requests`).Scan(&total)
	} else {
		err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM kyc_requests WHERE status = $1::kyc_status`, statusFilter).Scan(&total)
	}
	if err != nil {
		return nil, 0, err
	}

	var rows pgx.Rows
	if statusFilter == "" {
		rows, err = r.db.Query(ctx,
			`SELECT kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at
			 FROM kyc_requests ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
			limit, offset)
	} else {
		rows, err = r.db.Query(ctx,
			`SELECT kyc_id, user_id, status, rejection_reason, admin_id, submitted_at, reviewed_at, created_at, updated_at
			 FROM kyc_requests WHERE status = $1::kyc_status ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
			statusFilter, limit, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var list []models.KYCRequest
	for rows.Next() {
		var req models.KYCRequest
		var reviewedAt, submittedAt *time.Time
		if err := rows.Scan(&req.KYCID, &req.UserID, &req.Status, &req.RejectionReason, &req.AdminID,
			&submittedAt, &reviewedAt, &req.CreatedAt, &req.UpdatedAt); err != nil {
			return nil, 0, err
		}
		req.SubmittedAt = submittedAt
		req.ReviewedAt = reviewedAt
		list = append(list, req)
	}
	return list, total, rows.Err()
}
