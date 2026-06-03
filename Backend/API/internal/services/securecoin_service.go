//go:build securecoin
// +build securecoin

package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmcg-binary/config"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// SecureCoinService orchestrates the wallet-connect flow:
//
//  1. BuildConnectURL  — issues a CSRF token, persists state→user_id
//     for ~10 minutes (Redis when available, in-process map fallback),
//     and assembles the dashboard.securecoin.co.in/wallet-connect URL.
//  2. HandleCallback   — validates state/CSRF, exchanges connect_token,
//     persists wallet code + balance on the user row.
//  3. RefreshBalance   — calls Secure Coin's wallet-balance endpoint
//     with the merchant credentials, updates the cache, and clears the
//     linkage when Secure Coin says the wallet is no longer connected.
type SecureCoinService struct {
	cfg        SecureCoinServiceConfig
	client     *SecureCoinClient
	users      *repository.UserRepo
	rdb        *redis.Client
	stateStore stateStore
}

// SecureCoinServiceConfig is the wire-format configuration for the
// service, kept separate from the env reader so tests can inject values.
type SecureCoinServiceConfig struct {
	AppID             string
	ConnectURL        string
	CallbackURL       string
	FrontendReturnURL string
}

// NewSecureCoinService builds the service. Pass `nil` for `rdb` to use
// the in-process state store (single-replica deployments only — for
// production behind a load balancer always supply the Redis client so
// every replica sees the same CSRF state).
func NewSecureCoinService(cfg SecureCoinServiceConfig, client *SecureCoinClient, users *repository.UserRepo, rdb *redis.Client) *SecureCoinService {
	var store stateStore
	if rdb != nil {
		store = &redisStateStore{rdb: rdb}
	} else {
		store = newMemoryStateStore()
	}
	return &SecureCoinService{
		cfg:        cfg,
		client:     client,
		users:      users,
		rdb:        rdb,
		stateStore: store,
	}
}

// Configured returns true when both the merchant credentials AND the
// connect-flow specific knobs (app id + callback URL) are set. Handlers
// use this to short-circuit with a clear 503 instead of redirecting the
// user to a broken Secure Coin page.
func (s *SecureCoinService) Configured() bool {
	if s == nil || s.client == nil || !s.client.Configured() {
		return false
	}
	return strings.TrimSpace(s.cfg.AppID) != "" &&
		strings.TrimSpace(s.cfg.CallbackURL) != ""
}

// MissingConfigurationDetails lists what is still unset so the UI can show
// a precise message (most often only SECURE_COIN_CALLBACK_URL is missing).
func (s *SecureCoinService) MissingConfigurationDetails() string {
	if s == nil {
		return "Secure Coin service not initialised"
	}
	var parts []string
	if s.client != nil {
		parts = append(parts, s.client.MissingAuthEnv()...)
	} else {
		parts = append(parts, "internal: nil Secure Coin HTTP client")
	}
	if strings.TrimSpace(s.cfg.AppID) == "" {
		parts = append(parts, "SECURE_COIN_APP_ID")
	}
	if strings.TrimSpace(s.cfg.CallbackURL) == "" {
		parts = append(parts, fmt.Sprintf("SECURE_COIN_CALLBACK_URL (public HTTPS URL ending with %s, registered in Secure Coin; local: ngrok/Cloudflare Tunnel to this API)", config.SecureCoinCallbackPath))
	}
	return strings.Join(parts, "; ")
}

// stateTTL is intentionally short — connect_token redirects happen
// inside the browser within seconds, so 10 minutes covers slow networks
// and an OTP detour without leaving stale state hanging around.
const stateTTL = 10 * time.Minute

// statePayload is what we persist behind the opaque `state` value sent
// to Secure Coin. Keeping the user_id server-side (rather than encoding
// it in the state itself) means a leaked state value cannot be replayed
// against another account by simply rewriting the JSON.
type statePayload struct {
	UserID    string `json:"user_id"`
	IssuedAt  int64  `json:"issued_at"`
	UserAgent string `json:"ua,omitempty"`
}

