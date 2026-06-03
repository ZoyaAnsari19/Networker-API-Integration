"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  contentClassName?: string;
}

const paddingMap = { none: "", sm: "p-4", md: "p-5", lg: "p-6" };

export const Card = ({
  children,
  className,
  title,
  description,
  actions,
  padding = "md",
  hover = false,
  contentClassName,
}: CardProps) => (
  <div
    className={cn(
      "bg-white rounded-[14px] border border-[var(--border)]",
      "shadow-[var(--shadow-sm)]",
      hover && "hover:shadow-[var(--shadow-md)] hover:border-[var(--text-muted)] transition-all duration-200",
      className
    )}
  >
    {(title || description || actions) && (
      <div className="px-6 py-5 border-b border-[var(--border)] flex justify-between items-start gap-4 shrink-0">
        <div>
          {title && <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>}
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
    )}
    <div className={cn(paddingMap[padding], contentClassName)}>{children}</div>
  </div>
);
