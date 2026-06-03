package services

import (
	"context"
	"strings"
	"time"

	"fmcg-binary/pkg/storage"
)

const networkerTitleBadgePresignTTL = 24 * time.Hour

// PresignTitleBadgeURL returns a presigned HTTPS URL for an admin title badge object key.
func PresignTitleBadgeURL(ctx context.Context, b2 *storage.B2Client, objectKey *string) *string {
	if b2 == nil || objectKey == nil {
		return nil
	}
	key := strings.TrimSpace(*objectKey)
	if key == "" {
		return nil
	}
	u, err := b2.PresignedGetURL(ctx, key, networkerTitleBadgePresignTTL)
	if err != nil {
		return nil
	}
	return &u
}
