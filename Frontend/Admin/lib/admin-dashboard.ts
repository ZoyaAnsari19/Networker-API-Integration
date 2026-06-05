import {
  listKycRequests,
  listPackages,
  listPayouts,
  listUsers,
  type AdminPayoutRow,
  type AdminUserRow,
} from "@/lib/admin-api";

export interface DashboardPayoutRow {
  payout_id: string;
  user_id: string;
  user_name: string;
  sponsor_id: string;
  wallet_type: string;
  requested_amount: number;
  status: string;
  requested_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingKyc: number;
  pendingPayouts: number;
  activePackages: number;
  directToday: number;
  binaryToday: number;
  directTotal: number;
  binaryTotal: number;
  recentPayouts: DashboardPayoutRow[];
}

function isNetworker(u: AdminUserRow): boolean {
  return u.role === "NETWORKER";
}

async function fetchAllNetworkers(): Promise<AdminUserRow[]> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const all: AdminUserRow[] = [];

  while (page <= totalPages) {
    const res = await listUsers({ page, limit });
    all.push(...res.data.filter(isNetworker));
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

function aggregateIncome(networkers: AdminUserRow[]) {
  let binaryToday = 0;
  let monthlyIncome = 0;
  for (const u of networkers) {
    binaryToday += u.today_binary_earned ?? 0;
    monthlyIncome += u.monthly_income_paise ?? 0;
  }
  return {
    directToday: 0,
    binaryToday,
    directTotal: monthlyIncome,
    binaryTotal: binaryToday,
  };
}

function enrichPayouts(
  payouts: AdminPayoutRow[],
  userById: Map<string, AdminUserRow>,
): DashboardPayoutRow[] {
  return payouts.map((p) => {
    const u = userById.get(p.user_id);
    return {
      payout_id: p.payout_id,
      user_id: p.user_id,
      user_name: u?.full_name ?? "Unknown user",
      sponsor_id: u?.sponsor_id ?? "—",
      wallet_type: p.wallet_type,
      requested_amount: p.requested_amount,
      status: p.status,
      requested_at: p.requested_at,
    };
  });
}

export async function loadDashboardStats(): Promise<DashboardStats> {
  const [
    kycSubmittedRes,
    kycPendingRes,
    pendingPayoutsRes,
    packages,
    recentPayoutsRes,
    networkers,
  ] = await Promise.all([
    listKycRequests({ status: "SUBMITTED", page: 1, limit: 1 }),
    listKycRequests({ status: "PENDING", page: 1, limit: 1 }),
    listPayouts({ status: "PENDING", page: 1, limit: 1 }),
    listPackages(),
    listPayouts({ status: "", page: 1, limit: 5 }),
    fetchAllNetworkers(),
  ]);

  const userById = new Map(networkers.map((u) => [u.user_id, u]));
  const income = aggregateIncome(networkers);

  return {
    totalUsers: networkers.length,
    activeUsers: networkers.filter((u) => u.status === "ACTIVE").length,
    pendingKyc: kycSubmittedRes.total + kycPendingRes.total,
    pendingPayouts: pendingPayoutsRes.total,
    activePackages: packages.filter((p) => p.status === "ACTIVE").length,
    ...income,
    recentPayouts: enrichPayouts(recentPayoutsRes.data, userById),
  };
}
