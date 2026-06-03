package models

import "regexp"

var actionPINPattern = regexp.MustCompile(`^\d{6}$`)

// IsValidActionPIN returns true when pin is exactly six numeric digits.
func IsValidActionPIN(pin string) bool {
	return actionPINPattern.MatchString(pin)
}