// BuildConnectURL issues a fresh CSRF token, stores the user binding,
// and returns the absolute URL the browser should be redirected to.
// The state value is opaque from Secure Coin's perspective; we treat
// it as both authentication (proves the callback originated from a
// connect we initiated) and authorisation (binds the linkage to a
// specific user_id).
func (s *SecureCoinService) BuildConnectURL(ctx context.Context, userID, userAgent string) (string, error) {
	if !s.Configured() {
		return "", errors.New("secure-coin connect is not configured on the server")
	}
	state, err := generateCSRFToken()
	if err != nil {
		return "", err
	}
	payload := statePayload{
		UserID:    userID,
		IssuedAt:  time.Now().Unix(),
		UserAgent: trimUA(userAgent),
	}
	body, _ := json.Marshal(payload)
	if err := s.stateStore.Put(ctx, state, body, stateTTL); err != nil {
		return "", fmt.Errorf("persist state: %w", err)
	}

	q := url.Values{}
	q.Set("app_id", s.cfg.AppID)
	q.Set("scope", "pay")
	q.Set("redirect_uri", s.cfg.CallbackURL)
	q.Set("state", state)

	base := strings.TrimRight(s.cfg.ConnectURL, "?&")
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	return base + sep + q.Encode(), nil
}

// CallbackResult is what HandleCallback returns to the HTTP layer so it
// can pick a redirect URL or render a server-side message.
type CallbackResult struct {
	UserID     string
	WalletCode string
	BalanceSC  *float64
}

// HandleCallback validates the state token, exchanges connect_token for
// a wallet code, and persists the linkage. On success it returns the
// resolved user id so the handler can redirect appropriately.
func (s *SecureCoinService) HandleCallback(ctx context.Context, state, connectToken string) (*CallbackResult, error) {
	if !s.Configured() {
		return nil, errors.New("secure-coin connect is not configured on the server")
	}
	state = strings.TrimSpace(state)
	connectToken = strings.TrimSpace(connectToken)
	if state == "" || connectToken == "" {
		return nil, errors.New("missing state or connect_token")
	}

	raw, err := s.stateStore.Take(ctx, state)
	if err != nil {
		return nil, errors.New("state token is invalid or expired")
	}
	var payload statePayload
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil, errors.New("state token is malformed")
	}
	if payload.UserID == "" {
		return nil, errors.New("state token has no user binding")
	}

	verify, err := s.client.VerifyConnectToken(ctx, connectToken)
	if err != nil {
		return nil, err
	}
	if err := s.users.LinkSecureCoinWallet(ctx, payload.UserID, verify.WalletCode, verify.BalanceSC); err != nil {
		return nil, fmt.Errorf("save wallet linkage: %w", err)
	}
	return &CallbackResult{
		UserID:     payload.UserID,
		WalletCode: verify.WalletCode,
		BalanceSC:  verify.BalanceSC,
	}, nil
}

// RefreshBalance is the read path for /api/v1/me/secure-coin-balance.
// Returns an unlinked envelope (Linked=false) instead of an error when
// the local row has no wallet code OR Secure Coin reports the wallet
// has been disconnected — the SPA uses both states identically.
func (s *SecureCoinService) RefreshBalance(ctx context.Context, userID string) (*models.SecureCoinBalanceResponse, error) {
	user, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.SCWalletCode == nil || strings.TrimSpace(*user.SCWalletCode) == "" {
		return &models.SecureCoinBalanceResponse{
			Linked:  false,
			Message: "Secure Coin wallet is not linked to this account",
		}, nil
	}
	if !s.Configured() {
		// Wallet was linked previously but the server has lost its
		// merchant credentials — approximate SC from last mirrored paise
		// (legacy column) if present.
		return &models.SecureCoinBalanceResponse{
			Linked:     true,
			WalletCode: user.SCWalletCode,
			BalanceSC:  balanceSCFromLegacyPaise(user),
			LinkedAt:   user.SCLinkedAt,
			Message:    "Secure Coin client is not configured; showing last mirrored balance if available",
		}, nil
	}

	bal, err := s.client.GetWalletBalance(ctx, *user.SCWalletCode)
	if errors.Is(err, ErrSecureCoinNotConnected) {
		_ = s.users.ClearSecureCoinWallet(ctx, userID)
		return &models.SecureCoinBalanceResponse{
			Linked:  false,
			Message: "Secure Coin reports this wallet is no longer connected",
		}, nil
	}
	if err != nil {
		// Soft-fail: approximate SC from last mirrored paise (legacy)
		// so the wallet card does not whiplash on transient SC errors.
		return &models.SecureCoinBalanceResponse{
			Linked:     true,
			WalletCode: user.SCWalletCode,
			BalanceSC:  balanceSCFromLegacyPaise(user),
			LinkedAt:   user.SCLinkedAt,
			Message:    err.Error(),
		}, nil
	}

	if updateErr := s.users.UpdateSecureCoinBalance(ctx, userID, bal.BalanceSC); updateErr != nil {
		// Don't fail the request if the cache write fails — the live
		// value is still correct.
		_ = updateErr
	}
	balCopy := bal.BalanceSC
	walletCode := bal.WalletCode
	if walletCode == "" {
		walletCode = *user.SCWalletCode
	}
	status := bal.WalletStatus
	res := &models.SecureCoinBalanceResponse{
		Linked:     true,
		WalletCode: &walletCode,
		BalanceSC:  &balCopy,
		LinkedAt:   user.SCLinkedAt,
	}
	if status != "" {
		res.WalletStatus = &status
	}
	return res, nil
}

