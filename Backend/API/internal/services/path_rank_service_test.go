package services

import (
	"fmcg-binary/internal/models"
	"testing"
)

func TestResolvePathRank(t *testing.T) {
	slabs := []*models.PathRankSlab{
		{RankLevel: 1, Name: "Starter", MinDirectBVPaise: 0, IsActive: true},
		{RankLevel: 2, Name: "Bronze", MinDirectBVPaise: 5_000_000, IsActive: true},
		{RankLevel: 3, Name: "Silver", MinDirectBVPaise: 20_000_000, IsActive: true},
	}

	got := resolvePathRank(slabs, 0, 0)
	if got.Level != 1 || got.Name != "Starter" {
		t.Fatalf("expected Starter, got %+v", got)
	}

	got = resolvePathRank(slabs, 5_000_000, 0)
	if got.Level != 2 {
		t.Fatalf("expected Bronze, got %+v", got)
	}

	got = resolvePathRank(slabs, 19_999_999, 0)
	if got.Level != 2 {
		t.Fatalf("expected still Bronze, got %+v", got)
	}
}

func TestNextPathRank(t *testing.T) {
	slabs := []*models.PathRankSlab{
		{RankLevel: 1, Name: "Starter", MinDirectBVPaise: 0, IsActive: true},
		{RankLevel: 2, Name: "Bronze", MinDirectBVPaise: 5_000_000, IsActive: true},
		{RankLevel: 3, Name: "Silver", MinDirectBVPaise: 20_000_000, IsActive: true},
	}

	current := resolvePathRank(slabs, 5_000_000, 0)
	next := nextPathRank(slabs, current, 5_000_000, 0)
	if next == nil || next.Name != "Silver" {
		t.Fatalf("expected Silver next, got %+v", next)
	}
	if next.BVRemainingPaise != 15_000_000 {
		t.Fatalf("expected 15M remaining, got %d", next.BVRemainingPaise)
	}
}

func TestLegRatio(t *testing.T) {
	pct, disp := legRatio(30_000, 70_000)
	if pct != 30.0 {
		t.Fatalf("expected 30%%, got %v", pct)
	}
	if disp != "30/70" {
		t.Fatalf("expected 30/70, got %s", disp)
	}
}
