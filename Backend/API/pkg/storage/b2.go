package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// B2Client uploads objects to a bucket via the S3-compatible API (Backblaze B2, MinIO, etc.).
// It is a trimmed-down mirror of the Secure-Coin storage client so both services
// can share the same bucket and upload helper.
type B2Client struct {
	client *minio.Client
	bucket string
}

// NewB2Client builds an S3 client. endpoint is host only, e.g. s3.us-east-005.backblazeb2.com (no scheme).
func NewB2Client(endpoint, accessKey, secretKey, bucket, region string, useSSL bool) (*B2Client, error) {
	endpoint = strings.TrimPrefix(strings.TrimPrefix(endpoint, "https://"), "http://")
	if endpoint == "" || accessKey == "" || secretKey == "" || bucket == "" {
		return nil, fmt.Errorf("B2: endpoint, access key, secret key, and bucket are required")
	}
	opts := &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	}
	if region != "" {
		opts.Region = region
	}
	client, err := minio.New(endpoint, opts)
	if err != nil {
		return nil, fmt.Errorf("B2 client: %w", err)
	}
	return &B2Client{client: client, bucket: bucket}, nil
}

// EnsureBucket creates the bucket if it does not exist (idempotent).
func (b *B2Client) EnsureBucket(ctx context.Context, region string) error {
	exists, err := b.client.BucketExists(ctx, b.bucket)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	opts := minio.MakeBucketOptions{}
	if region != "" {
		opts.Region = region
	}
	return b.client.MakeBucket(ctx, b.bucket, opts)
}

// Put uploads an object; contentType may be empty.
func (b *B2Client) Put(ctx context.Context, objectKey string, r io.Reader, size int64, contentType string) error {
	opts := minio.PutObjectOptions{ContentType: contentType}
	_, err := b.client.PutObject(ctx, b.bucket, objectKey, r, size, opts)
	return err
}

// PresignedGetURL returns a time-limited URL to download an object (for admin review).
func (b *B2Client) PresignedGetURL(ctx context.Context, objectKey string, expiry time.Duration) (string, error) {
	u, err := b.client.PresignedGetObject(ctx, b.bucket, objectKey, expiry, nil)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}
