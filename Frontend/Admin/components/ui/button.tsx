"use client";
import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[#4F46E5] text-white hover:bg-[#4338CA] active:bg-[#3730A3] shadow-sm focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-1",
  secondary: "bg-white text-[#111827] border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] active:bg-[#F3F4F6] focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-1",
  ghost: "bg-transparent text-[#4B5563] hover:bg-[#F9FAFB] hover:text-[#111827] active:bg-[#F3F4F6] focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-1",
  danger: "bg-[#EF4444] text-white hover:bg-[#E11D48] active:bg-[#BE123C] shadow-sm focus:ring-2 focus:ring-[#EF4444] focus:ring-offset-1",
  outline: "bg-transparent text-[#4F46E5] border border-[#4F46E5] hover:bg-[#EEF2FF] active:bg-[#E0E7FF] focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-1",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-[8px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-6 text-sm gap-2.5 rounded-[10px]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, icon, iconPosition = "left", children, className, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer select-none focus:outline-none",
          variantClasses[variant],
          sizeClasses[size],
          isDisabled
            ? variant === "primary"
              ? "bg-[#C7D2FE] text-white cursor-not-allowed shadow-none hover:bg-[#C7D2FE]"
              : variant === "danger"
              ? "bg-[#FECDD3] text-[#E11D48] cursor-not-allowed"
              : "opacity-50 cursor-not-allowed"
            : "",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === "right" && <span className="shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
