'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, copyToClipboard } from '@/lib/utils';

type Leg = 'left' | 'right';

interface ReferralLinkCardProps {
  sponsorId: string;
  leg: Leg;
  referralLink: string;
  onLegChange: (leg: Leg) => void;
  loading?: boolean;
}

function buildShareText(link: string): string {
  return `Join me on Secure Binary and start earning! Use my referral link: ${link}`;
}

export function ReferralLinkCard({
  sponsorId,
  leg,
  referralLink,
  onLegChange,
  loading,
}: ReferralLinkCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await copyToClipboard(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Join Secure Binary',
          text: buildShareText(referralLink),
          url: referralLink,
        });
      } catch {
        await copyToClipboard(referralLink);
      }
    } else {
      await copyToClipboard(referralLink);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('invite-qr-svg') as SVGSVGElement | null;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referral-${sponsorId}-${leg}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  Share Your Referral Link
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  Earn 10% commission on every purchase your referrals make
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={loading ? 'Loading…' : referralLink}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    onClick={handleCopy}
                    variant={copied ? 'primary' : 'default'}
                    className="gap-2"
                    disabled={loading || !referralLink}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-xl">
                  <span className="text-sm font-medium text-text-secondary">
                    Place referral on:
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant={leg === 'left' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => onLegChange('left')}
                      className={cn(
                        'gap-2',
                        leg === 'left' && 'shadow-lg shadow-primary/30',
                      )}
                    >
                      <span className="text-lg">←</span> LEFT
                    </Button>
                    <Button
                      variant={leg === 'right' ? 'gold' : 'outline'}
                      size="sm"
                      onClick={() => onLegChange('right')}
                      className={cn(
                        'gap-2',
                        leg === 'right' && 'shadow-lg shadow-accent-gold/30',
                      )}
                    >
                      RIGHT <span className="text-lg">→</span>
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted w-full">
                    Referrals jo is link se signup karenge wo aapke{' '}
                    <span className="font-medium text-text-secondary uppercase">
                      {leg}
                    </span>{' '}
                    leg par place honge (spill-over apply if leg is full).
                  </p>
                </div>

                <div className="flex items-center gap-3 p-3 bg-card-hover rounded-xl">
                  <span className="text-sm text-text-muted">Your Sponsor ID:</span>
                  <Badge variant="primary" size="lg" className="font-mono">
                    {sponsorId || '—'}
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleShare}
                  disabled={loading || !referralLink}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleDownloadQR}
                  disabled={loading || !referralLink}
                >
                  <Download className="h-4 w-4" />
                  Download QR
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <QRCodeSVG
                  id="invite-qr-svg"
                  value={referralLink || 'https://securebinary.network'}
                  size={140}
                  level="H"
                  includeMargin
                />
              </div>
              <p className="text-xs text-text-muted mt-3">Scan to join ({leg.toUpperCase()})</p>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
