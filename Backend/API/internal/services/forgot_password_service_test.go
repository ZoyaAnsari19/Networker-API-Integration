package services

import "testing"

func TestNormalizeE164Phone(t *testing.T) {
	t.Parallel()
	tests := []struct {
		in    string
		want  string
		valid bool
	}{
		{"+919876543210", "+919876543210", true},
		{" +441234567890 ", "+441234567890", true},
		{"919876543210", "", false},
		{"+0123456789", "", false},
		{"+123", "", false},
		{"+1234567890123456", "", false},
		{"+12ab34", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			t.Parallel()
			got, err := normalizeE164Phone(tt.in)
			if tt.valid {
				if err != nil || got != tt.want {
					t.Fatalf("normalizeE164Phone(%q) = %q, %v; want %q, nil", tt.in, got, err, tt.want)
				}
			} else {
				if err == nil {
					t.Fatalf("normalizeE164Phone(%q) = %q, nil; want error", tt.in, got)
				}
			}
		})
	}
}
