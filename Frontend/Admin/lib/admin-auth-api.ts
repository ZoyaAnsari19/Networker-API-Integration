import { apiJson, unwrapData, type ApiEnvelope } from "@/lib/api-client";

export interface AdminAuthUser {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  sponsor_id: string;
  status: string;
  role: string;
}

export interface AdminAuthResponse {
  user: AdminAuthUser;
  access_token: string;
  refresh_token: string;
}

export async function adminLoginRequest(
  email: string,
  password: string,
): Promise<AdminAuthResponse> {
  const envelope = await apiJson<ApiEnvelope<AdminAuthResponse>>(
    "/api/v1/auth/login",
    {
      method: "POST",
      auth: false,
      body: { email, password },
    },
  );

  const data = unwrapData(envelope);

  if (data.user.role !== "ADMIN" && data.user.role !== "SUB_ADMIN") {
    throw new Error("This account is not allowed to access the admin portal.");
  }

  return data;
}

