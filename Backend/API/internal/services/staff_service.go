package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

// StaffService applies the business rules for sub-admin lifecycle: who can
// create staff, which fields are validated, audit logging, and Redis cache
// invalidation for the per-request permission middleware.
type StaffService struct {
	staffRepo *repository.StaffRepo
	userRepo  *repository.UserRepo
	auditRepo *repository.AuditRepo
	rdb       *redis.Client
}

func NewStaffService(
	staffRepo *repository.StaffRepo,
	userRepo *repository.UserRepo,
	auditRepo *repository.AuditRepo,
	rdb *redis.Client,
) *StaffService {
	return &StaffService{staffRepo: staffRepo, userRepo: userRepo, auditRepo: auditRepo, rdb: rdb}
}

// StaffPermissionsCacheKey is the Redis key namespace used by the
// permission middleware. Exported so middleware and tests share the format.
func StaffPermissionsCacheKey(userID string) string { return "staff:perms:" + userID }

const staffPermissionsCacheTTL = 5 * time.Minute

const (
	staffPinFailKeyPrefix = "staff:pin_fail:"
	staffPinLockKeyPrefix = "staff:pin_lock:"
)

// ActorContext is everything the service needs to know about the caller of
// a staff-management API. Populated by the handler from the request.
type ActorContext struct {
	ActorID   string
	ActorRole string
	IP        string
}

// List returns the paginated sub-admin set. Only ADMIN actors are allowed
// to call this; SUB_ADMIN staff cannot manage other staff.
func (s *StaffService) List(ctx context.Context, actor ActorContext, status string, page, limit int) ([]*models.StaffResponse, int64, error) {
	if err := requireSuperAdmin(actor); err != nil {
		return nil, 0, err
	}
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	return s.staffRepo.List(ctx, normaliseStatusFilter(status), page, limit)
}

// Get loads a single sub-admin with its permission set.
func (s *StaffService) Get(ctx context.Context, actor ActorContext, id string) (*models.StaffResponse, error) {
	if err := requireSuperAdmin(actor); err != nil {
		return nil, err
	}
	out, err := s.staffRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("sub-admin not found")
		}
		return nil, err
	}
	return out, nil
}

// Create validates the request, ensures email uniqueness, then provisions a
// sub-admin row plus its permission grants in a single transaction. The
// resulting staff response (with permissions) is returned so the API can
// hand the actor the canonical view of the new account immediately.
func (s *StaffService) Create(ctx context.Context, actor ActorContext, req *models.CreateStaffRequest) (*models.StaffResponse, error) {
	if err := requireSuperAdmin(actor); err != nil {
		return nil, err
	}

	fullName := strings.TrimSpace(req.FullName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	password := req.Password
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		status = models.UserStatusActive
	}

	if len(fullName) < 2 {
		return nil, errors.New("full_name is required")
	}
	if !looksLikeEmail(email) {
		return nil, errors.New("valid email is required")
	}
	if len(password) < 8 {
		return nil, errors.New("password must be at least 8 characters")
	}
	actionPin := strings.TrimSpace(req.ActionPin)
	if !models.IsValidActionPIN(actionPin) {
		return nil, errors.New("action PIN must be exactly 6 digits")
	}
	if err := validateStaffStatus(status); err != nil {
		return nil, err
	}

	perms, err := sanitisePermissions(req.Permissions, true)
	if err != nil {
		return nil, err
	}

	if inUse, err := s.staffRepo.EmailInUseByOther(ctx, email, ""); err != nil {
		return nil, err
	} else if inUse {
		return nil, errors.New("email is already in use by another account")
	}

	userID := uuid.New().String()
	if err := s.staffRepo.Create(ctx, userID, fullName, email, password, actionPin, status, perms, actor.ActorID); err != nil {
		return nil, err
	}

	s.invalidatePermissionCache(ctx, userID)
	s.audit(ctx, actor, models.AuditActionStaffCreate, userID, map[string]any{
		"email":       email,
		"status":      status,
		"permissions": perms,
	})

	return s.staffRepo.GetByID(ctx, userID)
}

