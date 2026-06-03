package services

import (
	"context"
	"errors"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PlacementService struct {
	db            *pgxpool.Pool
	placementRepo *repository.PlacementRepo
	userRepo      *repository.UserRepo
	treeRepo      *repository.TreeRepo
	binaryService *BinaryService
	holdHours     int
}

func NewPlacementService(
	db *pgxpool.Pool,
	placementRepo *repository.PlacementRepo,
	userRepo *repository.UserRepo,
	treeRepo *repository.TreeRepo,
	binaryService *BinaryService,
	holdHours int,
) *PlacementService {
	if holdHours <= 0 {
		holdHours = 48
	}
	return &PlacementService{
		db:            db,
		placementRepo: placementRepo,
		userRepo:      userRepo,
		treeRepo:      treeRepo,
		binaryService: binaryService,
		holdHours:     holdHours,
	}
}

// CreateRequest creates a pending placement request with a 48h expiry.
// Returns the PlacementRequest on success. If the sponsor is INACTIVE/BLOCKED
// it returns (nil, nil) signalling the caller should auto-place immediately.
func (s *PlacementService) CreateRequest(ctx context.Context, userID, sponsorUserID string) (*models.PlacementRequest, error) {
	sponsor, err := s.userRepo.GetByID(ctx, sponsorUserID)
	if err != nil {
		return nil, err
	}
	if sponsor.Status != models.UserStatusActive {
		return nil, nil
	}

	pr := &models.PlacementRequest{
		ID:            uuid.New().String(),
		UserID:        userID,
		SponsorUserID: sponsorUserID,
		Status:        models.PlacementReqPending,
		ExpiresAt:     time.Now().Add(time.Duration(s.holdHours) * time.Hour),
	}

	if err := s.placementRepo.CreateRequest(ctx, pr); err != nil {
		return nil, err
	}

	if err := s.userRepo.SetPlacementStatus(ctx, userID, models.PlacementPending); err != nil {
		return nil, err
	}

	return pr, nil
}

// Decide is called when sponsor (or admin) decides the placement leg.
func (s *PlacementService) Decide(ctx context.Context, requestID, actorID, leg string, isAdmin bool) error {
	pr, err := s.placementRepo.GetByID(ctx, requestID)
	if err != nil {
		return errors.New("placement request not found")
	}
	if pr.Status != models.PlacementReqPending {
		return errors.New("placement request already resolved")
	}

	if !isAdmin && actorID != pr.SponsorUserID {
		return errors.New("only the sponsor or admin can decide placement")
	}

	if leg != models.LegLeft && leg != models.LegRight {
		return errors.New("leg must be LEFT or RIGHT")
	}

	status := models.PlacementReqApproved
	if isAdmin {
		status = models.PlacementReqAdmin
	}

	if err := s.placeUserInTree(ctx, pr.SponsorUserID, pr.UserID, leg); err != nil {
		return err
	}

	if err := s.placementRepo.Decide(ctx, requestID, leg, actorID, status); err != nil {
		return err
	}

	if err := s.userRepo.SetPlacementStatus(ctx, pr.UserID, models.PlacementPlaced); err != nil {
		return err
	}

	return s.replayPendingBV(ctx, pr.UserID)
}

// AutoPlace computes the weaker subtree and places the user automatically.
func (s *PlacementService) AutoPlace(ctx context.Context, requestID string) error {
	pr, err := s.placementRepo.GetByID(ctx, requestID)
	if err != nil {
		return err
	}
	if pr.Status != models.PlacementReqPending {
		return nil
	}

	leg, err := s.weakerLeg(ctx, pr.SponsorUserID)
	if err != nil {
		return err
	}

	if err := s.placeUserInTree(ctx, pr.SponsorUserID, pr.UserID, leg); err != nil {
		return err
	}

	if err := s.placementRepo.Decide(ctx, requestID, leg, pr.SponsorUserID, models.PlacementReqAutoPlaced); err != nil {
		return err
	}

	if err := s.userRepo.SetPlacementStatus(ctx, pr.UserID, models.PlacementPlaced); err != nil {
		return err
	}

	return s.replayPendingBV(ctx, pr.UserID)
}

// AutoPlaceByUserID is a convenience for placing by user_id (looks up the request).
func (s *PlacementService) AutoPlaceByUserID(ctx context.Context, userID string) error {
	reqs, err := s.placementRepo.ListBySponsor(ctx, "", models.PlacementReqPending)
	if err != nil {
		return err
	}
	for _, r := range reqs {
		if r.UserID == userID {
			return s.AutoPlace(ctx, r.ID)
		}
	}
	return errors.New("no pending placement request for user")
}

// ParkBV stores binary BV in the hold table for later replay.
func (s *PlacementService) ParkBV(ctx context.Context, sourceUserID, orderRef string, bvAmount int64) error {
	hold := &models.PendingBVHold{
		SourceUserID:   sourceUserID,
		OrderReference: orderRef,
		BVAmount:       bvAmount,
		Status:         models.BVHoldHeld,
	}
	return s.placementRepo.InsertBVHold(ctx, hold)
}

// ListPendingRequests returns pending requests for a sponsor.
func (s *PlacementService) ListPendingRequests(ctx context.Context, sponsorID string) ([]*models.PlacementRequest, error) {
	return s.placementRepo.ListBySponsor(ctx, sponsorID, models.PlacementReqPending)
}

// ListAllRequests returns all requests, optionally filtered by status.
func (s *PlacementService) ListAllRequests(ctx context.Context, status string) ([]*models.PlacementRequest, error) {
	return s.placementRepo.ListAll(ctx, status)
}

// ProcessExpired finds all expired pending requests and auto-places them.
func (s *PlacementService) ProcessExpired(ctx context.Context) int {
	expired, err := s.placementRepo.FindExpired(ctx)
	if err != nil {
		log.Printf("placement_worker: findExpired error: %v", err)
		return 0
	}
	count := 0
	for _, pr := range expired {
		if err := s.AutoPlace(ctx, pr.ID); err != nil {
			log.Printf("placement_worker: autoPlace user=%s error: %v", pr.UserID, err)
		} else {
			count++
			log.Printf("placement_worker: auto-placed user=%s on weaker leg", pr.UserID)
		}
	}
	return count
}

// weakerLeg determines which subtree of the sponsor has less cumulative BV.
func (s *PlacementService) weakerLeg(ctx context.Context, sponsorUserID string) (string, error) {
	sponsorNode, err := s.treeRepo.GetByUserID(ctx, sponsorUserID)
	if err != nil {
		return models.LegLeft, nil
	}

	var leftBV, rightBV int64

	if sponsorNode.LeftChildID != nil {
		leftBV, _ = s.placementRepo.CumulativeSubtreeBV(ctx, *sponsorNode.LeftChildID)
		leftBV += sponsorNode.LeftBV
	}
	if sponsorNode.RightChildID != nil {
		rightBV, _ = s.placementRepo.CumulativeSubtreeBV(ctx, *sponsorNode.RightChildID)
		rightBV += sponsorNode.RightBV
	}

	if rightBV < leftBV {
		return models.LegRight, nil
	}
	return models.LegLeft, nil
}

// placeUserInTree re-uses the BFS spillover logic from UserService.
func (s *PlacementService) placeUserInTree(ctx context.Context, sponsorID, userID, leg string) error {
	sponsorNode, err := s.treeRepo.GetByUserID(ctx, sponsorID)
	if err != nil {
		sponsorNode = &models.TreeNode{UserID: sponsorID}
		if err := s.treeRepo.Insert(ctx, sponsorNode); err != nil {
			return err
		}
	}

	parentID := sponsorID
	placementLeg := leg

	if leg == models.LegLeft && sponsorNode.LeftChildID != nil {
		parentID, placementLeg, err = s.findAvailableSlot(ctx, *sponsorNode.LeftChildID, leg)
		if err != nil {
			return err
		}
	} else if leg == models.LegRight && sponsorNode.RightChildID != nil {
		parentID, placementLeg, err = s.findAvailableSlot(ctx, *sponsorNode.RightChildID, leg)
		if err != nil {
			return err
		}
	}

	newNode := &models.TreeNode{
		UserID:   userID,
		ParentID: &parentID,
		Leg:      &placementLeg,
	}
	if err := s.treeRepo.Insert(ctx, newNode); err != nil {
		return err
	}

	if placementLeg == models.LegLeft {
		return s.treeRepo.SetLeftChild(ctx, parentID, userID)
	}
	return s.treeRepo.SetRightChild(ctx, parentID, userID)
}

func (s *PlacementService) findAvailableSlot(ctx context.Context, startID, preferredLeg string) (string, string, error) {
	queue := []string{startID}
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]

		node, err := s.treeRepo.GetByUserID(ctx, current)
		if err != nil {
			return current, preferredLeg, nil
		}

		if preferredLeg == models.LegLeft && node.LeftChildID == nil {
			return current, models.LegLeft, nil
		}
		if preferredLeg == models.LegRight && node.RightChildID == nil {
			return current, models.LegRight, nil
		}
		if node.LeftChildID == nil {
			return current, models.LegLeft, nil
		}
		if node.RightChildID == nil {
			return current, models.LegRight, nil
		}

		queue = append(queue, *node.LeftChildID, *node.RightChildID)
	}
	return "", "", errors.New("no available slot found in tree")
}

func (s *PlacementService) replayPendingBV(ctx context.Context, userID string) error {
	holds, err := s.placementRepo.GetHeldBV(ctx, userID)
	if err != nil {
		return err
	}

	for _, h := range holds {
		if _, err := s.binaryService.DistributeBVAndMatch(ctx, userID, h.OrderReference, h.BVAmount); err != nil {
			log.Printf("replay_bv: error user=%s order=%s: %v", userID, h.OrderReference, err)
		}
		if err := s.placementRepo.ReleaseBVHold(ctx, h.ID); err != nil {
			log.Printf("replay_bv: release error id=%d: %v", h.ID, err)
		}
	}
	return nil
}
