"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrate, hydrated, isAuthenticated } = useAdminAuthStore();

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!hydrated) return;
    const isLogin = pathname === "/login";

    if (!isAuthenticated && !isLogin) {
      router.replace("/login");
      return;
    }
    if (isAuthenticated && isLogin) {
      router.replace("/dashboard");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) return null;
  return <>{children}</>;
}

