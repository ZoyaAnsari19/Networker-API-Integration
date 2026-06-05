const PREFIX = "[FMCG Admin]";

export function devLog(scope: string, message: string, data?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  if (data !== undefined) {
    console.log(`${PREFIX} [${scope}] ${message}`, data);
  } else {
    console.log(`${PREFIX} [${scope}] ${message}`);
  }
}

export function devError(scope: string, message: string, error?: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.error(`${PREFIX} [${scope}] ${message}`, error);
}

export function devLogApi(
  method: string,
  path: string,
  extra?: Record<string, unknown>,
) {
  if (process.env.NODE_ENV === "production") return;
  console.log(`${PREFIX} [API] ${method} ${path}`, extra ?? "");
}
