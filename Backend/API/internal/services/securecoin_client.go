package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

type SecureCoinClient struct {
	baseURL   string
	apiKey    string
	apiSecret string
	client    *http.Client
}

func NewSecureCoinClient(baseURL, apiKey, apiSecret string) *SecureCoinClient {
	return &SecureCoinClient{
		baseURL:   baseURL,
		apiKey:    apiKey,
		apiSecret: apiSecret,
		client:    &http.Client{Timeout: 30 * time.Second},
	}
}

// IssueReward calls Secure-Coin POST /api/v1/payments/rewards/issue
// to credit the user's SC wallet from the FMCG merchant wallet.
// Returns the reward reference ID on success.
func (c *SecureCoinClient) IssueReward(ctx context.Context, userEmail string, amountPaise int64, reason string) (string, error) {
	if c.baseURL == "" || c.apiKey == "" {
		return "", errors.New("secure-coin client not configured")
	}

	// SC rewards API expects reward_units (1 SC = 1000 units).
	// We convert paise to SC units: amount_paise / 100 (to INR) * 1000 (to units)
	// Simplified: reward_units = amount_paise * 10
	rewardUnits := amountPaise * 10

	body := map[string]any{
		"user_email":   userEmail,
		"reward_units": rewardUnits,
		"reason":       reason,
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/api/v1/payments/rewards/issue", bytes.NewReader(jsonBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)
	req.Header.Set("X-API-Secret", c.apiSecret)

	resp, err := c.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("sc api request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return "", fmt.Errorf("sc api returned %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Success bool `json:"success"`
		Data    struct {
			ReferenceID string `json:"reference_id"`
			TxID        string `json:"tx_id"`
		} `json:"data"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}

	ref := result.Data.ReferenceID
	if ref == "" {
		ref = result.Data.TxID
	}
	return ref, nil
}
