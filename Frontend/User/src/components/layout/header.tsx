'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Banknote,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useThemeStore } from '@/stores/useThemeStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { recentActivity } from '@/lib/dummy-data';
import { RelativeTime } from '@/components/ui/relative-time';

const pageNames: Record<string, string> = {
  '/': 'Dashboard',
  '/invite': 'Invite & Earn',
  '/team': 'My Team',
  '/network-tree': 'Network Tree',
  '/rank': 'Rank & Progress',
  '/income': 'Income',
  '/wallet': 'Wallet',
  '/withdraw': 'Withdraw',
  '/package': 'Package',
  '/p2p': 'P2P Transfer',
  '/support': 'Support',
  '/profile': 'Profile',
};

interface HeaderProps {
  sidebarCollapsed: boolean;
}

export function Header({ sidebarCollapsed }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = pathname.replace(/\/$/, '') || '/';
  const { theme, toggleTheme, isMounted } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [notifications] = React.useState(
    recentActivity.slice(0, 5)
  );
  const [unreadCount, setUnreadCount] = React.useState(3);

  const pageName = pageNames[normalizedPath] ?? 'Dashboard';

  const handleMarkAsRead = () => {
    setUnreadCount(0);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
      <header
        className={cn(
          // Above sidebar (z-40) so portaled dropdowns and clicks aren’t blocked by stacking
          'fixed right-0 top-0 z-[60] flex h-16 items-center justify-between border-b border-card-border bg-background/80 backdrop-blur-xl px-6 transition-all duration-300',
          sidebarCollapsed ? 'left-[72px]' : 'left-[280px]'
        )}
      >
        {/* Page Title */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">{pageName}</h1>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Actions: Withdraw + Transfer */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="gold"
              size="sm"
              className="h-9 px-4"
              onClick={() => router.push('/withdraw')}
            >
              <Banknote className="h-4 w-4" />
              Withdraw
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-9 px-4"
              onClick={() => router.push('/p2p')}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
          </div>

          {/* Notifications */}
          <DropdownMenu
            modal={false}
            open={showNotifications}
            onOpenChange={setShowNotifications}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-red text-[10px] font-bold text-white"
                  >
                    {unreadCount}
                  </motion.span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[100] w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAsRead}
                    className="h-auto p-0 text-xs text-primary"
                  >
                    Mark all read
                  </Button>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer flex-col items-start gap-1 p-3"
                >
                  <div className="flex w-full items-center gap-2">
                    {notification.user && (
                      <Avatar size="sm">
                        <AvatarImage src={notification.user.avatar} />
                        <AvatarFallback>
                          {notification.user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-text-muted">
                        {notification.description}
                      </p>
                    </div>
                    {notification.amount && (
                      <Badge
                        variant={notification.amount > 0 ? 'success' : 'danger'}
                        size="sm"
                      >
                        {notification.amount > 0 ? '+' : ''}
                        ${Math.abs(notification.amount).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <RelativeTime
                    value={notification.timestamp}
                    className="text-xs text-text-muted"
                  />
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle — TooltipProvider scoped here so it doesn’t interfere with dropdowns */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={toggleTheme}>
                  {isMounted && theme === 'dark' ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle theme</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* User Menu — plain controlled div, no Radix portal complications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg pl-2 pr-3 py-1.5 hover:bg-card-hover transition-colors text-text-secondary hover:text-text-primary"
            >
              <Avatar size="sm">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback>
                  {user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', showUserMenu && 'rotate-180')} />
            </button>

            {showUserMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-[90]"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-56 z-[100] rounded-xl border border-card-border bg-background-secondary p-1 shadow-xl ring-1 ring-black/20 dark:ring-white/10">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-text-primary">{user?.name}</p>
                    <p className="text-xs text-text-muted">{user?.email}</p>
                  </div>
                  <div className="-mx-1 my-1 h-px bg-card-border" />
                  <button
                    type="button"
                    onClick={() => { router.push('/profile'); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <div className="-mx-1 my-1 h-px bg-card-border" />
                  <button
                    type="button"
                    onClick={() => { handleLogout(); setShowUserMenu(false); }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent-red hover:bg-accent-red/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
  );
}
