package services

import (
	"context"
	"fmt"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"math"
)

type PathRankService struct {
	pathRankRepo *repository.PathRankRepo
	treeRepo     *repository.TreeRepo
	pairRepo     *repository.PairRepo
	configRepo   *repository.ConfigRepo
}

func NewPathRankService(
	pathRankRepo *repository.PathRankRepo,
	treeRepo *repository.TreeRepo,
	pairRepo *repository.PairRepo,
	configRepo *repository.ConfigRepo,
) *PathRankService {
	return &PathRankService{
		pathRankRepo: pathRankRepo,
		treeRepo:     treeRepo,
		pairRepo:     pairRepo,
		configRepo:   configRepo,
	}
}

func (s *PathRankService) GetSummary(ctx context.Context, userID string, recentPairLimit int) (*models.PathRankSummary, error) {
	slabs, err := s.pathRankRepo.ListSlabs(ctx)
	if err != nil {
		return nil, err
	}
	if len(slabs) == 0 {
		slabs = []*models.PathRankSlab{{RankLevel: 1, Name: "Member", MinDirectBVPaise: 0}}
	}

	directBV, directLeft, directRight, err := s.pathRankRepo.DirectTeamBV(ctx, userID)
	if err != nil {
		return nil, err
	}
	directCount, activeDirect, err := s.pathRankRepo.CountDirectTeam(ctx, userID)
	if err != nil {
		return nil, err
	}

	lifetimePairs, _ := s.pairRepo.GetLifetimePairs(ctx, userID)
	todayPairs, _ := s.pathRankRepo.TodayPairCount(ctx, userID)
	lifetimeMatched, _ := s.pathRankRepo.LifetimeMatchedBV(ctx, userID)

	leftLeg, rightLeg := int64(0), int64(0)
	if node, nErr := s.treeRepo.GetByUserID(ctx, userID); nErr == nil && node != nil {
		leftLeg, rightLeg = node.LeftBV, node.RightBV
	}

	ratioEnabled, _ := s.configRepo.GetCommissionBool(ctx, "ratio_rule_enabled")
	ratioMin, _ := s.configRepo.GetCommissionValue(ctx, "ratio_rule_max")

	current := resolvePathRank(slabs, directBV, lifetimePairs)
	next := nextPathRank(slabs, current, directBV, lifetimePairs)

	recentRaw, err := s.pathRankRepo.RecentPairs(ctx, userID, recentPairLimit)
	if err != nil {
		return nil, err
	}
	recent := enrichPairRows(recentRaw)

	progression := buildProgression(slabs, directBV, lifetimePairs, current.Level)

	weakPct, ratioDisplay := legRatio(leftLeg, rightLeg)
	passesRatio := passesWeakLegRatio(leftLeg, rightLeg, ratioMin)

	summary := &models.PathRankSummary{
		CurrentRank: models.PathRankRankView{
			Level:            current.Level,
			Name:             current.Name,
			MinDirectBVPaise: current.MinDirectBVPaise,
		},
		DirectTeam: models.PathRankDirectTeam{
			TotalBVPaise:      directBV,
			LeftBVPaise:       directLeft,
			RightBVPaise:      directRight,
			DirectCount:       directCount,
			ActiveDirectCount: activeDirect,
		},
		BinaryLegs: models.PathRankBinaryLegs{
			LeftBVPaise:         leftLeg,
			RightBVPaise:        rightLeg,
			TotalBVPaise:        leftLeg + rightLeg,
			WeakLegPercent:      weakPct,
			RatioDisplay:        ratioDisplay,
			RatioRuleEnabled:    ratioEnabled,
			RatioRuleMinPercent: ratioMin,
			PassesRatioRule:     passesRatio,
			StrongerLeg:         strongerLeg(leftLeg, rightLeg),
		},
		Pairs: models.PathRankPairsSection{
			LifetimeCount:          lifetimePairs,
			TodayCount:             todayPairs,
			LifetimeMatchedBVPaise: lifetimeMatched,
			Recent:                 recent,
		},
		RankProgression: progression,
	}

	if next != nil {
		summary.NextRank = next
	}

	return summary, nil
}

type resolvedRank struct {
	Level            int
	Name             string
	MinDirectBVPaise int64
}

