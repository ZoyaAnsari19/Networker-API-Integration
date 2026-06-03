package models

import "time"

const (
	KYCStatusPending   = "PENDING"
	KYCStatusSubmitted = "SUBMITTED"
	KYCStatusApproved  = "APPROVED"
	KYCStatusRejected  = "REJECTED"
)

// Mapping: User UI → API document_type
//   pan              → PAN_CARD
//   aadhaarFront     → AADHAAR_FRONT
//   aadhaarBack      → AADHAAR_BACK
//   bankPassbook     → BANK_PASSBOOK
//   (legacy single)  → AADHAAR_CARD
var ValidKYCDocumentTypes = []string{
	"PAN_CARD",
	"AADHAAR_CARD",
	"AADHAAR_FRONT",
	"AADHAAR_BACK",
	"BANK_PASSBOOK",
	"OTHER",
}

type KYCRequest struct {
	KYCID           string        `json:"kyc_id"`
	UserID          string        `json:"user_id"`
	Status          string        `json:"status"`
	RejectionReason *string       `json:"rejection_reason,omitempty"`
	AdminID         *string       `json:"admin_id,omitempty"`
	SubmittedAt     *time.Time    `json:"submitted_at,omitempty"`
	ReviewedAt      *time.Time    `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time     `json:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at"`
	Documents       []KYCDocument `json:"documents,omitempty"`
}

type KYCDocument struct {
	DocumentID   string    `json:"document_id"`
	KYCID        string    `json:"kyc_id"`
	DocumentType string    `json:"document_type"`
	DocumentURL  string    `json:"document_url,omitempty"`
	FileName     *string   `json:"file_name,omitempty"`
	FileSize     *int64    `json:"file_size,omitempty"`
	MimeType     *string   `json:"mime_type,omitempty"`
	DownloadURL  *string   `json:"download_url,omitempty"`
	UploadedAt   time.Time `json:"uploaded_at"`
}

// AdminUpdateKYCRequest is the body accepted by PATCH /admin/kyc/requests/:id.
// RejectionReason is required when Status == "REJECTED" so the user can see
// why and fix the documents.
type AdminUpdateKYCRequest struct {
	Status          string  `json:"status"`
	RejectionReason *string `json:"rejection_reason,omitempty"`
}