// Update applies a partial PATCH: any non-nil field is written and the
// remaining columns keep their current values. Permissions, when non-nil,
// fully replace the existing grant set.
func (s *StaffService) Update(ctx context.Context, actor ActorContext, id string, req *models.UpdateStaffRequest) (*models.StaffResponse, error) {
	if err := requireSuperAdmin(actor); err != nil {
		return nil, err
	}

	current, err := s.staffRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("sub-admin not found")
		}
		return nil, err
	}

	changes := make(map[string]any)

	var fullNamePtr, emailPtr *string
	if req.FullName != nil {
		fn := strings.TrimSpace(*req.FullName)
		if len(fn) < 2 {
			return nil, errors.New("full_name is required")
		}
		if fn != current.FullName {
			fullNamePtr = &fn
			changes["full_name"] = fn
		}
	}
	if req.Email != nil {
		em := strings.ToLower(strings.TrimSpace(*req.Email))
		if !looksLikeEmail(em) {
			return nil, errors.New("valid email is required")
		}
		if em != strings.ToLower(current.Email) {
			inUse, err := s.staffRepo.EmailInUseByOther(ctx, em, id)
			if err != nil {
				return nil, err
			}
			if inUse {
				return nil, errors.New("email is already in use by another account")
			}
			emailPtr = &em
			changes["email"] = em
		}
	}

	if fullNamePtr != nil || emailPtr != nil {
		if err := s.staffRepo.UpdateProfile(ctx, id, fullNamePtr, emailPtr); err != nil {
			return nil, err
		}
	}

	if req.Status != nil {
		st := strings.ToUpper(strings.TrimSpace(*req.Status))
		if err := validateStaffStatus(st); err != nil {
			return nil, err
		}
		if st != current.Status {
			if err := s.staffRepo.SetStatus(ctx, id, st); err != nil {
				return nil, err
			}
			changes["status"] = st
			s.audit(ctx, actor, models.AuditActionStaffStatus, id, map[string]any{
				"old": current.Status, "new": st,
			})
		}
	}

	if req.NewPassword != nil {
		pw := *req.NewPassword
		if len(pw) < 6 {
			return nil, errors.New("new_password must be at least 8 characters")
		}
		if err := s.staffRepo.SetPassword(ctx, id, pw); err != nil {
			return nil, err
		}
		changes["password_reset"] = true
	}

	if req.ActionPin != nil {
		pin := strings.TrimSpace(*req.ActionPin)
		if !models.IsValidActionPIN(pin) {
			return nil, errors.New("action PIN must be exactly 6 digits")
		}
		if err := s.staffRepo.SetActionPinHash(ctx, id, pin); err != nil {
			return nil, err
		}
		changes["action_pin_reset"] = true
		s.audit(ctx, actor, models.AuditActionStaffPinReset, id, nil)
	}

	if req.Permissions != nil {
		perms, err := sanitisePermissions(*req.Permissions, false)
		if err != nil {
			return nil, err
		}
		if err := s.staffRepo.ReplacePermissions(ctx, id, perms, actor.ActorID); err != nil {
			return nil, err
		}
		changes["permissions"] = perms
		s.invalidatePermissionCache(ctx, id)
	}

	if len(changes) > 0 && len(changes) > permissionsOnlyTouchCount(changes) {
		s.audit(ctx, actor, models.AuditActionStaffUpdate, id, changes)
	} else if _, ok := changes["permissions"]; ok && len(changes) == 1 {
		s.audit(ctx, actor, models.AuditActionStaffUpdate, id, changes)
	}

	return s.staffRepo.GetByID(ctx, id)
}

