import type { User } from '@/stores/useAuthStore';

export const AUTH_STORAGE_KEY = 'fmcg-binary-auth';

export interface StoredAuthSession {
  authenticated: boolean;
  user?: User;
}

export function readAuthSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAuthSession;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: StoredAuthSession): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
