package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"
	"unicode"

	"fmcg-binary/internal/models"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/storage"

	"github.com/google/uuid"
)

const (
	maxDashboardSlides       = 5
	maxImageURLLen           = 2048
	maxSlideCaptionLen       = 500
	maxNoticeTitleLen        = 200
	maxNoticeBodyLen         = 8000
	maxNoticeLinkURLLen      = 2048
	maxNoticeLinkLabelLen    = 120
	dashboardHomeB2Subdir    = "dashboard-home"
	maxDashboardHeroBytes    = 5 << 20
	networkerHomePresignTTL  = 7 * 24 * time.Hour
	adminHomePreviewPresignTTL = time.Hour
)

var dashboardHeroAllowedMime = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type DashboardHomeService struct {
	repo *repository.DashboardHomeRepo
	b2   *storage.B2Client
}

func NewDashboardHomeService(repo *repository.DashboardHomeRepo) *DashboardHomeService {
	return &DashboardHomeService{repo: repo}
}

// SetB2 wires Backblaze B2 for admin dashboard hero uploads (optional).
func (s *DashboardHomeService) SetB2(c *storage.B2Client) {
	s.b2 = c
}

func (s *DashboardHomeService) Get(ctx context.Context) (*models.DashboardHomeResponse, error) {
	return s.repo.Get(ctx)
}

func isHTTPURL(u string) bool {
	u = strings.ToLower(strings.TrimSpace(u))
	return strings.HasPrefix(u, "https://") || strings.HasPrefix(u, "http://")
}

func (s *DashboardHomeService) validateAndNormalize(p *models.DashboardHomePayload) error {
	if len(p.Slides) > maxDashboardSlides {
		return fmt.Errorf("at most %d slider images allowed", maxDashboardSlides)
	}
	for i := range p.Slides {
		p.Slides[i].ImageURL = strings.TrimSpace(p.Slides[i].ImageURL)
		p.Slides[i].ImageObjectKey = strings.TrimSpace(p.Slides[i].ImageObjectKey)
		p.Slides[i].Caption = strings.TrimSpace(p.Slides[i].Caption)
		if p.Slides[i].ImageURL != "" && p.Slides[i].ImageObjectKey != "" {
			return errors.New("each slide may use either image_url or image_object_key, not both")
		}
		if p.Slides[i].ImageObjectKey != "" {
			if !strings.HasPrefix(p.Slides[i].ImageObjectKey, storage.ObjectKey(dashboardHomeB2Subdir)+"/") {
				return errors.New("invalid image_object_key")
			}
			if len(p.Slides[i].ImageObjectKey) > maxImageURLLen {
				return errors.New("image_object_key too long")
			}
		}
		if p.Slides[i].ImageURL != "" {
			if !isHTTPURL(p.Slides[i].ImageURL) {
				return errors.New("image_url must be http(s) when image_object_key is empty")
			}
			if len(p.Slides[i].ImageURL) > maxImageURLLen {
				return errors.New("image_url too long")
			}
		}
		if len(p.Slides[i].Caption) > maxSlideCaptionLen {
			return errors.New("caption too long")
		}
		if p.Slides[i].LinkURL != nil {
			u := strings.TrimSpace(*p.Slides[i].LinkURL)
			if u == "" {
				p.Slides[i].LinkURL = nil
			} else {
				if !isHTTPURL(u) {
					return errors.New("slide link_url must be http(s)")
				}
				if len(u) > maxNoticeLinkURLLen {
					return errors.New("slide link_url too long")
				}
				p.Slides[i].LinkURL = &u
			}
		}
		p.Slides[i].SortOrder = i
	}
	for i := range p.Notices {
		p.Notices[i].Title = strings.TrimSpace(p.Notices[i].Title)
		p.Notices[i].Body = strings.TrimSpace(p.Notices[i].Body)
		if len(p.Notices[i].Title) > maxNoticeTitleLen {
			return errors.New("notice title too long")
		}
		if len(p.Notices[i].Body) > maxNoticeBodyLen {
			return errors.New("notice body too long")
		}
		if p.Notices[i].LinkURL != nil {
			u := strings.TrimSpace(*p.Notices[i].LinkURL)
			if u == "" {
				p.Notices[i].LinkURL = nil
			} else {
				if len(u) > maxNoticeLinkURLLen {
					return errors.New("link_url too long")
				}
				p.Notices[i].LinkURL = &u
			}
		}
		if p.Notices[i].LinkLabel != nil {
			l := strings.TrimSpace(*p.Notices[i].LinkLabel)
			if l == "" {
				p.Notices[i].LinkLabel = nil
			} else {
				if len(l) > maxNoticeLinkLabelLen {
					return errors.New("link_label too long")
				}
				p.Notices[i].LinkLabel = &l
			}
		}
		now := time.Now().UTC().Format(time.RFC3339Nano)
		p.Notices[i].UpdatedAt = now
	}
	return nil
}

