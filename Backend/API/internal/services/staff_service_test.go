package services

import (
	"fmcg-binary/internal/models"
	"testing"
)

func TestSanitisePermissionsAcceptsKnownKeys(t *testing.T) {
	t.Parallel()
	in := []string{
		models.PermKYCView,
		models.PermKYCView, // duplicate — should be deduped
		"  " + models.PermKYCManage + "  ",
	}
	got, err := sanitisePermissions(in, true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []string{models.PermKYCView, models.PermKYCManage}
	if len(got) != len(want) {
		t.Fatalf("got %d permissions, want %d (%v)", len(got), len(want), got)
	}
	seen := make(map[string]struct{}, len(got))
	for _, k := range got {
		seen[k] = struct{}{}
	}
	for _, k := range want {
		if _, ok := seen[k]; !ok {
			t.Fatalf("expected %s in result, got %v", k, got)
		}
	}
}

func TestSanitisePermissionsRejectsUnknownKey(t *testing.T) {
	t.Parallel()
	_, err := sanitisePermissions([]string{models.PermNetworkerView, "users.invent"}, true)
	if err == nil {
		t.Fatal("expected error for unknown permission key")
	}
}

func TestSanitisePermissionsRequiresOneOnCreate(t *testing.T) {
	t.Parallel()
	if _, err := sanitisePermissions(nil, true); err == nil {
		t.Fatal("expected error when create requires at least one permission")
	}
	// Empty list is fine on update — revoking everything is a valid action.
	out, err := sanitisePermissions(nil, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty list, got %v", out)
	}
}

func TestRequireSuperAdmin(t *testing.T) {
	t.Parallel()
	cases := []struct {
		role string
		ok   bool
	}{
		{models.RoleAdmin, true},
		{models.RoleSubAdmin, false},
		{models.RoleNetworker, false},
		{"", false},
	}
	for _, c := range cases {
		err := requireSuperAdmin(ActorContext{ActorID: "u-1", ActorRole: c.role})
		if c.ok && err != nil {
			t.Fatalf("role=%q: unexpected error %v", c.role, err)
		}
		if !c.ok && err == nil {
			t.Fatalf("role=%q: expected error, got nil", c.role)
		}
	}
	// Missing actor id should fail even when role is ADMIN.
	if err := requireSuperAdmin(ActorContext{ActorID: "", ActorRole: models.RoleAdmin}); err == nil {
		t.Fatal("expected error when actor id is missing")
	}
}

func TestValidateStaffStatus(t *testing.T) {
	t.Parallel()
	for _, ok := range []string{models.UserStatusActive, models.UserStatusInactive, models.UserStatusBlocked} {
		if err := validateStaffStatus(ok); err != nil {
			t.Fatalf("status %s should be valid: %v", ok, err)
		}
	}
	for _, bad := range []string{"", "pending", "REMOVED", "active"} {
		if err := validateStaffStatus(bad); err == nil {
			t.Fatalf("status %q should be rejected", bad)
		}
	}
}

func TestLooksLikeEmail(t *testing.T) {
	t.Parallel()
	cases := map[string]bool{
		"user@example.com":     true,
		"x@y.z":                true,
		"plain":                false,
		"@example.com":         false,
		"user@":                false,
		"user@example":         false, // no dot in host
		"":                     false,
	}
	for in, want := range cases {
		if got := looksLikeEmail(in); got != want {
			t.Fatalf("looksLikeEmail(%q)=%v want %v", in, got, want)
		}
	}
}

func TestStaffPermissionsCacheKey(t *testing.T) {
	t.Parallel()
	got := StaffPermissionsCacheKey("abc-123")
	want := "staff:perms:abc-123"
	if got != want {
		t.Fatalf("StaffPermissionsCacheKey: got %q want %q", got, want)
	}
}

func TestIsValidStaffPermissionCoversCatalog(t *testing.T) {
	t.Parallel()
	for _, k := range models.AllStaffPermissionKeys {
		if !models.IsValidStaffPermission(k) {
			t.Fatalf("AllStaffPermissionKeys lists %q but IsValidStaffPermission says no", k)
		}
	}
	if models.IsValidStaffPermission("not.a.real.permission") {
		t.Fatal("unknown key was accepted by IsValidStaffPermission")
	}
}

func TestIsValidActionPIN(t *testing.T) {
	t.Parallel()
	for _, pin := range []string{"000000", "123456", "999999"} {
		if !models.IsValidActionPIN(pin) {
			t.Fatalf("expected valid PIN %q", pin)
		}
	}
	for _, bad := range []string{"", "12345", "1234567", "12a456", "abcdef"} {
		if models.IsValidActionPIN(bad) {
			t.Fatalf("expected invalid PIN %q", bad)
		}
	}
}

func TestStaffPinFailMaxIsThree(t *testing.T) {
	t.Parallel()
	if StaffPinFailMax != 3 {
		t.Fatalf("StaffPinFailMax=%d want 3", StaffPinFailMax)
	}
}

func TestIsValidActionPINRejectsNonSixDigit(t *testing.T) {
	t.Parallel()
	if models.IsValidActionPIN("12345") || models.IsValidActionPIN("1234567") {
		t.Fatal("expected invalid length to be rejected")
	}
}
