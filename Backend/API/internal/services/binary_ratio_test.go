package services

import "testing"

func TestPassesWeakLegRatio(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name string
		left int64
		right int64
		min  float64
		want bool
	}{
		{"30/70 pass", 30, 70, 30, true},
		{"40/60 pass", 40, 60, 30, true},
		{"50/50 pass", 50, 50, 30, true},
		{"20/80 fail", 20, 80, 30, false},
		{"25/75 fail", 25, 75, 30, false},
		{"20k/80k fail", 20_000, 80_000, 30, false},
		{"30k/70k pass", 30_000, 70_000, 30, true},
		{"rule off", 10, 90, 0, true},
		{"one leg zero", 0, 50, 30, false},
	}
	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got := passesWeakLegRatio(tc.left, tc.right, tc.min)
			if got != tc.want {
				t.Fatalf("passesWeakLegRatio(%d,%d,%v)=%v want %v", tc.left, tc.right, tc.min, got, tc.want)
			}
		})
	}
}
