package models

import "time"

type PairMatchLog struct {
	ID                int64     `json:"id"`
	UserID            string    `json:"user_id"`
	LeftBVMatched     int64     `json:"left_bv_matched"`
	RightBVMatched    int64     `json:"right_bv_matched"`
	MatchedBV         int64     `json:"matched_bv"`
	CarryForwardBV    int64     `json:"carry_forward_bv"`
	CarryForwardLeg   *string   `json:"carry_forward_leg,omitempty"`
	CommissionAmount  int64     `json:"commission_amount"`
	LevelBonusAmount  int64     `json:"level_bonus_amount"`
	TotalCredited     int64     `json:"total_credited"`
	CapDeducted       int64     `json:"cap_deducted"`
	OrderReference    *string   `json:"order_reference,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

type DailyPairStats struct {
	ID                  int64     `json:"id"`
	UserID              string    `json:"user_id"`
	StatDate            string    `json:"stat_date"`
	PairsToday          int       `json:"pairs_today"`
	TotalPairsLifetime  int       `json:"total_pairs_lifetime"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}
