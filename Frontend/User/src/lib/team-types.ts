export type TeamMemberStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type TeamLeg = 'LEFT' | 'RIGHT';

export interface TeamMember {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  status: TeamMemberStatus;
  package_name: string | null;
  leg: TeamLeg;
  is_direct: boolean;
  /** BV under this node (paise). */
  volume: number;
  depth: number;
  joined_at: string;
}

export interface TeamStatsView {
  total_members: number;
  active_members: number;
  new_this_week: number;
  left_count: number;
  right_count: number;
  /** Paise — caller's left leg BV from binary_tree. */
  left_volume: number;
  /** Paise — caller's right leg BV from binary_tree. */
  right_volume: number;
  total_volume: number;
}

export interface TeamSideResponse {
  side: TeamLeg;
  count: number;
  members: TeamMember[];
}