// ClearLinkage clears the locally stored wallet linkage. This is a user-driven
// disconnect that only affects our DB; it does not revoke the app connection
// on Secure Coin's side.
func (s *SecureCoinService) ClearLinkage(ctx context.Context, userID string) error {
	if s == nil || s.users == nil {
		return errors.New("secure-coin service not initialised")
	}
	return s.users.ClearSecureCoinWallet(ctx, userID)
}

// FrontendReturnURL composes the SPA URL we redirect the user to after
// the callback. Returns "" when no return URL is configured so the
// handler can fall through to a JSON success envelope.
func (s *SecureCoinService) FrontendReturnURL(status string, extra map[string]string) string {
	base := strings.TrimSpace(s.cfg.FrontendReturnURL)
	if base == "" {
		return ""
	}
	q := url.Values{}
	q.Set("secure_coin", status)
	for k, v := range extra {
		if v == "" {
			continue
		}
		q.Set(k, v)
	}
	sep := "?"
	if strings.Contains(base, "?") {
		sep = "&"
	}
	return base + sep + q.Encode()
}

// ---------------------------------------------------------------------------
// State storage. The Redis backend is preferred; the in-memory store is
// a single-replica fallback so dev environments work without Redis.
// ---------------------------------------------------------------------------

type stateStore interface {
	Put(ctx context.Context, key string, value []byte, ttl time.Duration) error
	Take(ctx context.Context, key string) ([]byte, error)
}

type redisStateStore struct{ rdb *redis.Client }

func (s *redisStateStore) key(token string) string { return "securecoin:state:" + token }

func (s *redisStateStore) Put(ctx context.Context, token string, value []byte, ttl time.Duration) error {
	return s.rdb.Set(ctx, s.key(token), value, ttl).Err()
}

func (s *redisStateStore) Take(ctx context.Context, token string) ([]byte, error) {
	key := s.key(token)
	val, err := s.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, err
	}
	// Single-use: delete after fetch so an attacker who replays the
	// callback URL cannot re-link the wallet a second time.
	_ = s.rdb.Del(ctx, key).Err()
	return val, nil
}

type memoryStateStore struct {
	mu      sync.Mutex
	entries map[string]memoryStateEntry
}

type memoryStateEntry struct {
	value     []byte
	expiresAt time.Time
}

func newMemoryStateStore() *memoryStateStore {
	return &memoryStateStore{entries: make(map[string]memoryStateEntry)}
}

func (s *memoryStateStore) Put(_ context.Context, key string, value []byte, ttl time.Duration) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked()
	cp := make([]byte, len(value))
	copy(cp, value)
	s.entries[key] = memoryStateEntry{value: cp, expiresAt: time.Now().Add(ttl)}
	return nil
}

func (s *memoryStateStore) Take(_ context.Context, key string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.gcLocked()
	e, ok := s.entries[key]
	if !ok {
		return nil, errors.New("state not found")
	}
	delete(s.entries, key)
	if time.Now().After(e.expiresAt) {
		return nil, errors.New("state expired")
	}
	return e.value, nil
}

func (s *memoryStateStore) gcLocked() {
	now := time.Now()
	for k, e := range s.entries {
		if now.After(e.expiresAt) {
			delete(s.entries, k)
		}
	}
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// balanceSCFromLegacyPaise derives an approximate SC integer from the
// legacy paise column (we mirror live balance as paise = sc * 100). Used
// only when the Secure Coin API cannot be called (misconfig / transient
// error); nil means "unknown".
func balanceSCFromLegacyPaise(u *models.User) *float64 {
	if u == nil || u.SecureWalletBalancePaise == nil {
		return nil
	}
	v := float64(*u.SecureWalletBalancePaise) / 100
	return &v
}

func generateCSRFToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func trimUA(ua string) string {
	ua = strings.TrimSpace(ua)
	if len(ua) > 200 {
		return ua[:200]
	}
	return ua
}
