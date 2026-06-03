// E2E simulation for the weak-leg ratio rule against the LOCAL Postgres.
// Skipped by default. Run with:
//   RUN_E2E_RATIO=1 DB_HOST=127.0.0.1 DB_PORT=5434 DB_USER=fmcg_binary \
//     DB_PASSWORD=fmcg_binary_secret DB_NAME=fmcg_binary DB_SSLMODE=disable \
//     E2E_USER_SPONSOR=SPF00018 \
//     go test ./internal/services -run TestE2EWeakLegRatioRule -v
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"fmcg-binary/internal/repository"
	"fmcg-binary/pkg/database"

	"github.com/jackc/pgx/v5/pgxpool"
)

const e2eDefaultSponsor = "SPF00018"

func TestE2EWeakLegRatioRule(t *testing.T) {
	if os.Getenv("RUN_E2E_RATIO") == "" {
		t.Skip("set RUN_E2E_RATIO=1 to run weak-leg ratio E2E")
	}

	ctx := context.Background()
	url := fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		envOrDefault("DB_USER", "fmcg_binary"),
		envOrDefault("DB_PASSWORD", "fmcg_binary_secret"),
		envOrDefault("DB_HOST", "127.0.0.1"),
		envOrDefault("DB_PORT", "5434"),
		envOrDefault("DB_NAME", "fmcg_binary"),
		envOrDefault("DB_SSLMODE", "disable"),
	)
	pool, err := database.NewPostgresPool(url)
	if err != nil {
		t.Fatalf("db: %v", err)
	}

	sponsor := envOrDefault("E2E_USER_SPONSOR", e2eDefaultSponsor)
	userID, err := lookupUserBySponsor(ctx, pool, sponsor)
	if err != nil {
		pool.Close()
		t.Fatalf("lookup %s: %v", sponsor, err)
	}
	t.Logf("E2E target: sponsor=%s user_id=%s", sponsor, userID)

	snap := snapshotTree(t, ctx, pool, userID)
	origRule := snapshotRatioConfig(t, ctx, pool)
	origTodayBinary := snapshotTodayBinary(t, ctx, pool, userID)
	t.Logf("baseline wallet rows (BINARY_MATCH+LEVEL_BONUS): %d", walletMatchCount(t, ctx, pool, userID))

	runTag := fmt.Sprintf("E2E-RATIO-%d-", time.Now().UnixNano())

	defer func() {
		restoreTree(t, ctx, pool, userID, snap)
		restoreRatioConfig(t, ctx, pool, origRule)
		restoreTodayBinary(t, ctx, pool, userID, origTodayBinary)
		deletedWallet := deleteRowsByRefPrefix(t, ctx, pool, runTag)
		deletedPair := deletePairLogByOrderPrefix(t, ctx, pool, runTag)
		t.Logf("E2E cleanup OK: tree+config+caps restored; wallet rows=%d, pair_match_log rows=%d removed", deletedWallet, deletedPair)
		pool.Close()
	}()

	bs := buildBinaryServiceForE2E(pool)

	type scenario struct {
		name           string
		ruleEnabled    bool
		ratioMaxPct    float64
		left           int64
		right          int64
		expectMatch    bool
		expectMatched  int64
		expectCarryLeg string
		expectCarryBV  int64
	}

	scenarios := []scenario{
		{name: "rule_30_pct_20_80_FAIL", ruleEnabled: true, ratioMaxPct: 30, left: 20000, right: 80000, expectMatch: false},
		{name: "rule_30_pct_30_70_PASS", ruleEnabled: true, ratioMaxPct: 30, left: 30000, right: 70000, expectMatch: true, expectMatched: 30000, expectCarryLeg: "RIGHT", expectCarryBV: 40000},
		{name: "rule_30_pct_50_50_PASS", ruleEnabled: true, ratioMaxPct: 30, left: 50000, right: 50000, expectMatch: true, expectMatched: 50000, expectCarryLeg: "", expectCarryBV: 0},
		{name: "rule_40_pct_30_70_FAIL", ruleEnabled: true, ratioMaxPct: 40, left: 30000, right: 70000, expectMatch: false},
		{name: "rule_40_pct_40_60_PASS", ruleEnabled: true, ratioMaxPct: 40, left: 40000, right: 60000, expectMatch: true, expectMatched: 40000, expectCarryLeg: "RIGHT", expectCarryBV: 20000},
		{name: "rule_off_20_80_PASS", ruleEnabled: false, ratioMaxPct: 30, left: 20000, right: 80000, expectMatch: true, expectMatched: 20000, expectCarryLeg: "RIGHT", expectCarryBV: 60000},
		{name: "boundary_29_71_FAIL", ruleEnabled: true, ratioMaxPct: 30, left: 29, right: 71, expectMatch: false},
		{name: "boundary_30_70_PASS", ruleEnabled: true, ratioMaxPct: 30, left: 30, right: 70, expectMatch: true, expectMatched: 30, expectCarryLeg: "RIGHT", expectCarryBV: 40},
	}

	for _, sc := range scenarios {
		sc := sc
		t.Run(sc.name, func(t *testing.T) {
			setRatioConfig(t, ctx, pool, sc.ruleEnabled, sc.ratioMaxPct)
			setTreeBV(t, ctx, pool, userID, sc.left, sc.right)
			beforeWalletCount := walletMatchCount(t, ctx, pool, userID)

			orderRef := fmt.Sprintf("%s%s", runTag, sc.name)
			res, err := bs.matchPair(ctx, userID, orderRef, 10, 1, "E2E")
			if err != nil {
				t.Fatalf("matchPair err: %v", err)
			}

			postL, postR := readTreeBV(t, ctx, pool, userID)
			afterWalletCount := walletMatchCount(t, ctx, pool, userID)

			if sc.expectMatch {
				if res == nil {
					t.Fatalf("expected match but got nil (legs %d/%d, min=%v)", sc.left, sc.right, sc.ratioMaxPct)
				}
				if res.MatchedBV != sc.expectMatched {
					t.Fatalf("matched BV: got %d want %d", res.MatchedBV, sc.expectMatched)
				}
				if sc.expectCarryLeg == "" {
					if postL != 0 || postR != 0 {
						t.Fatalf("balanced match should consume both legs, got L=%d R=%d", postL, postR)
					}
				} else if sc.expectCarryLeg == "LEFT" {
					if postL != sc.expectCarryBV || postR != 0 {
						t.Fatalf("carry LEFT want %d/0 got %d/%d", sc.expectCarryBV, postL, postR)
					}
				} else {
					if postR != sc.expectCarryBV || postL != 0 {
						t.Fatalf("carry RIGHT want 0/%d got %d/%d", sc.expectCarryBV, postL, postR)
					}
				}
				t.Logf("PASS %s → matched=%d commission=%d level_bonus=%d carry=%s/%d wallet_match_rows %d→%d",
					sc.name, res.MatchedBV, res.Commission, res.LevelBonus,
					sc.expectCarryLeg, sc.expectCarryBV, beforeWalletCount, afterWalletCount)
			} else {
				if res != nil {
					t.Fatalf("expected NO match but got matched=%d (legs %d/%d min=%v)", res.MatchedBV, sc.left, sc.right, sc.ratioMaxPct)
				}
				if postL != sc.left || postR != sc.right {
					t.Fatalf("tree should be untouched, want %d/%d got %d/%d", sc.left, sc.right, postL, postR)
				}
				if afterWalletCount != beforeWalletCount {
					t.Fatalf("wallet_match rows changed on fail: %d→%d", beforeWalletCount, afterWalletCount)
				}
				t.Logf("BLOCK %s → no match, tree intact %d/%d, wallet untouched", sc.name, postL, postR)
			}
		})
	}
}

