package services

import (
	"context"
	"fmt"
	"os"
	"testing"

	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/database"
)

func TestVerifyActionPINDirect(t *testing.T) {
	if os.Getenv("RUN_PIN_VERIFY") == "" {
		t.Skip("set RUN_PIN_VERIFY=1 to run")
	}
	url := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		envOr("DB_USER", "fmcg_binary"),
		envOr("DB_PASSWORD", "fmcg_binary_secret"),
		envOr("DB_HOST", "127.0.0.1"),
		envOr("DB_PORT", "5434"),
		envOr("DB_NAME", "fmcg_binary"),
		envOr("DB_SSLMODE", "disable"),
	)
	pool, err := database.NewPostgresPool(url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	staffRepo := repository.NewStaffRepo(pool)
	svc := NewStaffService(staffRepo, nil, nil, nil)
	uid := "2fe361c7-90ac-4586-b007-fdffdd77a9b8"

	if err := svc.VerifyActionPIN(context.Background(), uid, "999999", "PATCH test", "127.0.0.1", "test-agent"); err == nil {
		t.Fatal("expected error for wrong pin")
	}
	if err := svc.VerifyActionPIN(context.Background(), uid, "123456", "PATCH test", "127.0.0.1", "test-agent"); err != nil {
		t.Fatalf("expected nil for correct pin, got %v", err)
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
