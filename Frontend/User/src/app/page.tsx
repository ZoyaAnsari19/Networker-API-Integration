'use client';

import { motion } from 'framer-motion';
import {
  IndianRupee,
  TrendingUp,
  Calendar,
  Award,
  Package,
  Clock,
  Wallet,
  Users2,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import {
  RotatingWelcomeHeading,
  StatCard,
  WalletCard,
  EarningsChart,
  BinaryStatus,
  QuickActions,
} from '@/components/dashboard';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatCurrencyCompact, cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import {
  MONTHLY_INCOME_THRESHOLD_PAISE,
  MONTHLY_SHOPPING_THRESHOLD_PAISE,
} from '@/hooks/use-package-data';
import { useAuthStore } from '@/stores/useAuthStore';

function pct(used: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.max(0, (used / total) * 100));
}

const paiseToRupees = (p: number) => (p || 0) / 100;

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { profile, wallets, binary, earningsSeries, totals, loading, error } =
    useDashboardData(90);

  const displayName = profile?.full_name || user?.name || 'Networker';
  const directCount = profile?.direct_referral_count ?? 0;
  const isActive = profile?.status === 'ACTIVE';
  const hasPackage = !!profile?.package_name;

  const monthlyIncome = profile?.monthly_income_paise ?? 0;
  const monthlyShopping = profile?.monthly_shopping_paise ?? 0;
  const dailyUsed = profile?.today_binary_earned ?? 0;
  const dailyCap = profile?.daily_binary_cap ?? 0;

  const incomeGateOn = monthlyIncome > MONTHLY_INCOME_THRESHOLD_PAISE;
  const shoppingDone = monthlyShopping >= MONTHLY_SHOPPING_THRESHOLD_PAISE;
  const gateHolding = incomeGateOn && !shoppingDone;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 p-6 border border-primary/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <RotatingWelcomeHeading name={displayName} />
            <p className="text-text-secondary mt-1">
              {directCount > 0 ? (
                <>
                  You have{' '}
                  <span className="text-primary font-semibold">
                    {directCount} direct member{directCount === 1 ? '' : 's'}
                  </span>{' '}
                  in your network.
                </>
              ) : (
                <>Start building your team by inviting your first member.</>
              )}
            </p>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex items-center gap-2"
          >
            <Badge
              variant={isActive ? 'success' : 'warning'}
              size="sm"
              className="gap-1"
            >
              <Award className="h-3 w-3" />
              {isActive ? 'Active' : profile?.status || 'Inactive'}
            </Badge>
            {profile?.sponsor_id && (
              <span className="text-xs text-text-muted">
                SPF ID:{' '}
                <span className="font-mono font-semibold text-text-primary">
                  {profile.sponsor_id}
                </span>
              </span>
            )}
          </motion.div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Earnings"
          value={totals?.total ?? 0}
          icon={IndianRupee}
          iconColor="text-primary"
          delay={100}
          loading={loading}
          glow
        />
        <StatCard
          title="Today"
          value={totals?.today ?? 0}
          icon={TrendingUp}
          iconColor="text-green-400"
          delay={200}
          loading={loading}
        />
        <StatCard
          title="This Week"
          value={totals?.weekly ?? 0}
          icon={Calendar}
          iconColor="text-accent-blue"
          delay={300}
          loading={loading}
        />
        <StatCard
          title="This Month"
          value={totals?.monthly ?? 0}
          icon={Award}
          iconColor="text-accent-gold"
          delay={400}
          loading={loading}
        />
      </div>

      {/* Active Package + Daily Binary Cap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading && !profile ? (
          <>
            <Skeleton className="h-[180px] rounded-2xl" />
            <Skeleton className="h-[180px] rounded-2xl" />
          </>
        ) : (
          <>
            <Card className="p-6 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">Active Package</p>
                    <p className="text-xl font-bold text-text-primary">
                      {hasPackage ? profile?.package_name : 'No package'}
                    </p>
                    {hasPackage && profile?.package_amount ? (
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatCurrency(paiseToRupees(profile.package_amount), 0)} package
                        {' · '}
                        daily binary cap drives earning speed
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted mt-0.5">
                        Auto-activates on first qualifying purchase
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant={isActive ? 'success' : 'warning'}
                    size="sm"
                  >
                    {isActive ? 'ACTIVE' : profile?.status || 'INACTIVE'}
                  </Badge>
                  {gateHolding ? (
                    <Badge variant="warning" size="sm" className="gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      Shopping pending
                    </Badge>
                  ) : incomeGateOn && shoppingDone ? (
                    <Badge variant="success" size="sm">
                      Shopping done
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-muted">Monthly income</span>
                    <span className="font-medium text-text-secondary">
                      {formatCurrencyCompact(paiseToRupees(monthlyIncome))} /{' '}
                      {formatCurrencyCompact(
                        paiseToRupees(MONTHLY_INCOME_THRESHOLD_PAISE),
                      )}
                    </span>
                  </div>
                  <Progress
                    value={pct(monthlyIncome, MONTHLY_INCOME_THRESHOLD_PAISE)}
                    variant="primary"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-muted">Monthly shopping</span>
                    <span className="font-medium text-text-secondary">
                      {formatCurrencyCompact(paiseToRupees(monthlyShopping))} /{' '}
                      {formatCurrencyCompact(
                        paiseToRupees(MONTHLY_SHOPPING_THRESHOLD_PAISE),
                      )}
                    </span>
                  </div>
                  <Progress
                    value={pct(monthlyShopping, MONTHLY_SHOPPING_THRESHOLD_PAISE)}
                    variant="gold"
                    size="sm"
                  />
                </div>
                <p className="text-xs text-text-muted mt-4 leading-relaxed border-t border-card-border pt-4">
                  Jab tak aapki monthly income{' '}
                  <span className="font-medium text-text-secondary">
                    {formatCurrency(MONTHLY_INCOME_THRESHOLD_PAISE / 100, 0)}
                  </span>{' '}
                  ke neeche hai, koi shopping shart nahi hai. Iske upar jate hi same month me{' '}
                  <span className="font-medium text-text-secondary">
                    {formatCurrency(MONTHLY_SHOPPING_THRESHOLD_PAISE / 100, 0)}+
                  </span>{' '}
                  ki Secure-Mart shopping zaroori ho jati hai, warna extra income{' '}
                  <span className="font-medium text-amber-200/85">hold</span> rehti hai aur{' '}
                  <span className="font-medium text-text-secondary">shopping complete hote hi</span>{' '}
                  automatic release. Har 1 tarikh ko counters reset — held amount us waqt tak
                  release nahi hua to{' '}
                  <span className="font-medium text-rose-200/85">forfeit</span>.
                </p>
              </div>
            </Card>

            <Card
              className={cn(
                'p-6 bg-gradient-to-br from-accent-gold/10 via-card to-card border-accent-gold/20',
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-gold/15">
                    <Clock className="h-6 w-6 text-accent-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-text-secondary">
                      Today&apos;s Binary Cap
                    </p>
                    <p className="text-xl font-bold text-text-primary">
                      {formatCurrency(paiseToRupees(dailyUsed), 0)}
                      <span className="text-sm font-medium text-text-muted">
                        {' '}
                        / {formatCurrency(paiseToRupees(dailyCap), 0)}
                      </span>
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Resets at 12:01 AM IST
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    dailyCap > 0 && dailyUsed >= dailyCap ? 'danger' : 'gold'
                  }
                  size="sm"
                >
                  {dailyCap > 0 && dailyUsed >= dailyCap ? 'Maxed' : 'Live'}
                </Badge>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-text-muted">Used today</span>
                  <span className="font-medium text-text-secondary">
                    {pct(dailyUsed, dailyCap).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={pct(dailyUsed, dailyCap)}
                  variant="gold"
                  size="lg"
                />
                <p className="text-xs text-text-muted mt-3 leading-relaxed">
                  Ye limit aapke binary pair-match se hone wali income ki hai jo
                  aapke package pe depend karti hai — max 1 din mein itna hi earn
                  kar sakte ho; usse upar ka amount flush ho jata hai. Ye limit
                  roz raat 12:01 IST par reset hoti hai.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Wallets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WalletCard
          title="Direct Wallet"
          balance={paiseToRupees(wallets?.direct_balance ?? 0)}
          icon={Wallet}
          gradient="from-primary/25 to-primary/5"
          delay={200}
          actions={[
            { label: 'Withdraw', onClick: () => {}, variant: 'secondary' },
          ]}
        />
        <WalletCard
          title="Team Wallet (binary income)"
          balance={paiseToRupees(wallets?.team_balance ?? 0)}
          icon={Users2}
          gradient="from-accent-gold/25 to-accent-gold/5"
          delay={300}
          actions={[
            { label: 'Withdraw', onClick: () => {}, variant: 'secondary' },
          ]}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EarningsChart data={earningsSeries} loading={loading} />
        </div>

        <div className="lg:col-span-1">
          {loading && !binary ? (
            <Skeleton className="h-[320px] rounded-2xl" />
          ) : (
            <BinaryStatus
              leftCount={binary?.left.count ?? 0}
              rightCount={binary?.right.count ?? 0}
              leftVolume={paiseToRupees(binary?.left.volume ?? 0)}
              rightVolume={paiseToRupees(binary?.right.volume ?? 0)}
              leftActive={binary?.left.activeCount ?? 0}
              rightActive={binary?.right.activeCount ?? 0}
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Quick Actions
        </h3>
        <QuickActions />
      </div>

      {/* Payouts note — wallets withdraw separately, no single "total" */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="rounded-2xl bg-gradient-to-r from-accent-gold/20 to-accent-gold/5 p-6 border border-accent-gold/20"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-accent-gold/20">
              <IndianRupee className="h-7 w-7 text-accent-gold" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">
                Withdraw / payout
              </p>
              <p className="text-xs text-text-muted leading-relaxed max-w-xl">
                Direct aur Team wallet ka balance alag-alag track hota hai.
                Dono ki withdrawal dates different ho sakti hain (rules bhi alag
                ho sakte hain). Ek combined &quot;total withdraw&quot; ek saath
                possible nahi — upar har wallet card se apna Withdraw use
                karein.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-text-secondary">
                <span>
                  Direct:{' '}
                  <span className="font-semibold text-text-primary tabular-nums">
                    {formatCurrency(paiseToRupees(wallets?.direct_balance ?? 0))}
                  </span>
                </span>
                <span className="text-text-muted">·</span>
                <span>
                  Team:{' '}
                  <span className="font-semibold text-text-primary tabular-nums">
                    {formatCurrency(paiseToRupees(wallets?.team_balance ?? 0))}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <Link href="/withdraw" className="md:self-center">
            <Button
              variant="primary"
              className="bg-gradient-to-r from-accent-gold to-accent-gold-light text-black font-semibold shadow-lg shadow-accent-gold/30 hover:opacity-90 whitespace-nowrap"
            >
              Withdraw
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