func resolvePathRank(slabs []*models.PathRankSlab, directBV int64, lifetimePairs int) resolvedRank {
	best := resolvedRank{Level: 0, Name: "Member", MinDirectBVPaise: 0}
	for _, slab := range slabs {
		if !slab.IsActive {
			continue
		}
		if directBV >= slab.MinDirectBVPaise && lifetimePairs >= slab.MinLifetimePairs {
			if slab.RankLevel >= best.Level {
				best = resolvedRank{
					Level:            slab.RankLevel,
					Name:             slab.Name,
					MinDirectBVPaise: slab.MinDirectBVPaise,
				}
			}
		}
	}
	if best.Level == 0 && len(slabs) > 0 {
		s := slabs[0]
		return resolvedRank{Level: s.RankLevel, Name: s.Name, MinDirectBVPaise: s.MinDirectBVPaise}
	}
	return best
}

func nextPathRank(slabs []*models.PathRankSlab, current resolvedRank, directBV int64, lifetimePairs int) *models.PathRankNextView {
	for _, slab := range slabs {
		if !slab.IsActive || slab.RankLevel <= current.Level {
			continue
		}
		if directBV >= slab.MinDirectBVPaise && lifetimePairs >= slab.MinLifetimePairs {
			continue
		}
		remaining := slab.MinDirectBVPaise - directBV
		if remaining < 0 {
			remaining = 0
		}
		var progress float64
		if slab.MinDirectBVPaise > current.MinDirectBVPaise {
			denom := slab.MinDirectBVPaise - current.MinDirectBVPaise
			num := directBV - current.MinDirectBVPaise
			if num < 0 {
				num = 0
			}
			progress = math.Min(100, float64(num)*100/float64(denom))
		} else if slab.MinDirectBVPaise == 0 {
			progress = 100
		}

		pairsRemaining := 0
		if slab.MinLifetimePairs > lifetimePairs {
			pairsRemaining = slab.MinLifetimePairs - lifetimePairs
		}

		next := &models.PathRankNextView{
			Level:             slab.RankLevel,
			Name:              slab.Name,
			MinDirectBVPaise:  slab.MinDirectBVPaise,
			BVRemainingPaise:  remaining,
			ProgressPercent:   round1(progress),
			MinLifetimePairs:  slab.MinLifetimePairs,
			LifetimePairsHave: lifetimePairs,
		}
		if pairsRemaining > 0 {
			next.PairsRemaining = pairsRemaining
		}
		return next
	}
	return nil
}

func buildProgression(slabs []*models.PathRankSlab, directBV int64, lifetimePairs, currentLevel int) []models.PathRankProgressRow {
	out := make([]models.PathRankProgressRow, 0, len(slabs))
	for _, slab := range slabs {
		if !slab.IsActive {
			continue
		}
		unlocked := directBV >= slab.MinDirectBVPaise && lifetimePairs >= slab.MinLifetimePairs
		out = append(out, models.PathRankProgressRow{
			Level:            slab.RankLevel,
			Name:             slab.Name,
			MinDirectBVPaise: slab.MinDirectBVPaise,
			MinLifetimePairs: slab.MinLifetimePairs,
			IsUnlocked:       unlocked,
			IsCurrent:        slab.RankLevel == currentLevel,
		})
	}
	return out
}

func enrichPairRows(raw []*models.PathRankPairRow) []models.PathRankPairRow {
	out := make([]models.PathRankPairRow, 0, len(raw))
	for _, p := range raw {
		if p == nil {
			continue
		}
		weak, display := legRatio(p.LeftBVMatchedPaise, p.RightBVMatchedPaise)
		row := *p
		row.WeakLegPercent = weak
		row.RatioDisplay = display
		out = append(out, row)
	}
	return out
}

func legRatio(left, right int64) (weakPercent float64, display string) {
	if left <= 0 && right <= 0 {
		return 0, "0/0"
	}
	total := left + right
	weak := left
	if right < weak {
		weak = right
	}
	strong := total - weak
	if strong < weak {
		strong = weak
		weak = total - strong
	}
	pct := float64(weak) * 100 / float64(total)
	return round1(pct), fmt.Sprintf("%d/%d", int(math.Round(pct)), int(math.Round(100-pct)))
}

func strongerLeg(left, right int64) string {
	if left > right {
		return "LEFT"
	}
	if right > left {
		return "RIGHT"
	}
	return ""
}

func round1(v float64) float64 {
	return math.Round(v*10) / 10
}
