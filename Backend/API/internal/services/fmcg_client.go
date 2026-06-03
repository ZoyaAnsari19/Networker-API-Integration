package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmcg-binary/internal/models"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type FMCGClient struct {
	baseURL   string
	apiKey    string
	apiSecret string
	client    *http.Client
}

func NewFMCGClient(baseURL, apiKey, apiSecret string) *FMCGClient {
	return &FMCGClient{
		baseURL:   baseURL,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

// FMCGSyncNewUserOpts is optional data Binary sends to FMCG when provisioning
// a mirror account after admin creates a user on Binary. PlaintextPassword must
// only be used over HTTPS to a trusted FMCG endpoint.
type FMCGSyncNewUserOpts struct {
	PlaintextPassword string
	Leg               string // binary tree leg for this user (LEFT or RIGHT)
}

// SyncNewUser POSTs to FMCG_BASE/api/v1/users/sync (FMCG-hosted). When opts is
// nil, only profile identifiers are sent (same as legacy behaviour).
func (c *FMCGClient) SyncNewUser(ctx context.Context, user *models.User, opts *FMCGSyncNewUserOpts) error {
	if c.baseURL == "" {
		return nil
	}

	body := map[string]any{
		"user_id":    user.UserID,
		"sponsor_id": user.SponsorID,
		"full_name":  user.FullName,
		"email":      user.Email,
		"phone":      user.Phone,
		"user_type":  "networker",
		"status":     user.Status,
		"placement_status": user.PlacementStatus,
	}
	if user.CurrentPackageID != nil && *user.CurrentPackageID != "" {
		body["package_id"] = *user.CurrentPackageID
	}
	if opts != nil {
		leg := strings.TrimSpace(strings.ToUpper(opts.Leg))
		if leg == models.LegLeft || leg == models.LegRight {
			body["leg"] = leg
		}
		if opts.PlaintextPassword != "" {
			body["password"] = opts.PlaintextPassword
		}
	}
	jsonBody, _ := json.Marshal(body)

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/v1/users/sync", bytes.NewReader(jsonBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("X-API-Secret", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("fmcg sync failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("fmcg sync returned %d", resp.StatusCode)
	}
	return nil
}
