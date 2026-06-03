'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  GitBranch,
  DollarSign,
  Calendar,
  Download,
  Loader2,
  RefreshCw,
  AlertCircle,
  ListFilter,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FilterField, PAGE_FILTER_CONTROL_CLASS } from '@/components/filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  useIncomeData,
  INCOME_RANGE_LABELS,
  type IncomeTableRow,
  type IncomeRangeKey,
} from '@/hooks/use-income-data';

function downloadCsv(filename: string, rows: IncomeTableRow[]) {
  const header = ['From', 'Date', 'Amount (INR)', 'Status'];
  const lines = [
    header.join(','),
    ...rows.map((r) => {
      const from = `"${String(r.from).replace(/"/g, '""')}"`;
      const date = new Date(r.date).toISOString();
      const amt = r.amountRupees.toFixed(2);
      return [from, date, amt, r.status].join(',');
    }),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type IncomeStatusFilter = 'all' | 'completed' | 'pending';

function applyIncomeTableFilters(
  rows: IncomeTableRow[],
  fromQuery: string,
  statusFilter: IncomeStatusFilter,
): IncomeTableRow[] {
  const q = fromQuery.trim().toLowerCase();
  return rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (!q) return true;
    if (r.from.toLowerCase().includes(q)) return true;
    if (r.level != null && `level ${r.level}`.includes(q)) return true;
    return false;
  });
}