// Delete permanently removes a sub-admin row. The handler should prefer
// blocking (Update with status=BLOCKED) for audit-friendly off-boarding;
// this exists for cases like an accidentally created account.
func (s *StaffService) Delete(ctx context.Context, actor ActorContext, id string) error {
	if err := requireSuperAdmin(actor); err != nil {
		return err
	}
	current, err := s.staffRepo.GetByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("sub-admin not found")
		}
		return err
	}
	if err := s.staffRepo.Delete(ctx, id); err != nil {
		return err
	}
	s.invalidatePermissionCache(ctx, id)
	s.audit(ctx, actor, models.AuditActionStaffDelete, id, map[string]any{
		"email":  current.Email,
		"status": current.Status,
	})
	return nil
}

// LoadPermissionsForRequest resolves a SUB_ADMIN's permission set with a
// short-lived Redis cache, falling back to Postgres on any cache miss or
// error. Returns an empty slice (never nil) when the user has no grants.
func (s *StaffService) LoadPermissionsForRequest(ctx context.Context, userID string) ([]string, error) {
	if s.rdb != nil {
		key := StaffPermissionsCacheKey(userID)
		if cached, err := s.rdb.SMembers(ctx, key).Result(); err == nil && len(cached) > 0 {
			return cached, nil
		}
	}
	perms, err := s.staffRepo.GetPermissions(ctx, userID)
	if err != nil {
		return nil, err
	}
	if perms == nil {
		perms = []string{}
	}
	s.primePermissionCache(ctx, userID, perms)
	return perms, nil
}

// VerifyActionPIN checks a sub-admin's step-up PIN before a high-risk write.
// ADMIN callers should skip this at the handler layer; this method is only
// invoked for SUB_ADMIN actors.
func (s *StaffService) VerifyActionPIN(ctx context.Context, userID, pin, endpoint, ip, userAgent string) error {
	if locked, retryAfter, err := s.actionPINLockStatus(ctx, userID); err != nil {
		return err
	} else if locked {
		s.auditPinDenied(ctx, userID, endpoint, ip, userAgent)
		return &ActionPINLockedError{RetryAfter: retryAfter}
	}

	stored, err := s.staffRepo.GetActionPinHash(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return s.onActionPINMismatch(ctx, userID, endpoint, ip, userAgent)
		}
		return err
	}
	pin = strings.TrimSpace(pin)
	stored = strings.TrimSpace(stored)
	if stored == "" || !models.IsValidActionPIN(pin) {
		return s.onActionPINMismatch(ctx, userID, endpoint, ip, userAgent)
	}
	if stored != pin {
		return s.onActionPINMismatch(ctx, userID, endpoint, ip, userAgent)
	}

	if s.rdb != nil {
		_ = s.rdb.Del(ctx, staffPinFailKeyPrefix+userID).Err()
	}
	return nil
}

// ClearActionPINLock removes Redis lock/fail counters for a sub-admin. Only
// super admins may call this (e.g. after a support request).
func (s *StaffService) ClearActionPINLock(ctx context.Context, actor ActorContext, targetUserID string) error {
	if err := requireSuperAdmin(actor); err != nil {
		return err
	}
	targetUserID = strings.TrimSpace(targetUserID)
	if targetUserID == "" {
		return errors.New("sub-admin id is required")
	}
	if _, err := s.staffRepo.GetByID(ctx, targetUserID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("sub-admin not found")
		}
		return err
	}
	if s.rdb != nil {
		_ = s.rdb.Del(ctx, staffPinLockKeyPrefix+targetUserID, staffPinFailKeyPrefix+targetUserID).Err()
	}
	s.audit(ctx, actor, models.AuditActionStaffPinLockCleared, targetUserID, nil)
	return nil
}

func (s *StaffService) actionPINLockStatus(ctx context.Context, userID string) (locked bool, retryAfter time.Duration, err error) {
	if s.rdb == nil {
		return false, 0, nil
	}
	lockKey := staffPinLockKeyPrefix + userID
	ttl, err := s.rdb.TTL(ctx, lockKey).Result()
	if err != nil {
		return false, 0, err
	}
	if ttl > 0 {
		return true, ttl, nil
	}
	return false, 0, nil
}

