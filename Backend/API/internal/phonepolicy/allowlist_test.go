package phonepolicy

import "testing"

func TestAllowsDuplicateUserRows(t *testing.T) {
	if !AllowsDuplicateUserRows(DemoMultiAccountE164) {
		t.Fatal("demo IN line must allow duplicates")
	}
	if AllowsDuplicateUserRows("+919999999999") {
		t.Fatal("normal numbers must not allow duplicates")
	}
	if AllowsDuplicateUserRows(" ") {
		t.Fatal("empty-ish must not allow")
	}
}
