'use client';

import * as React from 'react';
import { Calendar, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Shared height / border for selects and text inputs inside filter bars */
export const PAGE_FILTER_CONTROL_CLASS =
  'h-10 border-white/10 bg-background text-sm';

const DEFAULT_GRID_CLASS =
  'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6';

export type PageFilterBarProps = {
  /** Shown next to the list icon */
  title?: string;
  /** Muted note after title; set `null` to hide */
  scopeNote?: string | null;
  className?: string;
  headerClassName?: string;
  /** Tailwind grid classes for the filter controls row */
  gridClassName?: string;
  children: React.ReactNode;
  onClear?: () => void;
  clearDisabled?: boolean;
  clearLabel?: string;
  /** Extra controls in the footer row (e.g. badges) */
  footerExtra?: React.ReactNode;
};

export function PageFilterBar({
  title = 'Filters',
  scopeNote = '(this page only)',
  className,
  headerClassName,
  gridClassName = DEFAULT_GRID_CLASS,
  children,
  onClear,
  clearDisabled,
  clearLabel = 'Clear filters',
  footerExtra,
}: PageFilterBarProps) {
  const showFooter = onClear != null || footerExtra != null;

  return (
    <div className={cn('border-b border-card-border bg-card-hover/20 p-4', className)}>
      <div
        className={cn(
          'mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted',
          headerClassName,
        )}
      >
        <ListFilter className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span>{title}</span>
        {scopeNote != null && scopeNote !== '' && (
          <span className="normal-case font-normal text-text-muted">{scopeNote}</span>
        )}
      </div>
      <div className={gridClassName}>{children}</div>
      {showFooter && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {onClear != null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={clearDisabled}
              onClick={onClear}
            >
              {clearLabel}
            </Button>
          )}
          {footerExtra}
        </div>
      )}
    </div>
  );
}

export type FilterFieldProps = {
  label: string;
  /** When set, the label is a real `<label htmlFor>` (use with inputs that have matching `id`) */
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

/** Label + control stack used across filter rows */
export function FilterField({ label, htmlFor, children, className }: FilterFieldProps) {
  const labelClass =
    'block min-h-[1rem] shrink-0 text-xs font-normal leading-4 text-text-muted';
  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-1.5', className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <div className={labelClass}>{label}</div>
      )}
      <div className="mt-auto w-full min-w-0 shrink-0">{children}</div>
    </div>
  );
}

export type DateFilterFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  className?: string;
  inputClassName?: string;
};

export function DateFilterField({
  id,
  label,
  value,
  onChange,
  className,
  inputClassName,
}: DateFilterFieldProps) {
  const ref = React.useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker?.();
    } catch {
      el.click();
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="text-xs text-text-muted">
        {label}
      </label>
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'date-filter-input pr-10 [color-scheme:dark]',
            PAGE_FILTER_CONTROL_CLASS,
            inputClassName,
          )}
        />
        <button
          type="button"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          onClick={openPicker}
          aria-label={`Open calendar: ${label}`}
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
