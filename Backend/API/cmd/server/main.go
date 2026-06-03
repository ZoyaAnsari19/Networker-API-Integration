package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fmcg-binary/config"
	"fmcg-binary/internal/handlers"
	"fmcg-binary/internal/middleware"
	"fmcg-binary/internal/repository"
	"fmcg-binary/internal/routes"
	"fmcg-binary/internal/services"
	"fmcg-binary/pkg/cache"
	"fmcg-binary/pkg/database"
	"fmcg-binary/pkg/jwt"
	"fmcg-binary/pkg/storage"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()

	db, err := database.NewPostgresPool(cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to PostgreSQL")

	rdb, err := cache.NewRedisClient(cfg.RedisHost, cfg.RedisPort, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		log.Printf("Warning: Redis connection failed: %v (continuing without cache)", err)
	} else {
		defer rdb.Close()
		log.Println("Connected to Redis")
	}

	jwtManager := jwt.NewManager(cfg.JWTSecret, cfg.JWTExpiry, cfg.RefreshTokenExpiry)

	// Repositories
	userRepo := repository.NewUserRepo(db)
	treeRepo := repository.NewTreeRepo(db)
	ledgerRepo := repository.NewLedgerRepo(db)
	bvRepo := repository.NewBVRepo(db)
	pairRepo := repository.NewPairRepo(db)
	packageRepo := repository.NewPackageRepo(db)
	configRepo := repository.NewConfigRepo(db)
	payoutRepo := repository.NewPayoutRepo(db)
	apiKeyRepo := repository.NewAPIKeyRepo(db)
	placementRepo := repository.NewPlacementRepo(db)
	kycRepo := repository.NewKYCRepo(db)
	p2pRepo := repository.NewP2PRepo(db)
	heldIncomeRepo := repository.NewHeldIncomeRepo(db)

	if cfg.FMCGAPIKey != "" && cfg.FMCGAPISecret != "" {
		if err := apiKeyRepo.UpsertActiveKey(context.Background(), "Secure-Pharma FMCG", cfg.FMCGAPIKey, cfg.FMCGAPISecret); err != nil {
			log.Printf("Warning: failed to sync FMCG API credentials into database: %v", err)
		} else {
			log.Println("Synced FMCG API credentials into database")
		}
	}

	// Optional: Backblaze B2 for KYC document uploads. The service keeps
	// running even when B2 is not configured — the KYC endpoints just
	// return 503 until credentials are provided.
	var b2Client *storage.B2Client
	if cfg.B2Endpoint != "" && cfg.B2AccessKey != "" && cfg.B2SecretKey != "" && cfg.B2Bucket != "" {
		bc, bErr := storage.NewB2Client(cfg.B2Endpoint, cfg.B2AccessKey, cfg.B2SecretKey, cfg.B2Bucket, cfg.B2Region, cfg.B2UseSSL)
		if bErr != nil {
			log.Printf("Warning: B2 client init failed: %v (KYC uploads disabled)", bErr)
		} else {
			b2Client = bc
			log.Printf("Connected to Backblaze B2 bucket=%s region=%s", cfg.B2Bucket, cfg.B2Region)
		}
	} else {
		log.Println("Warning: B2 credentials not set — KYC uploads disabled")
	}

	// Services
	authService := services.NewAuthService(userRepo, jwtManager, rdb)
	walletService := services.NewWalletService(ledgerRepo)
	treeService := services.NewTreeService(treeRepo, userRepo)
	configService := services.NewConfigService(configRepo)
	packageService := services.NewPackageService(packageRepo)
	packageActivationService := services.NewPackageActivationService(userRepo, packageRepo)
	levelBonusService := services.NewLevelBonusService(configRepo, pairRepo)
	activationService := services.NewActivationService(db, userRepo, ledgerRepo, heldIncomeRepo)
	binaryService := services.NewBinaryService(db, treeRepo, bvRepo, pairRepo, ledgerRepo, userRepo, configRepo, levelBonusService, activationService)
	commissionService := services.NewCommissionService(db, userRepo, ledgerRepo, configRepo, binaryService, packageActivationService, activationService)
	placementService := services.NewPlacementService(db, placementRepo, userRepo, treeRepo, binaryService, 48)
	commissionService.SetPlacementService(placementService)
	scClient := services.NewSecureCoinClient(cfg.SCAPIBase, cfg.SCAPIKey, cfg.SCAPISecret)
	fmcgClient := services.NewFMCGClient(cfg.FMCGAPIBase, cfg.FMCGAPIKey, cfg.FMCGAPISecret)
	payoutService := services.NewPayoutService(db, payoutRepo, ledgerRepo, userRepo, configRepo, scClient, authService)
	userService := services.NewUserService(db, userRepo, treeRepo, packageRepo, ledgerRepo, fmcgClient)
	userService.SetPlacementService(placementService)
	userService.SetKYCRepo(kycRepo)
	if b2Client != nil {
		userService.SetAvatarB2(b2Client)
	}
	kycService := services.NewKYCService(kycRepo, b2Client)
	p2pService := services.NewP2PService(db, p2pRepo, ledgerRepo, userRepo, configRepo, authService)

	// Handlers
	h := &routes.Handlers{
		Auth:       handlers.NewAuthHandler(authService),
		User:       handlers.NewUserHandler(userService, packageService),
		Wallet:     handlers.NewWalletHandler(walletService),
		Tree:       handlers.NewTreeHandler(treeService),
		Commission: handlers.NewCommissionHandler(commissionService, binaryService),
		Payout:     handlers.NewPayoutHandler(payoutService),
		Admin:      handlers.NewAdminHandler(packageService, configService, payoutService, userRepo),
		FMCG:       handlers.NewFMCGHandler(commissionService, binaryService, userService, packageActivationService, activationService),
		Placement:  handlers.NewPlacementHandler(placementService),
		KYC:        handlers.NewKYCHandler(kycService),
		P2P:        handlers.NewP2PHandler(p2pService),
	}

	app := fiber.New(fiber.Config{
		AppName:      "FMCG-Binary API",
		ErrorHandler: customErrorHandler,
	})

	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-API-Key,X-API-Secret",
		AllowCredentials: false,
		MaxAge:           86400,
	}))
	if cfg.HTTPDebugLog {
		log.Println("HTTP debug log: request/response bodies to stdout (redacted). Set HTTP_DEBUG_LOG=false or APP_ENV=production to disable.")
	}
	app.Use(middleware.HTTPDebug(cfg.HTTPDebugLog))
	app.Use(logger.New())

	routes.Setup(app, h, jwtManager, apiKeyRepo)

	// Cron jobs
	scheduler := cron.New()
	_, _ = scheduler.AddFunc("1 0 * * *", func() { // 12:01 AM daily
		services.RunDailyReset(db)
	})
	_, _ = scheduler.AddFunc("5 0 1 * *", func() { // 12:05 AM on the 1st of every month
		n, fErr := activationService.ForfeitPreviousMonthHeld(context.Background())
		if fErr != nil {
			log.Printf("monthly_forfeit: error: %v", fErr)
			return
		}
		log.Printf("monthly_forfeit: forfeited %d held rows from previous month", n)
	})
	scheduler.Start()
	defer scheduler.Stop()

	// Background placement worker: every 60s check for expired placement requests
	placementDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				ctx := context.Background()
				n := placementService.ProcessExpired(ctx)
				if n > 0 {
					log.Printf("placement_worker: auto-placed %d expired requests", n)
				}
			case <-placementDone:
				return
			}
		}
	}()

	go func() {
		if err := app.Listen(":" + cfg.AppPort); err != nil {
			log.Fatalf("Server error: %v", err)
		}
	}()

	log.Printf("FMCG-Binary API running on port %s (%s)", cfg.AppPort, cfg.AppEnv)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down...")
	close(placementDone)
	_ = app.Shutdown()
}

func customErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   err.Error(),
	})
}
