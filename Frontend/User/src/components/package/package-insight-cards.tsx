'use client';

import * as React from 'react';
import { Box, Timer, ShoppingBag, Coins } from 'lucide-react';
import { CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils';
import {
  MONTHLY_INCOME_THRESHOLD_PAISE,
  MONTHLY_SHOPPING_THRESHOLD_PAISE,
  type NetworkPackage,
  type PackageProfileSlice,
} from '@/hooks/use-package-data';

function paiseToRupees(p: number) {
  return (p || 0) / 100;
}

function effectiveDailyBinaryCapPaise(
  profile: PackageProfileSlice | null,
  pkg: NetworkPackage | null,
): number {
  const d = profile?.daily_binary_cap;
  if (d != null && d > 0) return d;
  if (pkg?.daily_binary_cap != null && pkg.daily_binary_cap > 0) return pkg.daily_binary_cap;
  return 0;
}

function pctUsed(used: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, (used / max) * 100);
}

type RingGaugeProps = {
  /** 0–100 */
  value: number;
  size: number;
  stroke: number;
  gradientFrom: string;
  gradientTo: string;
  uid: string;
  centerTitle: string;
  centerValue: string;
  ariaLabel: string;
  svgClassName?: string;
};

function RingGauge({
  value,
  size,
  stroke,
  gradientFrom,
  gradientTo,
  uid,
  centerTitle,
  centerValue,
  ariaLabel,
  svgClassName,
}: RingGaugeProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, value));
  const offset = c * (1 - p / 100);
  const cx = size / 2;
  const cy = size / 2;
  const gradId = `rg-grad-${uid}`;

  return (
    <div className="relative flex flex-col items-center" role="img" aria-label={ariaLabel}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className={cn(
            'absolute inset-0 -rotate-90 drop-shadow-[0_0_12px_rgba(16,185,129,0.15)]',
            svgClassName,
          )}
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientFrom} />
              <stop offset="100%" stopColor={gradientTo} />
            </linearGradient>
          </defs>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-white/[0.08]"
          />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-700 ease-out"
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
            {centerTitle}
          </span>
          <span className="text-lg font-bold tabular-nums tracking-tight text-text-primary">
            {centerValue}
          </span>
        </div>
      </div>
    </div>
  );
}

function MonthlyMeterColumn({
  icon,
  accent,
  label,
  ring,
  amountLine,
  note,
}: {
  icon: React.ReactNode;
  accent: string;
  label: string;
  ring: React.ReactNode;
  amountLine: string;
  note: string;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-start px-3 py-3 sm:px-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', accent)}>
          {icon}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
          {label}
        </span>
      </div>
      <div className="shrink-0">{ring}</div>
      <p className="mt-4 flex min-h-[2.5rem] w-full max-w-[13rem] items-center justify-center text-pretty text-center text-xs font-semibold tabular-nums leading-snug text-text-primary">
        {amountLine}
      </p>
      <p className="mt-1 max-w-[14rem] text-center text-[11px] leading-snug text-text-muted">
        {note}
      </p>
    </div>
  );
}

