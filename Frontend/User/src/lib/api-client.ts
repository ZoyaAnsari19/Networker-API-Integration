import { getApiBaseUrl } from '@/lib/api-base';
import { getAccessToken } from '@/lib/auth-session';
import { devLogApi } from '@/lib/dev-log';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | Record<string, unknown> | null;
  /** When false, skip Authorization header (login, etc.). Default true. */
  auth?: boolean;
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  return path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
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
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let payload: BodyInit | undefined;
  if (body === null || body === undefined) {
    payload = undefined;
  } else if (
    typeof body === 'object' &&
    !(body instanceof FormData) &&
    !(body instanceof URLSearchParams) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer)
  ) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    payload = JSON.stringify(body);
  } else {
    payload = body as BodyInit;
  }

  const method = (rest.method ?? 'GET').toUpperCase();
  const url = buildUrl(path);
  const started = Date.now();
  const logBody =
    body && typeof body === 'object' && !(body instanceof FormData)
      ? body
      : body instanceof FormData
        ? '[FormData]'
        : undefined;

  devLogApi(method, path, { body: logBody });

  const res = await fetch(url, {
    ...rest,
    headers,
    body: payload,
  });

  if (!res.ok) {
    devLogApi(method, path, {
      status: res.status,
      ok: false,
      durationMs: Date.now() - started,
    });
  }

  return res;
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
      throw new ApiError(res.status, res.statusText || 'Request failed');
    }
    throw new ApiError(res.status, 'Invalid JSON response');
  }

  if (!res.ok || parsed.success === false) {
    const errMsg = parsed.error || parsed.message || 'Request failed';
    devLogApi((options.method ?? 'GET').toUpperCase(), path, {
      status: res.status,
      ok: false,
      error: errMsg,
      response: parsed,
    });
    throw new ApiError(res.status, errMsg);
  }

  devLogApi((options.method ?? 'GET').toUpperCase(), path, {
    status: res.status,
    ok: true,
    response: parsed,
  });

  return parsed as T;
}

/** Unwrap `{ success, data }` envelopes returned by the backend. */
export function unwrapData<T>(envelope: ApiEnvelope<T>): T {
  if (envelope.data === undefined) {
    throw new ApiError(500, 'Missing data in API response');
  }
  return envelope.data;
}
