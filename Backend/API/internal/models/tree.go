package models

import "time"

type TreeNode struct {
	ID           int64     `json:"id"`
	UserID       string    `json:"user_id"`
	ParentID     *string   `json:"parent_id,omitempty"`
	Leg          *string   `json:"leg,omitempty"`
	LeftChildID  *string   `json:"left_child_id,omitempty"`
	RightChildID *string   `json:"right_child_id,omitempty"`
	LeftBV       int64     `json:"left_bv"`
	RightBV      int64     `json:"right_bv"`
	CreatedAt    time.Time `json:"created_at"`
}

type TreeView struct {
	UserID       string    `json:"user_id"`
	FullName     string    `json:"full_name"`
	Leg          *string   `json:"leg,omitempty"`
	LeftBV       int64     `json:"left_bv"`
	RightBV      int64     `json:"right_bv"`
	Status       string    `json:"status"`
	PackageName  *string   `json:"package_name,omitempty"`
	Left         *TreeView `json:"left,omitempty"`
	Right        *TreeView `json:"right,omitempty"`
}

const (
	LegLeft  = "LEFT"
	LegRight = "RIGHT"
)

// TeamMember is a compact row describing one descendant in the caller's binary
// tree (either LEFT or RIGHT side relative to the caller). `Volume` is the BV
// that has flowed under that member's own node (`left_bv + right_bv`).
type TeamMember struct {
	UserID      string    `json:"user_id"`
	SponsorID   string    `json:"sponsor_id"`
	FullName    string    `json:"full_name"`
	Email       string    `json:"email"`
	Status      string    `json:"status"`
	PackageName *string   `json:"package_name,omitempty"`
	Leg         string    `json:"leg"`
	IsDirect    bool      `json:"is_direct"`
	Volume      int64     `json:"volume"`
	Depth       int       `json:"depth"`
	JoinedAt    time.Time `json:"joined_at"`
}

// TeamStatsView summarises the caller's full downline (both legs combined).
type TeamStatsView struct {
	TotalMembers  int   `json:"total_members"`
	ActiveMembers int   `json:"active_members"`
	NewThisWeek   int   `json:"new_this_week"`
	LeftCount     int   `json:"left_count"`
	RightCount    int   `json:"right_count"`
	LeftVolume    int64 `json:"left_volume"`
	RightVolume   int64 `json:"right_volume"`
	TotalVolume   int64 `json:"total_volume"`
}
