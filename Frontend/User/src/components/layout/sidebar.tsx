'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Network,
  Trophy,
  TrendingUp,
  Wallet,
  Banknote,
  Package,
  ArrowLeftRight,
  Headphones,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/useAuthStore';
import { navigationItems } from '@/lib/dummy-data';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  UserPlus,
  Users,
  Network,
  Trophy,
  TrendingUp,
  Wallet,
  Banknote,
  Package,
  ArrowLeftRight,
  Headphones,
  Settings,
  Gift,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full flex-col border-r border-card-border bg-background-secondary transition-all duration-300',
          collapsed ? 'w-[72px]' : 'w-[280px]'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-card-border px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-light shadow-lg shadow-primary/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-lg font-bold gradient-text whitespace-nowrap"
              >
                Secure Binary
              </motion.span>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = iconMap[item.icon];

            const navLink = (
              <Link
                href={item.href}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:bg-card-hover hover:text-text-primary',
                  item.highlight && !isActive && 'text-primary'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    isActive && 'text-primary',
                    item.highlight && !isActive && 'text-primary'
                  )}
                />
                {!collapsed && (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate">{item.label}</span>
                  </div>
                )}
                {!collapsed && item.highlight && (
                  <Badge variant="primary" size="sm">
                    New
                  </Badge>
                )}
                {!collapsed && !item.apiWired && (
                  <Badge variant="warning" size="sm" className="shrink-0 whitespace-nowrap">
                    api not wired
                  </Badge>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                  <TooltipContent side="right" className="flex max-w-[240px] flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {item.label}
                      {item.highlight && (
                        <Badge variant="primary" size="sm">
                          New
                        </Badge>
                      )}
                      {!item.apiWired && (
                        <Badge variant="warning" size="sm">
                          api not wired
                        </Badge>
                      )}
                    </span>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={item.id}>{navLink}</div>;
          })}
        </nav>

        {/* User Card */}
        <div className="border-t border-card-border p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl bg-card p-3',
              collapsed && 'justify-center'
            )}
          >
            <Avatar size="md">
              <AvatarImage src={user?.avatar} alt={user?.name} />
              <AvatarFallback>
                {user?.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 truncate">
                <p className="truncate text-sm font-medium text-text-primary">
                  {user?.name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="gold" size="sm">
                    {user?.rank}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-card-border p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
