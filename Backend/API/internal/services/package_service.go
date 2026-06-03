package services

import (
	"context"
	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
)

type PackageService struct {
	packageRepo *repository.PackageRepo
}

func NewPackageService(packageRepo *repository.PackageRepo) *PackageService {
	return &PackageService{packageRepo: packageRepo}
}

func (s *PackageService) Create(ctx context.Context, req *models.CreatePackageRequest) (*models.Package, error) {
	p := &models.Package{
		Name:           req.Name,
		Amount:         req.Amount,
		DailyBinaryCap: req.DailyBinaryCap,
		Status:         models.PackageStatusActive,
		SortOrder:      req.SortOrder,
	}
	if err := s.packageRepo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *PackageService) ListActive(ctx context.Context) ([]*models.Package, error) {
	return s.packageRepo.ListActive(ctx)
}

func (s *PackageService) ListAll(ctx context.Context) ([]*models.Package, error) {
	return s.packageRepo.ListAll(ctx)
}

func (s *PackageService) Update(ctx context.Context, id string, req *models.UpdatePackageRequest) error {
	return s.packageRepo.Update(ctx, id, req)
}
