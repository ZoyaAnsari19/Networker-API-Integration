-- ============================================================
-- Migration 001: Custom ENUM Types
-- FMCG-Binary MLM Platform
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('NETWORKER', 'ADMIN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tree_leg') THEN
    CREATE TYPE tree_leg AS ENUM ('LEFT', 'RIGHT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type') THEN
    CREATE TYPE wallet_type AS ENUM ('DIRECT', 'TEAM');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entry_type') THEN
    CREATE TYPE entry_type AS ENUM ('CREDIT', 'DEBIT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'commission_source') THEN
    CREATE TYPE commission_source AS ENUM (
      'DIRECT_COMMISSION',
      'BINARY_MATCH',
      'LEVEL_BONUS',
      'FRANCHISE_COMMISSION',
      'WITHDRAWAL',
      'ADMIN_ADJUSTMENT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reference_type') THEN
    CREATE TYPE reference_type AS ENUM ('PURCHASE', 'PAYOUT', 'ADMIN', 'PACKAGE_ACTIVATION');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bv_status') THEN
    CREATE TYPE bv_status AS ENUM ('UNMATCHED', 'MATCHED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_status') THEN
    CREATE TYPE package_status AS ENUM ('ACTIVE', 'DISABLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_package_status') THEN
    CREATE TYPE user_package_status AS ENUM ('ACTIVE', 'EXPIRED', 'RENEWED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_status') THEN
    CREATE TYPE payout_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_status') THEN
    CREATE TYPE api_key_status AS ENUM ('ACTIVE', 'DISABLED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flush_period') THEN
    CREATE TYPE flush_period AS ENUM ('never', 'weekly', 'monthly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_status') THEN
    CREATE TYPE placement_status AS ENUM ('PLACED', 'PENDING_PLACEMENT');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'placement_request_status') THEN
    CREATE TYPE placement_request_status AS ENUM ('PENDING', 'APPROVED', 'AUTO_PLACED', 'ADMIN_PLACED');
  END IF;

  -- v2 activation rule (2026-04): status of quarantined commission rows
  -- produced when a user's monthly income crosses the threshold without the
  -- required monthly shopping.  HELD rows flip to RELEASED once the user
  -- shops enough in the same month, or to FORFEITED on month rollover.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'held_income_status') THEN
    CREATE TYPE held_income_status AS ENUM ('HELD', 'RELEASED', 'FORFEITED');
  END IF;
END
$$;
