package emailpolicy

import "strings"

// DevMultiAccountEmailLower is hardcoded: multiple networker rows may share this
// email for local/QA (matches DB partial unique index exception).
const DevMultiAccountEmailLower = "faizanvector@gmail.com"

// AllowsDuplicateAccounts is true when DB and UpdateEmail allow reusing this address.
func AllowsDuplicateAccounts(email string) bool {
	return strings.ToLower(strings.TrimSpace(email)) == DevMultiAccountEmailLower
}
