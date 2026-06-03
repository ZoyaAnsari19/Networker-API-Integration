package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type SecureMartStoreClient struct {
	baseURL string
	client  *http.Client
}

func NewSecureMartStoreClient(baseURL string) *SecureMartStoreClient {
	base := strings.TrimSpace(baseURL)
	if base == "" {
		base = "https://api.securepharma.co.in/api/v1"
	}
	base = strings.TrimRight(base, "/")
	return &SecureMartStoreClient{
		baseURL: base,
		client: &http.Client{Timeout: 20 * time.Second},
	}
}

type secureMartStoreLoginRequest struct {
	LoginIdentifier string `json:"login_identifier"`
	Password        string `json:"password"`
}

type secureMartStoreLoginEnvelope struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Error   string `json:"error"`
	Data    struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
	} `json:"data"`
}

func (c *SecureMartStoreClient) Login(ctx context.Context, loginIdentifier, password string) (string, error) {
	loginIdentifier = strings.TrimSpace(loginIdentifier)
	password = strings.TrimSpace(password)
	if loginIdentifier == "" || password == "" {
		return "", fmt.Errorf("login_identifier and password are required")
	}

	body, _ := json.Marshal(secureMartStoreLoginRequest{
		LoginIdentifier: loginIdentifier,
		Password:        password,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/auth/store/login", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := c.client.Do(req)
	if err != nil {
		return "", err
	}
	defer func() { _ = resp.Body.Close() }()

	var env secureMartStoreLoginEnvelope
	if derr := json.NewDecoder(resp.Body).Decode(&env); derr != nil {
		return "", fmt.Errorf("store login parse failed (status=%d)", resp.StatusCode)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 || !env.Success || strings.TrimSpace(env.Data.AccessToken) == "" {
		msg := strings.TrimSpace(env.Error)
		if msg == "" {
			msg = strings.TrimSpace(env.Message)
		}
		if msg == "" {
			msg = "store login failed"
		}
		// Typical: wrong password, no scm_customer row, or email not registered on SecureMart.
		if strings.EqualFold(msg, "unauthorized") {
			msg = "unauthorized (SecureMart rejected email/password — use the same password as your SecureMart customer account)"
		}
		return "", fmt.Errorf("secure_mart: %s", msg)
	}

	return strings.TrimSpace(env.Data.AccessToken), nil
}

