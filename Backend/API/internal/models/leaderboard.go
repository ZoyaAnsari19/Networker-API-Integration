package models

import "time"

type LeaderboardEntry struct {
	Rank          int     `json:"rank"`
	UserID        string  `json:"user_id"`
	DisplayName   string  `json:"display_name"`
	SponsorID     string  `json:"sponsor_id"`
	AvatarURL     *string `json:"avatar_url,omitempty"`
	AdminTitle         *string `json:"admin_title,omitempty"`
	AdminTitleImageURL *string `json:"admin_title_image_url,omitempty"`
	ScorePaise    int64   `json:"score_paise"`
	PathRankName  string  `json:"path_rank_name,omitempty"`
	PathRankLevel int     `json:"path_rank_level,omitempty"`
	PackageName   string  `json:"package_name,omitempty"`
	IsMe          bool    `json:"is_me"`

	DirectBVAllTimePaise    int64 `json:"direct_bv_alltime_paise"`
	DirectLeftBVAllTimePaise  int64 `json:"direct_left_bv_alltime_paise"`
	DirectRightBVAllTimePaise int64 `json:"direct_right_bv_alltime_paise"`
	DirectCount             int   `json:"direct_count"`
	ActiveDirectCount       int   `json:"active_direct_count"`
	LifetimePairs           int   `json:"lifetime_pairs"`
	TodayPairs              int   `json:"today_pairs"`
	LifetimeMatchedBVPaise  int64 `json:"lifetime_matched_bv_paise"`
	MatchedBVInPeriodPaise  int64 `json:"matched_bv_in_period_paise"`

	LeftPipelinePaise  int64   `json:"left_pipeline_paise"`
	RightPipelinePaise int64   `json:"right_pipeline_paise"`
	WeakLegPercent     float64 `json:"weak_leg_percent"`
	RatioDisplay       string  `json:"ratio_display,omitempty"`

	PackageAmountPaise   int64      `json:"package_amount_paise,omitempty"`
	PackageActivatedAt   *time.Time `json:"package_activated_at,omitempty"`
	JoinedAt             time.Time  `json:"joined_at"`
	PlacementLeg         *string    `json:"placement_leg,omitempty"`
}

type LeaderboardMyPosition struct {
	Rank             int     `json:"rank"`
	ScorePaise       int64   `json:"score_paise"`
	Percentile       float64 `json:"percentile"`
	InTopList        bool    `json:"in_top_list"`
	TotalRanked      int     `json:"total_ranked"`
	LeaderScorePaise int64   `json:"leader_score_paise"`
	GapToNextPaise   int64   `json:"gap_to_next_paise"`
}

type LeaderboardResponse struct {
	Scope       string                 `json:"scope"`
	Period      string                 `json:"period"`
	PeriodLabel string                 `json:"period_label"`
	AsOf        time.Time              `json:"as_of"`
	Entries     []LeaderboardEntry     `json:"entries"`
	MyPosition  *LeaderboardMyPosition `json:"my_position,omitempty"`
}
