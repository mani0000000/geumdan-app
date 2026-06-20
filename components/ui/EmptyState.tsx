"use client";
import React from "react";

interface EmptyStateProps {
  icon: string;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, desc, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-4 text-3xl animate-spring-in">
        {icon}
      </div>
      <p className="text-[17px] font-bold text-[#1d1d1f] mb-1">{title}</p>
      {desc && (
        <p className="text-[14px] text-[#6e6e73] text-center leading-relaxed mt-0.5">{desc}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
