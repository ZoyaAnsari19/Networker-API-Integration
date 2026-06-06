"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

const STATUS_CONFIG: Record<string, { variant: BadgeVariant; icon?: React.ReactNode; label: string }> = {
  ACTIVE:            { variant: "success", icon: <CheckCircle2 className="w-3 h-3" />, label: "Active" },
  APPROVED:          { variant: "success", icon: <CheckCircle2 className="w-3 h-3" />, label: "Approved" },
  COMPLETED:         { variant: "success", icon: <CheckCircle2 className="w-3 h-3" />, label: "Completed" },
  PLACED:            { variant: "success", icon: <CheckCircle2 className="w-3 h-3" />, label: "Placed" },
  PENDING:           { variant: "warning", icon: <Clock className="w-3 h-3" />,         label: "Pending" },
  PENDING_PLACEMENT: { variant: "warning", icon: <Clock className="w-3 h-3" />,         label: "Pending Placement" },
  PROCESSING:        { variant: "info",    icon: <Clock className="w-3 h-3" />,         label: "Processing" },
  INACTIVE:          { variant: "neutral", icon: <Ban className="w-3 h-3" />,           label: "Inactive" },
  FAILED:            { variant: "danger",  icon: <XCircle className="w-3 h-3" />,       label: "Failed" },
  REJECTED:          { variant: "danger",  icon: <XCircle className="w-3 h-3" />,       label: "Rejected" },
  BLOCKED:           { variant: "danger",  icon: <Ban className="w-3 h-3" />,           label: "Blocked" },
  EXPIRED:           { variant: "neutral", icon: <Clock className="w-3 h-3" />,         label: "Expired" },
  DISABLED:          { variant: "neutral", icon: <Ban className="w-3 h-3" />,           label: "Disabled" },
  RENEWED:           { variant: "info",    icon: <CheckCircle2 className="w-3 h-3" />,  label: "Renewed" },
  CREDIT:            { variant: "success", label: "Credit" },
  DEBIT:             { variant: "danger",  label: "Debit" },
  open:              { variant: "warning", icon: <Clock className="w-3 h-3" />,         label: "Open" },
  in_progress:       { variant: "info",    icon: <Clock className="w-3 h-3" />,         label: "In progress" },
  closed:            { variant: "neutral", icon: <CheckCircle2 className="w-3 h-3" />, label: "Closed" },
};

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-[var(--success-50)] text-[var(--success-600)]",
  warning: "bg-[var(--warning-50)] text-[var(--warning-600)]",
  danger:  "bg-[var(--danger-50)] text-[var(--danger-600)]",
  info:    "bg-[var(--primary-50)] text-[var(--primary-600)]",
  neutral: "bg-[var(--bg)] text-[var(--text-secondary)]",
};

export const Badge = ({ status, children, className }: { status: string; children?: React.ReactNode; className?: string }) => {
  const config = STATUS_CONFIG[status] || { variant: "neutral" as BadgeVariant, label: status };
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold",
      variantClasses[config.variant],
      className
    )}>
      {config.icon}
      {children || config.label}
    </span>
  );
};
