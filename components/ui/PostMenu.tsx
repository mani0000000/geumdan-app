"use client";
import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, EyeOff, Flag } from "lucide-react";

interface PostMenuProps {
  postId?: string;
  onHide?: (id?: string) => void;
  onReport?: (id?: string) => void;
}

export function PostMenu({ postId, onHide, onReport }: PostMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <MoreHorizontal size={16} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden min-w-[140px]">
          {onHide && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onHide(postId); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              <EyeOff size={15} className="text-gray-500" />
              이 글 숨기기
            </button>
          )}
          {onReport && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onReport(postId); }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-[14px] text-red-600 hover:bg-red-50 active:bg-red-100"
            >
              <Flag size={15} className="text-red-500" />
              신고하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
