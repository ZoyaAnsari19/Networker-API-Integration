'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Loader2,
  Search,
  Send,
  User,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import {
  useP2PData,
  type P2PLookup,
  type P2PTransfer,
} from '@/hooks/use-p2p-data';

type Alert = { kind: 'success' | 'error' | 'info'; message: string } | null;

/** Amounts on the API are in paise; the UI shows rupees. */
const paiseToRupees = (p: number) => (p || 0) / 100;
const rupeesToPaise = (r: number) => Math.round(r * 100);

// Quick-select chips expressed in rupees so the UI reads naturally; each
// gets translated to paise before hitting the API.
const QUICK_AMOUNTS: { label: string; rupees: number }[] = [
  { label: '₹100', rupees: 100 },
  { label: '₹500', rupees: 500 },
  { label: '₹1,000', rupees: 1000 },
  { label: '₹5,000', rupees: 5000 },
];

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
      className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${styles[alert.kind]}`}
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

function TransferRow({ tx }: { tx: P2PTransfer }) {
  const isOut = tx.direction === 'OUT';
  const Icon = isOut ? ArrowUpRight : ArrowDownLeft;
  const rupees = paiseToRupees(isOut ? tx.amount : tx.net_amount);
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-card-hover">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isOut ? 'bg-accent-red/10 text-accent-red' : 'bg-green-500/10 text-green-400'
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {isOut ? 'To ' : 'From '}
          {tx.counterparty_name || (isOut ? tx.receiver_sponsor_id : tx.sender_sponsor_id)}
        </p>
        <p className="text-xs text-text-muted">
          {isOut ? tx.receiver_sponsor_id : tx.sender_sponsor_id} ·{' '}
          {formatRelativeTime(tx.created_at)}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${isOut ? 'text-accent-red' : 'text-green-400'}`}>
          {isOut ? '−' : '+'}
          {formatCurrency(rupees)}
        </p>
        {isOut && tx.service_charge > 0 && (
          <p className="text-[11px] text-text-muted">
            fee {formatCurrency(paiseToRupees(tx.service_charge))}
          </p>
        )}
      </div>
    </div>
  );
}

