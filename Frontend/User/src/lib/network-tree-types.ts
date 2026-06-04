/** Node shape for `NetworkTreeVisualizer` (mapped from API `TreeView`). */
export interface NetworkTreeNodeData {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  /** BV under node in rupees (API paise / 100). */
  volume: number;
  rank: string;
  rankLevel: number;
  isActive: boolean;
  joinedAt: string;
  children?: NetworkTreeNodeData[];
  directMembers?: number;
  totalDownline?: number;
}

export interface NetworkTreeLegSummary {
  leftCount: number;
  rightCount: number;
  leftVolumeRupees: number;
  rightVolumeRupees: number;
  leftActive: number;
  rightActive: number;
  matchingVolumeRupees: number;
}

export interface NetworkTreePageStats {
  totalMembers: number;
  activeMembers: number;
  newThisWeek: number;
  totalVolumeRupees: number;
  legs: NetworkTreeLegSummary;
}

export interface NetworkTreeTopPerformer {
  name: string;
  packageLabel: string;
}

export interface PackageRankCount {
  label: string;
  count: number;
}