func (s *StaffService) onActionPINMismatch(ctx context.Context, userID, endpoint, ip, userAgent string) error {
	locked, retryAfter := s.recordPinFailure(ctx, userID, endpoint, ip, userAgent)
	if locked {
		return &ActionPINLockedError{RetryAfter: retryAfter}
	}
	remaining := StaffPinFailMax
	if s.rdb != nil {
		if n, err := s.rdb.Get(ctx, staffPinFailKeyPrefix+userID).Int64(); err == nil {
			remaining = StaffPinFailMax - int(n)
			if remaining < 0 {
				remaining = 0
			}
		}
	}
	return &ActionPINInvalidError{AttemptsRemaining: remaining}
}

func (s *StaffService) auditPinDenied(ctx context.Context, userID, endpoint, ip, userAgent string) {
	if s.auditRepo == nil {
		return
	}
	details := map[string]any{"endpoint": endpoint}
	if err := s.auditRepo.Write(ctx, userID, models.AuditActionStaffPinDenied, models.AuditTargetTypeStaff, userID, details, ip, userAgent); err != nil {
		log.Printf("WARNING: staff PIN denied audit %s: %v", userID, err)
	}
}

// recordPinFailure increments the fail counter and sets the lock at threshold.
// Returns whether the user is now locked and the lock TTL for the response.
func (s *StaffService) recordPinFailure(ctx context.Context, userID, endpoint, ip, userAgent string) (locked bool, retryAfter time.Duration) {
	s.auditPinDenied(ctx, userID, endpoint, ip, userAgent)
	if s.rdb == nil {
		return false, 0
	}
	failKey := staffPinFailKeyPrefix + userID
	n, err := s.rdb.Incr(ctx, failKey).Result()
	if err != nil {
		log.Printf("WARNING: staff PIN fail counter %s: %v", userID, err)
		return false, 0
	}
	if n == 1 {
		_ = s.rdb.Expire(ctx, failKey, StaffPinLockTTL).Err()
	}
	if n >= StaffPinFailMax {
		lockKey := staffPinLockKeyPrefix + userID
		_ = s.rdb.Set(ctx, lockKey, "1", StaffPinLockTTL).Err()
		_ = s.rdb.Del(ctx, failKey).Err()
		if s.auditRepo != nil {
			details := map[string]any{"endpoint": endpoint, "fail_count": n}
			if err := s.auditRepo.Write(ctx, userID, models.AuditActionStaffPinLocked, models.AuditTargetTypeStaff, userID, details, ip, userAgent); err != nil {
				log.Printf("WARNING: staff PIN locked audit %s: %v", userID, err)
			}
		}
		return true, StaffPinLockTTL
	}
	return false, 0
}

// TouchLastLogin updates staff_last_login_at after a successful sub-admin
// authentication. Errors are logged but never bubbled up — login should not
// fail because of a metadata write.
func (s *StaffService) TouchLastLogin(ctx context.Context, userID string) {
	if err := s.staffRepo.TouchLastLogin(ctx, userID); err != nil {
		log.Printf("WARNING: failed to touch staff last login for %s: %v", userID, err)
	}
}

func (s *StaffService) primePermissionCache(ctx context.Context, userID string, perms []string) {
	if s.rdb == nil {
		return
	}
	key := StaffPermissionsCacheKey(userID)
	// Always delete first so stale members are not retained when the new
	// set is shorter; this is cheaper than DIFF + SREM gymnastics.
	if err := s.rdb.Del(ctx, key).Err(); err != nil {
		log.Printf("WARNING: staff perm cache delete %s: %v", userID, err)
		return
	}
	if len(perms) == 0 {
		return
	}
	args := make([]any, 0, len(perms))
	for _, p := range perms {
		args = append(args, p)
	}
	if err := s.rdb.SAdd(ctx, key, args...).Err(); err != nil {
		log.Printf("WARNING: staff perm cache sadd %s: %v", userID, err)
		return
	}
	if err := s.rdb.Expire(ctx, key, staffPermissionsCacheTTL).Err(); err != nil {
		log.Printf("WARNING: staff perm cache expire %s: %v", userID, err)
	}
}

