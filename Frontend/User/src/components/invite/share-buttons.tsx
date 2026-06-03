'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Link2, Users, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface ShareButtonsProps {
  referralLink: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
}

export function ShareButtons({
  referralLink,
  orientation = 'vertical',
  disabled = false,
}: ShareButtonsProps) {
  const [copied, setCopied] = React.useState(false);
  const shareMessage = `Join me on Secure Binary and start earning! Use my referral link: ${referralLink}`;

  const openWindow = (url: string) => {
    if (!referralLink) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* no-op */
    }
  };

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-green-500 hover:bg-green-600',
      textColor: 'text-white',
      onClick: () =>
        openWindow(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`),
    },
    {
      name: 'Telegram',
      icon: Send,
      color: 'bg-blue-500 hover:bg-blue-600',
      textColor: 'text-white',
      onClick: () =>
        openWindow(
          `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareMessage)}`,
        ),
    },
    {
      name: 'Facebook',
      icon: FacebookIcon,
      color: 'bg-blue-600 hover:bg-blue-700',
      textColor: 'text-white',
      onClick: () =>
        openWindow(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
        ),
    },
    {
      name: 'Twitter',
      icon: TwitterIcon,
      color: 'bg-black hover:bg-gray-800',
      textColor: 'text-white',
      onClick: () =>
        openWindow(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
        ),
    },
    {
      name: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? Check : Link2,
      color: copied
        ? 'bg-primary hover:bg-primary'
        : 'bg-card-hover hover:bg-card',
      textColor: copied ? 'text-white' : 'text-text-primary',
      onClick: handleCopy,
    },
  ];

  const isVertical = orientation === 'vertical';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="h-full"
    >
      <Card className="p-0 h-full">
        <CardHeader className="p-6 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Share & Invite
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div
            className={cn(
              isVertical
                ? 'flex flex-col gap-3'
                : 'grid grid-cols-2 sm:grid-cols-5 gap-3',
            )}
          >
            {shareOptions.map((option, index) => (
              <motion.button
                key={option.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.97 }}
                onClick={option.onClick}
                disabled={disabled || !referralLink}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed',
                  isVertical ? 'justify-start' : 'flex-col justify-center',
                  option.color,
                  option.textColor,
                )}
              >
                <option.icon
                  className={cn(isVertical ? 'h-5 w-5' : 'h-6 w-6', 'shrink-0')}
                />
                <span
                  className={cn(
                    'font-medium',
                    isVertical ? 'text-sm' : 'text-xs',
                  )}
                >
                  {option.name}
                </span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
