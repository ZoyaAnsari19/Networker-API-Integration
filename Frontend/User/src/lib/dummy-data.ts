// Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  rank: string;
  rankLevel: number;
  package: string;
  packageAmount: number;
  referralCode: string;
  leftRef: string;
  rightRef: string;
  createdAt: string;
  isActive: boolean;
}

export interface Earnings {
  total: number;
  today: number;
  weekly: number;
  monthly: number;
  change: {
    today: number;
    weekly: number;
    monthly: number;
  };
}

export interface Wallet {
  secureCoin: number;
  commission: number;
  withdrawable: number;
  totalEarnings: number;
}

export interface BinaryStatus {
  leftCount: number;
  rightCount: number;
  leftVolume: number;
  rightVolume: number;
  leftActive: number;
  rightActive: number;
}

export interface ChartPoint {
  date: string;
  earnings: number;
  dateLabel: string;
}

export interface Activity {
  id: string;
  type: 'join' | 'income' | 'withdrawal' | 'upgrade' | 'transfer';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  user?: {
    name: string;
    avatar: string;
  };
}

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  email: string;
  phone: string;
  joinedAt: string;
  status: 'active' | 'inactive';
  side: 'left' | 'right';
  package: string;
  volume: number;
  isDirect: boolean;
  parentId?: string;
}

export interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  responses: {
    from: 'user' | 'support';
    message: string;
    timestamp: string;
  }[];
}

export interface Rank {
  id: string;
  name: string;
  level: number;
  icon: string;
  requiredPV: number;
  benefits: string[];
  currentProgress: number;
  color: string;
}

// Current User
export const currentUser: User = {
  id: 'usr_001',
  name: 'Alex Johnson',
  email: 'alex.johnson@email.com',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  phone: '+1 234 567 8901',
  rank: 'Silver',
  rankLevel: 3,
  package: 'Silver',
  packageAmount: 2500,
  referralCode: 'ALEX2024',
  leftRef: 'LEFT789XYZ',
  rightRef: 'RIGHT456ABC',
  createdAt: '2024-01-15T10:30:00Z',
  isActive: true,
};

// Earnings Data
export const earningsData: Earnings = {
  total: 128459.75,
  today: 847.32,
  weekly: 4235.18,
  monthly: 18742.50,
  change: {
    today: 12.5,
    weekly: 8.3,
    monthly: 15.7,
  },
};

// Wallet Data (demo UI)
export const walletData: Wallet = {
  secureCoin: 12500,
  commission: 45000,
  withdrawable: 32000,
  totalEarnings: earningsData.total,
};

// Binary Status
export const binaryStatus: BinaryStatus = {
  leftCount: 847,
  rightCount: 723,
  leftVolume: 2456789.50,
  rightVolume: 1892345.25,
  leftActive: 612,
  rightActive: 498,
};

// Chart Data (7 days)
export const chartData7Days: ChartPoint[] = [
  { date: '2024-03-10', dateLabel: 'Mar 10', earnings: 2340.50 },
  { date: '2024-03-11', dateLabel: 'Mar 11', earnings: 1890.25 },
  { date: '2024-03-12', dateLabel: 'Mar 12', earnings: 3120.75 },
  { date: '2024-03-13', dateLabel: 'Mar 13', earnings: 2780.00 },
  { date: '2024-03-14', dateLabel: 'Mar 14', earnings: 3450.25 },
  { date: '2024-03-15', dateLabel: 'Mar 15', earnings: 4120.50 },
  { date: '2024-03-16', dateLabel: 'Mar 16', earnings: 847.32 },
];

// Chart Data (30 days)
export const chartData30Days: ChartPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  return {
    date: date.toISOString().split('T')[0],
    dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    earnings: Math.floor(Math.random() * 3000) + 500,
  };
});

// Chart Data (90 days)
export const chartData90Days: ChartPoint[] = Array.from({ length: 90 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (89 - i));
  return {
    date: date.toISOString().split('T')[0],
    dateLabel: i % 7 === 0 ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
    earnings: Math.floor(Math.random() * 3500) + 400,
  };
});

