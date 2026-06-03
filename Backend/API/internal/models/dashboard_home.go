package models

import "time"

// DashboardHomeSlide is one hero image in the networker app carousel (max 5).
// Use either ImageURL (https://… external) or ImageObjectKey (B2 key under
// fmcg-binary/dashboard-home/…), not both.
type DashboardHomeSlide struct {
	ID             string  `json:"id"`
	ImageURL       string  `json:"image_url"`
	ImageObjectKey string  `json:"image_object_key,omitempty"`
	LinkURL        *string `json:"link_url,omitempty"`
	Caption        string  `json:"caption"`
	SortOrder      int     `json:"sort_order"`
}

// AdminDashboardHomeSlide is returned by GET/PUT /admin/config/dashboard-home
// so the admin UI can preview B2-backed slides via DisplayImageURL.
type AdminDashboardHomeSlide struct {
	ID              string  `json:"id"`
	ImageURL        string  `json:"image_url"`
	ImageObjectKey  string  `json:"image_object_key,omitempty"`
	LinkURL         *string `json:"link_url,omitempty"`
	Caption         string  `json:"caption"`
	SortOrder       int     `json:"sort_order"`
	DisplayImageURL string  `json:"display_image_url,omitempty"`
}

// AdminDashboardHomeAPIResponse is the admin API envelope for dashboard home.
type AdminDashboardHomeAPIResponse struct {
	Slides    []AdminDashboardHomeSlide `json:"slides"`
	Notices   []DashboardHomeNotice     `json:"notices"`
	UpdatedAt time.Time                 `json:"updated_at"`
}

// DashboardHomeNotice is a dashboard notice with optional CTA link.
type DashboardHomeNotice struct {
	ID        string  `json:"id"`
	Title     string  `json:"title"`
	Body      string  `json:"body"`
	LinkURL   *string `json:"link_url,omitempty"`
	LinkLabel *string `json:"link_label,omitempty"`
	Active    bool    `json:"active"`
	UpdatedAt string  `json:"updated_at,omitempty"`
}

// DashboardHomePayload is the document stored in dashboard_home_content (JSON body for PUT).
type DashboardHomePayload struct {
	Slides  []DashboardHomeSlide  `json:"slides"`
	Notices []DashboardHomeNotice `json:"notices"`
}

// DashboardHomeResponse adds server metadata for admin GET.
type DashboardHomeResponse struct {
	DashboardHomePayload
	UpdatedAt time.Time `json:"updated_at"`
}
