"use client";
import React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "right" | "center";
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  actions?: (row: T) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
  bleed?: boolean;
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  actions,
  emptyMessage = "No data available",
  className,
  bleed = true,
  onRowClick,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-[#9CA3AF]">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className={cn("overflow-x-auto", bleed && "-mx-6 -mb-6", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-y border-[#E5E7EB] bg-slate-50/95">
            {columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF]",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center"
                )}
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] text-right">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {data.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "group/row bg-white transition-[background-color] duration-150 ease-out hover:bg-slate-50/95",
                onRowClick && "cursor-pointer"
              )}
            >
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "px-6 py-4 text-sm text-[#6B7280] whitespace-nowrap align-middle transition-colors duration-150 group-hover/row:text-[#111827]",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  {col.render ? col.render(row) : col.accessor ? String(row[col.accessor] ?? "—") : null}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-4 text-right align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
