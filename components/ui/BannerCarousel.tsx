"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Banner } from "@/lib/db/banners";

const BADGE_LIGHT = new Set(["#FDE68A", "#FFD600", "#FFFFFF", "#F59E0B"]);

function badgeTextColor(color: string) {
  return BADGE_LIGHT.has(color.toUpperCase()) || BADGE_LIGHT.has(color) ? "#1d1d1f" : "#ffffff";
}

interface Props {
  banners: Banner[];
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback(
    (idx: number) => setCurrent(((idx % banners.length) + banners.length) % banners.length),
    [banners.length]
  );

  useEffect(() => {
    if (paused || banners.length <= 1) return;
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % banners.length), 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="px-4 pb-1 pt-3">
      <div
        className="relative w-full rounded-2xl overflow-hidden select-none"
        style={{ height: 192 }}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; setPaused(true); }}
        onTouchEnd={e => {
          if (touchStartX.current !== null) {
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 44) goTo(current + (dx < 0 ? 1 : -1));
          }
          touchStartX.current = null;
          setTimeout(() => setPaused(false), 1200);
        }}
      >
        {/* 슬라이드 트랙 */}
        <div
          className="flex h-full w-full"
          style={{
            transform: `translateX(-${current * 100}%)`,
            transition: "transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {banners.map(b => (
            <div key={b.id} className="relative h-full w-full flex-shrink-0">
              {/* 배경 — 이미지 or 그라디언트 */}
              {b.image_url ? (
                <img
                  src={b.image_url}
                  alt={b.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${b.bg_from}, ${b.bg_to})` }}
                />
              )}

              {/* 텍스트 가독성용 하단 그라디언트 */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)",
                }}
              />

              {/* 배지 */}
              {b.badge && (
                <div className="absolute top-3.5 left-3.5">
                  <span
                    className="text-[11px] font-black px-2.5 py-1 rounded-full shadow"
                    style={{ background: b.badge_color, color: badgeTextColor(b.badge_color) }}
                  >
                    {b.badge}
                  </span>
                </div>
              )}

              {/* 텍스트 + 링크 */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                <p className="text-[20px] font-black text-white leading-tight drop-shadow">
                  {b.title}
                </p>
                {b.subtitle && (
                  <p className="text-[13px] text-white/80 mt-1 leading-snug drop-shadow">
                    {b.subtitle}
                  </p>
                )}
                {b.link_url && (
                  <a
                    href={b.link_url}
                    className="mt-3 inline-flex items-center h-8 px-4 rounded-full text-[12px] font-bold
                               bg-white/20 backdrop-blur-sm text-white border border-white/30 active:bg-white/35"
                  >
                    {b.link_label || "자세히 보기"} →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 슬라이드 카운터 */}
        {banners.length > 1 && (
          <div className="absolute top-3.5 right-3.5">
            <span className="text-[11px] font-semibold bg-black/30 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {current + 1} / {banners.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
