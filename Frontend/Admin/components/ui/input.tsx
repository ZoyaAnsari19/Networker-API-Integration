"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, id, className, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)] leading-none">
            {label}
            {props.required && <span className="text-[var(--danger-500)] ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">{icon}</div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-11 px-4 rounded-[10px] border text-sm text-[var(--text-primary)]",
              "placeholder:text-[var(--text-muted)] bg-white transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-offset-0",
              error
                ? "border-[var(--danger-500)] focus:border-[var(--danger-500)] focus:ring-[var(--danger-500)]/20"
                : "border-[var(--border)] focus:border-[var(--primary-500)] focus:ring-[var(--primary-500)]/20",
              !!icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-[var(--danger-500)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
