'use client';

import * as React from 'react';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileNav } from './mobile-nav';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { ProfileDataProvider, useProfileData } from '@/hooks/use-profile-data';

interface AppLayoutProps {
  children: React.ReactNode;
}

/** Keeps sidebar/header avatar + display name in sync with profile API data. */
function ProfileSessionSync() {
  const { profile } = useProfileData();
  const updateProfile = useAuthStore((s) => s.updateProfile);
  React.useEffect(() => {
    if (!profile) return;
    updateProfile({
      name: profile.full_name,
      ...(profile.avatar_url ? { avatar: profile.avatar_url } : {}),
      ...(profile.package_name ? { package: profile.package_name } : {}),
    });
  }, [profile, updateProfile]);
  return null;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    if (!hydrated) return;
    const isLoginRoute = pathname === '/login';
    if (!isAuthenticated && !isLoginRoute) {
      router.replace('/login');
      return;
    }
    if (isAuthenticated && isLoginRoute) {
      router.replace('/');
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ProfileDataProvider>
      <ProfileSessionSync />
      <div className="min-h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
        </div>

        <MobileNav />

        <div
          className={cn(
            'min-h-screen transition-all duration-300 pb-20 md:pb-0',
            sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[280px]',
          )}
        >
          <Header sidebarCollapsed={sidebarCollapsed} />
          <main className="px-4 pt-24 md:px-6 md:pt-20">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </ProfileDataProvider>
  );
}
