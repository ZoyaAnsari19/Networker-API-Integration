"use client";

import { AuthGuard } from "@/components/auth/auth-guard";

export function AuthProviders({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
