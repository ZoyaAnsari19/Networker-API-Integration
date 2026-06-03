'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  Layers,
  Package,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { RelativeTime } from '@/components/ui/relative-time';
import type { TeamMember } from '@/hooks/use-team-data';

interface TeamListProps {
  side: 'left' | 'right';
  members: TeamMember[];
  loading?: boolean;
}

const PKG_ALL = 'all';
const PKG_NONE = '__none__';
const LV_ALL = 'all';

export function TeamList({ side, members, loading = false }: TeamListProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [packageFilter, setPackageFilter] = React.useState<string>(PKG_ALL);
  const [levelFilter, setLevelFilter] = React.useState<string>(LV_ALL);

  const normalizedMembers = members ?? [];

  const packageOptions = React.useMemo(() => {
    const names = new Set<string>();
    let hasUnassigned = false;
    for (const m of normalizedMembers) {
      if (m.package_name) names.add(m.package_name);
      else hasUnassigned = true;
    }
    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
    return { names: sorted, hasUnassigned };
  }, [normalizedMembers]);

  const levelOptions = React.useMemo(() => {
    const depths = new Set(normalizedMembers.map((m) => m.depth));
    return Array.from(depths).sort((a, b) => a - b);
  }, [normalizedMembers]);

  const filteredMembers = normalizedMembers.filter((member) => {
    const name = member.full_name.toLowerCase();
    const email = member.email.toLowerCase();
    const matchesSearch =
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase()) ||
      member.sponsor_id.toLowerCase().includes(search.toLowerCase());

    const statusLower = member.status.toLowerCase();
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && statusLower === 'active') ||
      (statusFilter === 'inactive' && statusLower !== 'active');

    const matchesPackage =
      packageFilter === PKG_ALL ||
      (packageFilter === PKG_NONE && !member.package_name) ||
      member.package_name === packageFilter;

    const matchesLevel =
      levelFilter === LV_ALL || String(member.depth) === levelFilter;

    return matchesSearch && matchesStatus && matchesPackage && matchesLevel;
  });

  const totalVolume = normalizedMembers.reduce((sum, m) => sum + m.volume, 0);
  const activeCount = normalizedMembers.filter(
    (m) => m.status === 'ACTIVE',
  ).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPackageFilter(PKG_ALL);
    setLevelFilter(LV_ALL);
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    packageFilter !== PKG_ALL ||
    levelFilter !== LV_ALL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card className="p-0">
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl',
                  side === 'left'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-orange-500/10 text-orange-400',
                )}
              >
                {side === 'left' ? (
                  <ArrowLeft className="h-5 w-5" />
                ) : (
                  <ArrowRight className="h-5 w-5" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {side === 'left' ? 'Left' : 'Right'} Team
                  <Badge
                    variant={side === 'left' ? 'info' : 'warning'}
                    size="sm"
                  >
                    {normalizedMembers.length}
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                  <span>{activeCount} active</span>
                  <span>•</span>
                  <span>{formatCurrency(totalVolume / 100, 0)} volume</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Input
              placeholder="Search by name, email or SPF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              className="h-9"
            />

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as 'all' | 'active' | 'inactive')
                }
              >
                <SelectTrigger className="h-9 w-[min(100%,140px)] sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status: All</SelectItem>
                  <SelectItem value="active">Status: Active</SelectItem>
                  <SelectItem value="inactive">Status: Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={packageFilter} onValueChange={setPackageFilter}>
                <SelectTrigger className="h-9 w-[min(100%,180px)] sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
                  <Package className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  <SelectValue placeholder="Package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PKG_ALL}>Package: All</SelectItem>
                  {packageOptions.hasUnassigned && (
                    <SelectItem value={PKG_NONE}>Package: None</SelectItem>
                  )}
                  {packageOptions.names.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-9 w-[min(100%,140px)] sm:w-[140px]">
                  <Layers className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-60" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={LV_ALL}>Level: All</SelectItem>
                  {levelOptions.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Level {d}
                      {d === 1 ? ' (direct)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs text-text-muted"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="max-h-[480px] overflow-y-auto">
            {loading && normalizedMembers.length === 0 ? (
              <div className="p-8 text-center text-text-secondary text-sm">
                Loading team members…
              </div>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => {
                const initials = member.full_name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase();

                const depthHue =
                  side === 'left'
                    ? 'from-blue-500/35 to-blue-500/5'
                    : 'from-orange-500/35 to-orange-500/5';

                return (
                  <motion.div
                    key={member.user_id}
                    initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                    className="flex items-stretch gap-0 border-b border-card-border last:border-0 hover:bg-card-hover/50 transition-colors"
                  >
                    {/* Depth rail — level as visual depth, not a cramped badge */}
                    <div
                      className={cn(
                        'flex w-9 shrink-0 flex-col items-center justify-center border-r border-card-border/60 bg-gradient-to-b',
                        depthHue,
                      )}
                      title={`Level ${member.depth} — ${member.depth === 1 ? 'direct on this leg' : 'indirect downline'}`}
                    >
                      <span className="text-[9px] font-medium uppercase tracking-wide text-text-muted/90">
                        Lvl
                      </span>
                      <span className="text-sm font-semibold tabular-nums leading-none text-text-primary">
                        {member.depth}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-4 pl-3">
                      <Avatar size="sm">
                        <AvatarFallback>{initials || '?'}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {member.full_name}
                          </p>
                          {member.is_direct && (
                            <Badge variant="primary" size="sm">
                              Direct
                            </Badge>
                          )}
                          {member.package_name && (
                            <Badge variant="info" size="sm">
                              {member.package_name}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted truncate">
                          {member.sponsor_id}
                          <span className="mx-1.5 text-card-border">·</span>
                          <span className="text-text-secondary/90">
                            Level {member.depth}
                            {member.depth === 1
                              ? ' — direct'
                              : ` — ${member.depth} hops below you`}
                          </span>
                          <span className="mx-1.5 text-card-border">·</span>
                          Joined <RelativeTime value={member.joined_at} />
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          variant={
                            member.status === 'ACTIVE' ? 'success' : 'warning'
                          }
                          size="sm"
                          className="gap-1"
                        >
                          {member.status === 'ACTIVE' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                        </Badge>
                        <div className="hidden text-right sm:block">
                          <p className="text-xs text-text-muted">Volume</p>
                          <p className="text-sm font-medium text-text-primary">
                            {formatCurrency(member.volume / 100, 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : normalizedMembers.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-12 w-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary">
                  {side === 'left'
                    ? 'Left leg is empty — invite someone and place them here.'
                    : 'Right leg is empty — invite someone and place them here.'}
                </p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-text-muted" />
                <p className="text-text-secondary text-sm">
                  No members match your filters.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
