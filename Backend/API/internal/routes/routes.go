package routes

import (
	"fmcg-binary/internal/handlers"
	"fmcg-binary/internal/middleware"
	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/jwt"

	"github.com/gofiber/fiber/v2"
)

type Handlers struct {
	Auth       *handlers.AuthHandler
	User       *handlers.UserHandler
	Wallet     *handlers.WalletHandler
	Tree       *handlers.TreeHandler
	Commission *handlers.CommissionHandler
	Payout     *handlers.PayoutHandler
	Admin      *handlers.AdminHandler
	FMCG       *handlers.FMCGHandler
	Placement  *handlers.PlacementHandler
	KYC        *handlers.KYCHandler
	P2P        *handlers.P2PHandler
	Support    *handlers.SupportHandler
}

func Setup(app *fiber.App, h *Handlers, jwtManager *jwt.Manager, apiKeyRepo *repository.APIKeyRepo) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "fmcg-binary"})
	})

	api := app.Group("/api/v1")

	// --- FMCG Platform APIs (API Key Auth) ---
	fmcg := api.Group("/fmcg", middleware.FMCGAPIKeyAuth(apiKeyRepo))
	fmcg.Post("/users/register", h.FMCG.RegisterUser)
	fmcg.Post("/users/sync", h.FMCG.SyncUser)
	// /users/lookup must be registered BEFORE /users/:userId/check so Fiber's
	// router does not try to match "lookup" as a :userId param.
	fmcg.Get("/users/lookup", h.FMCG.LookupUser)
	fmcg.Post("/purchase", h.FMCG.ProcessPurchase)
	fmcg.Get("/users/:userId/check", h.FMCG.CheckUser)
	fmcg.Get("/packages/match", h.FMCG.MatchPackage)
	fmcg.Post("/packages/process", h.FMCG.ProcessPackage)

	// --- Auth (public) ---
	auth := api.Group("/auth")
	auth.Post("/login", h.Auth.Login)
	auth.Post("/refresh", h.Auth.RefreshToken)

	// --- Networker (JWT Auth) ---
	protected := api.Group("", middleware.AuthRequired(jwtManager))

	protected.Get("/me", h.User.GetProfile)
	protected.Post("/me/avatar", h.User.UploadAvatar)
	protected.Get("/packages", h.User.ListActivePackages)
	protected.Get("/wallets", h.Wallet.GetBalances)
	protected.Get("/wallets/:type/ledger", h.Wallet.GetLedger)
	protected.Get("/tree", h.Tree.GetTree)
	protected.Get("/me/team", h.Tree.ListTeamSide)
	protected.Get("/me/team/stats", h.Tree.GetTeamStats)
	protected.Get("/commissions", h.Commission.ListCommissions)
	protected.Get("/me/referrals", h.User.ListDirectReferrals)
	protected.Post("/users/create", h.User.CreateUser)
	protected.Get("/payouts/schedule", h.Payout.WithdrawalSchedule)
	protected.Post("/payouts/request", h.Payout.RequestPayout)
	protected.Get("/payouts", h.Payout.ListPayouts)
	protected.Post("/packages/renew", h.User.RenewPackage)

	// --- Profile security (password + transaction password + contact) ---
	protected.Post("/me/password", h.Auth.ChangePassword)
	protected.Post("/me/transaction-password", h.Auth.SetTransactionPassword)
	protected.Post("/me/email", h.Auth.ChangeEmail)
	protected.Post("/me/phone", h.Auth.ChangePhone)
	protected.Post("/me/payout-upi", h.Auth.ChangePayoutUPI)

	// --- KYC (user) ---
	protected.Get("/kyc/me", h.KYC.GetMine)
	protected.Post("/kyc/documents", h.KYC.UploadDocument)
	protected.Post("/kyc/submit", h.KYC.Submit)

	// --- Peer-to-peer transfers (networker → networker) ---
	protected.Get("/p2p/lookup", h.P2P.Lookup)
	protected.Get("/p2p/quote", h.P2P.Quote)
	protected.Post("/p2p/transfer", h.P2P.Transfer)
	protected.Get("/p2p/transfers", h.P2P.ListMine)

	// --- Placement requests (networker decides leg) ---
	protected.Get("/me/placement-requests", h.Placement.ListMyRequests)
	protected.Post("/me/placement-requests/:id/decide", h.Placement.DecideMyRequest)

	// --- Support tickets (networker) ---
	protected.Get("/me/support/topics", h.Support.ListTopicsForMe)
	protected.Post("/me/support/tickets", h.Support.CreateMyTicket)
	protected.Get("/me/support/tickets", h.Support.ListMyTickets)
	protected.Get("/me/support/tickets/:id", h.Support.GetMyTicket)
	protected.Post("/me/support/tickets/:id/messages", h.Support.PostMyTicketMessage)
	protected.Post("/me/support/tickets/:id/attachments", h.Support.UploadMyAttachment)
	protected.Post("/me/support/tickets/:id/close", h.Support.CloseMyTicket)

	// --- Admin (JWT + Admin Role) ---
	admin := protected.Group("/admin", middleware.AdminRequired())

	// Packages
	admin.Get("/config/packages", h.Admin.ListPackages)
	admin.Post("/config/packages", h.Admin.CreatePackage)
	admin.Put("/config/packages/:id", h.Admin.UpdatePackage)

	// Commission config
	admin.Get("/config/commissions", h.Admin.ListCommissionConfigs)
	admin.Put("/config/commissions", h.Admin.UpdateCommissionConfig)

	// Level bonus slabs
	admin.Get("/config/level-bonus", h.Admin.ListLevelBonusSlabs)
	admin.Put("/config/level-bonus", h.Admin.UpsertLevelBonusSlab)

	// Payout config
	admin.Get("/config/payout", h.Admin.ListPayoutConfigs)
	admin.Put("/config/payout", h.Admin.UpdatePayoutConfig)

	// Users
	admin.Get("/users", h.Admin.ListUsers)
	admin.Get("/users/:id", h.Admin.GetUser)
	admin.Patch("/users/:id", h.Admin.UpdateUserStatus)
	admin.Get("/users/:id/wallets", h.Admin.GetUserWallets)
	admin.Get("/users/:id/wallets/:type/ledger", h.Admin.GetUserWalletLedger)
	admin.Post("/users/:id/wallet/adjust", h.Admin.AdjustUserWallet)

	// Payouts
	admin.Get("/payouts", h.Admin.ListPayouts)
	admin.Post("/payouts/:id/approve", h.Admin.ApprovePayout)
	admin.Post("/payouts/:id/reject", h.Admin.RejectPayout)

	// Placement requests (admin override)
	admin.Get("/placement-requests", h.Placement.AdminListRequests)
	admin.Post("/placement-requests/:id/decide", h.Placement.AdminDecideRequest)

	// KYC review (admin)
	admin.Get("/kyc/requests", h.KYC.AdminList)
	admin.Get("/kyc/requests/:kycId", h.KYC.AdminGet)
	admin.Patch("/kyc/requests/:kycId", h.KYC.AdminUpdate)

	// Support tickets (admin)
	admin.Get("/support/tickets", h.Support.AdminListTickets)
	admin.Get("/support/tickets/:id", h.Support.AdminGetTicket)
	admin.Post("/support/tickets/:id/assign-to-me", h.Support.AdminAssignToMe)
	admin.Post("/support/tickets/:id/messages", h.Support.AdminPostMessage)
	admin.Post("/support/tickets/:id/attachments", h.Support.AdminUploadAttachment)
	admin.Post("/support/tickets/:id/close", h.Support.AdminCloseTicket)
	admin.Post("/support/tickets/:id/reassign", h.Support.AdminReassignTicket)
	admin.Get("/support/topics", h.Support.AdminListTopics)
	admin.Post("/support/topics", h.Support.AdminCreateTopic)
	admin.Put("/support/topics/:id", h.Support.AdminUpdateTopic)
	admin.Delete("/support/topics/:id", h.Support.AdminDeleteTopic)
}
