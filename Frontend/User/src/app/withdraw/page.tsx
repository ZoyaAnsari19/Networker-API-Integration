'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Info,
  Eye,
  EyeOff,
  KeyRound,
  Link2,
  Loader2,
  Plus,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  useWithdrawData,
  type PayoutRecord,
  type PayoutWalletType,
  type WithdrawalSchedule,
} from '@/hooks/use-withdraw-data';
import { useProfileData } from '@/hooks/use-profile-data';
import {
  DateFilterField,
  FilterField,
  PageFilterBar,
  PAGE_FILTER_CONTROL_CLASS,
} from '@/components/filters';

const paiseToRupees = (p: number) => (p || 0) / 100;
const rupeesToPaise = (r: number) => Math.round(r * 100);

function walletLabel(type: string): string {
  if (type === 'DIRECT') return 'Main wallet';
  if (type === 'TEAM') return 'Team royalty';
  return type;
}

function statusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'outline' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'success';
  if (s === 'PENDING' || s === 'PROCESSING' || s === 'APPROVED') return 'warning';
  if (s === 'REJECTED' || s === 'FAILED') return 'danger';
  return 'outline';
}

type Alert = { kind: 'success' | 'error' | 'info'; message: string } | null;

function AlertBanner({ alert, onClose }: { alert: Alert; onClose: () => void }) {
  if (!alert) return null;
  const styles: Record<NonNullable<Alert>['kind'], string> = {
    success: 'border-green-500/30 bg-green-500/10 text-green-400',
    error: 'border-accent-red/30 bg-accent-red/10 text-accent-red',
    info: 'border-accent-blue/30 bg-accent-blue/10 text-accent-blue',
  };
  const Icon =
    alert.kind === 'error'
      ? AlertCircle
      : alert.kind === 'success'
        ? CheckCircle2
        : Loader2;
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 rounded-lg border p-3 text-sm',
        styles[alert.kind],
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{alert.message}</span>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-current/70 hover:text-current"
        aria-label="Dismiss"
      >
        <XCircle className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatAllowedDates(days: number[]): string {
  if (!days?.length) return '—';
  const uniq: number[] = [];
  for (const d of days) {
    if (!uniq.includes(d)) uniq.push(d);
  }
  uniq.sort((a, b) => a - b);
  return uniq.join(', ');
}

function truncateText(s: string | null | undefined, max: number): string {
  if (!s) return '—';
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function filterPayoutsLocal(
  rows: PayoutRecord[],
  f: {
    status: string;
    wallet: 'all' | 'DIRECT' | 'TEAM';
    q: string;
    from: string;
    to: string;
  },
): PayoutRecord[] {
  const q = f.q.trim().toLowerCase();
  return rows.filter((row) => {
    if (f.status !== 'all' && row.status.toUpperCase() !== f.status.toUpperCase()) return false;
    if (f.wallet !== 'all' && row.wallet_type.toUpperCase() !== f.wallet) return false;
    if (q) {
      const blob = [
        row.payout_id,
        row.wallet_type,
        row.status,
        row.payment_method ?? '',
        row.sc_tx_reference ?? '',
        row.admin_note ?? '',
        String(row.requested_amount),
        String(row.net_payout_paise),
        row.requested_at,
        row.processed_at ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (f.from) {
      const t = new Date(row.requested_at).getTime();
      const fromT = new Date(`${f.from}T00:00:00`).getTime();
      if (t < fromT) return false;
    }
    if (f.to) {
      const t = new Date(row.requested_at).getTime();
      const toT = new Date(`${f.to}T23:59:59.999`).getTime();
      if (t > toT) return false;
    }
    return true;
  });
}

function WithdrawalDatesNote({
  schedule,
  loading,
}: {
  schedule: WithdrawalSchedule | null;
  loading: boolean;
}) {
  if (loading && !schedule) {
    return <p className="text-text-muted">Loading withdrawal rules…</p>;
  }
  if (!schedule) {
    return <p className="text-text-muted">Withdrawal schedule could not be loaded.</p>;
  }
  const mainStr = formatAllowedDates(schedule.allowed_dates_direct);
  const teamStr = formatAllowedDates(schedule.allowed_dates_team);
  const sameAllowed = mainStr === teamStr;

  if (sameAllowed) {
    return (
      <p>
        <span className="text-text-muted">Allowed withdrawal dates</span>{' '}
        <span className="text-text-muted">(day of month · both wallets):</span>{' '}
        <span className="font-mono text-base font-semibold text-primary">{mainStr}</span>
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p>
        <span className="font-medium text-text-primary">Main wallet</span>{' '}
        <span className="text-text-muted">— allowed dates:</span>{' '}
        <span className="font-mono font-semibold text-primary">{mainStr}</span>
      </p>
      <p>
        <span className="font-medium text-text-primary">Team wallet</span>{' '}
        <span className="text-text-muted">— allowed dates:</span>{' '}
        <span className="font-mono font-semibold text-primary">{teamStr}</span>
      </p>
    </div>
  );
}

export default function WithdrawPage() {
  const { profile, loading: profileLoading } = useProfileData();
  const {
    schedule,
    payouts,
    meta,
    loading,
    error,
    refresh,
    fetchPayouts,
    requestPayout,
  } = useWithdrawData();

  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [walletType, setWalletType] = React.useState<PayoutWalletType>('DIRECT');
  const [amountRupees, setAmountRupees] = React.useState('');
  const [txnPassword, setTxnPassword] = React.useState('');
  const [showTxn, setShowTxn] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const [historyStatus, setHistoryStatus] = React.useState<string>('all');
  const [historyWallet, setHistoryWallet] = React.useState<'all' | 'DIRECT' | 'TEAM'>('all');
  const [historySearch, setHistorySearch] = React.useState('');
  const [historyRequestedFrom, setHistoryRequestedFrom] = React.useState('');
  const [historyRequestedTo, setHistoryRequestedTo] = React.useState('');

  const directPaise = profile?.direct_wallet_balance ?? 0;
  const teamPaise = profile?.team_wallet_balance ?? 0;
  const balancePaise = walletType === 'DIRECT' ? directPaise : teamPaise;

  const minPaise = schedule?.min_withdrawal_paise ?? 50000;
  const todayOk =
    walletType === 'DIRECT'
      ? schedule?.today_allowed_for_direct
      : schedule?.today_allowed_for_team;
  const withinIst = schedule?.within_time_window ?? false;

  const amountPaise = rupeesToPaise(parseFloat(amountRupees) || 0);
  const grossRupees = paiseToRupees(amountPaise);
  const scEst =
    schedule && amountPaise > 0
      ? Math.floor((amountPaise * (schedule.service_charge_percent * 100)) / 10000)
      : 0;
  const tdsEst =
    schedule && amountPaise > 0
      ? Math.floor((amountPaise * (schedule.tds_percent * 100)) / 10000)
      : 0;
  const netEst = amountPaise - scEst - tdsEst;

  const canSubmit =
    amountPaise >= minPaise &&
    amountPaise <= balancePaise &&
    txnPassword.length > 0 &&
    withinIst &&
    todayOk;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await requestPayout({
        walletType,
        amountPaise,
        transactionPassword: txnPassword,
        paymentMethod: 'SECURE_WALLET',
      });
      setTxnPassword('');
      setAmountRupees('');
      setWithdrawOpen(false);
      setAlert({ kind: 'success', message: 'Withdrawal request submitted.' });
      await refresh();
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const onWithdrawDialogChange = (open: boolean) => {
    setWithdrawOpen(open);
    if (open) {
      setTxnPassword('');
      setShowTxn(false);
      setAlert((a) => (a?.kind === 'error' ? null : a));
    }
  };

  const filteredPayouts = React.useMemo(
    () =>
      filterPayoutsLocal(payouts, {
        status: historyStatus,
        wallet: historyWallet,
        q: historySearch,
        from: historyRequestedFrom,
        to: historyRequestedTo,
      }),
    [
      payouts,
      historyStatus,
      historyWallet,
      historySearch,
      historyRequestedFrom,
      historyRequestedTo,
    ],
  );

  const historyFiltersActive =
    historyStatus !== 'all' ||
    historyWallet !== 'all' ||
    historySearch.trim() !== '' ||
    historyRequestedFrom !== '' ||
    historyRequestedTo !== '';

  const historyStatusOptions = React.useMemo(() => {
    const s = new Set<string>();
    for (const p of payouts) s.add(p.status.toUpperCase());
    return Array.from(s).sort();
  }, [payouts]);

  const clearHistoryFilters = () => {
    setHistoryStatus('all');
    setHistoryWallet('all');
    setHistorySearch('');
    setHistoryRequestedFrom('');
    setHistoryRequestedTo('');
  };

  React.useEffect(() => {
    if (historyStatus === 'all') return;
    if (!historyStatusOptions.includes(historyStatus)) setHistoryStatus('all');
  }, [historyStatus, historyStatusOptions]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl border border-accent-gold/25 bg-gradient-to-r from-accent-gold/15 to-accent-red/10 p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-gold/20">
            <Banknote className="h-7 w-7 text-accent-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-text-primary">Withdraw</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Request a payout from your Main or Team wallet into your Secure Wallet only. Amounts are in
              INR; limits follow admin rules and today&apos;s calendar window.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0 gap-2"
            onClick={() => onWithdrawDialogChange(true)}
          >
            <Plus className="h-5 w-5" />
            New withdrawal
          </Button>
        </div>
      </motion.div>

      {error && (
        <Card className="border-accent-red/30 bg-accent-red/5 p-4">
          <div className="flex gap-2 text-sm text-accent-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void refresh()}>
            Retry
          </Button>
        </Card>
      )}

      <AlertBanner alert={alert} onClose={() => setAlert(null)} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-col gap-3 rounded-xl border border-white/10 bg-background-secondary/80 p-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex min-w-0 flex-1 gap-3 text-sm leading-relaxed text-text-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <WithdrawalDatesNote schedule={schedule} loading={loading} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 self-start text-primary hover:text-primary-light"
          onClick={() => void refresh()}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Refresh rules
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <Card className="overflow-hidden p-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-card-border p-5">
            <div>
              <CardTitle className="text-lg">Withdrawal history</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Payout requests for your account. Pagination loads each page from the server; filters narrow only the
                rows shown on the current page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {historyFiltersActive && (
                <Badge variant="info" size="sm" className="shrink-0">
                  {filteredPayouts.length} / {payouts.length} on page
                </Badge>
              )}
              {meta.total > 0 && (
                <Badge variant="outline" size="sm" className="shrink-0">
                  {meta.total} total
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading && payouts.length === 0 ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : payouts.length === 0 ? (
              <p className="p-8 text-center text-sm text-text-muted">No withdrawal requests yet.</p>
            ) : (
              <>
                <PageFilterBar
                  onClear={clearHistoryFilters}
                  clearDisabled={!historyFiltersActive}
                >
                  <FilterField label="Status">
                    <Select value={historyStatus} onValueChange={setHistoryStatus}>
                      <SelectTrigger className={PAGE_FILTER_CONTROL_CLASS}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="z-[220]">
                        <SelectItem value="all">All statuses</SelectItem>
                        {historyStatusOptions.map((st) => (
                          <SelectItem key={st} value={st}>
                            {st.charAt(0) + st.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <FilterField label="Wallet">
                    <Select
                      value={historyWallet}
                      onValueChange={(v) => setHistoryWallet(v as 'all' | 'DIRECT' | 'TEAM')}
                    >
                      <SelectTrigger className={PAGE_FILTER_CONTROL_CLASS}>
                        <SelectValue placeholder="Wallet" />
                      </SelectTrigger>
                      <SelectContent className="z-[220]">
                        <SelectItem value="all">All wallets</SelectItem>
                        <SelectItem value="DIRECT">Main (direct)</SelectItem>
                        <SelectItem value="TEAM">Team royalty</SelectItem>
                      </SelectContent>
                    </Select>
                  </FilterField>
                  <DateFilterField
                    id="withdraw-filter-from"
                    label="Requested from"
                    value={historyRequestedFrom}
                    onChange={setHistoryRequestedFrom}
                  />
                  <DateFilterField
                    id="withdraw-filter-to"
                    label="Requested to"
                    value={historyRequestedTo}
                    onChange={setHistoryRequestedTo}
                  />
                  <FilterField
                    label="Search"
                    htmlFor="withdraw-filter-search"
                    className="sm:col-span-2 lg:col-span-1 xl:col-span-2"
                  >
                    <Input
                      id="withdraw-filter-search"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="ID, reference, note, amount…"
                      className={PAGE_FILTER_CONTROL_CLASS}
                    />
                  </FilterField>
                </PageFilterBar>
                <div className="overflow-x-auto">
                  {filteredPayouts.length === 0 ? (
                    <p className="p-8 text-center text-sm text-text-muted">
                      No rows match these filters on this page. Clear filters or change page.
                    </p>
                  ) : (
                    <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-card-border bg-card-hover/80 text-xs uppercase tracking-wide text-text-muted">
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Requested
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Wallet
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm text-right">
                            Gross
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm text-right">
                            Service
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm text-right">
                            TDS
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm text-right">
                            Net
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Status
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Processed
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Reference
                          </th>
                          <th className="sticky top-0 z-[1] bg-card-hover/95 px-4 py-3 font-medium backdrop-blur-sm">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border/80">
                        {filteredPayouts.map((row) => (
                          <PayoutTableRow key={row.payout_id} row={row} />
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
            {meta.total_pages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-card-border bg-card-hover/30 px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => void fetchPayouts(meta.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-xs text-text-muted">
                  Page {meta.page} of {meta.total_pages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.total_pages || loading}
                  onClick={() => void fetchPayouts(meta.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={withdrawOpen} onOpenChange={onWithdrawDialogChange}>
        <DialogContent className="flex max-h-[min(90vh,calc(100vh-1.5rem))] max-w-lg flex-col gap-0 p-0">
          <DialogHeader>
            <DialogTitle>New withdrawal</DialogTitle>
            <DialogDescription>
              Funds are sent to your Secure Wallet using the email on your profile. Minimum and calendar rules
              apply.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">
            <div className="space-y-4">
              {alert?.kind === 'error' && withdrawOpen && (
                <div className="flex gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              )}

              {schedule && (
                <div className="rounded-xl border border-white/12 bg-background p-4 text-sm space-y-2 shadow-inner">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium text-primary">
                      {walletLabel(walletType).toUpperCase()}
                    </span>
                    <span className="text-lg font-bold text-text-primary">
                      {formatCurrency(paiseToRupees(balancePaise))}
                    </span>
                  </div>
                  <p className="text-text-secondary">
                    Min withdrawal: {formatCurrency(paiseToRupees(minPaise))} · Service charge{' '}
                    {schedule.service_charge_percent}% · TDS {schedule.tds_percent}%
                  </p>
                </div>
              )}

              {!withinIst && schedule && (
                <div className="flex gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Withdrawals are only allowed between {schedule.ist_start_hour}:00 and{' '}
                  {schedule.ist_end_hour}:00 IST.
                </div>
              )}

              {schedule && !todayOk && (
                <div className="flex gap-2 rounded-lg border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  This wallet type is not open for withdrawals today. Allowed calendar days:{' '}
                  {formatAllowedDates(
                    walletType === 'DIRECT'
                      ? schedule.allowed_dates_direct
                      : schedule.allowed_dates_team,
                  )}
                  .
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Withdraw from wallet <span className="text-accent-red">*</span>
                  </label>
                  <Select
                    value={walletType}
                    onValueChange={(v) => setWalletType(v as PayoutWalletType)}
                  >
                    <SelectTrigger className="border-white/12 bg-background text-text-primary">
                      <SelectValue placeholder="Wallet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIRECT">Main wallet (direct)</SelectItem>
                      <SelectItem value="TEAM">Team royalty wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-xl border border-white/12 bg-background p-4 space-y-3 shadow-inner">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Link2 className="h-4 w-4 text-primary" />
                    Secure Wallet
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-text-secondary">Connected wallet ID</p>
                      <p className="font-mono text-text-primary break-all text-xs">
                        {profile?.secure_wallet_external_id?.trim()
                          ? profile.secure_wallet_external_id
                          : 'Not linked yet'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Current balance (Secure Wallet)</p>
                      <p className="text-lg font-semibold text-primary">
                        {profile?.secure_wallet_balance_paise != null
                          ? formatCurrency(paiseToRupees(profile.secure_wallet_balance_paise))
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    Wallet linking and live balance sync will be enabled in a later release. Approved
                    withdrawals are still credited via the Secure platform using your account email on file.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Amount (₹) <span className="text-accent-red">*</span>
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    placeholder="Enter amount"
                    disabled={profileLoading}
                    className="border-white/12 bg-background placeholder:text-text-secondary/90"
                  />
                  <p className="text-xs text-text-secondary">
                    Available: {formatCurrency(paiseToRupees(balancePaise))} · Max this request: same as balance
                    (subject to monthly cap when configured).
                  </p>
                </div>

                {amountPaise > 0 && schedule && (
                  <div className="rounded-lg border border-white/10 bg-background p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Gross</span>
                      <span>{formatCurrency(grossRupees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Est. service charge</span>
                      <span>{formatCurrency(paiseToRupees(scEst))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Est. TDS</span>
                      <span>{formatCurrency(paiseToRupees(tdsEst))}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/10 pt-2 font-medium">
                      <span>Est. net payout</span>
                      <span className="text-primary">{formatCurrency(paiseToRupees(netEst))}</span>
                    </div>
                    {netEst <= 0 && (
                      <p className="text-accent-red text-xs pt-1">
                        Amount too low after fees — increase the amount.
                      </p>
                    )}
                  </div>
                )}

                <div className="relative space-y-2">
                  <label className="text-sm font-medium text-text-secondary">
                    Transaction password <span className="text-accent-red">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      type={showTxn ? 'text' : 'password'}
                      value={txnPassword}
                      onChange={(e) => setTxnPassword(e.target.value)}
                      placeholder="Enter transaction password"
                      className="border-white/12 bg-background pr-11 placeholder:text-text-secondary/90"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
                      onClick={() => setShowTxn((s) => !s)}
                      aria-label={showTxn ? 'Hide password' : 'Show password'}
                    >
                      {showTxn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary flex items-center gap-1">
                    <KeyRound className="h-3.5 w-3.5" />
                    Required to confirm this withdrawal.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWithdrawOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="min-w-[10rem]"
                    disabled={!canSubmit || submitting || netEst <= 0}
                    loading={submitting}
                  >
                    {submitting ? 'Submitting…' : 'Request withdrawal'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutTableRow({ row }: { row: PayoutRecord }) {
  return (
    <tr className="transition-colors hover:bg-card-hover/50">
      <td className="whitespace-nowrap px-4 py-3 text-text-secondary align-top">
        {formatDate(row.requested_at)}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 shrink-0 text-text-muted" />
          <span className="font-medium text-text-primary">{walletLabel(row.wallet_type)}</span>
        </div>
        <p className="mt-1 text-[11px] text-text-muted">{row.payment_method}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums align-top">
        {formatCurrency(paiseToRupees(row.requested_amount))}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-text-secondary tabular-nums align-top">
        {formatCurrency(paiseToRupees(row.service_charge_paise))}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-text-secondary tabular-nums align-top">
        {formatCurrency(paiseToRupees(row.tds_paise))}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-primary tabular-nums align-top">
        {formatCurrency(paiseToRupees(row.net_payout_paise))}
      </td>
      <td className="whitespace-nowrap px-4 py-3 align-top">
        <Badge variant={statusBadgeVariant(row.status)} size="sm">
          {row.status.toLowerCase()}
        </Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-text-secondary align-top">
        {row.processed_at ? formatDate(row.processed_at) : '—'}
      </td>
      <td className="max-w-[140px] px-4 py-3 align-top">
        <span className="break-all font-mono text-[11px] text-text-muted" title={row.sc_tx_reference ?? undefined}>
          {truncateText(row.sc_tx_reference, 28)}
        </span>
      </td>
      <td className="max-w-[200px] px-4 py-3 align-top text-xs text-text-secondary">
        <span title={row.admin_note ?? undefined}>{truncateText(row.admin_note, 80)}</span>
      </td>
    </tr>
  );
}
