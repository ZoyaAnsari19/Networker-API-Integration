'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { useWalletData, type WalletTxDisplayType } from '@/hooks/use-wallet-data';

const paiseToRupees = (p: number) => (p || 0) / 100;

export default function WalletPage() {
  const {
    balances,
    secureBalancePaise,
    platformWalletLinked,
    transactions,
    loading,
    error,
    refresh,
  } = useWalletData();

  const transactionIcons: Record<WalletTxDisplayType, ReactNode> = {
    deposit: <ArrowDownLeft className="h-4 w-4 text-green-400" />,
    withdrawal: <ArrowUpRight className="h-4 w-4 text-red-400" />,
    transfer: <ArrowLeftRight className="h-4 w-4 text-blue-400" />,
    commission: <Coins className="h-4 w-4 text-primary" />,
    bonus: <Coins className="h-4 w-4 text-accent-gold" />,
  };

  const walletCards = [
    {
      name: 'Direct (Main) wallet',
      subtitle: 'P2P send, direct income',
      balanceRupees: paiseToRupees(balances?.direct_balance ?? 0),
      icon: Wallet,
      color: 'text-primary',
      gradient: 'from-primary/20 to-primary/5',
    },
    {
      name: 'Team wallet',
      subtitle: 'Binary & team-side credits',
      balanceRupees: paiseToRupees(balances?.team_balance ?? 0),
      icon: Building2,
      color: 'text-accent-gold',
      gradient: 'from-accent-gold/20 to-accent-gold/5',
    },
    {
      name: 'Platform wallet',
      subtitle: platformWalletLinked
        ? 'Linked Secure / external wallet'
        : 'Not linked — see Profile',
      balanceRupees: !platformWalletLinked
        ? null
        : paiseToRupees(secureBalancePaise ?? 0),
      icon: Coins,
      color: 'text-secondary-light',
      gradient: 'from-secondary/20 to-secondary/5',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-accent-gold/20 to-accent-gold/5 p-6 border border-accent-gold/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-gold/20">
              <Wallet className="h-7 w-7 text-accent-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">My Wallets</h2>
              <p className="text-text-secondary mt-1">
                Live balances and ledger from the FMCG-Binary API (amounts in
                INR).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <Button variant="outline" size="sm" className="gap-2" asChild><Link href="/p2p" className="inline-flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                Transfer
              </Link></Button>
            <Button size="sm" className="gap-2" asChild><Link href="/withdraw" className="inline-flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </Link></Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && !balances
          ? [0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[160px] rounded-2xl" />
            ))
          : walletCards.map((wallet, index) => (
              <motion.div
                key={wallet.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.1 }}
              >
                <Card
                  className={`p-0 overflow-hidden bg-gradient-to-br ${wallet.gradient} border-card-border`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                          <wallet.icon className={`h-5 w-5 ${wallet.color}`} />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-text-primary block">
                            {wallet.name}
                          </span>
                          <span className="text-xs text-text-muted">
                            {wallet.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p
                      className={`text-2xl font-bold ${wallet.color} number-counter mt-2`}
                    >
                      {wallet.balanceRupees == null
                        ? '—'
                        : formatCurrency(wallet.balanceRupees)}
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button variant="ghost" size="sm" className="flex-1" asChild><Link href="/p2p">Send</Link></Button>
                      <Button variant="ghost" size="sm" className="flex-1" asChild><Link href="/withdraw">Receive</Link></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="p-0">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Transaction history
              </CardTitle>
              <Badge variant="outline">
                {loading ? '…' : `${transactions.length} shown`}
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-2">
              Combined Direct + Team wallet ledger (most recent first).
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {loading && transactions.length === 0 ? (
              <div className="px-6 py-8 space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-text-muted">
                No ledger entries yet.
              </p>
            ) : (
              <div className="divide-y divide-card-border">
                {transactions.map((tx, index) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.03 }}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-card-hover/50 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-card-hover">
                      {transactionIcons[tx.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {tx.description}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(tx.date)} · {tx.walletType}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`font-semibold number-counter ${tx.amountRupees >= 0 ? 'text-primary' : 'text-red-400'}`}
                      >
                        {tx.amountRupees >= 0 ? '+' : ''}
                        {formatCurrency(tx.amountRupees)}
                      </p>
                      <Badge variant="success" size="sm" className="mt-1">
                        posted
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
