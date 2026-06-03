# Changelog

Task log for this repo. After every completed task, append a new block **at the end of this file** (see `.cursor/rules/faizan-changelog.mdc`).

---

## [19-04-2026 20:45] — run frontends + backend locally

**What changed:** Started Admin and User frontends locally (Next.js dev) and ran the Go backend locally with `go run ./cmd/server`. Verified frontends on ports 4006 (Admin) and 4005 (User). Verified backend responding on port 3100.

**Files touched:** None (local dev run; no source edits)

**API endpoints used:** `GET /`, `GET /health` (probes)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 02:16] — faizan-changes + changelog rule

**What changed:** Added `faizan-changes/changelog.md` and Cursor rule to require appending this format after every task.

**Files touched:** `faizan-changes/changelog.md`, `.cursor/rules/faizan-changelog.mdc`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 02:28] — Wallet-related APIs from OpenAPI (answer)

**What changed:** None — documented which `openapi.yml` paths relate to wallet / payout / P2P and noted `/p2p/*` vs `/api/v1/p2p/*` mismatch.

**Files touched:** None

**API endpoints used:** None (reference-only: OpenAPI paths listed in chat)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 02:27] — Wallet screen API integration (User app)

**What changed:** Added `use-wallet-data` hook (`/wallets`, `/me` for platform wallet, merged DIRECT+TEAM ledgers); rewrote `/wallet` page (no dummy); zeroed legacy `walletData`, removed mock `transactions`; sidebar `apiWired` for wallet; OpenAPI ledger description + `page`/`limit` query params.

**Files touched:** `Frontend/User/src/hooks/use-wallet-data.ts`, `Frontend/User/src/app/wallet/page.tsx`, `Frontend/User/src/lib/dummy-data.ts`, `Backend/API/docs/openapi.yml`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/wallets`, `GET /api/v1/me`, `GET /api/v1/wallets/DIRECT/ledger`, `GET /api/v1/wallets/TEAM/ledger` (documented / used from User app)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 02:35] — Fix Radix asChild “Children.only” on wallet page

**What changed:** Compacted `Button asChild` + `Link` so no whitespace text node is a sibling of `Link`; `Button` skips auto `Loader2` when `asChild` is true so `Slot` always gets one child.

**Files touched:** `Frontend/User/src/app/wallet/page.tsx`, `Frontend/User/src/components/ui/button.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 02:42] — Button asChild: Slot renders only children

**What changed:** Refactored `Button` so `asChild` uses a dedicated `<Slot>{children}</Slot>` branch (no conditional sibling before `children`); non–asChild uses native `<button>` with optional `Loader2`.

**Files touched:** `Frontend/User/src/components/ui/button.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 16:05] — Package screen: live APIs + OpenAPI list

**What changed:** User `/package` loads tiers from `GET /api/v1/packages` and current context from `GET /api/v1/me`, renews via `POST /api/v1/packages/renew` (`use-package-data` hook); removed mock `packages` / `Package` type from `dummy-data`; sidebar marks Package as wired; documented `GET /api/v1/packages` in OpenAPI next to renew.

**Files touched:** `Frontend/User/src/hooks/use-package-data.ts`, `Frontend/User/src/app/package/page.tsx`, `Frontend/User/src/lib/dummy-data.ts`, `Backend/API/docs/openapi.yml`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/packages`, `GET /api/v1/me`, `POST /api/v1/packages/renew`

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 16:45] — Local DB: seed wallet + withdrawal schedule

**What changed:** On local Docker Postgres (`127.0.0.1:5434`, DB `fmcg_binary`): inserted `wallet_ledger` credits for `admin@fmcgbinary.local` (₹5,000 DIRECT + ₹2,000 TEAM via `ADMIN_ADJUSTMENT`); relaxed `payout_config` (IST 0–24, all days 1–31) so withdrawal rules do not block ad-hoc testing.

**Files touched:** `faizan-changes/changelog.md` (database only)

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 17:15] — DB: transaction password `123456` (bcrypt)

**What changed:** Updated `networker_users.transaction_password_hash` to a bcrypt hash of `123456` for every user in local Docker Postgres (currently only `admin@fmcgbinary.local`).

