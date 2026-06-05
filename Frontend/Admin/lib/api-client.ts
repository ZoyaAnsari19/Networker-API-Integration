import { getApiBaseUrl } from "@/lib/api-base";
import { getAccessToken } from "@/lib/auth-session";
import { devLogApi } from "@/lib/dev-log";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedEnvelope<T> {
  success: boolean;
  data: T;
  meta: PaginatedMeta;
  error?: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: BodyInit | Record<string, unknown> | null;
  auth?: boolean;
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const { auth = true, body, headers: initHeaders, ...rest } = options;
  const headers = new Headers(initHeaders);

  if (auth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let payload: BodyInit | undefined;
  if (body === null || body === undefined) {
    payload = undefined;
  } else if (
    typeof body === "object" &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    payload = JSON.stringify(body);
  } else {
    payload = body as BodyInit;
  }

  const method = (rest.method ?? "GET").toUpperCase();
  const url = buildUrl(path);
  devLogApi(method, path);

  return fetch(url, {
    ...rest,
    headers,
    body: payload,
  });
}

export async function apiJson<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const res = await apiRequest(path, options);
  let parsed: ApiEnvelope<T> | null = null;
  try {
    parsed = (await res.json()) as ApiEnvelope<T>;
  } catch {
    if (!res.ok) {
      throw new ApiError(res.status, res.statusText || "Request failed");
    }
    throw new ApiError(res.status, "Invalid JSON response");
  }

  if (!res.ok || parsed.success === false) {
    const errMsg = parsed.error || parsed.message || "Request failed";
    throw new ApiError(res.status, errMsg);
  }

  return parsed as T;
}

export async function apiPaginated<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<{ data: T; meta: PaginatedMeta }> {
  const res = await apiRequest(path, options);
  let parsed: PaginatedEnvelope<T> | null = null;
  try {
    parsed = (await res.json()) as PaginatedEnvelope<T>;
  } catch {
    throw new ApiError(res.status, res.statusText || "Request failed");
  }

  if (!res.ok || parsed.success === false) {
    throw new ApiError(res.status, parsed.error || "Request failed");
  }

  return { data: parsed.data, meta: parsed.meta };
}

export function unwrapData<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.data === undefined) {
    throw new ApiError(500, "Missing data in API response");
  }
  return envelope.data;
}
