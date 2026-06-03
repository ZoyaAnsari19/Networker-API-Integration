-- ============================================================
-- Real package tiers (INR: 2,500 / 7,500 / 15,000). Amounts in paise.
-- Idempotent: fixed UUIDs + ON CONFLICT DO UPDATE.
--
-- v2 activation rule (2026-04): packages only drive daily_binary_cap now.
-- The lifetime cap multipliers were dropped from the schema.
-- ============================================================

INSERT INTO packages (
    package_id,
    name,
    amount,
    daily_binary_cap,
    status,
    sort_order
) VALUES
    (
        'a1111111-1111-1111-1111-111111111101',
        'Silver',
        250000,
        300000,
        'ACTIVE',
        1
    ),
    (
        'a1111111-1111-1111-1111-111111111102',
        'Gold',
        750000,
        1000000,
        'ACTIVE',
        2
    ),
    (
        'a1111111-1111-1111-1111-111111111103',
        'Platinum',
        1500000,
        2500000,
        'ACTIVE',
        3
    )
ON CONFLICT (package_id) DO UPDATE SET
    name = EXCLUDED.name,
    amount = EXCLUDED.amount,
    daily_binary_cap = EXCLUDED.daily_binary_cap,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
