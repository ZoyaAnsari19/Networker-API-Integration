package services

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RunDailyReset resets today_binary_earned on all users. Called by cron at 12:01 AM.
func RunDailyReset(db *pgxpool.Pool) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := db.Exec(ctx, `UPDATE networker_users SET today_binary_earned = 0, updated_at = NOW()`)
	if err != nil {
		log.Printf("[cron] daily reset error: %v", err)
		return
	}
	log.Println("[cron] daily binary reset completed")
}
