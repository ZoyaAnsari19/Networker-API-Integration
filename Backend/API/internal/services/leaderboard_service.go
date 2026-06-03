package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/storage"
	"math"
	"strings"
	"time"
)

type LeaderboardService struct {
	leaderboardRepo *repository.LeaderboardRepo
	pathRankRepo    *repository.PathRankRepo
	avatarB2        *storage.B2Client
}

func NewLeaderboardService(
	leaderboardRepo *repository.LeaderboardRepo,
	pathRankRepo *repository.PathRankRepo,
) *LeaderboardService {
	return &LeaderboardService{
		leaderboardRepo: leaderboardRepo,
		pathRankRepo:    pathRankRepo,
	}
}

func (s *LeaderboardService) SetAvatarB2(c *storage.B2Client) {
	s.avatarB2 = c
}

func (s *LeaderboardService) List(
	ctx context.Context,
	viewerID string,
	scope repository.LeaderboardScope,
	period repository.LeaderboardPeriod,
	limit, offset int,
) (*models.LeaderboardResponse, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	now := time.Now().UTC()
	periodStart, periodLabel := repository.PeriodBounds(period, now)

	slabs, err := s.pathRankRepo.ListSlabs(ctx)
	if err != nil {
		return nil, err
	}
	if len(slabs) == 0 {
		slabs = []*models.PathRankSlab{{RankLevel: 1, Name: "Member", MinDirectBVPaise: 0}}
	}

	rows, err := s.leaderboardRepo.ListTop(ctx, scope, period, periodStart, limit, offset)
	if err != nil {
		return nil, err
	}

	myRank, err := s.leaderboardRepo.GetMyRank(ctx, viewerID, scope, period, periodStart)
	if err != nil {
		return nil, err
	}

	entries := make([]models.LeaderboardEntry, 0, len(rows))
	inTop := false
	for _, row := range rows {
		entry := s.rowToEntry(ctx, row, slabs, viewerID)
		if entry.IsMe {
			inTop = true
		}
		entries = append(entries, entry)
	}

	resp := &models.LeaderboardResponse{
		Scope:       string(scope),
		Period:      string(period),
		PeriodLabel: periodLabel,
		AsOf:        now,
		Entries:     entries,
	}

	if myRank.ScorePaise > 0 && myRank.Rank > 0 {
		pct := percentile(myRank.Rank, myRank.TotalRanked)
		resp.MyPosition = &models.LeaderboardMyPosition{
			Rank:             myRank.Rank,
			ScorePaise:       myRank.ScorePaise,
			Percentile:       pct,
			InTopList:        inTop,
			TotalRanked:      myRank.TotalRanked,
			LeaderScorePaise: myRank.LeaderScorePaise,
			GapToNextPaise:   myRank.GapToNextPaise,
		}
	}

	return resp, nil
}

func (s *LeaderboardService) rowToEntry(
	ctx context.Context,
	row repository.LeaderboardRow,
	slabs []*models.PathRankSlab,
	viewerID string,
) models.LeaderboardEntry {
	rank := resolvePathRank(slabs, row.DirectBVAllTime, row.LifetimePairs)
	weakPct, ratioDisplay := legRatio(row.LeftPipeline, row.RightPipeline)

	pkgName := ""
	if row.PackageName != nil {
		pkgName = *row.PackageName
	}
	var avatarURL *string
	if s.avatarB2 != nil && row.AvatarObjectKey != nil && *row.AvatarObjectKey != "" {
		if u, err := s.avatarB2.PresignedGetURL(ctx, *row.AvatarObjectKey, 24*time.Hour); err == nil {
			avatarURL = &u
		}
	}

	return models.LeaderboardEntry{
		Rank:          row.Rank,
		UserID:        row.UserID,
		DisplayName:   maskDisplayName(row.FullName),
		SponsorID:     row.SponsorID,
		AvatarURL:     avatarURL,
		AdminTitle:               row.AdminTitle,
		AdminTitleImageURL:       PresignTitleBadgeURL(ctx, s.avatarB2, row.AdminTitleImageObjectKey),
		ScorePaise:    row.ScorePaise,
		PathRankName:  rank.Name,
		PathRankLevel: rank.Level,
		PackageName:   pkgName,
		IsMe:          row.UserID == viewerID,

		DirectBVAllTimePaise:      row.DirectBVAllTime,
		DirectLeftBVAllTimePaise:  row.DirectLeftBV,
		DirectRightBVAllTimePaise: row.DirectRightBV,
		DirectCount:               row.DirectCount,
		ActiveDirectCount:         row.ActiveDirectCount,
		LifetimePairs:             row.LifetimePairs,
		TodayPairs:                row.TodayPairs,
		LifetimeMatchedBVPaise:    row.LifetimeMatched,
		MatchedBVInPeriodPaise:    row.MatchedInPeriod,

		LeftPipelinePaise:  row.LeftPipeline,
		RightPipelinePaise: row.RightPipeline,
		WeakLegPercent:     weakPct,
		RatioDisplay:       ratioDisplay,

		PackageAmountPaise: row.PackageAmount,
		PackageActivatedAt: row.PackageActivated,
		JoinedAt:           row.JoinedAt,
		PlacementLeg:       row.PlacementLeg,
	}
}

func maskDisplayName(fullName string) string {
	fullName = strings.TrimSpace(fullName)
	if fullName == "" {
		return "Member"
	}
	parts := strings.Fields(fullName)
	if len(parts) == 1 {
		return parts[0]
	}
	last := parts[len(parts)-1]
	initial := ""
	if len(last) > 0 {
		initial = string([]rune(last)[0]) + "."
	}
	return parts[0] + " " + initial
}

func percentile(rank, total int) float64 {
	if total <= 0 || rank <= 0 {
		return 0
	}
	pct := float64(total-rank+1) / float64(total) * 100
	return math.Round(pct*10) / 10
}