**Files touched:** `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 17:55] — HTTP debug: structured req/resp bodies in terminal

**What changed:** Added `middleware.HTTPDebug` (pretty JSON + redacted secrets, multipart skipped, 64KB cap) and `Config.HTTPDebugLog` driven by `HTTP_DEBUG_LOG` or default-on when `APP_ENV` is not `production`; wired in `cmd/server/main.go` before Fiber access logger.

**Files touched:** `Backend/API/internal/middleware/http_debug.go`, `Backend/API/config/config.go`, `Backend/API/cmd/server/main.go`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 03:08] — DB: approve pending payout (dev)

**What changed:** Completed payout `2f5c8877-d531-4dd0-b181-090f87327594` (DIRECT ₹1,000 gross): `wallet_ledger` WITHDRAWAL debit + `payout_requests` → `COMPLETED` (`sc_tx_reference=manual-dev-approve`) so another withdrawal can be requested (no SecureCoin call).

**Files touched:** `faizan-changes/changelog.md` (database only)

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 03:35] — Withdraw: modal request + full-width history table

**What changed:** User `/withdraw`: new withdrawal form opens in a Radix `Dialog`; schedule moved to a summary card with refresh; withdrawal history is a full-width table (gross / fees / net / status / processed / reference / note) with horizontal scroll and row hover.

**Files touched:** `Frontend/User/src/components/ui/dialog.tsx`, `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None (UI only)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 03:50] — Dialog: solid surface + readable withdrawal fields

**What changed:** `Dialog` overlay darker without blur; panel uses opaque `bg-background-secondary`; description uses `text-text-secondary`; withdrawal modal inner blocks/inputs use `bg-background`, stronger borders, and clearer placeholder/helper contrast.

**Files touched:** `Frontend/User/src/components/ui/dialog.tsx`, `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:05] — Select: z-index above Dialog

**What changed:** `SelectContent` default `z-50` → `z-[200]` so portaled options render above `Dialog` (`z-120`); fixes wallet dropdown not opening visibly inside the withdrawal modal.

**Files touched:** `Frontend/User/src/components/ui/select.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:20] — Withdraw: schedule card → dates-only note

**What changed:** Removed the large “Schedule (from API)” card; replaced with a compact info strip listing allowed calendar dates (main vs team when they differ) plus “Refresh rules”.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None (still uses schedule from existing hook)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:35] — Withdraw note: blocked dates only

**What changed:** Info strip now lists only **blocked** calendar days (complement of API allowed lists for days 1–31); when nothing is blocked, shows a short “no blocked dates” message; removed duplicate `blockedCalendarDays` helper.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:50] — Withdraw note: always show not-allowed dates value

**What changed:** Note label is explicit (“Calendar dates when withdrawal is not allowed”); blocked list always includes a visible value — **`None`** when every day 1–31 is allowed, otherwise comma-separated day numbers; clearer Main/Team lines when rules differ.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:05] — Withdraw note: API allowed dates only (e.g. 10, 20, 30)

**What changed:** Info strip shows only **allowed** calendar dates from the schedule API (comma-separated); removed blocked-date complement helpers.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:20] — Payout config: restore 10/20/30 + shorter withdraw note

**What changed:** Local Postgres `payout_config` reset `withdrawal_allowed_dates_*` from test `1–31` back to `[10, 20, 30]` (matches seed); withdraw info strip copy shortened so the date list is the focus.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md` (DB updated on dev instance)

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:40] — Withdraw history: client-side filters

**What changed:** Withdrawal history table toolbar — status, wallet, requested date range, text search; `filterPayoutsLocal` + `useMemo`; badge when filters active; clear + invalid status reset on page change; note that filters apply to current page only (no API changes).

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 06:15] — Withdraw filters: visible calendar icon on date inputs

**What changed:** Requested-from / requested-to filters use a `DateFilterInput` with a Lucide `Calendar` button that opens the native date picker (`showPicker()` / `click()` fallback); native webkit calendar indicator hidden via CSS so only the custom icon shows.

**Files touched:** `Frontend/User/src/app/withdraw/page.tsx`, `Frontend/User/src/app/globals.css`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 07:45] — Reusable page filter bar (User app)

**What changed:** Added `@/components/filters` — `PageFilterBar` (header + grid + optional clear/footer), `FilterField` (label + slot, optional `htmlFor`), `DateFilterField` (native date + calendar button), and `PAGE_FILTER_CONTROL_CLASS` for consistent control styling. Withdraw history wired to these exports.

**Files touched:** `Frontend/User/src/components/filters/page-filter-bar.tsx`, `Frontend/User/src/components/filters/index.ts`, `Frontend/User/src/app/withdraw/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 08:30] — Package screen: active package + daily binary cap cards

