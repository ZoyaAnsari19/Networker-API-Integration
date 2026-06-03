package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppPort string
	AppEnv  string
	// HTTPDebugLog prints request/response bodies to stdout (redacted). Off in production unless forced.
	HTTPDebugLog       bool
	JWTSecret          string
	JWTExpiry          time.Duration
	RefreshTokenExpiry time.Duration
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSSLMode          string
	RedisHost          string
	RedisPort          string
	RedisPassword      string
	RedisDB            int

	// Secure-Coin merchant API (payout via rewards/issue)
	SCAPIBase   string
	SCAPIKey    string
	SCAPISecret string

	// FMCG platform (user sync callbacks)
	FMCGAPIBase   string
	FMCGAPIKey    string
	FMCGAPISecret string

	// Backblaze B2 (S3-compatible) for KYC document uploads. Shared bucket
	// with Secure-Coin is fine — this service namespaces object keys under
	// fmcg-binary/kyc/ to prevent collisions.
	B2Endpoint  string
	B2AccessKey string
	B2SecretKey string
	B2Bucket    string
	B2Region    string
	B2UseSSL    bool
}

func Load() *Config {
	appEnv := getEnv("APP_ENV", "development")
	return &Config{
		AppPort:            getEnv("APP_PORT", "3100"),
		AppEnv:             appEnv,
		HTTPDebugLog:       parseHTTPDebugLog(appEnv, os.Getenv("HTTP_DEBUG_LOG")),
		JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production"),
		JWTExpiry:          getDuration("JWT_EXPIRY", 24*time.Hour),
		RefreshTokenExpiry: getDuration("REFRESH_TOKEN_EXPIRY", 168*time.Hour),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "fmcg_binary"),
		DBPassword:         getEnv("DB_PASSWORD", "fmcg_binary_secret"),
		DBName:             getEnv("DB_NAME", "fmcg_binary"),
		DBSSLMode:          getEnv("DB_SSLMODE", "disable"),
		RedisHost:          getEnv("REDIS_HOST", "localhost"),
		RedisPort:          getEnv("REDIS_PORT", "6379"),
		RedisPassword:      getEnv("REDIS_PASSWORD", ""),
		RedisDB:            getEnvInt("REDIS_DB", 1),

		SCAPIBase:   getEnv("SC_API_BASE", ""),
		SCAPIKey:    getEnv("SC_API_KEY", ""),
		SCAPISecret: getEnv("SC_API_SECRET", ""),

		FMCGAPIBase:   getEnv("FMCG_API_BASE", ""),
		FMCGAPIKey:    getEnv("FMCG_API_KEY", ""),
		FMCGAPISecret: getEnv("FMCG_API_SECRET", ""),

		B2Endpoint:  getEnv("B2_ENDPOINT", ""),
		B2AccessKey: getEnv("B2_ACCESS_KEY", ""),
		B2SecretKey: getEnv("B2_SECRET_KEY", ""),
		B2Bucket:    getEnv("B2_BUCKET", ""),
		B2Region:    getEnv("B2_REGION", ""),
		B2UseSSL:    getEnv("B2_USE_SSL", "true") != "false",
	}
}

func (c *Config) DatabaseURL() string {
	return "postgres://" + c.DBUser + ":" + c.DBPassword +
		"@" + c.DBHost + ":" + c.DBPort +
		"/" + c.DBName + "?sslmode=" + c.DBSSLMode
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// parseHTTPDebugLog: explicit HTTP_DEBUG_LOG wins; otherwise enabled when APP_ENV is not production.
func parseHTTPDebugLog(appEnv, explicit string) bool {
	switch strings.ToLower(strings.TrimSpace(explicit)) {
	case "1", "true", "yes", "on":
		return true
	case "0", "false", "no", "off":
		return false
	default:
		return strings.ToLower(strings.TrimSpace(appEnv)) != "production"
	}
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
