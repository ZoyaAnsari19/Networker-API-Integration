package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// WCLIClient calls WCLI-Service WhatsApp APIs:
//   POST /v1/send  — async default (wait=false) → 202 { status: "queued" }
//   GET  /v1/status/{request_id} — queued | sent | failed
//
// Success for SendOTP: HTTP 200/202 with terminal success (sent, or queued when
// we are not polling), or queued then sent after optional status polling.
// 502 + failed, or JSON status failed, is an error (logged; callers hide from users).
type WCLIClient struct {
	baseURL           string
	apiKey            string
	wait              bool
	timeoutMS         int
	statusPollMaxMS   int
	httpClient        *http.Client
	statusHTTPClient  *http.Client // short timeout per GET /v1/status
}

func NewWCLIClient(baseURL, apiKey string, wait bool, timeoutMS, statusPollMaxMS int) *WCLIClient {
	if timeoutMS <= 0 {
		timeoutMS = 30000
	}
	if statusPollMaxMS < 0 {
		statusPollMaxMS = 0
	}
	rt := time.Duration(timeoutMS) * time.Millisecond
	if rt < 5*time.Second {
		rt = 5 * time.Second
	}
	rt += 5 * time.Second // headroom for TLS / slow upstream
	return &WCLIClient{
		baseURL:          strings.TrimSuffix(strings.TrimSpace(baseURL), "/"),
		apiKey:           strings.TrimSpace(apiKey),
		wait:             wait,
		timeoutMS:        timeoutMS,
		statusPollMaxMS:  statusPollMaxMS,
		httpClient:       &http.Client{Timeout: rt},
		statusHTTPClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *WCLIClient) Configured() bool {
	return c != nil && c.baseURL != "" && c.apiKey != ""
}

type wcliSendPayload struct {
	RequestID string `json:"request_id"`
	To        string `json:"to"`
	Text      string `json:"text"`
	Kind      string `json:"kind"`
	Wait      bool   `json:"wait"`
	TimeoutMS int    `json:"timeout_ms"`
}

// wcliSendOrStatusBody is shared shape for POST /v1/send and GET /v1/status responses.
type wcliSendOrStatusBody struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"`
	MessageID string `json:"message_id,omitempty"`
	Error     string `json:"error,omitempty"`
}

func (c *WCLIClient) sendURL() (string, error) {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return "", err
	}
	return u.JoinPath("v1", "send").String(), nil
}

func (c *WCLIClient) statusURL(requestID string) (string, error) {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return "", err
	}
	rid := strings.TrimSpace(requestID)
	if rid == "" {
		return "", errors.New("missing request_id")
	}
	return u.JoinPath("v1", "status", rid).String(), nil
}

// SendOTP posts POST {base}/v1/send with kind "otp". Parses documented JSON
// statuses; treats 502 + failed as error. Optionally polls GET /v1/status when
// status is queued and WCLI_STATUS_POLL_MAX_MS > 0.
func (c *WCLIClient) SendOTP(ctx context.Context, requestID, toE164, message string) error {
	if !c.Configured() {
		return errors.New("wcli client not configured")
	}
	if strings.TrimSpace(requestID) == "" || strings.TrimSpace(toE164) == "" {
		return errors.New("wcli send: missing request_id or to")
	}
	body, err := json.Marshal(wcliSendPayload{
		RequestID: requestID,
		To:        toE164,
		Text:      message,
		Kind:      "otp",
		Wait:      c.wait,
		TimeoutMS: c.timeoutMS,
	})
	if err != nil {
		return err
	}
	sendURL, err := c.sendURL()
	if err != nil {
		return fmt.Errorf("wcli send url: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, sendURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("wcli send request: %w", err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	switch resp.StatusCode {
	case http.StatusOK, http.StatusAccepted:
		return c.interpretSendSuccess(ctx, resp.StatusCode, raw, requestID)
	case http.StatusBadGateway:
		var wr wcliSendOrStatusBody
		_ = json.Unmarshal(raw, &wr)
		msg := wr.Error
		if msg == "" {
			msg = strings.TrimSpace(string(raw))
		}
		if len(msg) > 400 {
			msg = msg[:400] + "…"
		}
		return fmt.Errorf("wcli send 502 failed status=%q err=%q", wr.Status, msg)
	default:
		snippet := strings.TrimSpace(string(raw))
		if len(snippet) > 300 {
			snippet = snippet[:300] + "…"
		}
		return fmt.Errorf("wcli send http %d body=%q", resp.StatusCode, snippet)
	}
}

func (c *WCLIClient) interpretSendSuccess(ctx context.Context, code int, raw []byte, fallbackRequestID string) error {
	var wr wcliSendOrStatusBody
	if err := json.Unmarshal(raw, &wr); err != nil || strings.TrimSpace(wr.Status) == "" {
		// Legacy or empty body: 200/202 still means accepted upstream.
		if code == http.StatusAccepted {
			if c.statusPollMaxMS > 0 && strings.TrimSpace(fallbackRequestID) != "" {
				return c.pollSendStatus(ctx, fallbackRequestID)
			}
		}
		return nil
	}
	st := strings.ToLower(strings.TrimSpace(wr.Status))
	switch st {
	case "sent":
		return nil
	case "failed":
		msg := wr.Error
		if msg == "" {
			msg = "unknown error"
		}
		return fmt.Errorf("wcli send status=failed err=%q", msg)
	case "queued":
		rid := strings.TrimSpace(wr.RequestID)
		if rid == "" {
			rid = fallbackRequestID
		}
		if c.statusPollMaxMS > 0 && rid != "" {
			return c.pollSendStatus(ctx, rid)
		}
		return nil
	default:
		return nil
	}
}

func (c *WCLIClient) pollSendStatus(ctx context.Context, requestID string) error {
	deadline := time.Now().Add(time.Duration(c.statusPollMaxMS) * time.Millisecond)
	interval := 900 * time.Millisecond
	t := time.NewTicker(interval)
	defer t.Stop()

	for {
		st, errText, err := c.FetchSendStatus(ctx, requestID)
		if err == nil {
			switch strings.ToLower(strings.TrimSpace(st)) {
			case "sent":
				return nil
			case "failed":
				if errText == "" {
					errText = "downstream failed"
				}
				return fmt.Errorf("wcli status=failed after queue: %s", errText)
			}
		}
		if time.Now().After(deadline) {
			return nil
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
		}
	}
}

// FetchSendStatus calls GET /v1/status/{request_id}. Used by polling; safe to
// log errors without exposing to end users.
func (c *WCLIClient) FetchSendStatus(ctx context.Context, requestID string) (status string, errDetail string, err error) {
	if !c.Configured() {
		return "", "", errors.New("wcli client not configured")
	}
	u, err := c.statusURL(requestID)
	if err != nil {
		return "", "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := c.statusHTTPClient.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		snippet := strings.TrimSpace(string(raw))
		if len(snippet) > 200 {
			snippet = snippet[:200] + "…"
		}
		return "", "", fmt.Errorf("wcli status http %d: %s", resp.StatusCode, snippet)
	}
	var wr wcliSendOrStatusBody
	if err := json.Unmarshal(raw, &wr); err != nil {
		return "", "", fmt.Errorf("wcli status json: %w", err)
	}
	return wr.Status, wr.Error, nil
}
