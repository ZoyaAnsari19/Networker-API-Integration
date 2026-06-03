"use client";
import React, { useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { BodyPortal } from "@/components/body-portal";

type FullViewportModalProps = {
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  "aria-labelledby"?: string;
};

export function FullViewportModal({
  onClose,
  children,
  panelClassName,
  "aria-labelledby": ariaLabelledBy,
}: FullViewportModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape]);

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-labelledby={ariaLabelledBy}>
        <div className="fixed inset-0 bg-slate-900/55 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-md" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto overscroll-contain" onClick={onClose}>
          <div className="flex min-h-full min-h-[100dvh] items-center justify-center p-3 sm:p-4 md:p-6">
            <div className={cn("relative w-full", panelClassName)} onClick={(e) => e.stopPropagation()}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </BodyPortal>
  );
}
