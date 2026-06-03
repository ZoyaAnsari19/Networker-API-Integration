'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  TrendingUp,
  Wallet,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigationItems } from '@/lib/dummy-data';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  UserPlus,
  Users,
  Trophy: TrendingUp,
  TrendingUp,
  Wallet,
};

export function MobileNav() {
  const pathname = usePathname();

  // Show only first 5 items + more
  const mainItems = navigationItems.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 bg-background-secondary/95 backdrop-blur-xl border-t border-card-border md:hidden">
      <div className="flex items-center justify-around px-2 py-2">
        {mainItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = iconMap[item.icon] || LayoutDashboard;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {!item.apiWired && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-yellow-500 ring-2 ring-background-secondary"
                    title="api not wired"
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -bottom-1 left-1/2 h-1 w-1 rounded-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="hidden max-w-[5.5rem] flex-col items-center gap-0.5 sm:flex">
                <span className="truncate text-center leading-tight">{item.label}</span>
              </span>
            </Link>
          );
        })}

        {/* More Button */}
        <Link
          href="/profile"
          className={cn(
            'flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors',
            pathname === '/profile' || pathname === '/support'
              ? 'text-primary'
              : 'text-text-muted hover:text-text-secondary'
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="hidden sm:inline">More</span>
        </Link>
      </div>
    </nav>
  );
}
