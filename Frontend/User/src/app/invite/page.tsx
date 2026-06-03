'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Gift } from 'lucide-react';
import {
  ReferralLinkCard,
  ShareButtons,
  InviteStats,
  RecentInvites,
} from '@/components/invite';
import { useInviteData } from '@/hooks/use-invite-data';

type Leg = 'left' | 'right';

const SIGNUP_BASE =
  process.env.NEXT_PUBLIC_REFERRAL_BASE_URL ||
  'https://securemart.co.in/signup';

function buildReferralLink(sponsorId: string | undefined, leg: Leg): string {
  if (!sponsorId) return '';
  const payload = `leg=${leg}&id=${sponsorId}`;
  const encoded = btoa(payload);
  return `${SIGNUP_BASE}?r=${encoded}`;
}

export default function InvitePage() {
  const { profile, referrals, stats, loading, error } = useInviteData();
  const [leg, setLeg] = React.useState<Leg>('left');

  const sponsorId = profile?.sponsor_id;
  const referralLink = buildReferralLink(sponsorId, leg);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] animate-gradient p-6 border border-primary/20"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Invite & Earn Together
              </h2>
              <p className="text-white/80 mt-1">
                Earn up to <span className="font-bold">15% commission</span> on
                every purchase your referrals make!
              </p>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-accent-gold" />
            <span className="text-sm font-medium text-accent-gold">
              Earn Extra Rewards
            </span>
          </motion.div>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Referral Link + Side Share Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <ReferralLinkCard
          sponsorId={sponsorId ?? ''}
          leg={leg}
          referralLink={referralLink}
          onLegChange={setLeg}
          loading={loading && !profile}
        />
        <ShareButtons
          referralLink={referralLink}
          orientation="vertical"
          disabled={loading && !profile}
        />
      </div>

      <InviteStats
        totalInvited={stats.totalInvited}
        activeUsers={stats.activeUsers}
        pendingPlacements={stats.pendingPlacements}
        totalCommission={stats.totalCommission}
        leftCount={stats.leftCount}
        rightCount={stats.rightCount}
        unplacedCount={stats.unplacedCount}
      />

      <RecentInvites referrals={referrals} loading={loading} />

      {/* How It Works */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: 1,
              title: 'Share Your Link',
              description:
                'Choose left/right leg and share your unique referral link — har leg ke liye alag link banega.',
              icon: '🔗',
            },
            {
              step: 2,
              title: 'They Join & Invest',
              description:
                'User us link se signup karke package kharidta hai; aapke chosen leg par place hota hai.',
              icon: '👥',
            },
            {
              step: 3,
              title: 'Get Paid Commission',
              description:
                'Har purchase pe 10% direct + binary commission aapke wallets me credit hoti hai.',
              icon: '💰',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-start gap-4 p-6 rounded-xl bg-card border border-card-border"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-2xl">
                {item.icon}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-primary uppercase">
                    Step {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-text-primary">
                  {item.title}
                </h3>
                <p className="text-sm text-text-secondary mt-1">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
