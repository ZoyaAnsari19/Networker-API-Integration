import {
  listPackages,
  listUsers,
  type AdminPackage,
  type AdminUserRow,
} from "@/lib/admin-api";

export interface NetworkerRow {
  user_id: string;
  sponsor_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  role: string;
  placement_status: string;
  created_at: string;
  package_id: string | null;
  package_name: string | null;
  package_amount: number | null;
  monthly_income_paise: number;
  monthly_shopping_paise: number;
  today_binary_earned: number;
  daily_binary_cap: number;
  secure_wallet_external_id: string | null;
  secure_wallet_balance_paise: number | null;
}

function mapRow(
  u: AdminUserRow,
  packagesById: Map<string, AdminPackage>,
): NetworkerRow | null {
  if (u.role !== "NETWORKER") return null;
  const pkg = u.current_package_id
    ? packagesById.get(u.current_package_id)
    : undefined;
  return {
    user_id: u.user_id,
    sponsor_id: u.sponsor_id,
    full_name: u.full_name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    role: u.role,
    placement_status: u.placement_status,
    created_at: u.created_at,
    package_id: u.current_package_id ?? null,
    package_name: pkg?.name ?? null,
    package_amount: pkg?.amount ?? null,
    monthly_income_paise: u.monthly_income_paise ?? 0,
    monthly_shopping_paise: u.monthly_shopping_paise ?? 0,
    today_binary_earned: u.today_binary_earned ?? 0,
    daily_binary_cap: u.daily_binary_cap ?? 0,
    secure_wallet_external_id: u.secure_wallet_external_id ?? null,
    secure_wallet_balance_paise: u.secure_wallet_balance_paise ?? null,
  };
}

async function packagesMap(): Promise<Map<string, AdminPackage>> {
  const packages = await listPackages();
  return new Map(packages.map((p) => [p.package_id, p]));
}

export async function fetchNetworkerPage(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ rows: NetworkerRow[]; total: number; totalPages: number }> {
  const [usersRes, pkgMap] = await Promise.all([
    listUsers({
      status: params.status || undefined,
      page: params.page,
      limit: params.limit,
    }),
    packagesMap(),
  ]);

  const rows = usersRes.data
    .map((u) => mapRow(u, pkgMap))
    .filter((r): r is NetworkerRow => r !== null);

  return {
    rows,
    total: usersRes.total,
    totalPages: usersRes.totalPages,
  };
}

export async function fetchAllNetworkers(status?: string): Promise<NetworkerRow[]> {
  const pkgMap = await packagesMap();
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const all: NetworkerRow[] = [];

  while (page <= totalPages) {
    const res = await listUsers({
      status: status || undefined,
      page,
      limit,
    });
    for (const u of res.data) {
      const row = mapRow(u, pkgMap);
      if (row) all.push(row);
    }
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

export function filterNetworkers(
  rows: NetworkerRow[],
  search: string,
  packageFilter: string,
): NetworkerRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((u) => {
    if (packageFilter && u.package_name !== packageFilter) return false;
    if (!q) return true;
    const hay = [u.full_name, u.email, u.sponsor_id, u.phone, u.package_name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
