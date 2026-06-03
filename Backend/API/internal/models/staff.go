package models

import (
	"strings"
	"time"
)

// Permission keys mirror Frontend/Admin/lib/sub-admin-permissions.ts. Any new
// key added there must also be added here (and vice versa) so the permission
// picker UI cannot grant a key the backend doesn't enforce.
const (
	PermNetworkerView       = "networker.view"
	PermNetworkerManage     = "networker.manage"
	PermPlacementView       = "placement.view"
	PermPlacementManage     = "placement.manage"
	PermKYCView             = "kyc.view"
	PermKYCManage           = "kyc.manage"
	PermWithdrawView        = "withdraw.view"
	PermWithdrawManage      = "withdraw.manage"
	PermPackagesView        = "packages.view"
	PermPackagesManage      = "packages.manage"
	PermNotificationsView   = "notifications.view"
	PermNotificationsManage = "notifications.manage"
	PermConfigCommissionPlacementManage = "platform_config.commission_placement.manage"
	PermConfigWithdrawalsManage         = "platform_config.withdrawals.manage"
	PermConfigP2PManage                 = "platform_config.p2p.manage"
	PermConfigLevelBonusManage          = "platform_config.level_bonus.manage"
	PermLedgerView          = "ledger.view"
	PermIncomeDirectView    = "income_direct.view"
	PermIncomeBinaryView    = "income_binary.view"
	PermSupportView         = "support.view"
	PermSupportManage       = "support.manage"
)

// AllStaffPermissionKeys is the source of truth for valid permission keys on
// the backend. Order is preserved so list responses stay deterministic.
var AllStaffPermissionKeys = []string{
	PermNetworkerView,
	PermNetworkerManage,
	PermPlacementView,
	PermPlacementManage,
	PermKYCView,
	PermKYCManage,
	PermWithdrawView,
	PermWithdrawManage,
	PermPackagesView,
	PermPackagesManage,
	PermNotificationsView,
	PermNotificationsManage,
	PermConfigCommissionPlacementManage,
	PermConfigWithdrawalsManage,
	PermConfigP2PManage,
	PermConfigLevelBonusManage,
	PermLedgerView,
	PermIncomeDirectView,
	PermIncomeBinaryView,
	PermSupportView,
	PermSupportManage,
}

var staffPermissionLookup = func() map[string]struct{} {
	m := make(map[string]struct{}, len(AllStaffPermissionKeys))
	for _, k := range AllStaffPermissionKeys {
		m[k] = struct{}{}
	}
	return m
}()

// IsValidStaffPermission returns true when `key` is a known permission key.
func IsValidStaffPermission(key string) bool {
	_, ok := staffPermissionLookup[key]
	return ok
}

// PlatformConfigManageKeys lists every delegatable platform-config tab permission.
var PlatformConfigManageKeys = []string{
	PermConfigCommissionPlacementManage,
	PermConfigWithdrawalsManage,
	PermConfigP2PManage,
	PermConfigLevelBonusManage,
}

// RequiredPermissionForCommissionConfigKey maps a commission_config row key to
// the manage permission needed to update it (p2p_* vs commission/placement).
func RequiredPermissionForCommissionConfigKey(configKey string) string {
	if strings.HasPrefix(configKey, "p2p_") {
		return PermConfigP2PManage
	}
	return PermConfigCommissionPlacementManage
}

// Audit action constants for staff CRUD writes into audit_logs.
const (
	AuditActionStaffCreate   = "STAFF_CREATE"
	AuditActionStaffUpdate   = "STAFF_UPDATE"
	AuditActionStaffStatus   = "STAFF_STATUS"
	AuditActionStaffDelete   = "STAFF_DELETE"
	AuditActionStaffPinReset      = "STAFF_PIN_RESET"
	AuditActionStaffPinDenied     = "STAFF_PIN_DENIED"
	AuditActionStaffPinLocked     = "STAFF_PIN_LOCKED"
	AuditActionStaffPinLockCleared = "STAFF_PIN_LOCK_CLEARED"
	AuditTargetTypeStaff     = "STAFF"
)

// CreateStaffRequest is the body for POST /api/v1/admin/staff.
type CreateStaffRequest struct {
	FullName    string   `json:"full_name" validate:"required,min=2"`
	Email       string   `json:"email" validate:"required,email"`
	Password    string   `json:"password" validate:"required,min=8"`
	ActionPin   string   `json:"action_pin" validate:"required"`
	Status      string   `json:"status,omitempty"`
	Permissions []string `json:"permissions" validate:"required,min=1"`
}

// UpdateStaffRequest is the body for PATCH /api/v1/admin/staff/:id. All
// fields are optional; omitted fields keep their existing value. Permissions
// is treated as a full replacement when non-nil; pass [] to revoke all.
type UpdateStaffRequest struct {
	FullName    *string   `json:"full_name,omitempty"`
	Email       *string   `json:"email,omitempty"`
	Status      *string   `json:"status,omitempty"`
	Permissions *[]string `json:"permissions,omitempty"`
	NewPassword *string   `json:"new_password,omitempty"`
	ActionPin   *string   `json:"action_pin,omitempty"`
}

// StaffResponse is the public JSON shape for sub-admins. The login password
// is intentionally absent — staff actors never need to read each other's
// password and exposing it would leak a credential the actor cannot rotate.
type StaffResponse struct {
	UserID          string     `json:"user_id"`
	FullName        string     `json:"full_name"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	Role            string     `json:"role"`
	Permissions     []string   `json:"permissions"`
	HasActionPin    bool       `json:"has_action_pin"`
	CreatedByUserID *string    `json:"created_by_user_id,omitempty"`
	CreatedByName   *string    `json:"created_by_name,omitempty"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}
