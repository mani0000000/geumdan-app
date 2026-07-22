"use client";

import { useEffect } from "react";
import { CalendarDays, ExternalLink, Percent, ShieldCheck, X } from "lucide-react";
import type { BrandPromotion } from "@/lib/db/brand-promotions";

function dateRange(item: BrandPromotion) {
  const format = (value: string) => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(value));
  if (item.starts_at && item.ends_at) return `${format(item.starts_at)} ~ ${format(item.ends_at)}`;
  if (item.ends_at) return `${format(item.ends_at)}까지`;
  return "공식 홈페이지에서 기간 확인";
}

export default function BrandPromotionViewer({ promotion, onClose }: { promotion: BrandPromotion; onClose: () => void }) {
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
            <a href={`/api/promotions/reader?id=${encodeURIComponent(promotion.id)}`} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full bg-[#eef5ff] text-[#2563eb]" aria-label="기기에 맞는 공식 페이지 열기"><ExternalLink size={17}/></a>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f9] px-5 py-8 sm:px-8">
          <article className="mx-auto max-w-[620px] overflow-hidden rounded-[28px] bg-white shadow-[0_18px_60px_rgba(15,23,42,.10)]">
            <div className="relative grid aspect-[16/10] place-items-center overflow-hidden bg-[linear-gradient(145deg,#172033,#334155_55%,#2563eb)]">
              <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-[#60a5fa]/25 blur-3xl" />
              <div className="relative text-center text-white">
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-[22px] bg-white/14 shadow-xl backdrop-blur"><Percent size={30}/></span>
                <p className="mt-4 text-[13px] font-black tracking-[.16em] text-white/65">OFFICIAL SALE</p>
                <p className="mt-1 text-[24px] font-black tracking-[-.04em]">{promotion.brand_name}</p>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-bold text-[#64748b]"><CalendarDays size={14}/>{dateRange(promotion)}</div>
              <h2 className="mt-3 text-[22px] font-black leading-[1.35] tracking-[-.035em] text-[#172033]">{promotion.title}</h2>
              <div className="mt-6 flex gap-3 rounded-[18px] bg-[#eef5ff] p-4 text-[#315b8f]">
                <ShieldCheck size={19} className="mt-0.5 shrink-0"/>
                <p className="text-[12px] font-semibold leading-5">원본 페이지를 복제하지 않고 브랜드 공식 홈페이지에서 직접 확인합니다. 매장별 적용 여부는 방문 전 확인해 주세요.</p>
              </div>
              <a href={`/api/promotions/reader?id=${encodeURIComponent(promotion.id)}`} target="_blank" rel="noopener noreferrer" className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-[17px] bg-[#191f28] text-[13px] font-black text-white active:scale-[.99]">
                공식 홈페이지에서 확인 <ExternalLink size={15}/>
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
