package services

import (
	"slices"
	"testing"
)

func TestPhoneLookupCandidates(t *testing.T) {
	t.Parallel()
	cases := []struct {
		in   string
		want []string
	}{
		{"+918600000889", []string{"+918600000889"}},
		{"8600000889", []string{"8600000889", "+918600000889"}},
		{"918600000889", []string{"918600000889", "+918600000889"}},
		{"user@test.com", nil},
		{"", nil},
	}
	for _, tc := range cases {
		got := phoneLookupCandidates(tc.in)
		if len(got) != len(tc.want) {
			t.Fatalf("phoneLookupCandidates(%q): got %v want %v", tc.in, got, tc.want)
		}
		for _, w := range tc.want {
			if !slices.Contains(got, w) {
				t.Fatalf("phoneLookupCandidates(%q): got %v want to contain %q", tc.in, got, w)
			}
		}
	}
}