**What changed:** Replaced the single summary strip with two side-by-side cards — active package (lifetime direct/binary usage vs caps from `/api/v1/me` plus tier multipliers) and today's binary cap with progress; Hinglish footers; `PackageProfileSlice` extended for cap/earnings fields. New `PackageInsightCards` component.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `Frontend/User/src/hooks/use-package-data.ts`, `Frontend/User/src/app/package/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/me` (existing fields: `total_direct_earned`, `max_direct_cap`, `today_binary_earned`, `daily_binary_cap`, etc.)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 09:05] — Package insight cards: circular gauges + gradient UI

**What changed:** Active package + daily binary cards redesigned — SVG ring gauges (lifetime direct/binary %, today binary %), gradient meter bar, radial highlights, icon glow rings, LIVE pulse; glassy inner panels. Outer shell uses `role="article"` divs so styles are not dropped by `Card` className handling.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 09:35] — Package insights: single card (binary under active package)

**What changed:** Merged the two side-by-side cards into one unified “Active package” panel: shared header + explainer line, then two subsections (“Lifetime income caps” | “Today’s binary cap” with timer + LIVE), combined footer (Lifetime / Aaj ki binary). Loading skeleton is a single block.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 10:00] — Package insight card: text alignment + footer rhythm

**What changed:** Header uses a 3-column grid on `sm+` so the ACTIVE badge lines up with the title row; explainer tightened (`mt-1.5`, `max-w-prose`). Lifetime panel has symmetric horizontal padding and wider gap between rings. Today’s binary column centers the ₹ / reset lines with the ring + meter (`mx-auto max-w-sm` panel). Column split uses `lg:pr-8` / `lg:pl-8`. Footer uses `!flex-col`, explicit `pt-5 pb-5` to override `CardFooter` defaults, `text-left` + `text-pretty` on copy.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 10:25] — Package insight: partitioned inner box + full-height divider

**What changed:** Middle metrics sit in one rounded shell with a stronger `lg:border-r` / mobile `border-b` between columns; both sides use `h-full` + matching `min-h` inner panels (`flex-1`) so lifetime and today-binary areas align in height; orange panel fills the right partition.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 10:45] — Lifetime caps: symmetric columns + divider

**What changed:** Direct/binary lifetime metrics share a `LifetimeCapColumn` layout (ring → “Lifetime usage” → amount) matching the binary-cap column rhythm; `divide-x` between halves; fixed `min-h` on amount lines for equal text blocks; ring SVG glow per side.

**Files touched:** `Frontend/User/src/components/package/package-insight-cards.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 19:00] — Base64 encoded referral link format

**What changed:** Invite link now uses Base64-encoded query param format (`?r=<base64>`) instead of path-based format. Payload is `leg=${leg}&id=${sponsorId}` encoded with `btoa()`. Base URL updated to `https://securemart.co.in/signup` (overridable via `NEXT_PUBLIC_REFERRAL_BASE_URL`).

**Files touched:** `Frontend/User/src/app/invite/page.tsx`

**API endpoints used:** None

**Breaking change:** YES — old `/ref/left/ID` links no longer generated

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:36] — Income page: live APIs + OpenAPI ledger docs

**What changed:** User `/income` uses `useIncomeData` (`GET /api/v1/me` for totals, `GET /api/v1/wallets/DIRECT/ledger` + `TEAM/ledger` for tab rows and filtered sums); removed income mocks from `dummy-data`; sidebar marks Income as wired; OpenAPI documents paginated ledger envelope and Income-page filtering; `apiGetJson` surfaces Fiber `error` when `message` is absent.

**Files touched:** `Frontend/User/src/hooks/use-income-data.ts`, `Frontend/User/src/app/income/page.tsx`, `Frontend/User/src/lib/dummy-data.ts`, `Backend/API/docs/openapi.yml`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/me`, `GET /api/v1/wallets/DIRECT/ledger`, `GET /api/v1/wallets/TEAM/ledger`

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:37] — Income hero: drop internal API copy

**What changed:** Replaced the Income details subtitle that mentioned wallet ledger and `/me` paths with a short user-facing line (“Track all your earnings and commissions.”).

**Files touched:** `Frontend/User/src/app/income/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:39] — Income: date filter drives cards + full ledger paging

**What changed:** Statement period (7d/30d/90d/all) now drives all four summary figures and matches each tab’s rows; ledgers load all pages (capped) instead of first page only; removed `/me` and internal hints; clearer period selector and empty copy; OpenAPI income notes updated.

