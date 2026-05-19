"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import type { Banner } from "@/lib/db/banners";

const BADGE_LIGHT = new Set(["#FDE68A", "#FFD600", "#FFFFFF", "#F59E0B"]);

function badgeTextColor(color: string) {
  return BADGE_LIGHT.has(color.toUpperCase()) || BADGE_LIGHT.has(color) ? "#1d1d1f" : "#ffffff";
}

const AUTOPLAY_MS = 4000;
const RESUME_MS = 1500;
const SWIPE_THRESHOLD = 50;
const DURATION = 420;
const EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

interface Props {
  banners: Banner[];
}

function Slide({ b, eager }: { b: Banner; eager: boolean }) {
  return (
    <div className="relative shrink-0 w-full h-full overflow-hidden">
      {b.image_url ? (
        <img
          src={b.image_url}
          alt={b.title}
          draggable={false}
          loading={eager ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${b.bg_from}, ${b.bg_to})` }}
        />
      )}

      {/* 텍스트 영역 하단 그라디언트 오버레이 */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 100%)",
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
            draggable={false}
            className="mt-3 inline-flex items-center h-8 px-4 rounded-full text-[12px] font-bold
                       bg-white/20 backdrop-blur-sm text-white border border-white/30 active:bg-white/35"
          >
            {b.link_label || "자세히 보기"} →
          </a>
        )}
      </div>
    </div>
  );
}

export default function BannerCarousel({ banners }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setImgFailed(false); }, [current]);

  const goTo = useCallback(
    (idx: number) => setCurrent(((idx % banners.length) + banners.length) % banners.length),
    [banners.length]
  );

  useEffect(() => {
    return () => {
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, []);

  // 클론으로 점프한 직후, 다음 프레임에 트랜지션 복구
  useEffect(() => {
    if (withTransition) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setWithTransition(true))
    );
    return () => cancelAnimationFrame(id);
  }, [withTransition]);

  const pause = useCallback(() => {
    paused.current = true;
    if (resumeRef.current) clearTimeout(resumeRef.current);
  }, []);

  const scheduleResume = useCallback(() => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => {
      paused.current = false;
    }, RESUME_MS);
  }, []);

  // 트랜지션 종료 시 클론 → 원본 무탈 점프
  const handleTransitionEnd = useCallback(
    (e: React.TransitionEvent) => {
      if (!loop || e.propertyName !== "transform") return;
      if (index === n + 1) {
        setWithTransition(false);
        setIndex(1);
      } else if (index === 0) {
        setWithTransition(false);
        setIndex(n);
      }
    },
    [loop, index, n]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!loop) return;
      startX.current = e.touches[0].clientX;
      dragging.current = true;
      pause();
      setWithTransition(false);
    },
    [loop, pause]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!loop || startX.current === null) return;
      setDrag(e.touches[0].clientX - startX.current);
    },
    [loop]
  );

  const onTouchEnd = useCallback(() => {
    if (!loop || startX.current === null) return;
    const dx = drag;
    dragging.current = false;
    startX.current = null;
    setDrag(0);
    setWithTransition(true);
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      setIndex(i => i + (dx < 0 ? 1 : -1));
    }
    scheduleResume();
  }, [loop, drag, scheduleResume]);

  if (n === 0) return null;

  const realIndex = loop ? ((index - 1 + n) % n) : index;
  const transform = `translate3d(calc(${-index * 100}% + ${drag}px), 0, 0)`;

  return (
    <div className="px-4 pb-1 pt-3">
      <div
        className="relative w-full h-48 md:h-60 lg:h-72 rounded-2xl overflow-hidden select-none"
      >
        {/* 배경 그라디언트 — 항상 렌더 (이미지 로드 실패 시 fallback) */}
        <div
          className="absolute inset-0 transition-all duration-300"
          style={{ background: `linear-gradient(135deg, ${b.bg_from}, ${b.bg_to})` }}
        />
        {/* 배경 이미지 — 그라디언트 위에 덮어쓰기, 실패 시 숨김 */}
        {b.image_url && !imgFailed && (
          <img
            key={b.id}
            src={b.image_url}
            alt={b.title}
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          />
        )}

        {/* 그라디언트 오버레이 */}
        <div
          className="flex h-full"
          style={{
            transform,
            transition: withTransition ? `transform ${DURATION}ms ${EASE}` : "none",
            willChange: "transform",
            touchAction: "pan-y",
          }}
          onTransitionEnd={handleTransitionEnd}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {slides.map((b, i) => (
            <Slide key={i} b={b} eager={loop ? i === 1 : i === 0} />
          ))}
        </div>

        {/* 슬라이드 카운터 */}
        {loop && (
          <div className="absolute top-3.5 right-3.5 z-10">
            <span className="text-[11px] font-semibold bg-black/30 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
              {realIndex + 1} / {n}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
