package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
)

type TreeService struct {
	treeRepo *repository.TreeRepo
	userRepo *repository.UserRepo
}

func NewTreeService(treeRepo *repository.TreeRepo, userRepo *repository.UserRepo) *TreeService {
	return &TreeService{treeRepo: treeRepo, userRepo: userRepo}
}

func (s *TreeService) GetTreeView(ctx context.Context, userID string, depth int) (*models.TreeView, error) {
	if depth <= 0 {
		depth = 3
	}
	if depth > 10 {
		depth = 10
	}

	nodes, err := s.treeRepo.GetChildren(ctx, userID, depth)
	if err != nil {
		return nil, err
	}

	nodeMap := make(map[string]*models.TreeNode)
	for _, n := range nodes {
		nodeMap[n.UserID] = n
	}

	return s.buildTreeView(ctx, userID, nodeMap)
}

func (s *TreeService) buildTreeView(ctx context.Context, userID string, nodeMap map[string]*models.TreeNode) (*models.TreeView, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	node := nodeMap[userID]
	view := &models.TreeView{
		UserID:   user.UserID,
		FullName: user.FullName,
		Status:   user.Status,
	}

	if node != nil {
		view.Leg = node.Leg
		view.LeftBV = node.LeftBV
		view.RightBV = node.RightBV

		if node.LeftChildID != nil {
			if _, ok := nodeMap[*node.LeftChildID]; ok {
				left, _ := s.buildTreeView(ctx, *node.LeftChildID, nodeMap)
				view.Left = left
			}
		}
		if node.RightChildID != nil {
			if _, ok := nodeMap[*node.RightChildID]; ok {
				right, _ := s.buildTreeView(ctx, *node.RightChildID, nodeMap)
				view.Right = right
			}
		}
	}

	return view, nil
}

func (s *TreeService) GetNode(ctx context.Context, userID string) (*models.TreeNode, error) {
	return s.treeRepo.GetByUserID(ctx, userID)
}

// GetTeamSide returns every downline member on a given leg (LEFT/RIGHT)
// relative to the caller.
func (s *TreeService) GetTeamSide(ctx context.Context, userID, leg string, limit, offset int) ([]*models.TeamMember, error) {
	return s.treeRepo.GetTeamSide(ctx, userID, leg, limit, offset)
}

// GetTeamStats aggregates downline counts + BV volumes for the /team header.
func (s *TreeService) GetTeamStats(ctx context.Context, userID string) (*models.TeamStatsView, error) {
	return s.treeRepo.GetTeamStats(ctx, userID)
}
