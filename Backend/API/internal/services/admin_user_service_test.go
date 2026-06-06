package services

import (
	"testing"

	"fmcg-binary/internal/models"
)

func TestValidateUserStatus(t *testing.T) {
	t.Parallel()
	for _, ok := range []string{models.UserStatusActive, models.UserStatusInactive, models.UserStatusBlocked} {
		if err := validateUserStatus(ok); err != nil {
			t.Fatalf("status %q: %v", ok, err)
		}
	}
	if err := validateUserStatus("BANNED"); err == nil {
		t.Fatal("expected error for invalid status")
	}
}