func envOrDefault(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func lookupUserBySponsor(ctx context.Context, pool *pgxpool.Pool, sponsor string) (string, error) {
	var id string
	err := pool.QueryRow(ctx, `SELECT user_id FROM networker_users WHERE sponsor_id=$1`, sponsor).Scan(&id)
	return id, err
}

type treeSnapshot struct {
	left  int64
	right int64
}

func snapshotTree(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) treeSnapshot {
	t.Helper()
	var s treeSnapshot
	if err := pool.QueryRow(ctx, `SELECT left_bv, right_bv FROM binary_tree WHERE user_id=$1`, userID).Scan(&s.left, &s.right); err != nil {
		t.Fatalf("snapshot tree: %v", err)
	}
	t.Logf("snapshot tree: L=%d R=%d", s.left, s.right)
	return s
}

func restoreTree(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string, s treeSnapshot) {
	t.Helper()
	if _, err := pool.Exec(ctx, `UPDATE binary_tree SET left_bv=$1, right_bv=$2 WHERE user_id=$3`, s.left, s.right, userID); err != nil {
		t.Fatalf("restore tree: %v", err)
	}
}

func setTreeBV(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string, l, r int64) {
	t.Helper()
	if _, err := pool.Exec(ctx, `UPDATE binary_tree SET left_bv=$1, right_bv=$2 WHERE user_id=$3`, l, r, userID); err != nil {
		t.Fatalf("set tree: %v", err)
	}
}

func readTreeBV(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) (int64, int64) {
	t.Helper()
	var l, r int64
	if err := pool.QueryRow(ctx, `SELECT left_bv, right_bv FROM binary_tree WHERE user_id=$1`, userID).Scan(&l, &r); err != nil {
		t.Fatalf("read tree: %v", err)
	}
	return l, r
}

type ratioCfg struct {
	enabled bool
	max     float64
}

func snapshotRatioConfig(t *testing.T, ctx context.Context, pool *pgxpool.Pool) ratioCfg {
	t.Helper()
	var enJSON, maxJSON []byte
	_ = pool.QueryRow(ctx, `SELECT config_value FROM commission_config WHERE config_key='ratio_rule_enabled'`).Scan(&enJSON)
	_ = pool.QueryRow(ctx, `SELECT config_value FROM commission_config WHERE config_key='ratio_rule_max'`).Scan(&maxJSON)
	var en struct{ Value bool `json:"value"` }
	var mx struct{ Value float64 `json:"value"` }
	_ = json.Unmarshal(enJSON, &en)
	_ = json.Unmarshal(maxJSON, &mx)
	t.Logf("snapshot config: enabled=%v max=%v", en.Value, mx.Value)
	return ratioCfg{enabled: en.Value, max: mx.Value}
}

func setRatioConfig(t *testing.T, ctx context.Context, pool *pgxpool.Pool, enabled bool, maxPct float64) {
	t.Helper()
	en, _ := json.Marshal(map[string]any{"value": enabled})
	mx, _ := json.Marshal(map[string]any{"value": maxPct})
	if _, err := pool.Exec(ctx, `UPDATE commission_config SET config_value=$1::jsonb, updated_at=NOW() WHERE config_key='ratio_rule_enabled'`, en); err != nil {
		t.Fatalf("set enabled: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE commission_config SET config_value=$1::jsonb, updated_at=NOW() WHERE config_key='ratio_rule_max'`, mx); err != nil {
		t.Fatalf("set max: %v", err)
	}
}

func restoreRatioConfig(t *testing.T, ctx context.Context, pool *pgxpool.Pool, cfg ratioCfg) {
	t.Helper()
	setRatioConfig(t, ctx, pool, cfg.enabled, cfg.max)
}

func walletMatchCount(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM wallet_ledger WHERE user_id=$1 AND source IN ('BINARY_MATCH','LEVEL_BONUS')`, userID).Scan(&n); err != nil {
		t.Fatalf("count wallet: %v", err)
	}
	return n
}

func snapshotTodayBinary(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string) int64 {
	t.Helper()
	var v int64
	if err := pool.QueryRow(ctx, `SELECT today_binary_earned FROM networker_users WHERE user_id=$1`, userID).Scan(&v); err != nil {
		t.Fatalf("snapshot today_binary: %v", err)
	}
	return v
}

func restoreTodayBinary(t *testing.T, ctx context.Context, pool *pgxpool.Pool, userID string, v int64) {
	t.Helper()
	if _, err := pool.Exec(ctx, `UPDATE networker_users SET today_binary_earned=$1 WHERE user_id=$2`, v, userID); err != nil {
		t.Fatalf("restore today_binary: %v", err)
	}
}

func deleteRowsByRefPrefix(t *testing.T, ctx context.Context, pool *pgxpool.Pool, prefix string) int64 {
	t.Helper()
	tag, err := pool.Exec(ctx, `DELETE FROM wallet_ledger WHERE reference_id LIKE $1`, prefix+"%")
	if err != nil {
		t.Fatalf("delete wallet by prefix: %v", err)
	}
	return tag.RowsAffected()
}

func deletePairLogByOrderPrefix(t *testing.T, ctx context.Context, pool *pgxpool.Pool, prefix string) int64 {
	t.Helper()
	tag, err := pool.Exec(ctx, `DELETE FROM pair_match_log WHERE order_reference LIKE $1`, prefix+"%")
	if err != nil {
		t.Fatalf("delete pair_match_log by prefix: %v", err)
	}
	return tag.RowsAffected()
}

func buildBinaryServiceForE2E(pool *pgxpool.Pool) *BinaryService {
	treeRepo := repository.NewTreeRepo(pool)
	bvRepo := repository.NewBVRepo(pool)
	pairRepo := repository.NewPairRepo(pool)
	ledgerRepo := repository.NewLedgerRepo(pool)
	userRepo := repository.NewUserRepo(pool)
	configRepo := repository.NewConfigRepo(pool)
	heldIncomeRepo := repository.NewHeldIncomeRepo(pool)
	levelBonusService := NewLevelBonusService(configRepo, pairRepo)
	activationService := NewActivationService(pool, userRepo, ledgerRepo, heldIncomeRepo)
	return NewBinaryService(pool, treeRepo, bvRepo, pairRepo, ledgerRepo, userRepo, configRepo, levelBonusService, activationService)
}