**Files touched:** `Frontend/User/src/hooks/use-income-data.ts`, `Frontend/User/src/app/income/page.tsx`, `Backend/API/docs/openapi.yml`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/wallets/DIRECT/ledger`, `GET /api/v1/wallets/TEAM/ledger`

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:41] — Income: shared PageFilterBar + FilterField

**What changed:** Statement period UI now uses `PageFilterBar`, `FilterField`, and `PAGE_FILTER_CONTROL_CLASS` (same pattern as withdraw history); “Reset period” clears selection back to last 30 days; dropdown `z-[220]` for stacking.

**Files touched:** `Frontend/User/src/app/income/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:43] — Income: client search + status filters

**What changed:** Added **Search From** (matches description / “From” text and level number) and **Status** (all / completed / pending) with table + CSV export using filtered rows; **Clear filters** resets period, search, and status; row count hint in filter footer; separate empty copy when the period has rows but filters hide them; removed redundant sublines under summary cards (including total earnings).

**Files touched:** `Frontend/User/src/app/income/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:45] — Income: filter row + tabs + table alignment

**What changed:** Replaced `PageFilterBar` footer layout with a compact income-only strip: three controls share a 6-col grid (equal thirds on large screens), **Clear filters** sits on the same row as controls on desktop; tab list uses **equal-width** three-column grid; income table uses **`table-fixed`**, **colgroup** widths, **tabular-nums**, and **break-words** on From for predictable columns.

**Files touched:** `Frontend/User/src/app/income/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:52] — Rank page: blur + Coming soon overlay

**What changed:** `/rank` main content is wrapped in a relative shell with a blurred preview underneath and a full-area **backdrop-blur** layer plus centered “Coming soon” card; `cn` now imported from `@/lib/utils` (removed duplicate helper).

**Files touched:** `Frontend/User/src/app/rank/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:51] — QA: docker psql sample rows for Income ledger

**What changed:** Ran documented `docker exec … psql` inserts into `wallet_ledger` (DIRECT direct commission + TEAM binary + TEAM level) for local verification; no app code changes.

**Files touched:** `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 04:47] — FilterField + income filters: baseline alignment

**What changed:** `FilterField` uses a stretched column layout with **`mt-auto`** on the control slot so labels sit on one line and inputs share a common baseline in grid rows; labels use consistent **`block` / `leading-4` / `min-h`**. Income filters use **`lg:grid-cols-3`** (equal thirds), **`lg:items-stretch`**, explicit **`h-10 py-0`** on selects/input, and **Clear filters** wrapped in **`items-end`** for bottom alignment.

**Files touched:** `Frontend/User/src/components/filters/page-filter-bar.tsx`, `Frontend/User/src/app/income/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:02] — Start backend API locally (go run)

**What changed:** None in repo — started `go run ./cmd/server` from `Backend/API` (background); API listening on **3100** with Postgres/Redis connected.

**Files touched:** `faizan-changes/changelog.md`

**API endpoints used:** None (process start only)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:00] — Support page: blur + Coming soon overlay

**What changed:** `/support` uses the same pattern as `/rank`: blurred page shell underneath, full-area **backdrop-blur** scrim, centered “Coming soon” card with Support-specific copy.

**Files touched:** `Frontend/User/src/app/support/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 05:10] — Profile OTP panel: show dev code on screen

**What changed:** After Send OTP on profile **email** and **mobile** edit flows, `OtpInlinePanel` matches the reference layout (icon + “Enter the 6-digit code”, gray dev-mode line, amber **`dev code:`** line); console logging kept; invalid code shows in red under the dev block.

