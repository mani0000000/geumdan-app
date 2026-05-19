"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Popup } from "@/lib/db/popups";

const HIDE_KEY = "geumdan_popup_hide_date";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export default function PopupBottomSheet({ popups }: { popups: Popup[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (popups.length === 0) return;
    let hidden = false;
    try {
      hidden = localStorage.getItem(HIDE_KEY) === todayStr();
    } catch {}
    if (!hidden) setOpen(true);
  }, [popups.length]);

  if (!open || popups.length === 0) return null;

  function close() {
    setOpen(false);
  }

  function hideToday() {
    try {
      localStorage.setItem(HIDE_KEY, todayStr());
    } catch {}
    setOpen(false);
  }

  function handleLink(p: Popup) {
    if (!p.link_url) return;
    close();
    if (p.link_url.startsWith("/")) {
      router.push(p.link_url);
    } else {
      window.open(p.link_url, "_blank", "noopener,noreferrer");
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    startY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (dragY > 90) {
      close();
    }
    setDragY(0);
    startY.current = null;
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(i);
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={close} />

      <div
        className="relative w-full max-w-2xl mx-auto bg-white rounded-t-3xl shadow-2xl"
        style={{
          maxHeight: "85dvh",
          transform: `translateY(${dragY}px)`,
          transition: startY.current == null ? "transform 0.2s ease-out" : "none",
        }}
      >
        {/* 핸들 바 + 닫기 (드래그 영역) */}
        <div
          className="pt-3 pb-1"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex justify-center">
            <div className="w-10 h-1.5 rounded-full bg-gray-300" />
          </div>
          <button
            onClick={close}
            aria-label="닫기"
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 active:bg-gray-200"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* 캐러셀 */}
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory"
        >
          {popups.map(p => (
            <div key={p.id} className="shrink-0 w-full snap-center">
              <div className="overflow-y-auto px-5 pb-2" style={{ maxHeight: "62dvh" }}>
                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt=""
                    className="w-full max-h-64 object-cover rounded-2xl"
                  />
                )}
                <p className="text-[19px] font-extrabold text-[#191F28] mt-4">{p.title}</p>
                {p.body && (
                  <p className="text-[14px] text-gray-600 mt-2.5 whitespace-pre-wrap leading-relaxed">
                    {p.body}
                  </p>
                )}
                {p.link_url && (
                  <button
                    onClick={() => handleLink(p)}
                    className="mt-5 w-full h-12 rounded-xl bg-[#3182F6] text-white text-[15px] font-bold active:opacity-80"
                  >
                    {p.link_label || "자세히 보기"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 도트 인디케이터 */}
        {popups.length > 1 && (
          <div className="flex justify-center gap-1.5 py-3">
            {popups.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-5 bg-[#3182F6]" : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
        )}

        {/* 하단 액션 */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={hideToday}
            className="flex-1 h-12 text-[14px] font-semibold text-gray-500 active:bg-gray-50"
          >
            오늘 하루 보지 않기
          </button>
          <div className="w-px bg-gray-100" />
          <button
            onClick={close}
            className="flex-1 h-12 text-[14px] font-bold text-[#191F28] active:bg-gray-50"
          >
            닫기
          </button>
        </div>

        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </div>
    </div>
  );
}
