import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';
import { fetchAllLedgerEntries } from '@/lib/dashboard-api';
import type { LedgerEntry } from '@/lib/dashboard-types';
import { fetchMyProfile } from '@/lib/profile-api';
import type {
  DirectReferral,
  InviteProfile,
  InviteStatsSummary,
  PlacementRequestSummary,
  PlacementStatus,
  ReferralLeg,
  ReferralStatus,
} from '@/lib/invite-types';

const REFERRALS_LIMIT = 200;

function normalizeStatus(raw: unknown): ReferralStatus {
  const s = String(raw ?? 'INACTIVE').toUpperCase();
  if (s === 'ACTIVE' || s === 'BLOCKED') return s;
  return 'INACTIVE';
}

function normalizePlacementStatus(raw: unknown): PlacementStatus {
  const s = String(raw ?? 'PENDING_PLACEMENT').toUpperCase();
  return s === 'PLACED' ? 'PLACED' : 'PENDING_PLACEMENT';
}

function normalizeLeg(raw: unknown): ReferralLeg | null {
  if (raw == null || raw === '') return null;
  const s = String(raw).toUpperCase();
  if (s === 'LEFT' || s === 'RIGHT') return s;
  return null;
}

export function normalizeDirectReferral(
  raw: Record<string, unknown>,
): DirectReferral {
  const phone = raw.phone;
  const pkg = raw.package_name;
  return {
    user_id: String(raw.user_id ?? ''),
    sponsor_id: String(raw.sponsor_id ?? ''),
    full_name: String(raw.full_name ?? ''),
    email: String(raw.email ?? ''),
    phone: phone == null || phone === '' ? null : String(phone),
    status: normalizeStatus(raw.status),
    placement_status: normalizePlacementStatus(raw.placement_status),
    leg: normalizeLeg(raw.leg),
    package_name: pkg == null || pkg === '' ? null : String(pkg),
    total_direct_earned: Number(raw.total_direct_earned ?? 0),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function normalizePlacementRequest(
  raw: Record<string, unknown>,
): PlacementRequestSummary {
  return {
    id: String(raw.id ?? ''),
    user_id: String(raw.user_id ?? ''),
    sponsor_user_id: String(raw.sponsor_user_id ?? ''),
    status: String(raw.status ?? 'PENDING'),
    expires_at: String(raw.expires_at ?? new Date().toISOString()),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  };
}

function profileToInviteProfile(
  raw: Awaited<ReturnType<typeof fetchMyProfile>>,
): InviteProfile {
  return {
    user_id: raw.user_id,
    sponsor_id: raw.sponsor_id,
    full_name: raw.full_name,
    monthly_income_paise: raw.monthly_income_paise,
    direct_referral_count: raw.direct_referral_count,
  };
}

function isCurrentMonth(isoDate: string): boolean {
  const d = new Date(isoDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function isDirectCommissionCredit(entry: LedgerEntry): boolean {
  return (
    entry.entry_type === 'CREDIT' &&
    entry.amount > 0 &&
    (entry.source === 'DIRECT_COMMISSION' ||
      entry.source === 'FRANCHISE_COMMISSION')
  );
}

export function computeMonthlyDirectCommissionRupees(
  entries: LedgerEntry[],
): number {
  return entries
    .filter((e) => isDirectCommissionCredit(e) && isCurrentMonth(e.created_at))
    .reduce((sum, e) => sum + e.amount / 100, 0);
}

export function computeInviteStats(
  referrals: DirectReferral[],
  pendingPlacementCount: number,
  monthlyDirectCommissionRupees: number,
): InviteStatsSummary {
  const activeUsers = referrals.filter((r) => r.status === 'ACTIVE').length;
  const leftCount = referrals.filter((r) => r.leg === 'LEFT').length;
  const rightCount = referrals.filter((r) => r.leg === 'RIGHT').length;
  const unplacedCount = referrals.filter(
    (r) => r.placement_status === 'PENDING_PLACEMENT' || r.leg == null,
  ).length;

  return {
    totalInvited: referrals.length,
    activeUsers,
    pendingPlacements: pendingPlacementCount,
    totalCommission: monthlyDirectCommissionRupees,
    leftCount,
    rightCount,
    unplacedCount,
  };
}

export async function fetchDirectReferrals(
  limit = REFERRALS_LIMIT,
  offset = 0,
): Promise<DirectReferral[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const envelope = await apiJson<ApiEnvelope<Array<Record<string, unknown>>>>(
    `/api/v1/me/referrals?${params}`,
  );
  const rows = unwrapData(envelope) ?? [];
  return rows.map((row) => normalizeDirectReferral(row));
}

export async function fetchPendingPlacementRequests(): Promise<
  PlacementRequestSummary[]
> {
  const envelope = await apiJson<
    ApiEnvelope<Array<Record<string, unknown>>>
  >('/api/v1/me/placement-requests');
  const rows = unwrapData(envelope) ?? [];
  return rows.map((row) => normalizePlacementRequest(row));
}

/** Profile, referrals, placement queue, and invite stats (parallel). */
export async function fetchInvitePageData(): Promise<{
  profile: InviteProfile;
  referrals: DirectReferral[];
  stats: InviteStatsSummary;
}> {
  const [profileRaw, referrals, placementRequests, directLedger] =
    await Promise.all([
      fetchMyProfile(),
      fetchDirectReferrals(),
      fetchPendingPlacementRequests(),
      fetchAllLedgerEntries('DIRECT'),
    ]);

  const profile = profileToInviteProfile(profileRaw);
  const monthlyDirectCommissionRupees =
    computeMonthlyDirectCommissionRupees(directLedger);
  const stats = computeInviteStats(
    referrals,
    placementRequests.length,
    monthlyDirectCommissionRupees,
  );

  return { profile, referrals, stats };
}
