package phonepolicy

import "strings"

// DemoMultiAccountE164 is the normalized E.164 for the national number 8600000889 (IN).
// Multiple networker rows may share this phone for QA; DB uses a partial unique index.
const DemoMultiAccountE164 = "+918600000889"

// AllowsDuplicateUserRows is true when the DB and add-member flow allow more than one
// account with this phone (already normalized E.164, e.g. +918600000889).
func AllowsDuplicateUserRows(normalizedE164 string) bool {
	return strings.TrimSpace(normalizedE164) == DemoMultiAccountE164
}
