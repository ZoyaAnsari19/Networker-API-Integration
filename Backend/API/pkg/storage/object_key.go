package storage

import "strings"

// objectPrefix is the first path segment for all B2 keys (must match B2 app key namePrefix if set).
var objectPrefix = "networker"

// SetObjectPrefix configures the namespace for uploaded objects (no leading/trailing slashes).
func SetObjectPrefix(prefix string) {
	p := strings.Trim(strings.TrimSpace(prefix), "/")
	if p != "" {
		objectPrefix = p
	}
}

// ObjectPrefix returns the configured root prefix.
func ObjectPrefix() string {
	return objectPrefix
}

// ObjectKey joins prefix + path segments with slashes.
func ObjectKey(parts ...string) string {
	if len(parts) == 0 {
		return objectPrefix
	}
	return objectPrefix + "/" + strings.Join(parts, "/")
}
