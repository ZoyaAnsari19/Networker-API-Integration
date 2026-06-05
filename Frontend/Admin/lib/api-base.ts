/** Backend API origin (no trailing slash). */
export function getApiBaseUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:3100";
  return base.replace(/\/+$/, "");
}
