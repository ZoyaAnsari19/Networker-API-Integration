import type { TreeView } from '@/lib/dashboard-types';
import type { TeamMember } from '@/lib/team-types';
import type { TeamStatsView } from '@/lib/team-types';
import type {
  NetworkTreeNodeData,
  NetworkTreePageStats,
  PackageRankCount,
  NetworkTreeTopPerformer,
} from '@/lib/network-tree-types';

function paiseToRupees(paise: number): number {
  return paise / 100;
}

function countSubtree(node: TreeView | undefined): {
  members: number;
  active: number;
} {
  if (!node) return { members: 0, active: 0 };
  let members = 1;
  let active = node.status === 'ACTIVE' ? 1 : 0;
  const left = countSubtree(node.left);
  const right = countSubtree(node.right);
  return {
    members: members + left.members + right.members,
    active: active + left.active + right.active,
  };
}

function packageLabel(node: TreeView): string {
  const pkg = node.package_name?.trim();
  return pkg || 'Unassigned';
}

function rankLevelFromPackage(label: string): number {
  const order = ['Starter', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const idx = order.findIndex(
    (r) => r.toLowerCase() === label.toLowerCase(),
  );
  return idx >= 0 ? idx + 1 : 1;
}

export function mapTreeViewToNetworkNode(node: TreeView): NetworkTreeNodeData {
  const subtree = countSubtree(node);
  const downline = Math.max(0, subtree.members - 1);
  const children: NetworkTreeNodeData[] = [];
  if (node.left) {
    children.push(mapTreeViewToNetworkNode(node.left));
  }
  if (node.right) {
    children.push(mapTreeViewToNetworkNode(node.right));
  }

  const rank = packageLabel(node);
  const directMembers = (node.left ? 1 : 0) + (node.right ? 1 : 0);

  return {
    id: node.user_id,
    name: node.full_name,
    memberCount: downline,
    volume: paiseToRupees(node.left_bv + node.right_bv),
    rank,
    rankLevel: rankLevelFromPackage(rank),
    isActive: node.status === 'ACTIVE',
    joinedAt: '',
    directMembers,
    totalDownline: downline,
    children: children.length > 0 ? children : undefined,
  };
}

export function buildPageStatsFromTeam(
  stats: TeamStatsView,
  tree: TreeView | null,
): NetworkTreePageStats {
  const leftVolumeRupees = paiseToRupees(stats.left_volume);
  const rightVolumeRupees = paiseToRupees(stats.right_volume);
  const legs = {
    leftCount: stats.left_count,
    rightCount: stats.right_count,
    leftVolumeRupees,
    rightVolumeRupees,
    leftActive: countLegActive(tree?.left),
    rightActive: countLegActive(tree?.right),
    matchingVolumeRupees: Math.min(leftVolumeRupees, rightVolumeRupees),
  };

  return {
    totalMembers: stats.total_members,
    activeMembers: stats.active_members,
    newThisWeek: stats.new_this_week,
    totalVolumeRupees: paiseToRupees(stats.total_volume),
    legs,
  };
}

function countLegActive(node: TreeView | undefined): number {
  if (!node) return 0;
  let n = node.status === 'ACTIVE' ? 1 : 0;
  n += countLegActive(node.left);
  n += countLegActive(node.right);
  return n;
}

export function collectPackageRankCounts(
  tree: TreeView | null,
): PackageRankCount[] {
  const counts = new Map<string, number>();
  const walk = (node: TreeView | undefined) => {
    if (!node) return;
    const label = packageLabel(node);
    counts.set(label, (counts.get(label) ?? 0) + 1);
    walk(node.left);
    walk(node.right);
  };
  walk(tree ?? undefined);
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function topPerformersFromLeg(
  members: TeamMember[],
  limit = 3,
): NetworkTreeTopPerformer[] {
  return [...members]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit)
    .map((m) => ({
      name: m.full_name,
      packageLabel: m.package_name?.trim() || 'Unassigned',
    }));
}
