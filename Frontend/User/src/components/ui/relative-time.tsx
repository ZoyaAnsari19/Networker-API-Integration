'use client';

import * as React from 'react';
import { formatRelativeTime } from '@/lib/utils';

interface RelativeTimeProps extends React.HTMLAttributes<HTMLTimeElement> {
  value: Date | string;
  /** Text rendered on server & during the first client paint to avoid hydration mismatch. */
  fallback?: string;
}

/**
 * Renders a human-friendly "X min ago" label.
 *
 * The computation depends on the current wall-clock time, which differs
 * between the SSR render and the first client render. To avoid hydration
 * warnings we render a stable fallback until after mount, then swap in the
 * live relative value.
 */
export function RelativeTime({
  value,
  fallback = '—',
  ...rest
}: RelativeTimeProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const iso = new Date(value).toISOString();

  return (
    <time dateTime={iso} suppressHydrationWarning {...rest}>
      {mounted ? formatRelativeTime(value) : fallback}
    </time>
  );
}
