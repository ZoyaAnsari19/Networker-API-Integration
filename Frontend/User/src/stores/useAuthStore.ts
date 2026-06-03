import { create } from 'zustand';
import {
  currentUser,
  earningsData,
  walletData,
  binaryStatus,
} from '@/lib/dummy-data';
import { mockDelay } from '@/lib/mock-api-data';
import { loginRequest } from '@/lib/profile-api';
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from '@/lib/auth-session';
import { devError, devLog } from '@/lib/dev-log';

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

function mapAuthUserToStoreUser(apiUser: {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  sponsor_id: string;
  status: string;
}): User {
  return {
    id: apiUser.user_id,
    name: apiUser.full_name,
    email: apiUser.email,
    avatar: '',
    phone: apiUser.phone ?? '',
    rank: 'Member',
    rankLevel: 1,
    package: '',
    packageAmount: 0,
    referralCode: apiUser.sponsor_id,
    leftRef: '',
    rightRef: '',
    createdAt: new Date().toISOString(),
    isActive: apiUser.status === 'ACTIVE',
  };
}

interface AuthState {
  user: User;
  isAuthenticated: boolean;
  hydrated: boolean;
  isLoading: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
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
    if (stored?.authenticated && stored.accessToken) {
      devLog('Auth', 'Session restored from localStorage', {
        email: stored.user?.email,
        sponsor_id: stored.user?.referralCode,
        hasToken: true,
      });
      set({
        user: stored.user ?? { ...currentUser },
        isAuthenticated: true,
        hydrated: true,
      });
      return;
    }
    devLog('Auth', 'No JWT session — user must log in');
    set({
      user: { ...currentUser },
      isAuthenticated: false,
      hydrated: true,
    });
  },
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await loginRequest(email, password);
      const user = mapAuthUserToStoreUser(result.user);
      writeAuthSession({
        authenticated: true,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        user,
      });
      devLog('Auth', 'Login success', {
        user_id: result.user.user_id,
        email: result.user.email,
        sponsor_id: result.user.sponsor_id,
        role: result.user.role,
      });
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      devError('Auth', 'Login failed', error);
      set({ isLoading: false });
      throw error;
    }
  },
  logout: () => {
    devLog('Auth', 'Logout');
    clearAuthSession();
    writeAuthSession({ authenticated: false });
    set({
      user: { ...currentUser },
      isAuthenticated: false,
    });
  },
  updateProfile: (data) => {
    const user = { ...get().user, ...data };
    const stored = readAuthSession();
    if (stored?.authenticated && stored.accessToken) {
      writeAuthSession({
        ...stored,
        authenticated: true,
        user,
      });
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
