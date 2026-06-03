'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  Check,
  Sparkles,
  TrendingUp,
  Gift,
  Zap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, cn } from '@/lib/utils';
import {
  usePackageData,
  packageFeatures,
  type NetworkPackage,
} from '@/hooks/use-package-data';
import { PackageInsightCards } from '@/components/package/package-insight-cards';

function featureIcon(text: string): ReactNode {
  const t = text.toLowerCase();
  if (t.includes('daily')) {
    return <Zap className="h-4 w-4 text-accent-gold" />;
  }
  if (t.includes('lifetime')) {
    return <TrendingUp className="h-4 w-4 text-primary" />;
  }
  if (t.includes('shopping')) {
    return <Gift className="h-4 w-4 text-accent-gold" />;
  }
  return <Check className="h-4 w-4 text-primary" />;
}

export default function PackagePage() {
  const {
    packages,
    profile,
    recommendedId,
    loading,
    error,
    actionMessage,
    renewingId,
    refresh,
    renewTo,
  } = usePackageData();

  const currentAmt = profile?.package_amount ?? 0;
  const currentId = profile?.current_package_id ?? null;
  const currentPkg =
    currentId && packages.length
      ? packages.find((p) => p.package_id === currentId) ?? null
      : null;
  const currentLabel =
    profile?.package_name ||
    (currentPkg?.name ?? (currentAmt > 0 ? 'Package' : 'No package yet'));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-secondary/20 to-primary/20 p-6 border border-secondary/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20">
              <Package className="h-7 w-7 text-secondary-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Upgrade Your Package
              </h2>
              <p className="text-text-secondary mt-1">
                Tiers and caps from the FMCG-Binary API (amounts in INR).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <Badge variant="primary" size="lg">
              Current: {currentLabel}
            </Badge>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {actionMessage && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm',
            actionMessage.toLowerCase().includes('success')
              ? 'border-green-500/30 bg-green-500/10 text-green-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-100',
          )}
        >
          {actionMessage}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <PackageInsightCards
          loading={loading}
          profile={profile}
          currentPkg={currentPkg}
          currentLabel={currentLabel}
        />
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && packages.length === 0
          ? [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[420px] rounded-2xl" />
            ))
          : packages.map((pkg, index) => {
              const features = packageFeatures(pkg);
              const isCurrent = Boolean(currentId && pkg.package_id === currentId);
              const isUpgrade = pkg.amount > currentAmt;
              const isRecommended = pkg.package_id === recommendedId;

              return (
                <motion.div
                  key={pkg.package_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                >
                  <Card
                    className={`p-0 h-full relative overflow-hidden ${
                      isRecommended
                        ? 'border-primary/50 shadow-lg shadow-primary/20'
                        : ''
                    } ${isCurrent ? 'border-primary/30 bg-gradient-to-br from-card to-primary/5' : ''}`}
                  >
                    {isRecommended && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="primary" className="gap-1">
                          <Sparkles className="h-3 w-3" /> Recommended
                        </Badge>
                      </div>
                    )}

                    <CardContent className="p-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-text-primary">{pkg.name}</h3>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-bold text-primary">
                            {formatCurrency(pkg.amount / 100)}
                          </span>
                          <span className="text-text-muted">one-time</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-sm mb-4 p-3 rounded-xl bg-card-hover">
                        <div className="text-center">
                          <p className="text-text-muted">Daily binary cap</p>
                          <p className="font-semibold text-primary">
                            {pkg.daily_binary_cap > 0
                              ? formatCurrency(pkg.daily_binary_cap / 100, 0)
                              : '—'}
                          </p>
                        </div>
                        <div className="border-l border-card-border mx-2" />
                        <div className="text-center">
                          <p className="text-text-muted">Lifetime cap</p>
                          <p className="font-semibold text-text-secondary text-[11px] leading-tight">
                            None — only daily cap applies
                          </p>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">{featureIcon(feature)}</span>
                            <span className="text-text-secondary">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current package
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full gap-2"
                          variant={isRecommended ? 'default' : 'outline'}
                          disabled={renewingId !== null}
                          onClick={() => renewTo(pkg.package_id)}
                        >
                          <TrendingUp className="h-4 w-4" />
                          {renewingId === pkg.package_id
                            ? 'Please wait…'
                            : currentId
                              ? `Upgrade to ${pkg.name}`
                              : `Activate ${pkg.name}`}
                        </Button>
                      ) : (
                        <Button variant="ghost" className="w-full" disabled>
                          Downgrade
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {packages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <Card className="p-0">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg">Package comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-card-border">
                    <th className="text-left py-3 text-xs font-semibold text-text-muted uppercase">
                      Metric
                    </th>
                    {packages.map((pkg) => (
                      <th
                        key={pkg.package_id}
                        className="text-center py-3 text-xs font-semibold text-text-muted uppercase"
                      >
                        {pkg.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows(packages).map(([label, values]) => (
                    <tr key={label} className="border-b border-card-border/50">
                      <td className="py-3 text-sm text-text-secondary">{label}</td>
                      {values.map((value, i) => (
                        <td
                          key={i}
                          className="py-3 text-sm text-center font-medium text-text-primary"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

function comparisonRows(pkgs: NetworkPackage[]): [string, string[]][] {
  return [
    [
      'One-time (INR)',
      pkgs.map((p) => formatCurrency(p.amount / 100)),
    ],
    [
      'Daily binary cap',
      pkgs.map((p) =>
        p.daily_binary_cap > 0 ? formatCurrency(p.daily_binary_cap / 100, 0) : '—',
      ),
    ],
    [
      'Lifetime income cap',
      pkgs.map(() => 'None'),
    ],
    [
      'Monthly shopping gate',
      pkgs.map(() => '₹2,500 when monthly income > ₹25,000'),
    ],
  ];
}
