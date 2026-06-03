//go:build securecoin
// +build securecoin

package config

import "testing"

func TestValidateSecureCoinCallbackURL_ok(t *testing.T) {
	t.Parallel()
	for _, raw := range []string{
		"https://abc123.ngrok-free.app/api/v1/secure-coin/callback",
		"https://abc123.ngrok-free.app/api/v1/secure-coin/callback/",
	} {
		if err := ValidateSecureCoinCallbackURL(raw, "development"); err != nil {
			t.Fatalf("%q: %v", raw, err)
		}
	}
}

func TestValidateSecureCoinCallbackURL_empty(t *testing.T) {
	t.Parallel()
	if err := ValidateSecureCoinCallbackURL("", "development"); err != nil {
		t.Fatal(err)
	}
}

func TestValidateSecureCoinCallbackURL_wrongPath(t *testing.T) {
	t.Parallel()
	err := ValidateSecureCoinCallbackURL("https://x.app/api/v1/secure-coin/callback/extra", "development")
	if err == nil {
		t.Fatal("expected error for wrong path")
	}
}

func TestValidateSecureCoinCallbackURL_httpLocalhost(t *testing.T) {
	t.Parallel()
	u := "http://127.0.0.1:3100" + SecureCoinCallbackPath
	if err := ValidateSecureCoinCallbackURL(u, "development"); err != nil {
		t.Fatal(err)
	}
	if err := ValidateSecureCoinCallbackURL(u, "production"); err == nil {
		t.Fatal("expected https-only in production")
	}
}
