"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, Loader2, X } from "lucide-react";
import type { BrandPromotion } from "@/lib/db/brand-promotions";

function dateRange(item: BrandPromotion) {
  const format = (value: string) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value));
  if (item.starts_at && item.ends_at) return `${format(item.starts_at)} ~ ${format(item.ends_at)}`;
  if (item.ends_at) return `${format(item.ends_at)}까지`;
  return "공식 홈페이지에서 기간 확인";
}

export default function BrandPromotionViewer({ promotion, onClose }: { promotion: BrandPromotion; onClose: () => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const previous = document.body.style.overflow;
    const keydown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keydown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-[#07111f]/72 backdrop-blur-md sm:p-5" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="flex h-full w-full max-w-[900px] flex-col overflow-hidden bg-white sm:h-[min(920px,94dvh)] sm:rounded-[30px] sm:shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="shrink-0 border-b border-black/[0.06] bg-white/95 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f1f3f5]" aria-label="닫기"><X size={19}/></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-black text-[#172033]">{promotion.brand_name} 공식 홈페이지</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-[#657386]"><CalendarDays size={12}/>{dateRange(promotion)}</p>
            </div>
            <a href={promotion.source_url} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#eef5ff] text-[#2563eb]" aria-label="브라우저에서 공식 페이지 열기"><ExternalLink size={17}/></a>
          </div>
        </header>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {loading && <div className="absolute inset-0 z-10 grid place-items-center bg-[#f5f6f8]"><div className="text-center"><Loader2 className="mx-auto animate-spin text-[#2563eb]"/><p className="mt-3 text-[13px] font-bold text-[#566171]">공식 행사 페이지를 불러오는 중이에요</p></div></div>}
          <iframe src={`/api/promotions/reader?id=${encodeURIComponent(promotion.id)}`} title={`${promotion.brand_name} 공식 할인`} onLoad={() => setLoading(false)} className="h-full w-full border-0 bg-white" sandbox="allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin" referrerPolicy="no-referrer" />
        </div>
      </div>
    </div>
  );
}