**Files touched:** `Frontend/User/src/app/profile/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 06:05] — Fix registry HTTP 524 on multi-arch push

**What changed:** Documented that HTTP 524 during `docker buildx --push` is typically Cloudflare timing out large parallel layer uploads to Harbor; updated `Infra/scripts/build-and-push.sh` to push each CPU architecture sequentially, merge with `docker buildx imagetools create`, disable provenance/SBOM blobs, and retry failed pushes with backoff. Optional `DOCKER_PLATFORMS=linux/amd64` if the registry still times out.

**Files touched:** `Infra/scripts/build-and-push.sh`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [18-04-2026 06:45] — Dedicated Ingress for Binary API host

**What changed:** Added `Infra/k8s/10-ingress-binary-api.yaml` (`fmcg-binary-api`) routing `api-binary.securepharma.co.in` to service `fmcg-binary-backend-api:3100`. Removed that host from `09-ingress-service.yaml` so the API is not duplicated on the combined `fmcg-binary` ingress. `deploy.sh` now applies `10-ingress-binary-api.yaml` after `09`. Applied to cluster `secure-fmcg`.

**Files touched:** `Infra/k8s/10-ingress-binary-api.yaml`, `Infra/k8s/09-ingress-service.yaml`, `Infra/scripts/deploy.sh`, `faizan-changes/changelog.md`

**API endpoints used:** `kubectl apply` (cluster)

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [20-04-2026 15:44] — Prod Income “From” shows payer name

**What changed:** Fixed production Income “From” column by enriching wallet ledger rows with `payer_name` (derived from `reference_id` → `bv_ledger.order_reference` → `source_user_id` → `networker_users.full_name`). Also improved commission credit descriptions for new rows, made DB migrations re-runnable (idempotent) to stop `db-migrate` pods failing on redeploys, consolidated build/push script to auto-bump tags + update YAMLs, and rolled out updated images (`1.0.7` → `1.0.9` API).

**Files touched:** `Backend/API/internal/models/wallet.go`, `Backend/API/internal/repository/ledger_repo.go`, `Backend/API/internal/services/commission_service.go`, `Backend/API/internal/services/binary_service.go`, `Backend/Database/001_enums.sql`, `Backend/Database/002_networker_users.sql`, `Backend/Database/003_packages.sql`, `Backend/Database/004_binary_tree.sql`, `Backend/Database/005_wallet_ledger.sql`, `Backend/Database/006_bv_ledger.sql`, `Backend/Database/007_pair_matching.sql`, `Backend/Database/008_config.sql`, `Backend/Database/009_payouts.sql`, `Backend/Database/010_api_keys.sql`, `Backend/Database/011_audit_logs.sql`, `Infra/scripts/build-and-push.sh`, `Infra/scripts/deploy.sh`, `Infra/k8s/06-backend-api.yaml`, `Infra/k8s/07-networker-frontend.yaml`, `Infra/k8s/08-admin-frontend.yaml`

**API endpoints used:** `GET /api/v1/wallets/{DIRECT|TEAM}/ledger`

**Breaking change:** NO

**Branch:** faizan-dev-user-integration

---

## [03-06-2026 10:51] — Start User frontend dev server

**What changed:** Started the User frontend locally with `npm run dev:4005` (Next.js 16.2.4 on http://localhost:4005).

**Files touched:** None

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 10:58] — Start backend API locally

**What changed:** Started Docker Desktop, brought up Postgres (`fb-postgres` on 5434) and Redis (`fb-redis` on 6381) via `docker compose up -d postgres redis`, then ran the Go API with `go run ./cmd/server` (localhost DB/Redis overrides). Verified health at http://localhost:3100/health.

**Files touched:** None

**API endpoints used:** `GET /health`

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:05] — Stop duplicate User frontend dev server

**What changed:** Terminated existing Next.js dev process (PID 11156) on port 4005 via `taskkill /PID 11156 /F`.

**Files touched:** None

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:15] — Local networker passwords 1–8 plain text

**What changed:** Updated all 119 `NETWORKER` rows in local Postgres (`fb-postgres`) so `password_hash` is plain text `1`–`8`, cycling by SPF number: SPF00001→`1`, … SPF00008→`8`, SPF00009→`1`, etc.

**Files touched:** None (DB only)

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:17] — All networker passwords 12345678 plain text

**What changed:** Set `password_hash` to plain text `12345678` for all 119 `NETWORKER` users in local Postgres (`fb-postgres`).

**Files touched:** None (DB only)

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:24] — Local .env DB/Redis hosts for host go run

**What changed:** Updated `Backend/API/.env` to match local pgAdmin/Docker port mapping: `DB_HOST=localhost`, `DB_PORT=5434`, `REDIS_HOST=localhost`, `REDIS_PORT=6381` (fixes `lookup postgres: no such host` when running `go run ./cmd/server` on Windows).

**Files touched:** `Backend/API/.env`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:25] — Free port 3100 and restart go run backend

**What changed:** Resolved `bind: Only one usage of each socket address` on 3100 by stopping Docker `fb-backend` and terminating stale `server.exe` (PID 21976), then started `go run ./cmd/server` with updated local `.env`.

**Files touched:** `faizan-changes/changelog.md`

**API endpoints used:** `GET /health`

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 11:57] — Frontend User demo mode (no API)

**What changed:** Removed all backend API calls from `Frontend/User`: hooks and auth now load from `src/lib/mock-api-data.ts` and `dummy-data.ts`; login/add-user/profile mutations simulate success locally; removed Next.js `/api` proxy rewrites. Backend untouched.

**Files touched:** `Frontend/User/src/lib/mock-api-data.ts`, `Frontend/User/src/stores/useAuthStore.ts`, `Frontend/User/src/hooks/use-*.ts(x)`, `Frontend/User/src/app/add-user/page.tsx`, `Frontend/User/src/lib/dummy-data.ts`, `Frontend/User/src/lib/api-base.ts`, `Frontend/User/next.config.mjs`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 12:05] — Remove login gate and JWT from User app

**What changed:** Demo user auto-loaded on start (no login screen); removed `accessToken`/`refreshToken`, Zustand persist, and auth redirect; `/login` redirects to `/`; cleared legacy `fmcg-binary-auth` localStorage.

**Files touched:** `Frontend/User/src/stores/useAuthStore.ts`, `Frontend/User/src/components/layout/app-layout.tsx`, `Frontend/User/src/app/login/page.tsx`, `Frontend/User/src/hooks/use-*.ts(x)`, `Frontend/User/src/hooks/use-auth-hydrated.ts` (deleted), `Frontend/User/src/app/add-user/page.tsx`, `Frontend/User/src/components/layout/header.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 13:46] — Restart backend API on port 3100

