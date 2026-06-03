"use client";
import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectOption { label: string; value: string }

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, hint, placeholder, id, className, ...props }, ref) => {
    const selectId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[var(--text-secondary)] leading-none">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "w-full h-11 px-4 pr-10 rounded-[10px] border text-sm text-[var(--text-primary)] bg-white appearance-none cursor-pointer transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-[var(--danger-500)] focus:border-[var(--danger-500)] focus:ring-[var(--danger-500)]/20"
                : "border-[var(--border)] focus:border-[var(--primary-500)] focus:ring-[var(--primary-500)]/20",
              className
            )}
            {...props}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        </div>
        {error && <p className="text-xs text-[var(--danger-500)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