export default function P2PPage() {
  const {
    wallets,
    quote,
    transfers,
    loading,
    error,
    refresh,
    refreshQuote,
    lookupReceiver,
    transfer,
  } = useP2PData();

  const [sponsorId, setSponsorId] = React.useState('');
  const [lookupState, setLookupState] = React.useState<{
    loading: boolean;
    result: P2PLookup | null;
    error: string | null;
  }>({ loading: false, result: null, error: null });

  const [amountStr, setAmountStr] = React.useState('');
  const [txnPassword, setTxnPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [alert, setAlert] = React.useState<Alert>(null);

  const availablePaise = wallets?.direct_balance ?? 0;
  const minPaise = quote?.min_amount_paise ?? 10000;
  const chargePercent = quote?.service_charge_percent ?? 0;
  const enabled = quote?.enabled ?? true;

  // Debounced SPF lookup — auto-resolves the receiver name/status
  // ~400ms after the user stops typing, so the UI feels live without
  // hammering the API on every keystroke.
  React.useEffect(() => {
    const raw = sponsorId.trim();
    if (raw.length < 3) {
      setLookupState({ loading: false, result: null, error: null });
      return;
    }
    setLookupState((s) => ({ ...s, loading: true, error: null }));
    const handle = window.setTimeout(async () => {
      try {
        const res = await lookupReceiver(raw);
        setLookupState({ loading: false, result: res, error: null });
      } catch (e) {
        setLookupState({
          loading: false,
          result: null,
          error: e instanceof Error ? e.message : 'Lookup failed',
        });
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [sponsorId, lookupReceiver]);

  // Debounced quote fetch as amount changes, so the service-charge line
  // updates smoothly without issuing a quote request per keystroke.
  React.useEffect(() => {
    const r = parseFloat(amountStr || '0');
    if (!Number.isFinite(r) || r <= 0) return;
    const handle = window.setTimeout(() => {
      refreshQuote(rupeesToPaise(r));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [amountStr, refreshQuote]);

  const amountPaise = React.useMemo(() => {
    const r = parseFloat(amountStr || '0');
    return Number.isFinite(r) && r > 0 ? rupeesToPaise(r) : 0;
  }, [amountStr]);

  const servicePaise = React.useMemo(() => {
    if (!amountPaise) return 0;
    if (quote?.amount === amountPaise && typeof quote?.service_charge === 'number') {
      return quote.service_charge;
    }
    return Math.floor((amountPaise * (chargePercent * 100)) / 10000);
  }, [amountPaise, quote, chargePercent]);
  const netPaise = Math.max(0, amountPaise - servicePaise);

  const receiverOk =
    !!lookupState.result?.eligible && lookupState.result.sponsor_id;
  const amountOk = amountPaise >= minPaise && amountPaise <= availablePaise;

  const canSubmit =
    enabled &&
    !submitting &&
    !!receiverOk &&
    amountOk &&
    txnPassword.length > 0;

  const reasons: string[] = [];
  if (!enabled) reasons.push('P2P transfers are currently disabled.');
  if (!receiverOk && sponsorId.trim().length >= 3 && !lookupState.loading)
    reasons.push(lookupState.result?.reason || 'Receiver not eligible.');
  if (amountPaise > 0 && amountPaise < minPaise)
    reasons.push(`Minimum transfer is ${formatCurrency(paiseToRupees(minPaise))}.`);
  if (amountPaise > availablePaise)
    reasons.push('Amount exceeds your available balance.');

  const handleMax = () => {
    setAmountStr(paiseToRupees(availablePaise).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    if (!canSubmit || !lookupState.result) return;
    setSubmitting(true);
    try {
      const result = await transfer({
        receiverSponsorId: lookupState.result.sponsor_id,
        amountPaise,
        transactionPassword: txnPassword,
        note: note.trim() || undefined,
      });
      setAlert({
        kind: 'success',
        message: `Sent ${formatCurrency(paiseToRupees(result.amount))} to ${lookupState.result.full_name} (${result.receiver_sponsor_id}).`,
      });
      setAmountStr('');
      setTxnPassword('');
      setNote('');
    } catch (err) {
      setAlert({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Transfer failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !wallets) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl border border-accent-blue/20 bg-gradient-to-r from-accent-blue/20 to-primary/20 p-6"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-blue/20">
            <ArrowLeftRight className="h-7 w-7 text-accent-blue" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text-primary">P2P Transfer</h2>
            <p className="mt-1 text-text-secondary">
              Send Secure Coins to other active networkers instantly.
            </p>
          </div>
        </div>
      </motion.div>

      {error && !wallets && (
        <Card className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-accent-red" />
            <div>
              <p className="font-medium text-text-primary">Unable to load P2P</p>
              <p className="mt-1 text-sm text-text-muted">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm" className="mt-3">
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transfer form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="lg:col-span-2"
        >
          <Card className="p-0">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" />
                Transfer Coins
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Available balance */}
                <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 p-4">
                  <div className="flex items-center gap-3">
                    <Wallet className="h-5 w-5 text-primary" />
                    <span className="text-text-secondary">Available Balance</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(paiseToRupees(availablePaise))}
                  </span>
                </div>

                {/* Receiver ID */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Receiver Sponsor ID
                  </label>
                  <Input
                    placeholder="SPF00001"
                    value={sponsorId}
                    onChange={(e) => setSponsorId(e.target.value.toUpperCase())}
                    icon={<Search className="h-4 w-4" />}
                    className="font-mono tracking-wider"
                    autoComplete="off"
                  />

                  <AnimatePresence mode="wait">
                    {lookupState.loading && sponsorId.trim().length >= 3 && (
                      <motion.div
                        key="looking"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-xs text-text-muted"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Looking up receiver...
                      </motion.div>
                    )}
                    {!lookupState.loading && lookupState.result && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
                          lookupState.result.eligible
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-accent-red/30 bg-accent-red/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-full ${
                              lookupState.result.eligible
                                ? 'bg-green-500/15 text-green-400'
                                : 'bg-accent-red/15 text-accent-red'
                            }`}
                          >
                            <User className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-text-primary">
                              {lookupState.result.full_name || 'Not found'}
                            </p>
                            <p className="text-xs text-text-muted">
                              {lookupState.result.sponsor_id}
                              {lookupState.result.status ? ` · ${lookupState.result.status}` : ''}
                            </p>
                          </div>
                        </div>
                        {lookupState.result.eligible ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Eligible
                          </Badge>
                        ) : (
                          <Badge variant="danger" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            {lookupState.result.reason || 'Ineligible'}
                          </Badge>
                        )}
                      </motion.div>
                    )}
                    {!lookupState.loading && lookupState.error && (
                      <motion.p
                        key="err"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-accent-red"
                      >
                        {lookupState.error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Wallet selection — backend only moves DIRECT today, kept
                    as a segmented control so it's ready when TEAM lands. */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    From Wallet
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 rounded-xl border border-primary bg-primary/10 p-3">
                      <Coins className="h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-primary">Main Wallet</p>
                        <p className="text-xs text-text-muted">
                          {formatCurrency(paiseToRupees(availablePaise))}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <div
                      className="flex items-center gap-3 rounded-xl border border-card-border bg-card/50 p-3 opacity-60"
                      title="Team wallet transfers coming soon"
                    >
                      <Wallet className="h-5 w-5 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-secondary">Team Wallet</p>
                        <p className="text-xs text-text-muted">Coming soon</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Transfer Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-text-muted">
                      ₹
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder="0.00"
                      className="h-14 pl-10 text-2xl font-bold"
                      min={paiseToRupees(minPaise)}
                      step="0.01"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_AMOUNTS.map((q) => (
                      <button
                        key={q.rupees}
                        type="button"
                        disabled={rupeesToPaise(q.rupees) > availablePaise}
                        onClick={() => setAmountStr(q.rupees.toFixed(2))}
                        className="flex h-9 items-center rounded-lg border border-card-border bg-card px-3 text-xs font-medium text-text-secondary transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {q.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleMax}
                      className="flex h-9 items-center rounded-lg border border-primary/40 bg-primary/10 px-3 text-xs font-semibold text-primary transition-all hover:bg-primary/20"
                    >
                      MAX
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>Min: {formatCurrency(paiseToRupees(minPaise))}</span>
                    <span>Service charge: {chargePercent}%</span>
                  </div>
                </div>

                {/* Summary */}
                {amountPaise > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden rounded-xl border border-card-border bg-card-hover/50"
                  >
                    <div className="space-y-2 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-muted">Transfer amount</span>
                        <span className="font-medium text-text-primary">
                          {formatCurrency(paiseToRupees(amountPaise))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">
                          Service charge ({chargePercent}%)
                        </span>
                        <span className="font-medium text-accent-red">
                          −{formatCurrency(paiseToRupees(servicePaise))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-card-border pt-2">
                        <span className="font-medium text-text-secondary">
                          Receiver will get
                        </span>
                        <span className="font-semibold text-green-400">
                          {formatCurrency(paiseToRupees(netPaise))}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Txn password */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Transaction Password
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={txnPassword}
                    onChange={(e) => setTxnPassword(e.target.value)}
                    placeholder="Enter transaction password"
                    icon={<KeyRound className="h-4 w-4" />}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="text-text-muted hover:text-text-primary"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    }
                    autoComplete="off"
                  />
                  <p className="text-xs text-text-muted">
                    Need to set one?{' '}
                    <a href="/profile" className="text-primary hover:underline">
                      Configure it in your profile
                    </a>
                    .
                  </p>
                </div>

                {/* Note (optional) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Note <span className="text-text-muted">(optional)</span>
                  </label>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a short note for the receiver"
                    maxLength={140}
                  />
                </div>

                <AnimatePresence>
                  {alert && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <AlertBanner alert={alert} onClose={() => setAlert(null)} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Inline reasons (why the button is disabled) */}
                {reasons.length > 0 && amountStr !== '' && (
                  <ul className="space-y-1 text-xs text-accent-red">
                    {reasons.map((r) => (
                      <li key={r} className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" /> {r}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  type="submit"
                  className="h-12 w-full text-base"
                  disabled={!canSubmit}
                  loading={submitting}
                >
                  <Lock className="h-4 w-4" />
                  {submitting
                    ? 'Sending...'
                    : amountPaise > 0
                    ? `Send ${formatCurrency(paiseToRupees(amountPaise))}`
                    : 'Send Coins'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="p-0">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowLeftRight className="h-5 w-5 text-accent-blue" />
                Recent Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {transfers.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card-hover">
                    <ArrowLeftRight className="h-5 w-5 text-text-muted" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">
                    No transfers yet
                  </p>
                  <p className="text-xs text-text-muted">
                    Your P2P transfers will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {transfers.map((tx) => (
                    <TransferRow key={tx.transfer_id} tx={tx} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
