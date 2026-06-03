package models

import "time"

const (
	PlacementReqPending    = "PENDING"
	PlacementReqApproved   = "APPROVED"
	PlacementReqAutoPlaced = "AUTO_PLACED"
	PlacementReqAdmin      = "ADMIN_PLACED"

	BVHoldHeld     = "HELD"
	BVHoldReleased = "RELEASED"
)

type PlacementRequest struct {
	ID            string     `json:"id"`
	UserID        string     `json:"user_id"`
	SponsorUserID string     `json:"sponsor_user_id"`
	Status        string     `json:"status"`
	DecidedLeg    *string    `json:"decided_leg,omitempty"`
	DecidedBy     *string    `json:"decided_by,omitempty"`
	ExpiresAt     time.Time  `json:"expires_at"`
	DecidedAt     *time.Time `json:"decided_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type PendingBVHold struct {
	ID             int64      `json:"id"`
	SourceUserID   string     `json:"source_user_id"`
	OrderReference string     `json:"order_reference"`
	BVAmount       int64      `json:"bv_amount"`
	Status         string     `json:"status"`
	CreatedAt      time.Time  `json:"created_at"`
	ReleasedAt     *time.Time `json:"released_at,omitempty"`
}

type PlacementDecideRequest struct {
	Leg string `json:"leg" validate:"required,oneof=LEFT RIGHT"`
}
