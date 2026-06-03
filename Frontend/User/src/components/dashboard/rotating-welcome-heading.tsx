'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Greetings rotate every `ROTATE_MS`; each is typed with a typewriter effect. */
const GREETINGS = ['नमस्ते', 'Hello', 'हैलो', 'नमस्कार'] as const;
const ROTATE_MS = 3000;
const TYPE_MS = 55;

export function RotatingWelcomeHeading({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const [idx, setIdx] = React.useState(0);
  const [typed, setTyped] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(true);

  React.useEffect(() => {
    const word = GREETINGS[idx];
    let i = 0;
    setTyped('');
    setIsTyping(true);
    const id = window.setInterval(() => {
      i += 1;
      setTyped(word.slice(0, i));
      if (i >= word.length) {
        window.clearInterval(id);
        setIsTyping(false);
      }
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [idx]);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setIdx((j) => (j + 1) % GREETINGS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <h2
      className={cn(
        'text-xl font-bold text-text-primary flex flex-wrap items-baseline gap-x-1 gap-y-0',
        className,
      )}
    >
      <span
        className="inline-flex min-h-[1.75rem] items-baseline text-primary"
        aria-live="polite"
      >
        <span className="font-semibold tracking-tight">{typed}</span>
        {isTyping && (
          <span
            className="ml-0.5 inline-block font-light text-primary animate-pulse"
            aria-hidden
          >
            |
          </span>
        )}
      </span>
      <span className="text-text-primary">
        , {name} <span aria-hidden>👋</span>
      </span>
    </h2>
  );
}
