package services

import "testing"

func TestCompareTxnPassword_legacyPlainText(t *testing.T) {
	if !compareTxnPassword("123123", "123123") {
		t.Fatal("expected plain-text match")
	}
	if compareTxnPassword("123123", "wrong") {
		t.Fatal("expected plain-text mismatch")
	}
}

func TestCompareTxnPassword_bcrypt(t *testing.T) {
	hash, err := HashPassword("secret99")
	if err != nil {
		t.Fatal(err)
	}
	if !compareTxnPassword(hash, "secret99") {
		t.Fatal("expected bcrypt match")
	}
	if compareTxnPassword(hash, "wrong") {
		t.Fatal("expected bcrypt mismatch")
	}
}
