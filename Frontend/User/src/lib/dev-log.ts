/** Dev-only console logging for Frontend/User (prefix: [FMCG User]). */

const PREFIX = '[FMCG User]';

function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

function redactBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  if (body instanceof FormData) return '[FormData]';
  const clone = { ...(body as Record<string, unknown>) };
  for (const key of Object.keys(clone)) {
    if (/password/i.test(key)) {
      clone[key] = '***';
    }
  }
  return clone;
}

export function devLog(scope: string, message: string, data?: unknown): void {
  if (!isDev()) return;
  const label = `${PREFIX} ${scope}`;
  if (data !== undefined) {
    console.log(label, message, data);
  } else {
    console.log(label, message);
  }
}

export function devWarn(scope: string, message: string, data?: unknown): void {
  if (!isDev()) return;
  const label = `${PREFIX} ${scope}`;
  if (data !== undefined) {
    console.warn(label, message, data);
  } else {
    console.warn(label, message);
  }
}

export function devError(scope: string, message: string, data?: unknown): void {
  if (!isDev()) return;
  const label = `${PREFIX} ${scope}`;
  if (data !== undefined) {
    console.error(label, message, data);
  } else {
    console.error(label, message);
  }
}

export function devLogApi(
  method: string,
  path: string,
  meta: {
    status?: number;
    ok?: boolean;
    body?: unknown;
    response?: unknown;
    error?: string;
    durationMs?: number;
  },
): void {
  if (!isDev()) return;
  const payload = {
    method,
    path,
    ...meta,
    ...(meta.body !== undefined ? { body: redactBody(meta.body) } : {}),
  };
  if (meta.ok === false || meta.error) {
    console.error(`${PREFIX} API`, payload);
  } else {
    console.log(`${PREFIX} API`, payload);
  }
}
