package models

// ForgotPasswordWhatsAppSendRequest is POST /api/v1/auth/forgot-password/whatsapp/send
type ForgotPasswordWhatsAppSendRequest struct {
	Phone string `json:"phone"`
}

// ForgotPasswordWhatsAppVerifyRequest is POST /api/v1/auth/forgot-password/whatsapp/verify
type ForgotPasswordWhatsAppVerifyRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

// ForgotPasswordResetRequest is POST /api/v1/auth/forgot-password/reset
type ForgotPasswordResetRequest struct {
	ResetToken  string `json:"reset_token"`
	NewPassword string `json:"new_password"`
}

// ForgotPasswordVerifyResponse carries the short-lived opaque reset token.
type ForgotPasswordVerifyResponse struct {
	ResetToken string `json:"reset_token"`
	ExpiresIn  int    `json:"expires_in"` // seconds
}
