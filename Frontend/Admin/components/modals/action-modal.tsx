"use client";
import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FullViewportModal } from "@/components/full-viewport-modal";

interface ActionModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  titleIcon?: React.ReactNode;
  /** Shown between the title and the close control (e.g. compact wallet chips). */
  headerTrailing?: React.ReactNode;
  footer?: React.ReactNode;
  hideHeader?: boolean;
}

export const ActionModal = ({
  title,
  onClose,
  children,
  maxWidth = "max-w-lg",
  titleIcon,
  headerTrailing,
  footer,
  hideHeader = false,
}: ActionModalProps) => {
  return (
    <FullViewportModal onClose={onClose} panelClassName={cn(maxWidth)}>
      <div
        className={cn(
          "max-h-[min(90dvh,880px)] overflow-hidden flex flex-col",
          "bg-white rounded-2xl shadow-2xl border border-slate-200",
          "animate-fade-up"
        )}
      >
        {!hideHeader && (
          <div className="flex shrink-0 items-center gap-2 sm:gap-3 px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-100 bg-slate-50/80 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0 max-w-[min(52%,14rem)] sm:max-w-[40%]">
              {titleIcon && (
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  {titleIcon}
                </div>
              )}
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 truncate">{title}</h2>
            </div>
            {headerTrailing ? (
              <div className="flex-1 min-w-0 flex items-stretch justify-end gap-1.5 sm:gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {headerTrailing}
              </div>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>
    </FullViewportModal>
  );
};
