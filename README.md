# FMCG-Binary

Binary MLM commission, wallet, and payout service that is **called by the FMCG (Secure-Mart) platform**.

---

## Components

| Component | Path | Stack |
|---|---|---|
| Backend API | `Backend/API` | Go (GoFiber), PostgreSQL, Redis |
| Database migrations | `Backend/Database` | SQL init scripts (fresh-DB, no incremental migrations) |
| FMCG simulator | `Testing/fmcg-simulator` | Express.js |
| E2E tests | `Testing/` | Python 3, Bash |
| Frontend | `Frontend/` | Next.js |

All monetary values are stored in **paise** (1 INR = 100 paise).

---

## Quickstart

### 1. Start Postgres + Redis

```bash
cd FMCG-Binary/Backend/API
docker compose down -v
docker compose up -d postgres redis
sleep 8
```

### 2. Seed admin password (dev only)

The bootstrap admin row is created with `password_hash = SYSTEM_ACCOUNT_NO_LOGIN`.
For local testing set a bcrypt hash for password `admin123`:

```bash
docker exec fb-postgres psql -U fmcg_binary -d fmcg_binary -c \
  "UPDATE networker_users SET password_hash = '\$2a\$10\$sKWPw0kPZzDF0c4yMJDny.svSCbMyZhSXvJqRGW9kdBT0u5WNLOtu' WHERE user_id = '00000000-0000-0000-0000-000000000001';"
```

### 3. Build and run backend

```bash
cd FMCG-Binary/Backend/API
go build -o fb-server ./cmd/server
./fb-server
```

Health: `curl http://localhost:3100/health`

### 4. Run FMCG simulator (optional)

```bash
cd FMCG-Binary/Testing/fmcg-simulator
npm i && node index.js
```

Health: `curl http://localhost:3200/health`

---

## Authentication

### Networker / Admin APIs

JWT Bearer token:

```
Authorization: Bearer <access_token>
```

Obtain via `POST /api/v1/auth/login` with `{email, password}`.

### FMCG Platform APIs

API Key + Secret headers:

```
X-API-Key: fmcg-dev-key-change-me
X-API-Secret: fmcg-dev-secret-change-me
```

---

## Sponsor ID (SPF scheme)

Every networker gets a human-readable **sponsor_id** like `SPF00001`, auto-incremented via a Postgres sequence. The internal relationship uses `sponsor_user_id` (UUID). Both forms are accepted in API inputs.

---

## User Lifecycle

```
                        ┌───────────────────────┐
 FMCG signup            │  PENDING_PLACEMENT    │
 (no leg)               │  (no binary_tree row) │
        ─────────────►  │                       │
                        └──────────┬────────────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             │ Sponsor decides     │ 48h timeout          │ Sponsor INACTIVE
             │ (left/right)        │ (auto weaker leg)    │ at signup time
             ▼                     ▼                      ▼
        ┌──────────┐          ┌──────────┐          ┌──────────┐
        │  PLACED  │          │  PLACED  │          │  PLACED  │
        │(APPROVED)│          │(AUTO_PL) │          │(immediate│
        └──────────┘          └──────────┘          └──────────┘
```

- **Dashboard signup** (`POST /users/create` with JWT): always placed immediately with chosen leg.
- **FMCG signup** (`POST /fmcg/users/register` with API key):
  - **With `leg` field**: placed immediately (backwards compatible).
  - **Without `leg` field**: enters `PENDING_PLACEMENT` for up to 48h.

### Placement hold rules

1. Sponsor gets a `placement_request` viewable at `GET /me/placement-requests`.
2. Sponsor decides via `POST /me/placement-requests/:id/decide {leg}`.
3. If no action within 48h, background worker auto-places on the **weaker subtree** (cumulative BV of left subtree vs right subtree).
4. If sponsor is INACTIVE/BLOCKED at signup time, user is immediately auto-placed.
5. Admin can force-decide via `POST /admin/placement-requests/:id/decide`.
6. During `PENDING_PLACEMENT`:
   - **Direct commissions** flow normally to sponsor.
   - **Binary BV** is parked in `pending_bv_hold` table (not distributed to any upline).
   - Once placed, all held BV rows are replayed through `DistributeBVAndMatch`, so all uplines (including sponsor) receive delayed binary + level bonuses (caps respected).

### Active / Inactive status

- User becomes `INACTIVE` only if manually blocked by an admin. There are no lifetime earning caps that expire a user.
- `ACTIVE` users earn as long as daily binary cap allows.
- Monthly shopping gate (see below) can **hold** new income but does not flip the status to INACTIVE.

---