export default function IncomePage() {
  const {
    range,
    setRange,
    totalEarningsInRangeRupees,
    directCommissionInRangeRupees,
    binaryCommissionInRangeRupees,
    levelIncomeInRangeRupees,
    directRows,
    binaryRows,
    levelRows,
    loading,
    error,
    refresh,
  } = useIncomeData();

  const rangeCaption = INCOME_RANGE_LABELS[range];

  const [activeTab, setActiveTab] = React.useState<'direct' | 'binary' | 'level'>('direct');
  const [fromQuery, setFromQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<IncomeStatusFilter>('all');

  const activeRows =
    activeTab === 'direct' ? directRows : activeTab === 'binary' ? binaryRows : levelRows;

  const directDisplay = React.useMemo(
    () => applyIncomeTableFilters(directRows, fromQuery, statusFilter),
    [directRows, fromQuery, statusFilter],
  );
  const binaryDisplay = React.useMemo(
    () => applyIncomeTableFilters(binaryRows, fromQuery, statusFilter),
    [binaryRows, fromQuery, statusFilter],
  );
  const levelDisplay = React.useMemo(
    () => applyIncomeTableFilters(levelRows, fromQuery, statusFilter),
    [levelRows, fromQuery, statusFilter],
  );

  const activeDisplay =
    activeTab === 'direct' ? directDisplay : activeTab === 'binary' ? binaryDisplay : levelDisplay;

  const tableFiltersActive =
    fromQuery.trim() !== '' || statusFilter !== 'all' || range !== '30d';

  const clearAllFilters = React.useCallback(() => {
    setRange('30d');
    setFromQuery('');
    setStatusFilter('all');
  }, [setRange]);

  const renderTable = (baseRows: IncomeTableRow[], displayRows: IncomeTableRow[]) => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] table-fixed border-collapse text-left text-sm">
        <colgroup>
          <col className="w-[42%]" />
          <col className="w-[22%]" />
          <col className="w-[20%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="border-b border-card-border">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              From
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {baseRows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-text-muted">
                No commission credits in {rangeCaption.toLowerCase()}. Choose a longer range or All
                time, or tap Refresh after new earnings are credited.
              </td>
            </tr>
          ) : displayRows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-10 text-center text-sm text-text-muted">
                No rows match your search or status. Clear filters or change the From / status fields.
              </td>
            </tr>
          ) : (
            displayRows.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="border-b border-card-border/50 transition-colors hover:bg-card-hover/50"
              >
                <td className="max-w-0 px-4 py-4 align-top">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-text-primary">{item.from}</p>
                    {item.level != null && (
                      <p className="text-xs text-text-muted">Level {item.level}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-sm tabular-nums text-text-secondary">
                  {formatDate(item.date)}
                </td>
                <td className="px-4 py-4 align-top text-right tabular-nums">
                  <span className="number-counter font-semibold text-primary">
                    +{formatCurrency(item.amountRupees)}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-right whitespace-nowrap">
                  <Badge variant={item.status === 'completed' ? 'success' : 'warning'} size="sm">
                    {item.status}
                  </Badge>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const stats = [
    {
      label: 'Direct commission',
      value: directCommissionInRangeRupees,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Binary commission',
      value: binaryCommissionInRangeRupees,
      icon: GitBranch,
      color: 'text-secondary-light',
      bgColor: 'bg-secondary/10',
    },
    {
      label: 'Level income',
      value: levelIncomeInRangeRupees,
      icon: TrendingUp,
      color: 'text-accent-gold',
      bgColor: 'bg-accent-gold/10',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/20 to-secondary/20 p-6"
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20">
              <DollarSign className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Income details</h2>
              <p className="mt-1 text-text-secondary">
                Track all your earnings and commissions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={activeDisplay.length === 0}
              onClick={() =>
                downloadCsv(`income-${activeTab}-${range}.csv`, activeDisplay)
              }
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/20 to-primary/5 p-0">
            <CardContent className="p-4">
              <p className="text-sm text-text-secondary">Total earnings</p>
              {loading ? (
                <Loader2 className="mt-2 h-8 w-8 animate-spin text-primary" />
              ) : (
                <p className="number-counter text-2xl font-bold text-primary">
                  {formatCurrency(totalEarningsInRangeRupees)}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + index * 0.05 }}
          >
            <Card className="p-0" hover>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bgColor}`}
                  >
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">{stat.label}</p>
                    {loading ? (
                      <Loader2 className="mt-1 h-5 w-5 animate-spin text-text-muted" />
                    ) : (
                      <p className="number-counter text-lg font-bold text-text-primary">
                        {formatCurrency(stat.value)}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="overflow-hidden p-0">
          <div className="border-b border-card-border bg-card-hover/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              <ListFilter className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span>Filters</span>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-3">
              <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
                <FilterField label="Statement period" className="min-h-0 min-w-0 sm:col-span-1">
                  <Select value={range} onValueChange={(v) => setRange(v as IncomeRangeKey)}>
                    <SelectTrigger
                      className={cn(
                        PAGE_FILTER_CONTROL_CLASS,
                        'h-10 w-full border-card-border py-0',
                      )}
                      aria-label="Filter income by statement period"
                    >
                      <Calendar className="mr-2 h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent className="z-[220]">
                      <SelectItem value="7d">{INCOME_RANGE_LABELS['7d']}</SelectItem>
                      <SelectItem value="30d">{INCOME_RANGE_LABELS['30d']}</SelectItem>
                      <SelectItem value="90d">{INCOME_RANGE_LABELS['90d']}</SelectItem>
                      <SelectItem value="all">{INCOME_RANGE_LABELS.all}</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Status" className="min-h-0 min-w-0 sm:col-span-1">
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as IncomeStatusFilter)}
                  >
                    <SelectTrigger
                      className={cn(
                        PAGE_FILTER_CONTROL_CLASS,
                        'h-10 w-full border-card-border py-0',
                      )}
                    >
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="z-[220]">
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField
                  label="Search From"
                  htmlFor="income-filter-from"
                  className="min-h-0 min-w-0 sm:col-span-2 lg:col-span-1"
                >
                  <Input
                    id="income-filter-from"
                    value={fromQuery}
                    onChange={(e) => setFromQuery(e.target.value)}
                    placeholder="Description, commission type, level…"
                    className={cn(
                      PAGE_FILTER_CONTROL_CLASS,
                      'h-10 border-card-border py-0 shadow-none',
                    )}
                    autoComplete="off"
                  />
                </FilterField>
              </div>
              <div className="flex w-full shrink-0 items-end lg:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-full lg:w-auto"
                  disabled={!tableFiltersActive}
                  onClick={clearAllFilters}
                >
                  Clear filters
                </Button>
              </div>
            </div>
            {!loading && activeRows.length > 0 ? (
              <p className="mt-3 text-xs text-text-muted">
                Showing {activeDisplay.length} of {activeRows.length} in this tab
                {tableFiltersActive ? ' (filters on)' : ''}
              </p>
            ) : null}
          </div>
          <CardContent className="p-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="w-full"
            >
              <TabsList className="mb-4 grid w-full grid-cols-3 gap-1 rounded-xl bg-card-hover p-1">
                <TabsTrigger value="direct" className="w-full gap-2">
                  <Users className="h-4 w-4 shrink-0" /> Direct
                </TabsTrigger>
                <TabsTrigger value="binary" className="w-full gap-2">
                  <GitBranch className="h-4 w-4 shrink-0" /> Binary
                </TabsTrigger>
                <TabsTrigger value="level" className="w-full gap-2">
                  <TrendingUp className="h-4 w-4 shrink-0" /> Level
                </TabsTrigger>
              </TabsList>
              <TabsContent value="direct" className="m-0">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : (
                  renderTable(directRows, directDisplay)
                )}
              </TabsContent>
              <TabsContent value="binary" className="m-0">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : (
                  renderTable(binaryRows, binaryDisplay)
                )}
              </TabsContent>
              <TabsContent value="level" className="m-0">
                {loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  </div>
                ) : (
                  renderTable(levelRows, levelDisplay)
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
