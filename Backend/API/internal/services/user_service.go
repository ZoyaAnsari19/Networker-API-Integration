package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/storage"
	"log"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UserService struct {
	db               *pgxpool.Pool
	userRepo         *repository.UserRepo
	treeRepo         *repository.TreeRepo
	packageRepo      *repository.PackageRepo
	ledgerRepo       *repository.LedgerRepo
	kycRepo          *repository.KYCRepo
	fmcgClient       *FMCGClient
	placementService *PlacementService
	avatarB2         *storage.B2Client
}

func NewUserService(db *pgxpool.Pool, userRepo *repository.UserRepo, treeRepo *repository.TreeRepo,
	packageRepo *repository.PackageRepo, ledgerRepo *repository.LedgerRepo, fmcgClient *FMCGClient) *UserService {
	return &UserService{db: db, userRepo: userRepo, treeRepo: treeRepo, packageRepo: packageRepo, ledgerRepo: ledgerRepo, fmcgClient: fmcgClient}
}

// SetKYCRepo lets main.go inject the KYC repository after construction so
// GetProfile can surface kyc_status / kyc_rejection_reason on /me without
// reshuffling the constructor signature (which the FMCG sync code also calls).
func (s *UserService) SetKYCRepo(kr *repository.KYCRepo) {
	s.kycRepo = kr
}

func (s *UserService) SetPlacementService(ps *PlacementService) {
	s.placementService = ps
}

// SetAvatarB2 wires B2 for profile photo uploads (optional — nil disables uploads).
func (s *UserService) SetAvatarB2(c *storage.B2Client) {
	s.avatarB2 = c
}

const maxAvatarBytes = 2 << 20

var allowedAvatarMime = map[string]struct{}{
	"image/jpeg": {},
	"image/png":  {},
}

// UploadProfilePhoto stores a new avatar in B2 and updates networker_users.avatar_object_key.
func (s *UserService) UploadProfilePhoto(ctx context.Context, userID, filename, mimeType string, size int64, r io.Reader) error {
	if s.avatarB2 == nil {
		return fmt.Errorf("file storage is not configured")
	}
	if size <= 0 || size > maxAvatarBytes {
		return fmt.Errorf("avatar must be between 1 byte and 2 MB")
	}
	mt := strings.TrimSpace(strings.ToLower(mimeType))
	if mt == "" {
		mt = "application/octet-stream"
	}
	if _, ok := allowedAvatarMime[mt]; !ok {
		return fmt.Errorf("unsupported file type (use jpeg or png)")
	}
	base := filepath.Base(filename)
	if base == "." || base == "/" {
		base = "avatar.jpg"
	}
	objectKey := fmt.Sprintf("fmcg-binary/avatars/%s/%s_%s", userID, uuid.NewString(), base)
	if err := s.avatarB2.Put(ctx, objectKey, r, size, mt); err != nil {
		return fmt.Errorf("upload failed: %w", err)
	}
	return s.userRepo.UpdateAvatarObjectKey(ctx, userID, objectKey)
}