## Commission Rules

### 1. Direct Commission

| Field | Value |
|---|---|
| Trigger | Any purchase by a user whose sponsor is ACTIVE |
| Percentage | 10% of BV (configurable: `direct_commission_percent`) |
| Wallet | Direct wallet |
| Cap | **None** — no lifetime cap. Monthly shopping gate may hold credits when monthly income > ₹25,000. |

### 2. Binary Pair Matching

| Field | Value |
|---|---|
| Trigger | Networker purchase; BV flows up the binary tree to all ancestors |
| Match | min(left_unmatched_bv, right_unmatched_bv) at each ancestor |
| Commission | 10% of matched BV (configurable: `binary_match_percent`) |
| Level bonus | Additional % based on pair count (see Level Bonus table) |
| Wallet | Team wallet |
| Cap — lifetime | **None** (removed in v2) |
| Cap — daily | Package-specific (`daily_binary_cap`) — only this much binary income is **paid per day**; anything above is **forfeited** (not banked for tomorrow) |
| Carry forward (BV) | Unmatched **BV** on legs stays on the stronger side for future matches (unless BV flush is enabled). This is **not** "extra daily income" rolling over — daily cap excess is lost. |

### 3. Level Bonus (on top of binary match)

| Pair # | Bonus % | Max Level |
|--------|---------|-----------|
| 1 | 2.50% | 1 |
| 2 | 2.50% | 2 |
| 3 | 2.50% | 3 |
| 4 | 3.00% | 4 |
| 5 | 3.00% | 5 |
| 6 | 3.50% | 6 |
| 7 | 3.50% | 7 |
| 8 | 4.00% | 8 |
| 9 | 4.00% | 9 |
| 10 | 5.00% | 10 |

### 4. Franchise Commission

| Field | Value |
|---|---|
| Trigger | Purchase from a franchise whose sponsor is a networker |
| Percentage | 10% of BV (configurable: `franchise_commission_percent`) |
| Wallet | Sponsor's direct wallet |

---

## Cap & Limit System

| Cap | Calculation | Scope |
|-----|-------------|-------|
| ~~Max direct cap~~ | Removed in v2 | — |
| ~~Max binary cap~~ | Removed in v2 | — |
| Daily binary cap | Fixed per package tier | Resets at 12:01 AM daily; **over-cap income is forfeited**, not deferred |
| Carry forward flush | Configurable: `never` / `weekly` / `monthly` | If enabled, unmatched **leg BV** resets (not wallet income) |

There is no lifetime cap. Users earn indefinitely, subject only to the daily binary cap and monthly shopping gate.

---

## Monthly Shopping Gate (v2 rule)

Introduced in **v2 (April 2026)**. Applies to all ACTIVE networkers.

| Condition | Outcome |
|-----------|---------|
| Monthly income (direct + binary + franchise + level) **≤ ₹25,000** | No restriction — all credits land normally |
| Monthly income **> ₹25,000** AND monthly shopping **≥ ₹2,500** | No restriction — all credits land normally |
| Monthly income **> ₹25,000** AND monthly shopping **< ₹2,500** | New credits are **HELD** (quarantined in `held_income` table) |

- **Release**: When the user's shopping in the same calendar month crosses ₹2,500, all `HELD` rows for that month are released atomically to their wallets.
- **Forfeit**: On the 1st of each month a cron job runs (12:05 AM) that marks all `HELD` rows from the previous month as `FORFEITED` — they are permanently lost.
- **Monthly counters** (`monthly_income_paise`, `monthly_shopping_paise`, `income_period_ym`) reset via lazy rollover on first write of a new month.
- The daily binary cap and the monthly shopping gate are **independent** — daily-cap excess is still forfeited even when the shopping gate is open.
- Non-networker purchases and admin accounts are never subject to the gate.

---

## Package Auto-Activation

When a networker makes a purchase on Secure-Mart, FMCG can call `/fmcg/packages/process` (or it happens automatically within `/fmcg/purchase` for `user_type=networker`):

| Scenario | Action | Effect |
|----------|--------|--------|
| Amount < smallest active tier | `none` | No changes |
| No current package | `activated` | Package set, `daily_binary_cap` updated, status → ACTIVE |
| Matched tier > current tier | `upgraded` | `daily_binary_cap` updated to higher tier |
| Matched tier ≤ current tier | `none` | No changes (no lifetime cap to extend) |
| Non-networker user | `none` | No changes |

Read-only tier lookup: `GET /fmcg/packages/match?amount=<paise>`

---

## Binary Placement & Spillover

