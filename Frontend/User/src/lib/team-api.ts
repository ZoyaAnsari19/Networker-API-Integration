import { apiJson, unwrapData, type ApiEnvelope } from '@/lib/api-client';
import type {
  TeamLeg,
  TeamMember,
  TeamMemberStatus,
  TeamSideResponse,
  TeamStatsView,
} from '@/lib/team-types';

const TEAM_LIST_LIMIT = 500;

function normalizeStatus(raw: unknown): TeamMemberStatus {
  const s = String(raw ?? 'INACTIVE').toUpperCase();
  if (s === 'ACTIVE' || s === 'BLOCKED') return s;
  return 'INACTIVE';
}

export function normalizeTeamMember(
  raw: Record<string, unknown>,
  leg: TeamLeg,
): TeamMember {
  const pkg = raw.package_name;
  return {
    user_id: String(raw.user_id ?? ''),
    sponsor_id: String(raw.sponsor_id ?? ''),
    full_name: String(raw.full_name ?? ''),
    email: String(raw.email ?? ''),
    status: normalizeStatus(raw.status),
    package_name: pkg == null || pkg === '' ? null : String(pkg),
    leg: (String(raw.leg ?? leg).toUpperCase() as TeamLeg) || leg,
    is_direct: Boolean(raw.is_direct),
    volume: Number(raw.volume ?? 0),
    depth: Number(raw.depth ?? 0),
    joined_at: String(raw.joined_at ?? new Date().toISOString()),
  };
}

export function normalizeTeamStats(raw: Record<string, unknown>): TeamStatsView {
  return {
    total_members: Number(raw.total_members ?? 0),
    active_members: Number(raw.active_members ?? 0),
    new_this_week: Number(raw.new_this_week ?? 0),
    left_count: Number(raw.left_count ?? 0),
    right_count: Number(raw.right_count ?? 0),
    left_volume: Number(raw.left_volume ?? 0),
    right_volume: Number(raw.right_volume ?? 0),
    total_volume: Number(raw.total_volume ?? 0),
  };
}

export async function fetchTeamStats(): Promise<TeamStatsView> {
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    '/api/v1/me/team/stats',
  );
  return normalizeTeamStats(unwrapData(envelope));
}

export async function fetchTeamSide(
  side: TeamLeg,
  limit = TEAM_LIST_LIMIT,
  offset = 0,
): Promise<TeamSideResponse> {
  const params = new URLSearchParams({
    side,
    limit: String(limit),
    offset: String(offset),
  });
  const envelope = await apiJson<ApiEnvelope<Record<string, unknown>>>(
    `/api/v1/me/team?${params}`,
  );
  const data = unwrapData(envelope);
  const membersRaw = (data.members as Array<Record<string, unknown>> | undefined) ?? [];
  const members = membersRaw.map((row) =>
    normalizeTeamMember(row, side),
  );
  return {
    side: (String(data.side ?? side).toUpperCase() as TeamLeg) || side,
    count: Number(data.count ?? members.length),
    members,
  };
}

/** Stats plus both leg member lists (parallel). */
export async function fetchTeamPageData(): Promise<{
  stats: TeamStatsView;
  left: TeamMember[];
  right: TeamMember[];
}> {
  const [stats, leftSide, rightSide] = await Promise.all([
    fetchTeamStats(),
    fetchTeamSide('LEFT'),
    fetchTeamSide('RIGHT'),
  ]);
  return {
    stats,
    left: leftSide.members,
    right: rightSide.members,
  };
}