func (s *UserService) RegisterNetworker(ctx context.Context, req *models.RegisterRequest) (*models.User, error) {
	sponsor, err := s.userRepo.GetByID(ctx, req.SponsorID)
	if err != nil {
		// Allow sponsor_id to be provided as sponsor_id code (e.g. SPF00001)
		sponsor, err = s.userRepo.GetBySponsorID(ctx, req.SponsorID)
		if err != nil {
			return nil, errors.New("invalid sponsor_id")
		}
	}
	if sponsor.Status == models.UserStatusBlocked {
		return nil, errors.New("sponsor is blocked")
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	userID := NewUserID()
	user := &models.User{
		UserID:        userID,
		SponsorUserID: &sponsor.UserID,
		FullName:      req.FullName,
		Email:         req.Email,
		Phone:         strPtr(req.Phone),
		PasswordHash:  hash,
		Role:          models.RoleNetworker,
	}

	if req.PackageID != "" {
		// Package provided — validate and activate immediately.
		pkg, err := s.packageRepo.GetByID(ctx, req.PackageID)
		if err != nil {
			return nil, errors.New("invalid package_id")
		}
		if pkg.Status != models.PackageStatusActive {
			return nil, errors.New("package is not active")
		}
		now := time.Now()
		user.Status = models.UserStatusActive
		user.CurrentPackageID = &req.PackageID
		user.PackageActivatedAt = &now
		user.DailyBinaryCap = pkg.DailyBinaryCap
	} else {
		// No package provided — user is INACTIVE until their first FMCG
		// purchase triggers auto-activation via the purchase commission flow.
		user.Status = models.UserStatusInactive
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Place in binary tree regardless of package status so the slot is
	// reserved.  Binary commissions will only flow once the user is ACTIVE.
	legNorm, _, legErr := parseBinaryLeg(req.Leg)
	if legErr != nil {
		return nil, legErr
	}
	if err := s.placeInTree(ctx, sponsor.UserID, userID, legNorm); err != nil {
		return nil, err
	}

	if req.PackageID != "" {
		up := &models.UserPackage{
			UserID:     userID,
			PackageID:  req.PackageID,
			AmountPaid: 0,
			Status:     models.UserPackageActive,
		}
		_ = s.packageRepo.InsertUserPackage(ctx, up)
	}

	// Reload so sponsor_id (generated in DB) is included in API responses.
	created, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return user, nil
	}
	return created, nil
}

func (s *UserService) RegisterFromFMCG(ctx context.Context, req *models.FMCGRegisterRequest) (*models.User, error) {
	sponsor, err := s.userRepo.GetByID(ctx, req.SponsorID)
	if err != nil {
		sponsor, err = s.userRepo.GetBySponsorID(ctx, req.SponsorID)
		if err != nil {
			return nil, errors.New("invalid sponsor_id")
		}
	}
	if sponsor.Status == models.UserStatusBlocked {
		return nil, errors.New("sponsor is blocked")
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	userID := NewUserID()
	user := &models.User{
		UserID:             userID,
		SponsorUserID:      &sponsor.UserID,
		FullName:           req.FullName,
		Email:              req.Email,
		Phone:              strPtr(req.Phone),
		PasswordHash:       hash,
		Role:               models.RoleNetworker,
		PlacementStatus:    models.PlacementPlaced,
	}

	if req.PackageID != "" {
		pkg, err := s.packageRepo.GetByID(ctx, req.PackageID)
		if err != nil {
			return nil, errors.New("invalid package_id")
		}
		if pkg.Status != models.PackageStatusActive {
			return nil, errors.New("package is not active")
		}
		user.Status = models.UserStatusActive
		user.CurrentPackageID = &req.PackageID
		user.PackageActivatedAt = &now
		user.DailyBinaryCap = pkg.DailyBinaryCap
	} else {
		// FMCG can create a networker before any package purchase.
		// The account stays INACTIVE until the first qualifying purchase
		// triggers package activation through the purchase flow.
		user.Status = models.UserStatusInactive
	}

	legNorm, legEmpty, legErr := parseBinaryLeg(req.Leg)
	if legErr != nil {
		return nil, legErr
	}
	deferPlacement := s.placementService != nil && legEmpty
	if deferPlacement {
		user.PlacementStatus = models.PlacementPending
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	if req.PackageID != "" {
		up := &models.UserPackage{
			UserID:     userID,
			PackageID:  req.PackageID,
			AmountPaid: 0,
			Status:     models.UserPackageActive,
		}
		_ = s.packageRepo.InsertUserPackage(ctx, up)
	}

	if deferPlacement {
		pr, createErr := s.placementService.CreateRequest(ctx, userID, sponsor.UserID)
		if createErr != nil {
			log.Printf("placement_request create error: %v, falling back to auto-place", createErr)
		}
		if pr == nil {
			// Sponsor inactive or error — auto-place on weaker leg now
			weakerLeg, _ := s.placementService.weakerLeg(ctx, sponsor.UserID)
			if weakerLeg == "" {
				weakerLeg = models.LegLeft
			}
			if err := s.placeInTree(ctx, sponsor.UserID, userID, weakerLeg); err != nil {
				return nil, err
			}
			_ = s.userRepo.SetPlacementStatus(ctx, userID, models.PlacementPlaced)
			user.PlacementStatus = models.PlacementPlaced
		}
	} else {
		if err := s.placeInTree(ctx, sponsor.UserID, userID, legNorm); err != nil {
			return nil, err
		}
	}

	created, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return user, nil
	}
	return created, nil
}

func (s *UserService) CreateFromDashboard(ctx context.Context, sponsorID string, req *models.CreateUserRequest) (*models.User, error) {
	r := &models.RegisterRequest{
		SponsorID: sponsorID,
		FullName:  req.FullName,
		Email:     req.Email,
		Phone:     req.Phone,
		Password:  req.Password,
		Leg:       req.Leg,
		PackageID: req.PackageID,
	}
	user, err := s.RegisterNetworker(ctx, r)
	if err != nil {
		return nil, err
	}

	// Sync to FMCG platform (full row + plaintext password + leg for mirror signup)
	if s.fmcgClient != nil && s.fmcgClient.baseURL != "" {
		legForSync, _, _ := parseBinaryLeg(req.Leg)
		syncErr := s.fmcgClient.SyncNewUser(ctx, user, &FMCGSyncNewUserOpts{
			PlaintextPassword: req.Password,
			Leg:               legForSync,
		})
		if syncErr != nil {
			log.Printf("WARNING: FMCG sync failed for user %s: %v", user.UserID, syncErr)
		}
	}

	return user, nil
}

func (s *UserService) RenewPackage(ctx context.Context, userID, packageID string) error {
	pkg, err := s.packageRepo.GetByID(ctx, packageID)
	if err != nil || pkg.Status != models.PackageStatusActive {
		return errors.New("invalid or inactive package")
	}

	_ = s.packageRepo.ExpireUserPackage(ctx, userID)

	up := &models.UserPackage{UserID: userID, PackageID: packageID, AmountPaid: pkg.Amount, Status: models.UserPackageActive}
	if err := s.packageRepo.InsertUserPackage(ctx, up); err != nil {
		return err
	}

	now := time.Now()
	return s.userRepo.ActivatePackage(ctx, userID, packageID, pkg.DailyBinaryCap, now)
}

func (s *UserService) SyncProfile(ctx context.Context, req *models.UserSyncRequest) error {
	return s.userRepo.UpdateProfile(ctx, req.UserID, req.FullName, req.Email, req.Phone)
}

func (s *UserService) GetProfile(ctx context.Context, userID string) (*models.UserProfile, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	balances, _ := s.ledgerRepo.GetBothBalances(ctx, userID)
	directCount, _ := s.userRepo.CountDirectReferrals(ctx, userID)

	profile := &models.UserProfile{
		User:          *user,
		DirectBalance: balances.DirectBalance,
		TeamBalance:   balances.TeamBalance,
		DirectCount:   directCount,
	}

	if user.SponsorUserID != nil {
		sponsor, err := s.userRepo.GetByID(ctx, *user.SponsorUserID)
		if err == nil {
			profile.SponsorName = &sponsor.FullName
			profile.SponsorSponsorID = &sponsor.SponsorID
		}
	}

	if user.CurrentPackageID != nil {
		pkg, err := s.packageRepo.GetByID(ctx, *user.CurrentPackageID)
		if err == nil {
			profile.PackageName = &pkg.Name
			profile.PackageAmount = &pkg.Amount
		}
	}

	if has, err := s.userRepo.HasTransactionPassword(ctx, userID); err == nil {
		profile.HasTransactionPassword = has
	}

	if s.kycRepo != nil {
		if req, err := s.kycRepo.GetByUserID(ctx, userID); err == nil && req != nil {
			status := req.Status
			profile.KYCStatus = &status
			if req.RejectionReason != nil && *req.RejectionReason != "" {
				profile.KYCRejectionReason = req.RejectionReason
			}
		}
	}

	if s.avatarB2 != nil && user.AvatarObjectKey != nil && *user.AvatarObjectKey != "" {
		if u, err := s.avatarB2.PresignedGetURL(ctx, *user.AvatarObjectKey, 24*time.Hour); err == nil {
			profile.AvatarURL = &u
		}
	}

	return profile, nil
}

// ListDirectReferrals returns the directs sponsored by the given user.
func (s *UserService) ListDirectReferrals(ctx context.Context, sponsorUserID string, limit, offset int) ([]*models.DirectReferral, error) {
	return s.userRepo.ListDirectReferrals(ctx, sponsorUserID, limit, offset)
}

// LookupUser is used by the FMCG platform (server-to-server, API-key auth) to
// fetch a complete snapshot of a networker given one of these identifiers:
//
//	key = "email"       → match by email
//	key = "phone"       → exact phone match (include country code if present)
//	key = "sponsor_id"  → SPF code (case-insensitive)
//	key = "user_id"     → internal UUID
//
// The response aggregates profile, current package, sponsor (upline), wallet
// balances, KYC, placement/tree leg, and the 5 most recent direct referrals
// so FMCG can render a full "user card" without stitching multiple calls.
func (s *UserService) LookupUser(ctx context.Context, key, value string) (*models.UserLookupResponse, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, errors.New("lookup value is required")
	}

	var (
		user *models.User
		err  error
	)
	switch strings.ToLower(strings.TrimSpace(key)) {
	case "email":
		user, err = s.userRepo.GetByEmail(ctx, strings.ToLower(value))
	case "phone":
		user, err = s.userRepo.GetByPhone(ctx, value)
	case "sponsor_id":
		user, err = s.userRepo.GetBySponsorID(ctx, strings.ToUpper(value))
	case "user_id":
		user, err = s.userRepo.GetByID(ctx, value)
	default:
		return nil, fmt.Errorf("unsupported lookup key %q", key)
	}
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	res := &models.UserLookupResponse{User: *user}

	if balances, bErr := s.ledgerRepo.GetBothBalances(ctx, user.UserID); bErr == nil && balances != nil {
		res.Wallets = models.UserLookupWallets{
			Direct: balances.DirectBalance,
			Team:   balances.TeamBalance,
			Total:  balances.TotalBalance,
		}
	}

	if cnt, cErr := s.userRepo.CountDirectReferrals(ctx, user.UserID); cErr == nil {
		res.DirectCount = cnt
	}

	if user.SponsorUserID != nil {
		if sp, spErr := s.userRepo.GetByID(ctx, *user.SponsorUserID); spErr == nil && sp != nil {
			res.Sponsor = &models.UserLookupSponsor{
				UserID:    sp.UserID,
				SponsorID: sp.SponsorID,
				FullName:  sp.FullName,
				Email:     sp.Email,
				Phone:     sp.Phone,
				Status:    sp.Status,
			}
		}
	}

	if user.CurrentPackageID != nil {
		if pkg, pErr := s.packageRepo.GetByID(ctx, *user.CurrentPackageID); pErr == nil && pkg != nil {
			res.Package = &models.UserLookupPackage{
				ID:             pkg.PackageID,
				Name:           pkg.Name,
				Amount:         pkg.Amount,
				DailyBinaryCap: user.DailyBinaryCap,
				ActivatedAt:    user.PackageActivatedAt,
			}
		}
	}

	if s.kycRepo != nil {
		if k, kErr := s.kycRepo.GetByUserID(ctx, user.UserID); kErr == nil && k != nil {
			res.KYC = &models.UserLookupKYC{
				Status:          k.Status,
				SubmittedAt:     k.SubmittedAt,
				ReviewedAt:      k.ReviewedAt,
				RejectionReason: k.RejectionReason,
			}
		}
	}

	placement := models.UserLookupPlacement{Status: user.PlacementStatus}
	if node, tErr := s.treeRepo.GetByUserID(ctx, user.UserID); tErr == nil && node != nil {
		placement.Leg = node.Leg
	}
	res.Placement = placement

	if s.avatarB2 != nil && user.AvatarObjectKey != nil && *user.AvatarObjectKey != "" {
		if u, uErr := s.avatarB2.PresignedGetURL(ctx, *user.AvatarObjectKey, 24*time.Hour); uErr == nil {
			res.AvatarURL = &u
		}
	}

	if directs, dErr := s.userRepo.ListDirectReferrals(ctx, user.UserID, 5, 0); dErr == nil {
		res.RecentReferrals = directs
	}

	return res, nil
}

func (s *UserService) placeInTree(ctx context.Context, sponsorID, userID, leg string) error {
	sponsorNode, err := s.treeRepo.GetByUserID(ctx, sponsorID)
	if err != nil {
		// Sponsor has no tree node yet (root user case) -- create one
		sponsorNode = &models.TreeNode{UserID: sponsorID}
		if err := s.treeRepo.Insert(ctx, sponsorNode); err != nil {
			return err
		}
	}

	parentID := sponsorID
	placementLeg := leg

	// If the chosen leg is already occupied, find the next available slot (spillover/BFS down that leg)
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

// findAvailableSlot does BFS down a sub-tree to find the first empty left or right slot.
func (s *UserService) findAvailableSlot(ctx context.Context, startID, preferredLeg string) (string, string, error) {
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

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// parseBinaryLeg normalises referral / FMCG leg strings to LEFT or RIGHT.
// Empty input means "no leg" (used for PENDING_PLACEMENT handshake). Any other
// value is rejected so tree_leg enums never receive garbage casing.
func parseBinaryLeg(raw string) (normalized string, empty bool, err error) {
	s := strings.TrimSpace(raw)
	if s == "" {
		return "", true, nil
	}
	u := strings.ToUpper(s)
	if u == models.LegLeft || u == models.LegRight {
		return u, false, nil
	}
	return "", false, fmt.Errorf("leg must be LEFT or RIGHT (got %q)", raw)
}