// Recent Activity
export const recentActivity: Activity[] = [
  {
    id: 'act_001',
    type: 'join',
    title: 'New Member Joined',
    description: 'Sarah Miller joined your team on LEFT leg',
    amount: 50,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    user: { name: 'Sarah Miller', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 'act_002',
    type: 'income',
    title: 'Binary Commission',
    description: 'Matching bonus from LEFT-RIGHT match',
    amount: 250.00,
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_003',
    type: 'join',
    title: 'New Member Joined',
    description: 'James Wilson joined your team on RIGHT leg',
    amount: 50,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    user: { name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' },
  },
  {
    id: 'act_004',
    type: 'income',
    title: 'Direct Commission',
    description: 'From direct referral - Sarah Miller',
    amount: 125.50,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_005',
    type: 'withdrawal',
    title: 'Withdrawal Processed',
    description: 'Bank transfer to ****4521',
    amount: -1500.00,
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_006',
    type: 'upgrade',
    title: 'Package Upgraded',
    description: 'Upgraded from Silver to Gold',
    amount: -2000.00,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_007',
    type: 'income',
    title: 'Level Income',
    description: 'Level 3 commission from team growth',
    amount: 87.25,
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'act_008',
    type: 'join',
    title: 'New Member Joined',
    description: 'Emily Chen joined your team on LEFT leg',
    amount: 50,
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    user: { name: 'Emily Chen', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' },
  },
];

// Team Members - Left Leg
export const leftTeamMembers: TeamMember[] = [
  { id: 'tm_001', name: 'Sarah Miller', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face', email: 'sarah.m@email.com', phone: '+1 234 567 8902', joinedAt: '2024-03-16T09:30:00Z', status: 'active', side: 'left', package: 'Gold', volume: 12500, isDirect: true },
  { id: 'tm_002', name: 'Emily Chen', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face', email: 'emily.c@email.com', phone: '+1 234 567 8903', joinedAt: '2024-03-14T14:20:00Z', status: 'active', side: 'left', package: 'Silver', volume: 8500, isDirect: true },
  { id: 'tm_003', name: 'Michael Brown', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face', email: 'michael.b@email.com', phone: '+1 234 567 8904', joinedAt: '2024-03-12T11:45:00Z', status: 'inactive', side: 'left', package: 'Silver', volume: 3200, isDirect: false, parentId: 'tm_001' },
  { id: 'tm_004', name: 'Lisa Anderson', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face', email: 'lisa.a@email.com', phone: '+1 234 567 8905', joinedAt: '2024-03-10T08:15:00Z', status: 'active', side: 'left', package: 'Platinum', volume: 15000, isDirect: false, parentId: 'tm_001' },
  { id: 'tm_005', name: 'David Kim', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face', email: 'david.k@email.com', phone: '+1 234 567 8906', joinedAt: '2024-03-08T16:30:00Z', status: 'active', side: 'left', package: 'Silver', volume: 9800, isDirect: false, parentId: 'tm_002' },
];

// Team Members - Right Leg
export const rightTeamMembers: TeamMember[] = [
  { id: 'tm_006', name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face', email: 'james.w@email.com', phone: '+1 234 567 8907', joinedAt: '2024-03-15T10:00:00Z', status: 'active', side: 'right', package: 'Gold', volume: 11200, isDirect: true },
  { id: 'tm_007', name: 'Amanda Taylor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face', email: 'amanda.t@email.com', phone: '+1 234 567 8908', joinedAt: '2024-03-13T13:20:00Z', status: 'active', side: 'right', package: 'Silver', volume: 5600, isDirect: true },
  { id: 'tm_008', name: 'Robert Martinez', avatar: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face', email: 'robert.m@email.com', phone: '+1 234 567 8909', joinedAt: '2024-03-11T09:45:00Z', status: 'inactive', side: 'right', package: 'Silver', volume: 4500, isDirect: false, parentId: 'tm_006' },
  { id: 'tm_009', name: 'Jennifer Lee', avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop&crop=face', email: 'jennifer.l@email.com', phone: '+1 234 567 8910', joinedAt: '2024-03-09T15:30:00Z', status: 'active', side: 'right', package: 'Platinum', volume: 18500, isDirect: false, parentId: 'tm_006' },
  { id: 'tm_010', name: 'Christopher Davis', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face', email: 'chris.d@email.com', phone: '+1 234 567 8911', joinedAt: '2024-03-07T12:00:00Z', status: 'active', side: 'right', package: 'Gold', volume: 7200, isDirect: false, parentId: 'tm_007' },
];

// Ranks
export const ranks: Rank[] = [
  { id: 'rank_1', name: 'Starter', level: 1, icon: '🌱', requiredPV: 0, benefits: ['Basic dashboard access', 'Referral link', '5% direct commission'], currentProgress: 100, color: '#94a3b8' },
  { id: 'rank_2', name: 'Bronze', level: 2, icon: '🥉', requiredPV: 50000, benefits: ['All Starter features', '8% direct commission', 'Binary matching bonus'], currentProgress: 100, color: '#cd7f32' },
  { id: 'rank_3', name: 'Silver', level: 3, icon: '🥈', requiredPV: 200000, benefits: ['All Bronze features', '10% direct commission', 'Level 1-3 income', 'Priority support'], currentProgress: 65, color: '#c0c0c0' },
  { id: 'rank_4', name: 'Gold', level: 4, icon: '🥇', requiredPV: 750000, benefits: ['All Silver features', '12% direct commission', 'Level 1-5 income', 'Car bonus'], currentProgress: 28, color: '#ffd700' },
  { id: 'rank_5', name: 'Platinum', level: 5, icon: '💎', requiredPV: 2500000, benefits: ['All Gold features', '15% direct commission', 'Level 1-7 income', 'House bonus', 'Leadership pool'], currentProgress: 8, color: '#e5e4e2' },
  { id: 'rank_6', name: 'Diamond', level: 6, icon: '💠', requiredPV: 10000000, benefits: ['All Platinum features', 'Team override bonus', 'Global leadership pool', 'Company equity'], currentProgress: 2, color: '#b9f2ff' },
];

// Support Tickets
export const tickets: Ticket[] = [
  { id: 'tkt_001', subject: 'Withdrawal not received', message: 'I requested a withdrawal of $1500 on March 13th but haven\'t received it yet.', status: 'pending', priority: 'high', createdAt: '2024-03-13T10:30:00Z', updatedAt: '2024-03-14T09:15:00Z', responses: [{ from: 'user', message: 'I requested a withdrawal of $1500 on March 13th but haven\'t received it yet.', timestamp: '2024-03-13T10:30:00Z' }, { from: 'support', message: 'Hi Alex, we\'re checking with our finance team. The transfer should be processed within 2-3 business days.', timestamp: '2024-03-14T09:15:00Z' }] },
  { id: 'tkt_002', subject: 'Binary matching calculation', message: 'Can you explain how my binary commission was calculated for this week?', status: 'resolved', priority: 'medium', createdAt: '2024-03-10T14:20:00Z', updatedAt: '2024-03-11T11:00:00Z', responses: [{ from: 'user', message: 'Can you explain how my binary commission was calculated?', timestamp: '2024-03-10T14:20:00Z' }, { from: 'support', message: 'Your binary commission was calculated based on 250 points on your left leg and 180 points on your right leg. The matching bonus applies to the lower volume.', timestamp: '2024-03-11T11:00:00Z' }] },
  { id: 'tkt_003', subject: 'Account verification', message: 'I need help completing my KYC verification.', status: 'closed', priority: 'low', createdAt: '2024-03-05T09:00:00Z', updatedAt: '2024-03-06T16:30:00Z', responses: [{ from: 'user', message: 'I need help completing my KYC verification.', timestamp: '2024-03-05T09:00:00Z' }, { from: 'support', message: 'Please upload a clear photo of your ID and proof of address. Our team will review within 24 hours.', timestamp: '2024-03-05T10:30:00Z' }, { from: 'user', message: 'I\'ve uploaded the documents.', timestamp: '2024-03-05T14:00:00Z' }, { from: 'support', message: 'Your verification is complete. You now have full access to all features.', timestamp: '2024-03-06T16:30:00Z' }] },
];

// Referral Stats
export const referralStats = {
  totalInvited: 47,
  activeUsers: 32,
  pendingPlacements: 5,
  totalCommission: 8745.50,
  leftCount: 25,
  rightCount: 22,
};

// Daily Streak
export const dailyStreak = {
  currentStreak: 12,
  longestStreak: 28,
  last7Days: [
    { date: '2024-03-10', loggedIn: true },
    { date: '2024-03-11', loggedIn: true },
    { date: '2024-03-12', loggedIn: true },
    { date: '2024-03-13', loggedIn: true },
    { date: '2024-03-14', loggedIn: true },
    { date: '2024-03-15', loggedIn: true },
    { date: '2024-03-16', loggedIn: true },
  ],
};

// Navigation Items — demo mode: all pages use local mock data (no backend).
export type NavigationItem = {
  id: string;
  label: string;
  icon: string;
  href: string;
  highlight?: boolean;
  apiWired: boolean;
};

export const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/', apiWired: true },
  { id: 'add-user', label: 'Add Member', icon: 'UserPlus', href: '/add-user', highlight: true, apiWired: true },
  { id: 'invite', label: 'Invite & Earn', icon: 'Gift', href: '/invite', apiWired: true },
  { id: 'team', label: 'My Team', icon: 'Users', href: '/team', apiWired: true },
  { id: 'network-tree', label: 'Network Tree', icon: 'Network', href: '/network-tree', apiWired: true },
  { id: 'rank', label: 'Rank & Progress', icon: 'Trophy', href: '/rank', apiWired: true },
  { id: 'income', label: 'Income', icon: 'TrendingUp', href: '/income', apiWired: true },
  { id: 'wallet', label: 'Wallet', icon: 'Wallet', href: '/wallet', apiWired: true },
  { id: 'withdraw', label: 'Withdraw', icon: 'Banknote', href: '/withdraw', apiWired: true },
  { id: 'package', label: 'Package', icon: 'Package', href: '/package', apiWired: true },
  { id: 'p2p', label: 'P2P Transfer', icon: 'ArrowLeftRight', href: '/p2p', apiWired: true },
  { id: 'support', label: 'Support', icon: 'Headphones', href: '/support', apiWired: true },
  { id: 'profile', label: 'Profile', icon: 'Settings', href: '/profile', apiWired: true },
];

// Quick Actions
export const quickActions = [
  { id: 'invite', label: 'Invite Friends', icon: 'UserPlus', color: 'primary', href: '/invite' },
  { id: 'withdraw', label: 'Withdraw', icon: 'Banknote', color: 'gold', href: '/withdraw' },
  { id: 'upgrade', label: 'Upgrade', icon: 'TrendingUp', color: 'secondary', href: '/package' },
  { id: 'transfer', label: 'Transfer', icon: 'ArrowLeftRight', color: 'blue', href: '/p2p' },
];
