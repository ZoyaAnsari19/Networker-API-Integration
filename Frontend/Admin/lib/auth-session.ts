import type { AdminUser } from "@/stores/useAdminAuthStore";

export const AUTH_STORAGE_KEY = "fmcg-binary-admin-auth";

export interface StoredAuthSession {
  authenticated: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AdminUser;
}

export function readAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: StoredAuthSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  return readAuthSession()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  return readAuthSession()?.refreshToken ?? null;
}