function GradientMeterBar({ value }: { value: number }) {
  const p = Math.min(100, Math.max(0, value));
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/[0.06] shadow-inner ring-1 ring-inset ring-white/5">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-rose-400 transition-[width] duration-700 ease-out"
        style={{ width: `${p}%` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-white/25 to-transparent opacity-60"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

export type PackageInsightCardsProps = {
  loading: boolean;
  profile: PackageProfileSlice | null;
  currentPkg: NetworkPackage | null;
  currentLabel: string;
};

export function PackageInsightCards({
  loading,
  profile,
  currentPkg,
  currentLabel,
}: PackageInsightCardsProps) {
  const rid = React.useId().replace(/:/g, '');

  const hasPackage = Boolean(
    profile?.current_package_id || (profile?.package_amount != null && profile.package_amount > 0),
  );
  const pkgAmountPaise = profile?.package_amount ?? currentPkg?.amount ?? 0;
  const displayName =
    currentLabel ||
    currentPkg?.name ||
    (hasPackage ? 'Package' : 'No package yet');

  const dailyCap = effectiveDailyBinaryCapPaise(profile, currentPkg);
  const todayBinary = profile?.today_binary_earned ?? 0;

  const monthlyIncome = profile?.monthly_income_paise ?? 0;
  const monthlyShopping = profile?.monthly_shopping_paise ?? 0;

  const incomePct = pctUsed(monthlyIncome, MONTHLY_INCOME_THRESHOLD_PAISE);
  const shoppingPct = pctUsed(monthlyShopping, MONTHLY_SHOPPING_THRESHOLD_PAISE);
  const binaryTodayPct =
    dailyCap > 0 ? Math.min(100, (todayBinary / dailyCap) * 100) : 0;

  const incomeGateOn = monthlyIncome > MONTHLY_INCOME_THRESHOLD_PAISE;
  const shoppingDone = monthlyShopping >= MONTHLY_SHOPPING_THRESHOLD_PAISE;
  const gateHolding = incomeGateOn && !shoppingDone;

  const subLine =
    hasPackage && pkgAmountPaise > 0
      ? `${formatCurrency(paiseToRupees(pkgAmountPaise), 0)} package · daily binary cap drives earning speed`
      : hasPackage
        ? 'Daily binary cap drives earning speed'
        : 'Neeche se koi package activate karein — tab ye limits apply hongi.';

  const statusU = profile?.status?.toUpperCase();
  const showActiveBadge = hasPackage && (statusU === 'ACTIVE' || !statusU);

  if (loading && !profile) {
    return (
      <Skeleton className="h-[420px] w-full rounded-2xl border border-card-border md:h-[360px]" />
    );
  }

  return (
    <div
      role="article"
      aria-labelledby="active-package-heading"
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/12 bg-gradient-to-br from-emerald-500/[0.06] via-card to-orange-500/[0.05] shadow-xl shadow-black/20',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(ellipse_90%_55%_at_20%_-10%,rgba(52,211,153,0.14),transparent)]',
        'after:pointer-events-none after:absolute after:inset-0 after:rounded-2xl after:bg-[radial-gradient(ellipse_60%_40%_at_95%_100%,rgba(251,146,60,0.12),transparent)]',
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-orange-400/10 blur-3xl" />

      <CardContent className="relative space-y-5 p-5 md:p-6 md:space-y-6">
        {/* Shared header — grid keeps badge aligned with title block */}
        <div className="grid grid-cols-[auto_1fr] items-start gap-x-3 gap-y-3 sm:grid-cols-[auto,minmax(0,1fr),auto] sm:gap-x-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 scale-110 rounded-full bg-emerald-400/25 blur-lg" />
            <div
              className={cn(
                'relative flex h-14 w-14 items-center justify-center rounded-full',
                'border border-emerald-400/35 bg-emerald-500/15',
                'shadow-[0_0_24px_rgba(52,211,153,0.22)]',
              )}
            >
              <Box className="h-7 w-7 text-emerald-300" aria-hidden />
            </div>
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
              Active package
            </p>
            <h2
              id="active-package-heading"
              className="truncate text-xl font-bold tracking-tight text-text-primary md:text-2xl"
            >
              {displayName}
            </h2>
            <p className="mt-1 text-xs leading-snug text-text-muted">{subLine}</p>
            <p className="mt-1.5 max-w-prose text-[11px] leading-relaxed text-text-muted/90">
              Lifetime caps{' '}
              <span className="font-medium text-emerald-200/80">hata diye gaye hain</span>. Ab sirf{' '}
              <span className="font-medium text-orange-200/80">daily binary cap</span> aur{' '}
              <span className="font-medium text-amber-200/80">monthly shopping gate</span> apply
              hote hain.
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2 justify-self-start sm:col-span-1 sm:justify-self-end">
            {hasPackage ? (
              <Badge
                variant={showActiveBadge ? 'success' : 'outline'}
                className="border-emerald-500/30 uppercase tracking-wide shadow-[0_0_16px_rgba(34,197,94,0.2)]"
              >
                {showActiveBadge ? 'ACTIVE' : statusU || '—'}
              </Badge>
            ) : null}
            {gateHolding ? (
              <Badge
                variant="warning"
                className="border-amber-500/40 uppercase tracking-wide shadow-[0_0_16px_rgba(245,158,11,0.25)]"
              >
                Shopping pending
              </Badge>
            ) : incomeGateOn && shoppingDone ? (
              <Badge
                variant="success"
                className="border-emerald-500/40 uppercase tracking-wide shadow-[0_0_16px_rgba(34,197,94,0.25)]"
              >
                Shopping done
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Partitioned shell: one box, full-height column divider, matched panel heights */}
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-black/[0.22] shadow-inner ring-1 ring-inset ring-white/[0.06]">
          <div className="grid lg:grid-cols-2 lg:items-stretch">
            {/* Left partition — monthly activation gate */}
            <div className="flex h-full min-h-0 min-w-0 flex-col border-b border-white/20 p-5 md:p-6 lg:border-b-0 lg:border-r lg:border-white/20">
              <div className="flex shrink-0 items-center justify-between gap-2">
                <h3 className="text-left text-[11px] font-semibold uppercase tracking-widest text-emerald-300/90">
                  Monthly activation gate
                </h3>
                <span className="text-[10px] uppercase tracking-widest text-text-muted">
                  Resets 1st of every month
                </span>
              </div>
              <div className="mt-3 flex min-h-[260px] flex-1 flex-col rounded-xl border border-white/10 bg-black/30 p-3 shadow-inner ring-1 ring-inset ring-white/[0.04] backdrop-blur-sm sm:min-h-[280px] sm:p-4">
                <div className="grid min-h-0 flex-1 grid-cols-2 items-stretch divide-x divide-white/15">
                  <MonthlyMeterColumn
                    icon={<Coins className="h-3.5 w-3.5 text-emerald-300" aria-hidden />}
                    accent="border-emerald-400/35 bg-emerald-500/15"
                    label="Monthly income"
                    ring={
                      <RingGauge
                        uid={`${rid}-mi`}
                        value={incomePct}
                        size={108}
                        stroke={9}
                        gradientFrom="#6ee7b7"
                        gradientTo="#059669"
                        centerTitle="Of ₹25k"
                        centerValue={`${incomePct.toFixed(0)}%`}
                        ariaLabel={`Monthly income ${incomePct.toFixed(0)} percent of ₹25,000 threshold`}
                        svgClassName="drop-shadow-[0_0_14px_rgba(52,211,153,0.2)]"
                      />
                    }
                    amountLine={`${formatCurrencyCompact(paiseToRupees(monthlyIncome))} / ${formatCurrencyCompact(paiseToRupees(MONTHLY_INCOME_THRESHOLD_PAISE))}`}
                    note={
                      incomeGateOn
                        ? 'Threshold cross ho chuka — shopping gate active.'
                        : 'Iske upar jate hi shopping rule on ho jayega.'
                    }
                  />
                  <MonthlyMeterColumn
                    icon={<ShoppingBag className="h-3.5 w-3.5 text-amber-200" aria-hidden />}
                    accent="border-amber-400/35 bg-amber-500/15"
                    label="Monthly shopping"
                    ring={
                      <RingGauge
                        uid={`${rid}-ms`}
                        value={shoppingPct}
                        size={108}
                        stroke={9}
                        gradientFrom="#fcd34d"
                        gradientTo="#b45309"
                        centerTitle="Of ₹2.5k"
                        centerValue={`${shoppingPct.toFixed(0)}%`}
                        ariaLabel={`Monthly shopping ${shoppingPct.toFixed(0)} percent of ₹2,500 requirement`}
                        svgClassName="drop-shadow-[0_0_14px_rgba(251,191,36,0.22)]"
                      />
                    }
                    amountLine={`${formatCurrencyCompact(paiseToRupees(monthlyShopping))} / ${formatCurrencyCompact(paiseToRupees(MONTHLY_SHOPPING_THRESHOLD_PAISE))}`}
                    note={
                      shoppingDone
                        ? 'Shopping target pura — held income release ho gayi.'
                        : incomeGateOn
                          ? 'Held income tab release hogi jab ye ₹2,500 par jaye.'
                          : 'Income ₹25k ke upar gai, to ye bar relevant hoga.'
                    }
                  />
                </div>
              </div>
            </div>

            {/* Right partition — daily binary cap */}
            <div className="flex h-full min-h-0 min-w-0 flex-col p-5 md:p-6">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-orange-400/25 blur-md" />
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/35 bg-orange-500/15 shadow-[0_0_16px_rgba(251,146,60,0.2)]">
                      <Timer className="h-4 w-4 text-orange-300" aria-hidden />
                    </div>
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-[11px] font-semibold uppercase tracking-widest text-orange-300/90">
                      Today&apos;s binary cap
                    </h3>
                    <p className="mt-0.5 text-xs leading-snug text-text-muted">
                      Isi package ki roz ki ceiling — pair-match team income
                    </p>
                  </div>
                </div>
                <span className="relative shrink-0 pt-0.5 text-xs font-bold uppercase tracking-widest text-orange-400">
                  <span className="absolute -inset-1 rounded-full bg-orange-500/10 blur-md" />
                  <span className="relative inline-flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                    </span>
                    Live
                  </span>
                </span>
              </div>

              <div className="mt-3 flex w-full shrink-0 flex-col items-center text-center">
                <p className="text-lg font-bold tabular-nums tracking-tight text-text-primary md:text-xl">
                  {dailyCap > 0
                    ? `${formatCurrencyCompact(paiseToRupees(todayBinary))} / ${formatCurrencyCompact(paiseToRupees(dailyCap))}`
                    : '₹0 / ₹0'}
                </p>
                <p className="mt-1 text-xs text-text-muted">Resets at 12:01 AM IST</p>
              </div>

              <div className="mt-3 flex min-h-[260px] flex-1 flex-col sm:min-h-[280px]">
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-orange-500/25 bg-orange-950/[0.14] px-4 py-6 shadow-inner ring-1 ring-inset ring-orange-500/15 backdrop-blur-sm sm:px-5">
                  <RingGauge
                    uid={`${rid}-t`}
                    value={binaryTodayPct}
                    size={112}
                    stroke={10}
                    gradientFrom="#fcd34d"
                    gradientTo="#ea580c"
                    centerTitle="Used today"
                    centerValue={`${binaryTodayPct.toFixed(1)}%`}
                    ariaLabel={`Today binary cap ${binaryTodayPct.toFixed(1)} percent used`}
                    svgClassName="drop-shadow-[0_0_14px_rgba(251,146,60,0.22)]"
                  />
                  <div className="w-full max-w-md space-y-2 px-0.5">
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>Progress</span>
                      <span className="tabular-nums text-orange-200/90">
                        {binaryTodayPct.toFixed(1)}%
                      </span>
                    </div>
                    <GradientMeterBar value={binaryTodayPct} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="relative !flex-col !items-stretch border-t border-white/10 bg-gradient-to-t from-black/30 to-transparent px-5 pb-5 pt-5 text-left md:px-6">
        <p className="text-pretty text-xs leading-relaxed text-text-muted">
          <span className="font-semibold text-emerald-200/85">Monthly gate: </span>
          Agar aapki monthly income{' '}
          <strong className="font-semibold text-emerald-200/90">
            {formatCurrency(MONTHLY_INCOME_THRESHOLD_PAISE / 100, 0)}
          </strong>{' '}
          cross kar jati hai, to us month{' '}
          <strong className="font-semibold text-amber-200/90">
            {formatCurrency(MONTHLY_SHOPPING_THRESHOLD_PAISE / 100, 0)}
          </strong>{' '}
          ki Secure-Mart shopping zaroori hoti hai. Jab tak shopping target pura nahi, aane wali
          extra income{' '}
          <strong className="font-semibold text-amber-200/90">hold</strong> hoti hai aur shopping
          complete hote hi{' '}
          <strong className="font-semibold text-emerald-200/90">automatic release</strong> ho jati
          hai. Month khatam hua aur shopping nahi ki — to held amount{' '}
          <strong className="font-semibold text-rose-200/90">forfeit</strong> ho jata hai.
        </p>
        <p className="mt-3 border-t border-white/10 pt-3 text-pretty text-xs leading-relaxed text-text-muted">
          <span className="font-semibold text-orange-200/85">Daily binary: </span>
          Ye limit{' '}
          <strong className="font-semibold text-orange-200/90">usi active package</strong> ki daily
          ceiling hai — iske upar ka amount us din flush ho jata hai. Roz raat{' '}
          <strong className="font-semibold text-orange-200/90">12:01 IST</strong> par reset. Aaj ke
          daily cap ka monthly gate se koi lena-dena nahi — dono independent hain.
        </p>
      </CardFooter>
    </div>
  );
}