- Each user has one binary tree node with LEFT and RIGHT children.
- When the chosen leg is already occupied, the system uses **BFS spillover** to find the first available slot down that subtree.
- Sponsor relationship is separate from placement: `sponsor_user_id` (who referred) vs `parent_id` in `binary_tree` (where placed).

---

## Background Workers

| Worker | Interval | Purpose |
|--------|----------|---------|
| Daily reset | 12:01 AM cron | Resets `today_binary_earned` and daily pair count to 0 |
| Monthly forfeit | 12:05 AM on 1st of month | Marks all prior-month `HELD` income rows as `FORFEITED` |
| Placement worker | Every 60s | Auto-places expired `PENDING` placement requests on weaker subtree |

---

## Config Keys (commission_config table)

| Key | Default | Description |
|-----|---------|-------------|
| `direct_commission_percent` | 10 | % of BV for direct commission |
| `binary_match_percent` | 10 | % of matched BV for binary commission |
| `franchise_commission_percent` | 10 | % of BV for franchise commission |
| `carry_forward_flush_enabled` | false | Whether to flush unmatched BV |
| `carry_forward_flush_period` | never | never / weekly / monthly |
| `ratio_rule_enabled` | false | Max ratio between legs |
| `ratio_rule_max` | 0 | Max ratio value |
| `placement_hold_hours` | 48 | Hours before auto-placement |
| `placement_weaker_by` | subtree_bv | Method for weaker-leg calculation |

---

## API Endpoints Summary

### FMCG Platform (API Key Auth)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/fmcg/users/register` | Register networker (with or without leg) |
| POST | `/api/v1/fmcg/users/sync` | Sync user profile |
| POST | `/api/v1/fmcg/purchase` | Process purchase + commissions + shopping gate |
| GET | `/api/v1/fmcg/users/:userId/check` | Check user info |
| GET | `/api/v1/fmcg/packages/match` | Read-only tier lookup |
| POST | `/api/v1/fmcg/packages/process` | Auto package activation |
| GET | `/api/v1/fmcg/users/lookup` | Full user snapshot (profile + package + wallets + KYC) |

### Networker (JWT Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/me` | Get profile (includes `monthly_income_paise`, `monthly_shopping_paise`) |
| GET | `/api/v1/wallets` | Get wallet balances |
| GET | `/api/v1/wallets/:type/ledger` | Get ledger entries |
| GET | `/api/v1/tree` | Get binary tree |
| GET | `/api/v1/commissions` | List commissions |
| POST | `/api/v1/users/create` | Create user (dashboard, immediate placement) |
| POST | `/api/v1/payouts/request` | Request payout |
| GET | `/api/v1/payouts` | List payouts |
| POST | `/api/v1/packages/renew` | Renew / upgrade package |
| GET | `/api/v1/me/placement-requests` | List pending placement requests |
| POST | `/api/v1/me/placement-requests/:id/decide` | Decide placement leg |

### Admin (JWT + Admin Role)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/v1/admin/config/packages` | List/create packages |
| PUT | `/api/v1/admin/config/packages/:id` | Update package |
| GET/PUT | `/api/v1/admin/config/commissions` | Commission config |
| GET/PUT | `/api/v1/admin/config/level-bonus` | Level bonus slabs |
| GET/PUT | `/api/v1/admin/config/payout` | Payout config |
| GET | `/api/v1/admin/users` | List all users |
| GET | `/api/v1/admin/payouts` | List all payouts |
| POST | `/api/v1/admin/payouts/:id/approve` | Approve payout |
| POST | `/api/v1/admin/payouts/:id/reject` | Reject payout |
| GET | `/api/v1/admin/placement-requests` | List all placement requests |
| POST | `/api/v1/admin/placement-requests/:id/decide` | Admin force-decide |

---

## E2E Tests

Each suite expects a **fresh database** (run `docker compose down -v && docker compose up -d postgres redis` + seed admin password before each):

```bash
# Core suite (59 assertions)
bash FMCG-Binary/Testing/e2e-test.sh

# Edge cases: 50 users (46 assertions)
python3 FMCG-Binary/Testing/e2e-edge-cases.py

# Cross-sync: dense (64 assertions)
python3 FMCG-Binary/Testing/e2e-cross-sync.py

# Auto package activation — v2 (no lifetime caps, activate/upgrade/none)
python3 FMCG-Binary/Testing/e2e-package-activation.py

# Monthly shopping gate — v2 edge cases
python3 FMCG-Binary/Testing/e2e-monthly-activation-rule.py

# Placement hold flow (46 assertions)
python3 FMCG-Binary/Testing/e2e-placement-hold.py
```
