"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  BookOpen,
  TrendingUp,
  GitBranch,
  Landmark,
  Settings,
  LogOut,
  Menu,
  Bell,
  ChevronDown,
  ShieldCheck,
  X,
  Wallet,
  FileCheck2,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group?: "ops" | "reports" | "config";
};

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard",            icon: LayoutDashboard, label: "Dashboard",           group: "ops" },
  { path: "/users",                icon: Users,           label: "Networkers",          group: "ops" },
  { path: "/kyc-requests",         icon: FileCheck2,      label: "KYC Requests",        group: "ops" },
  { path: "/payouts",              icon: Landmark,        label: "Withdrawal requests", group: "ops" },

  { path: "/ledger",               icon: BookOpen,        label: "Wallet Ledger",       group: "reports" },
  { path: "/income/direct",        icon: TrendingUp,      label: "Direct Income",       group: "reports" },
  { path: "/income/binary",        icon: GitBranch,       label: "Binary Income",       group: "reports" },

  { path: "/packages",             icon: Package,         label: "Packages",            group: "config" },
  { path: "/notification-center",  icon: Megaphone,       label: "Notification center", group: "config" },
  { path: "/config",               icon: Settings,        label: "Platform Config",     group: "config" },
];

const GROUPS: Array<{ id: NonNullable<NavItem["group"]>; label: string }> = [
  { id: "ops",     label: "Operations" },
  { id: "reports", label: "Reports" },
  { id: "config",  label: "Configuration" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [userMenuOpen]);

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    if (pathname === "/login") {
      router.replace("/dashboard");
    }
  }, [pathname, router]);

  const isItemActive = (item: NavItem) => pathname === item.path || pathname?.startsWith(item.path + "/");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      <header className="fixed top-0 inset-x-0 z-30 h-[72px] bg-white border-b border-[var(--border)] shadow-[var(--shadow-xs)]">
        <div className="h-full px-4 sm:px-6 flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors lg:hidden"
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#4338CA] flex items-center justify-center shadow-md">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[var(--text-primary)] text-[15px] tracking-tight hidden sm:block truncate">
                Secure Binary
                <span className="text-[var(--text-muted)] font-normal text-xs ml-1.5">Admin</span>
              </span>
            </button>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3 min-w-0">
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-[var(--primary-50)] text-[var(--primary-700)] px-3 py-1 text-[11px] font-semibold">
              <Wallet className="w-3 h-3" /> Binary MLM
            </div>

            <button
              type="button"
              className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger-500)] ring-2 ring-white" />
            </button>

            <div className="h-6 w-px bg-[var(--border)] hidden sm:block" />

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg",
                  "hover:bg-[var(--border-subtle)] transition-colors cursor-pointer",
                  userMenuOpen && "bg-[var(--border-subtle)]"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--text-primary)] to-[var(--text-secondary)] flex items-center justify-center text-white font-bold text-xs">
                  A
                </div>
                <div className="hidden sm:block text-left leading-none">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Admin</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">admin@fmcg-binary.io</p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 hidden sm:block", userMenuOpen && "rotate-180")} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 py-2 bg-white rounded-xl border border-[var(--border)] shadow-[var(--shadow-xl)] animate-fade-in">
                  <div className="px-4 py-3 border-b border-[var(--border)]">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Admin</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">admin@fmcg-binary.io</p>
                  </div>
                  <div className="px-2 py-1">
                    <button
                      type="button"
                      onClick={() => { router.push("/settings"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Account settings
                    </button>
                    <button
                      type="button"
                      onClick={() => { router.push("/dashboard"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--danger-500)] hover:text-[var(--danger-600)] hover:bg-[var(--danger-50)] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed top-[72px] bottom-0 left-0 z-40 w-[260px]",
          "bg-[var(--sidebar-bg)] border-r border-[var(--border)]",
          "transform transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="flex flex-col h-full p-4 overflow-y-auto">
          <div className="space-y-4">
            {GROUPS.map((grp) => {
              const items = NAV_ITEMS.filter((n) => n.group === grp.id);
              if (items.length === 0) return null;
              return (
                <div key={grp.id}>
                  <p className="px-3 mb-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{grp.label}</p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isItemActive(item);
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => router.push(item.path)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
                            isActive
                              ? "bg-[var(--primary-50)] text-[var(--primary-600)]"
                              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
                          )}
                        >
                          <Icon className={cn("w-[18px] h-[18px] shrink-0", isActive ? "text-[var(--primary-600)]" : "text-[var(--text-muted)]")} />
                          {item.label}
                          {isActive && <span className="ml-auto w-1.5 h-5 rounded-full bg-[var(--primary-600)]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-4 space-y-0.5">
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative",
                pathname === "/settings"
                  ? "bg-[var(--primary-50)] text-[var(--primary-600)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]"
              )}
            >
              <Settings className={cn("w-[18px] h-[18px]", pathname === "/settings" ? "text-[var(--primary-600)]" : "text-[var(--text-muted)]")} />
              Settings
              {pathname === "/settings" && <span className="ml-auto w-1.5 h-5 rounded-full bg-[var(--primary-600)]" />}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--danger-500)] hover:text-[var(--danger-600)] hover:bg-[var(--danger-50)] transition-colors"
            >
              <LogOut className="w-[18px] h-[18px]" />
              Sign out
            </button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 pt-[72px] lg:pl-[260px]">
        <div className="p-6 lg:p-8">
          <div className="max-w-6xl mx-auto animate-fade-up">{children}</div>
        </div>
      </main>
    </div>
  );
}
