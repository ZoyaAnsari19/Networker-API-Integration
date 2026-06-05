import {
  getKycRequest,
  listKycRequests,
  listUsers,
  type AdminUserRow,
  type KYCRequest,
} from "@/lib/admin-api";
import { inDateRange } from "@/lib/utils";

export type KycStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "REJECTED";

export const KYC_DOCUMENT_LABELS: Record<string, string> = {
  PAN_CARD: "PAN card",
  AADHAAR_CARD: "Aadhaar card",
  AADHAAR_FRONT: "Aadhaar (front)",
  AADHAAR_BACK: "Aadhaar (back)",
  BANK_PASSBOOK: "Bank passbook",
  OTHER: "Other document",
};

export interface KycDocumentRow {
  document_id: string;
  document_type: string;
  document_url: string;
  mime_type?: string | null;
  file_name?: string | null;
}

export interface KycRow {
  kyc_id: string;
  user_id: string;
  status: KycStatus;
  rejection_reason: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  full_name: string;
  sponsor_id: string;
  email: string;
  phone: string | null;
  documents: KycDocumentRow[];
}

async function buildUserMap(): Promise<Map<string, AdminUserRow>> {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const map = new Map<string, AdminUserRow>();

  while (page <= totalPages) {
    const res = await listUsers({ page, limit });
    for (const u of res.data) {
      map.set(u.user_id, u);
    }
    totalPages = res.totalPages;
    page += 1;
  }

  return map;
}

function mapKyc(
  k: KYCRequest,
  userMap: Map<string, AdminUserRow>,
  includeDocuments: boolean,
): KycRow {
  const user = userMap.get(k.user_id);
  const documents: KycDocumentRow[] = includeDocuments
    ? (k.documents ?? []).map((d) => ({
        document_id: d.document_id,
        document_type: d.document_type,
        document_url: d.download_url ?? "",
        mime_type: d.mime_type,
        file_name: d.file_name,
      }))
    : [];

  return {
    kyc_id: k.kyc_id,
    user_id: k.user_id,
    status: k.status as KycStatus,
    rejection_reason: k.rejection_reason ?? null,
    submitted_at: k.submitted_at ?? null,
    reviewed_at: k.reviewed_at ?? null,
    created_at: k.created_at,
    full_name: user?.full_name ?? "Unknown",
    sponsor_id: user?.sponsor_id ?? "—",
    email: user?.email ?? "—",
    phone: user?.phone ?? null,
    documents,
  };
}

export async function fetchKycPage(params: {
  status?: string;
  page: number;
  limit: number;
}): Promise<{ rows: KycRow[]; total: number; totalPages: number }> {
  const [kycRes, userMap] = await Promise.all([
    listKycRequests({
      status: params.status || undefined,
      page: params.page,
      limit: params.limit,
    }),
    buildUserMap(),
  ]);

  return {
    rows: kycRes.data.map((k) => mapKyc(k, userMap, false)),
    total: kycRes.total,
    totalPages: kycRes.totalPages,
  };
}

export async function fetchAllKyc(status?: string): Promise<KycRow[]> {
  const userMap = await buildUserMap();
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const all: KycRow[] = [];

  while (page <= totalPages) {
    const res = await listKycRequests({
      status: status || undefined,
      page,
      limit,
    });
    all.push(...res.data.map((k) => mapKyc(k, userMap, false)));
    totalPages = res.totalPages;
    page += 1;
  }

  return all;
}

export async function fetchKycDetail(kycId: string): Promise<KycRow> {
  const [kyc, userMap] = await Promise.all([
    getKycRequest(kycId),
    buildUserMap(),
  ]);
  return mapKyc(kyc, userMap, true);
}

export async function fetchKycStatusCounts(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
}> {
  const [pending, submitted, approved, rejected] = await Promise.all([
    listKycRequests({ status: "PENDING", page: 1, limit: 1 }),
    listKycRequests({ status: "SUBMITTED", page: 1, limit: 1 }),
    listKycRequests({ status: "APPROVED", page: 1, limit: 1 }),
    listKycRequests({ status: "REJECTED", page: 1, limit: 1 }),
  ]);
  return {
    pending: pending.total + submitted.total,
    approved: approved.total,
    rejected: rejected.total,
  };
}

export function filterKycRows(
  rows: KycRow[],
  search: string,
  statusFilter: string,
  dateFrom: string,
  dateTo: string,
): KycRow[] {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false;
    const dateStr = r.submitted_at ?? r.reviewed_at;
    if ((dateFrom || dateTo) && dateStr && !inDateRange(dateStr, dateFrom, dateTo)) {
      return false;
    }
    if ((dateFrom || dateTo) && !dateStr) return false;
    if (!q) return true;
    const hay = `${r.kyc_id} ${r.user_id} ${r.sponsor_id} ${r.email} ${r.full_name} ${r.phone ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}