func (s *DashboardHomeService) Save(ctx context.Context, p *models.DashboardHomePayload) (*models.DashboardHomeResponse, error) {
	if p == nil {
		return nil, errors.New("payload required")
	}
	if err := s.validateAndNormalize(p); err != nil {
		return nil, err
	}
	updatedAt, err := s.repo.Save(ctx, p)
	if err != nil {
		return nil, err
	}
	return &models.DashboardHomeResponse{
		DashboardHomePayload: *p,
		UpdatedAt:            updatedAt,
	}, nil
}

// UploadDashboardHeroImage stores one image in B2 for the dashboard slider.
// Returns the object key and a short-lived presigned URL for immediate UI preview.
func (s *DashboardHomeService) UploadDashboardHeroImage(ctx context.Context, filename, mimeType string, size int64, r io.Reader) (objectKey string, previewURL string, err error) {
	if s.b2 == nil {
		return "", "", fmt.Errorf("file storage is not configured")
	}
	if size <= 0 || size > maxDashboardHeroBytes {
		return "", "", fmt.Errorf("file must be between 1 byte and %d MB", maxDashboardHeroBytes/(1<<20))
	}
	mt := strings.TrimSpace(strings.ToLower(mimeType))
	if mt == "" {
		mt = "application/octet-stream"
	}
	ext, ok := dashboardHeroAllowedMime[mt]
	if !ok {
		return "", "", fmt.Errorf("unsupported file type (use jpeg, png, or webp)")
	}
	safe := sanitizeDashHeroFilename(filename)
	if safe != "" {
		objectKey = storage.ObjectKey(dashboardHomeB2Subdir, uuid.NewString()+"_"+safe+ext)
	} else {
		objectKey = storage.ObjectKey(dashboardHomeB2Subdir, uuid.NewString()+ext)
	}
	if err := s.b2.Put(ctx, objectKey, r, size, mt); err != nil {
		return "", "", fmt.Errorf("upload failed: %w", err)
	}
	if u, uerr := s.b2.PresignedGetURL(ctx, objectKey, adminHomePreviewPresignTTL); uerr == nil {
		previewURL = u
	}
	return objectKey, previewURL, nil
}

func sanitizeDashHeroFilename(name string) string {
	base := filepath.Base(strings.TrimSpace(name))
	if base == "." || base == "/" {
		return ""
	}
	var b strings.Builder
	for _, r := range strings.TrimSuffix(base, filepath.Ext(base)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			b.WriteRune(r)
		}
	}
	out := b.String()
	if len(out) > 40 {
		out = out[:40]
	}
	return out
}

func presignOrEmpty(ctx context.Context, b2 *storage.B2Client, key string, ttl time.Duration) string {
	if b2 == nil || key == "" {
		return ""
	}
	u, err := b2.PresignedGetURL(ctx, key, ttl)
	if err != nil {
		return ""
	}
	return u
}

// ToAdminAPIResponse builds slides with display_image_url for the admin UI.
func (s *DashboardHomeService) ToAdminAPIResponse(ctx context.Context, data *models.DashboardHomeResponse) *models.AdminDashboardHomeAPIResponse {
	if data == nil {
		return &models.AdminDashboardHomeAPIResponse{
			Slides:    []models.AdminDashboardHomeSlide{},
			Notices:   []models.DashboardHomeNotice{},
			UpdatedAt: time.Time{},
		}
	}
	out := &models.AdminDashboardHomeAPIResponse{
		Slides:    make([]models.AdminDashboardHomeSlide, 0, len(data.Slides)),
		Notices:   data.Notices,
		UpdatedAt: data.UpdatedAt,
	}
	for _, sl := range data.Slides {
		item := models.AdminDashboardHomeSlide{
			ID:             sl.ID,
			ImageURL:       sl.ImageURL,
			ImageObjectKey: sl.ImageObjectKey,
			Caption:        sl.Caption,
			SortOrder:      sl.SortOrder,
		}
		if sl.LinkURL != nil {
			u := *sl.LinkURL
			item.LinkURL = &u
		}
		if sl.ImageObjectKey != "" {
			item.DisplayImageURL = presignOrEmpty(ctx, s.b2, sl.ImageObjectKey, adminHomePreviewPresignTTL)
		} else if sl.ImageURL != "" {
			item.DisplayImageURL = sl.ImageURL
		}
		out.Slides = append(out.Slides, item)
	}
	return out
}

// GetForNetworker returns dashboard home with image_url resolved for B2-backed slides (presigned).
func (s *DashboardHomeService) GetForNetworker(ctx context.Context) (*models.DashboardHomeResponse, error) {
	data, err := s.Get(ctx)
	if err != nil {
		return nil, err
	}
	out := &models.DashboardHomeResponse{
		DashboardHomePayload: models.DashboardHomePayload{
			Slides:  make([]models.DashboardHomeSlide, len(data.Slides)),
			Notices: data.Notices,
		},
		UpdatedAt: data.UpdatedAt,
	}
	for i, sl := range data.Slides {
		out.Slides[i] = sl
		out.Slides[i].ImageObjectKey = ""
		if sl.ImageObjectKey != "" && s.b2 != nil {
			if u, uerr := s.b2.PresignedGetURL(ctx, sl.ImageObjectKey, networkerHomePresignTTL); uerr == nil {
				out.Slides[i].ImageURL = u
			}
		}
	}
	return out, nil
}
