import { create } from 'zustand';
import {
  currentUser,
  earningsData,
  walletData,
  binaryStatus,
} from '@/lib/dummy-data';
import { mockDelay } from '@/lib/mock-api-data';
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/lib/auth-session';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  rank: string;
  rankLevel: number;
  package: string;
  packageAmount: number;
  referralCode: string;
  leftRef: string;
  rightRef: string;
  createdAt: string;
  isActive: boolean;
}

interface AuthState {
  user: User;
  isAuthenticated: boolean;
  hydrated: boolean;
  isLoading: boolean;
  hydrate: () => void;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: { ...currentUser },
  isAuthenticated: false,
  hydrated: false,
  isLoading: false,
  hydrate: () => {
    const stored = readAuthSession();
    if (stored === null) {
      // First visit: keep demo session so existing UX still works.
      writeAuthSession({ authenticated: true, user: { ...currentUser } });
      set({
        user: { ...currentUser },
        isAuthenticated: true,
        hydrated: true,
      });
      return;
    }
    if (stored.authenticated) {
      set({
        user: stored.user ?? { ...currentUser },
        isAuthenticated: true,
        hydrated: true,
      });
      return;
    }
    set({
      user: { ...currentUser },
      isAuthenticated: false,
      hydrated: true,
    });
  },
  login: async (email) => {
    set({ isLoading: true });
    await mockDelay(200);
    const user: User = {
      ...currentUser,
      ...(email?.trim() ? { email: email.trim() } : {}),
    };
    writeAuthSession({ authenticated: true, user });
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },
  logout: () => {
    clearAuthSession();
    writeAuthSession({ authenticated: false });
    set({
      user: { ...currentUser },
      isAuthenticated: false,
    });
  },
  updateProfile: (data) => {
    const user = { ...get().user, ...data };
    if (get().isAuthenticated) {
      writeAuthSession({ authenticated: true, user });
    }
    set({ user });
  },
}));

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}

interface DashboardState {
  earnings: typeof earningsData;
  wallet: typeof walletData;
  binary: typeof binaryStatus;
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  earnings: earningsData,
  wallet: walletData,
  binary: binaryStatus,
  isLoading: false,
  lastUpdated: new Date(),
  refreshData: async () => {
    set({ isLoading: true });
    await mockDelay(500);
    set({
      earnings: earningsData,
      wallet: walletData,
      binary: binaryStatus,
      lastUpdated: new Date(),
      isLoading: false,
    });
  },
}));
