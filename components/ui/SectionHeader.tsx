"use client";
import React from "react";

interface SectionHeaderProps {
  title: string;
  badge?: string | number;
  action?: React.ReactNode;
  accent?: boolean;
  className?: string;
}

export function SectionHeader({ title, badge, action, accent = true, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between px-4 pt-6 pb-3 ${className ?? ""}`}>
      <div className="flex items-center gap-2.5">
        {accent && (
          <span
            className="w-1 h-5 rounded-full shrink-0"
            style={{ background: "linear-gradient(180deg, #3182F6 0%, #7C3AED 100%)" }}
          />
        )}
        <h2 className="text-[20px] font-extrabold text-[#1d1d1f] tracking-tight">{title}</h2>
        {badge !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-[12px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3182F6 0%, #2563EB 100%)" }}>
            {badge}
          </span>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