**What changed:** Stopped prior process on port 3100 and restarted `go run ./cmd/server`; health check returns ok.

**Files touched:** `faizan-changes/changelog.md`

**API endpoints used:** `GET /health`

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 12:11] — Local dev ports 4001 (User) and 4002 (Admin)

**What changed:** Set `npm run dev` to `next dev -p 4001` for `Frontend/User` and `-p 4002` for `Frontend/Admin`; started both dev servers locally.

**Files touched:** `Frontend/User/package.json`, `Frontend/Admin/package.json`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 12:15] — Admin demo mode: skip login, no API

**What changed:** Admin app already used `lib/mock-data.ts` only; removed login screen (redirect `/login` → `/dashboard`), sign-out stays on dashboard, and cleaned backend/API copy in mock data and packages UI.

**Files touched:** `Frontend/Admin/app/(auth)/login/page.tsx`, `Frontend/Admin/components/layout/app-layout.tsx`, `Frontend/Admin/lib/mock-data.ts`, `Frontend/Admin/app/(dashboard)/packages/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** None

**Breaking change:** NO

**Branch:** N/A (not a git repository)

---

## [03-06-2026 14:30] — Dashboard KPIs wired to API (no mock)

**What changed:** Replaced dashboard mock data with live API calls: `GET /api/v1/me` for profile, wallets, package, binary cap, and referrals; paginated `GET /api/v1/wallets/DIRECT|TEAM/ledger` for earnings KPIs and chart; `GET /api/v1/tree` for binary side counts/volume. Added `dashboard-api.ts` / `dashboard-types.ts`. Ledger amounts converted paise → rupees for StatCard/chart. Dashboard page display uses `paiseToRupees` for wallets, caps, and progress bars.

**Files touched:** `Frontend/User/src/lib/dashboard-api.ts`, `Frontend/User/src/lib/dashboard-types.ts`, `Frontend/User/src/hooks/use-dashboard-data.ts`, `Frontend/User/src/app/page.tsx`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/me`, `GET /api/v1/wallets/DIRECT/ledger`, `GET /api/v1/wallets/TEAM/ledger`, `GET /api/v1/tree`

**Breaking change:** NO

**Branch:** zoya-dev

---

## [03-06-2026 15:00] — Income page API integration (no mock)

**What changed:** Income page loads commission history from paginated wallet ledgers instead of `mock-api-data`. Direct tab uses `DIRECT` wallet (`DIRECT_COMMISSION`, `FRANCHISE_COMMISSION`); Binary/Level tabs use `TEAM` wallet (`BINARY_MATCH`, `LEVEL_BONUS`). KPI totals and tables filter by statement period client-side. Ledger normalizer now includes `payer_name` from API.

**Files touched:** `Frontend/User/src/hooks/use-income-data.ts`, `Frontend/User/src/lib/dashboard-api.ts`, `Frontend/User/src/lib/dashboard-types.ts`, `faizan-changes/changelog.md`

**API endpoints used:** `GET /api/v1/wallets/DIRECT/ledger`, `GET /api/v1/wallets/TEAM/ledger`

**Breaking change:** NO

**Branch:** zoya-dev

---
