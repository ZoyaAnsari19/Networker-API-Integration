package models

import "time"

type BVEntry struct {
	ID             int64      `json:"id"`
	UserID         string     `json:"user_id"`
	SourceUserID   string     `json:"source_user_id"`
	Leg            string     `json:"leg"`
	BVAmount       int64      `json:"bv_amount"`
	OrderReference *string    `json:"order_reference,omitempty"`
	Status         string     `json:"status"`
	MatchedAt      *time.Time `json:"matched_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

const (
	BVStatusUnmatched = "UNMATCHED"
	BVStatusMatched   = "MATCHED"
)
