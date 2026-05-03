"use client";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, EyeOff, Eye, Flag } from "lucide-react";

interface Props {
  isHidden?: boolean;
  onHide?: () => void;
  onUnhide?: () => void;
  onReport: () => void;
  size?: number;
}

export function PostMenu({ isHidden, onHide, onUnhide, onReport, size = 18 }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(v => !v); }}
        className="p-1.5 rounded-full active:bg-[#f5f5f7]"
        aria-label="더보기"
      >
        <MoreHorizontal size={size} className="text-[#86868b]" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 bg-white border border-[#d2d2d7] rounded-xl shadow-lg z-30 min-w-[140px] overflow-hidden"
          onClick={e => { e.stopPropagation(); e.preventDefault(); }}
        >
          {isHidden ? (
            <button
              onClick={() => { setOpen(false); onUnhide?.(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] active:bg-[#f5f5f7]"
            >
              <Eye size={14} />숨김 해제
            </button>
          ) : (
            <button
              onClick={() => { setOpen(false); onHide?.(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] active:bg-[#f5f5f7]"
            >
              <EyeOff size={14} />숨기기
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onReport(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#F04452] border-t border-[#f5f5f7] hover:bg-[#FFF0F0] active:bg-[#FFF0F0]"
          >
            <Flag size={14} />신고
          </button>
        </div>
      )}
    </div>
  );
}
