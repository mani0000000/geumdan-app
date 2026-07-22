"use client";

import { useRef, useState } from "react";
import { CalendarDays, MoveRight, Percent } from "lucide-react";
import type { Banner } from "@/lib/db/banners";
import BrandPromotionViewer from "@/components/ui/BrandPromotionViewer";
import type { BrandPromotion } from "@/lib/db/brand-promotions";
import { normalizeNewsText } from "@/lib/api/news";

interface Props { banners: Banner[] }

function periodLabel(banner: Banner) {
  if (!banner.promotion?.ends_at) return "공식 페이지에서 기간 확인";
  const format = (value: string) => new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "UTC" }).format(new Date(value));
  if (banner.promotion.starts_at) return `${format(banner.promotion.starts_at)} ~ ${format(banner.promotion.ends_at)}`;
  return `${format(banner.promotion.ends_at)}까지`;
}

function displayTitle(value: string) {
  const cleaned = normalizeNewsText(value)
    .replace(/^공지사항\s*/i, "")
    .replace(/^진행중\s*(?:20\d{2}[-./]\d{1,2}[-./]\d{1,2}\s*~\s*20\d{2}[-./]\d{1,2}[-./]\d{1,2})?\s*/i, "")
    .replace(/\s+(안녕하세요|항상\s+\S+을?\s+이용해).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= 58) return cleaned;
  const shortened = cleaned.slice(0, 58);
  const boundary = Math.max(shortened.lastIndexOf(" "), shortened.lastIndexOf("·"));
  return `${shortened.slice(0, boundary > 34 ? boundary : 58).trim()}…`;
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [selectedPromotion, setSelectedPromotion] = useState<BrandPromotion | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  if (!banners.length) return null;

  function openBanner(banner: Banner) {
    if (banner.promotion) setSelectedPromotion(banner.promotion);
  }

  function updateCurrentCard() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const strip = stripRef.current;
      if (!strip) return;
      const cards = Array.from(strip.children) as HTMLElement[];
      const firstCard = cards[0];
      if (!firstCard) return;
      const gap = 12;
      const nearest = Math.round(strip.scrollLeft / (firstCard.offsetWidth + gap));
      setCurrent(Math.min(banners.length - 1, Math.max(0, nearest)));
    });
  }

  return (
    <section className="mt-5" aria-label="브랜드 할인">
      <div className="mb-3 flex items-end justify-between px-4">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-[.04em] text-[#2563eb]"><Percent size={12} strokeWidth={2.6}/>OFFICIAL SALE</div>
          <h2 className="mt-1 text-[20px] font-black tracking-[-.045em] text-[#191f28]">지금 받을 수 있는 할인</h2>
        </div>
        {banners.length > 1 && <span className="mb-0.5 text-[10px] font-bold tabular-nums text-[#8b95a1]">{current + 1} / {banners.length}</span>}
      </div>

      <div
        ref={stripRef}
        onScroll={updateCurrentCard}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 scroll-px-4 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        aria-label="할인 카드 목록"
      >
        {banners.map((banner, index) => {
          const title = displayTitle(banner.title);
          const isPromotion = Boolean(banner.promotion);
          return (
            <article
              key={banner.id}
              className="w-[min(68vw,268px)] flex-none snap-start scroll-ml-4 overflow-hidden rounded-[20px] border border-black/[0.055] bg-white shadow-[0_8px_22px_rgba(34,50,84,.08)]"
              aria-label={`${index + 1}번 할인 ${title}`}
            >
              <button
                type="button"
                onClick={isPromotion ? () => openBanner(banner) : undefined}
                className="relative block aspect-square w-full overflow-hidden bg-[#f2f4f6] text-left"
                aria-label={`${title} 자세히 보기`}
              >
                {banner.image_url ? (
                  <img src={banner.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 active:scale-[1.02]" referrerPolicy="no-referrer" />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${banner.bg_from}, ${banner.bg_to})` }} />
                )}
              </button>

              <div className="p-3">
                <div className="flex items-center gap-1.5">
                  <span className="max-w-[62%] truncate rounded-full bg-[#f2f4f6] px-2 py-1 text-[9px] font-black text-[#4e5968]">{banner.promotion?.brand_name || banner.badge || "검단 라이프"}</span>
                  <span className="rounded-full bg-[#e8f1ff] px-2 py-1 text-[9px] font-black text-[#2563eb]">할인</span>
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-[40px] text-[14px] font-black leading-[1.4] tracking-[-.025em] text-[#191f28]">{title}</h3>
                <div className="mt-2.5 flex items-center gap-2 border-t border-black/[0.05] pt-2.5">
                  <div className="flex min-w-0 flex-1 items-center gap-1 text-[10px] font-semibold text-[#8b95a1]"><CalendarDays size={11}/><span className="truncate">{periodLabel(banner)}</span></div>
                  {banner.promotion ? (
                    <button type="button" onClick={() => openBanner(banner)} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#191f28] px-3 text-[10px] font-black text-white active:scale-[.96]">공식 페이지<MoveRight size={11}/></button>
                  ) : banner.link_url ? (
                    <a href={banner.link_url} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-[#191f28] px-3 text-[10px] font-black text-white">보기<MoveRight size={11}/></a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
        <div aria-hidden="true" className="w-1 shrink-0" />
      </div>

      {selectedPromotion && <BrandPromotionViewer promotion={selectedPromotion} onClose={() => setSelectedPromotion(null)} />}
    </section>
  );
}
