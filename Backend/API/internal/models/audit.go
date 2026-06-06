package models

import "time"

// audit_logs.target_type values for sub-admin operational activity.
const (
	AuditTargetTypeUser      = "USER"
	AuditTargetTypeKYC       = "KYC"
	AuditTargetTypePayout    = "PAYOUT"
	AuditTargetTypePlacement = "PLACEMENT"
	AuditTargetTypePackage   = "PACKAGE"
	AuditTargetTypeConfig    = "CONFIG"
	AuditTargetTypeSupport   = "SUPPORT"
)

// Sub-admin operational actions (actor role = SUB_ADMIN).
const (
	AuditActionSubAdminUserStatus       = "SUB_ADMIN_USER_STATUS"
	AuditActionSubAdminUserTitle        = "SUB_ADMIN_USER_TITLE"
	AuditActionSubAdminWalletAdjustment = "SUB_ADMIN_WALLET_ADJUSTMENT"
	AuditActionSubAdminKYCUpdate        = "SUB_ADMIN_KYC_UPDATE"
	AuditActionSubAdminPlacementDecide  = "SUB_ADMIN_PLACEMENT_DECIDE"
	AuditActionSubAdminPayoutApprove    = "SUB_ADMIN_PAYOUT_APPROVE"
	AuditActionSubAdminPayoutReject     = "SUB_ADMIN_PAYOUT_REJECT"
	AuditActionSubAdminPackageCreate    = "SUB_ADMIN_PACKAGE_CREATE"
	AuditActionSubAdminPackageUpdate    = "SUB_ADMIN_PACKAGE_UPDATE"
	AuditActionSubAdminConfigUpdate     = "SUB_ADMIN_CONFIG_UPDATE"
	AuditActionSubAdminLevelBonusUpdate = "SUB_ADMIN_LEVEL_BONUS_UPDATE"
	AuditActionSubAdminPayoutConfigUpdate = "SUB_ADMIN_PAYOUT_CONFIG_UPDATE"
	AuditActionSubAdminSupportAssign      = "SUB_ADMIN_SUPPORT_ASSIGN"
	AuditActionSubAdminSupportReply       = "SUB_ADMIN_SUPPORT_REPLY"
	AuditActionSubAdminSupportAttachment  = "SUB_ADMIN_SUPPORT_ATTACHMENT"
	AuditActionSubAdminSupportClose       = "SUB_ADMIN_SUPPORT_CLOSE"
	AuditActionAdminUserStatus            = "ADMIN_USER_STATUS"
	AuditActionAdminWalletAdjustment      = "ADMIN_WALLET_ADJUSTMENT"
)

// AuditLogEntry is a single row for GET /admin/staff/activity.
type AuditLogEntry struct {
	LogID      string         `json:"log_id"`
	ActorID    string         `json:"actor_id"`
	ActorName  string         `json:"actor_name"`
	ActorEmail string         `json:"actor_email"`
	Action     string         `json:"action"`
	TargetType    string         `json:"target_type"`
	TargetID      string         `json:"target_id"`
	TargetLabel   string         `json:"target_label"`
	TargetSublabel *string       `json:"target_sublabel,omitempty"`
	Details       map[string]any `json:"details,omitempty"`
	IPAddress  *string        `json:"ip_address,omitempty"`
	UserAgent  *string        `json:"user_agent,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}

// SubAdminActivityFilters optional query filters for activity list.
type SubAdminActivityFilters struct {
	ActorID string
	Action  string
	From    *time.Time
	To      *time.Time
}
