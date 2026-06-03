package emailpolicy

import "testing"

func TestAllowsDuplicateAccounts(t *testing.T) {
	if !AllowsDuplicateAccounts(DevMultiAccountEmailLower) {
		t.Fatal("dev email must allow duplicates")
	}
	if !AllowsDuplicateAccounts("  FaizanVector@gmail.com ") {
		t.Fatal("case/space insensitive")
	}
	if AllowsDuplicateAccounts("other@gmail.com") {
		t.Fatal("normal emails must not allow")
	}
}
