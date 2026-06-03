package services

import "time"

// StaffPinFailMax is the number of consecutive wrong action PIN attempts
// before a sub-admin is locked out of high-risk writes.
const StaffPinFailMax = 3

// StaffPinLockTTL is how long the lock lasts after StaffPinFailMax failures.
const StaffPinLockTTL = 15 * time.Minute

// ActionPINLockedError is returned when a sub-admin's action PIN is locked.
type ActionPINLockedError struct {
	RetryAfter time.Duration
}

func (e *ActionPINLockedError) Error() string { return "action PIN locked" }

// ActionPINInvalidError is returned on a wrong PIN when not yet locked.
type ActionPINInvalidError struct {
	AttemptsRemaining int
}

func (e *ActionPINInvalidError) Error() string { return "invalid action PIN" }
