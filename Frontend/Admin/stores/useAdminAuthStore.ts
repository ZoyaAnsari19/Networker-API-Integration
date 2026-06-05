import { create } from "zustand";
import { adminLoginRequest } from "@/lib/admin-auth-api";
import {
  clearAuthSession,
  readAuthSession,
  writeAuthSession,
} from "@/lib/auth-session";
import { devError, devLog } from "@/lib/dev-log";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

function mapAuthUserToAdminUser(apiUser: {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}): AdminUser {
  return {
    id: apiUser.user_id,
    name: apiUser.full_name,
    email: apiUser.email,
    role: apiUser.role,
  };
}

interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  isLoading: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hydrated: false,
  isLoading: false,
  hydrate: () => {
    const stored = readAuthSession();
    if (stored?.authenticated && stored.accessToken && stored.user) {
      devLog("AdminAuth", "Session restored", { email: stored.user.email });
      set({
        user: stored.user,
        isAuthenticated: true,
        hydrated: true,
      });
      return;
    }
    devLog("AdminAuth", "No admin session");
    set({ user: null, isAuthenticated: false, hydrated: true });
  },
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await adminLoginRequest(email, password);
      const user = mapAuthUserToAdminUser(result.user);
      writeAuthSession({
        authenticated: true,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        user,
      });
      devLog("AdminAuth", "Login success", {
        user_id: result.user.user_id,
        email: result.user.email,
        role: result.user.role,
      });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      devError("AdminAuth", "Login failed", err);
      set({ isLoading: false });
      throw err;
    }
  },
  logout: () => {
    devLog("AdminAuth", "Logout");
    clearAuthSession();
    writeAuthSession({ authenticated: false });
    set({ user: null, isAuthenticated: false });
  },
}));

