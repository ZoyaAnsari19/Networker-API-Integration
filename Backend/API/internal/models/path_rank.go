package models

import "time"

type PathRankSlab struct {
	RankLevel         int       `json:"rank_level"`
	Name              string    `json:"name"`
	MinDirectBVPaise  int64     `json:"min_direct_bv_paise"`
	MinLifetimePairs  int       `json:"min_lifetime_pairs"`
	IsActive          bool      `json:"is_active"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type PathRankSummary struct {
	CurrentRank     PathRankRankView      `json:"current_rank"`
	NextRank        *PathRankNextView     `json:"next_rank,omitempty"`
	DirectTeam      PathRankDirectTeam    `json:"direct_team"`
	BinaryLegs      PathRankBinaryLegs    `json:"binary_legs"`
	Pairs           PathRankPairsSection  `json:"pairs"`
	RankProgression []PathRankProgressRow `json:"rank_progression"`
}

type PathRankRankView struct {
	Level            int    `json:"level"`
	Name             string `json:"name"`
	MinDirectBVPaise int64  `json:"min_direct_bv_paise"`
}

type PathRankNextView struct {
	Level              int     `json:"level"`
	Name               string  `json:"name"`
	MinDirectBVPaise   int64   `json:"min_direct_bv_paise"`
	BVRemainingPaise   int64   `json:"bv_remaining_paise"`
	ProgressPercent    float64 `json:"progress_percent"`
	MinLifetimePairs   int     `json:"min_lifetime_pairs"`
	LifetimePairsHave  int     `json:"lifetime_pairs_have"`
	PairsRemaining     int     `json:"pairs_remaining,omitempty"`
}

type PathRankDirectTeam struct {
	TotalBVPaise       int64 `json:"total_bv_paise"`
	LeftBVPaise        int64 `json:"left_bv_paise"`
	RightBVPaise       int64 `json:"right_bv_paise"`
	DirectCount        int   `json:"direct_count"`
	ActiveDirectCount  int   `json:"active_direct_count"`
}

type PathRankBinaryLegs struct {
	LeftBVPaise          int64   `json:"left_bv_paise"`
	RightBVPaise         int64   `json:"right_bv_paise"`
	TotalBVPaise         int64   `json:"total_bv_paise"`
	WeakLegPercent       float64 `json:"weak_leg_percent"`
	RatioDisplay         string  `json:"ratio_display"`
	RatioRuleEnabled     bool    `json:"ratio_rule_enabled"`
	RatioRuleMinPercent  float64 `json:"ratio_rule_min_percent"`
	PassesRatioRule      bool    `json:"passes_ratio_rule"`
	StrongerLeg          string  `json:"stronger_leg,omitempty"`
}

type PathRankPairsSection struct {
	LifetimeCount         int                `json:"lifetime_count"`
	TodayCount            int                `json:"today_count"`
	LifetimeMatchedBVPaise int64             `json:"lifetime_matched_bv_paise"`
	Recent                []PathRankPairRow  `json:"recent"`
}

type PathRankPairRow struct {
	ID                 int64   `json:"id"`
	MatchedBVPaise     int64   `json:"matched_bv_paise"`
	LeftBVMatchedPaise int64   `json:"left_bv_matched_paise"`
	RightBVMatchedPaise int64  `json:"right_bv_matched_paise"`
	WeakLegPercent     float64 `json:"weak_leg_percent"`
	RatioDisplay       string  `json:"ratio_display"`
	CarryForwardBVPaise int64  `json:"carry_forward_bv_paise"`
	CarryForwardLeg    *string `json:"carry_forward_leg,omitempty"`
	TotalCreditedPaise int64   `json:"total_credited_paise"`
	OrderReference     *string `json:"order_reference,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

type PathRankProgressRow struct {
	Level            int     `json:"level"`
	Name             string  `json:"name"`
	MinDirectBVPaise int64   `json:"min_direct_bv_paise"`
	MinLifetimePairs int     `json:"min_lifetime_pairs"`
	IsUnlocked       bool    `json:"is_unlocked"`
	IsCurrent        bool    `json:"is_current"`
}