func (s *StaffService) invalidatePermissionCache(ctx context.Context, userID string) {
	if s.rdb == nil {
		return
	}
	if err := s.rdb.Del(ctx, StaffPermissionsCacheKey(userID)).Err(); err != nil {
		log.Printf("WARNING: staff perm cache invalidate %s: %v", userID, err)
	}
}

func (s *StaffService) audit(ctx context.Context, actor ActorContext, action, targetID string, details map[string]any) {
	if s.auditRepo == nil {
		return
	}
	if err := s.auditRepo.Write(ctx, actor.ActorID, action, models.AuditTargetTypeStaff, targetID, details, actor.IP, ""); err != nil {
		log.Printf("WARNING: audit log %s %s: %v", action, targetID, err)
	}
}

// LogSubAdminActivity writes an audit row for a sub-admin operational action.
// Errors are logged and never returned — callers must not fail the request.
func (s *StaffService) LogSubAdminActivity(
	ctx context.Context,
	actorID, action, targetType, targetID string,
	details map[string]any,
	ip, userAgent string,
) {
	if s.auditRepo == nil || strings.TrimSpace(actorID) == "" {
		return
	}
	if err := s.auditRepo.Write(ctx, actorID, action, targetType, targetID, details, ip, userAgent); err != nil {
		log.Printf("WARNING: sub-admin activity audit %s %s: %v", action, targetID, err)
	}
}

// ListSubAdminActivity returns paginated audit rows for SUB_ADMIN actors.
// Only super admins may call this.
func (s *StaffService) ListSubAdminActivity(
	ctx context.Context,
	actor ActorContext,
	page, limit int,
	filters models.SubAdminActivityFilters,
) ([]models.AuditLogEntry, int64, error) {
	if err := requireSuperAdmin(actor); err != nil {
		return nil, 0, err
	}
	if s.auditRepo == nil {
		return []models.AuditLogEntry{}, 0, nil
	}
	return s.auditRepo.ListSubAdminActivity(ctx, page, limit, filters)
}

// permissionsOnlyTouchCount returns 1 when the changes map only contains the
// permissions key (which we audit separately) so the generic STAFF_UPDATE
// event isn't double-written for permission edits.
func permissionsOnlyTouchCount(changes map[string]any) int {
	if _, ok := changes["permissions"]; ok && len(changes) == 1 {
		return 1
	}
	return 0
}

func requireSuperAdmin(actor ActorContext) error {
	if strings.ToUpper(strings.TrimSpace(actor.ActorRole)) != models.RoleAdmin {
		return errors.New("only super admins can manage sub-admins")
	}
	if strings.TrimSpace(actor.ActorID) == "" {
		return errors.New("actor user id missing")
	}
	return nil
}

func normaliseStatusFilter(status string) string {
	s := strings.ToUpper(strings.TrimSpace(status))
	switch s {
	case models.UserStatusActive, models.UserStatusInactive, models.UserStatusBlocked:
		return s
	}
	return ""
}

func validateStaffStatus(status string) error {
	switch status {
	case models.UserStatusActive, models.UserStatusInactive, models.UserStatusBlocked:
		return nil
	}
	return errors.New("status must be ACTIVE, INACTIVE, or BLOCKED")
}

func sanitisePermissions(raw []string, requireOne bool) ([]string, error) {
	seen := make(map[string]struct{}, len(raw))
	out := make([]string, 0, len(raw))
	for _, k := range raw {
		key := strings.TrimSpace(k)
		if key == "" {
			continue
		}
		if !models.IsValidStaffPermission(key) {
			return nil, errors.New("unknown permission: " + key)
		}
		if _, dup := seen[key]; dup {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, key)
	}
	if requireOne && len(out) == 0 {
		return nil, errors.New("at least one permission is required")
	}
	return out, nil
}

func looksLikeEmail(s string) bool {
	if s == "" {
		return false
	}
	at := strings.IndexByte(s, '@')
	if at <= 0 || at == len(s)-1 {
		return false
	}
	if !strings.Contains(s[at+1:], ".") {
		return false
	}
	return true
}
