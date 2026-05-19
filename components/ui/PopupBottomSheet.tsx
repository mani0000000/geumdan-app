"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { X } from "lucide-react";
import type { Popup } from "@/lib/db/popups";

const HIDE_KEY = "popupHideDate";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  popups: Popup[];
}

export default function PopupBottomSheet({ popups }: Props) {
  const [closed, setClosed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => { setImgFailed(false); }, [current]);

  const goTo = useCallback(
    (idx: number) => setCurrent(((idx % popups.length) + popups.length) % popups.length),
    [popups.length]
  );

  if (closed || popups.length === 0) return null;

  // "오늘 하루 보지 않음" 처리 — 렌더 시점 검사
  try {
    if (typeof window !== "undefined" && localStorage.getItem(HIDE_KEY) === todayStr()) {
      return null;
    }
  } catch { /* noop */ }

  const p = popups[current];
  const multi = popups.length > 1;

  function hideToday() {
    try { localStorage.setItem(HIDE_KEY, todayStr()); } catch { /* noop */ }
    setClosed(true);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={() => setClosed(true)} />

      <div className="relative z-10 w-full max-w-md bg-white rounded-t-3xl overflow-hidden">
        {/* 이미지 캐러셀 (배너 방식 — 꽉 차게) */}
        <div
          className="relative w-full select-none bg-[#f5f5f7]"
          style={{ aspectRatio: "1 / 1" }}
          onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={e => {
            if (touchStartX.current !== null && multi) {
              const dx = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(dx) > 44) goTo(current + (dx < 0 ? 1 : -1));
            }
            touchStartX.current = null;
          }}
        >
          {p.image_url && !imgFailed ? (
            <img
              key={p.id}
              src={p.image_url}
              alt={p.title}
              onError={() => setImgFailed(true)}
              onClick={() => { if (p.link_url) window.location.href = p.link_url; }}
              className={`absolute inset-0 w-full h-full object-cover ${p.link_url ? "cursor-pointer" : ""}`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-[13px]">
              이미지 없음
            </div>
          )}

          {/* 인디케이터 도트 */}
          {multi && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {popups.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === current ? "w-5 bg-white" : "w-1.5 bg-white/50"
                  }`}
                  style={{ boxShadow: "0 0 2px rgba(0,0,0,.4)" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 하단 액션 — 작게 */}
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={hideToday}
            className="text-[12px] text-gray-400 px-1.5 py-1 active:text-gray-600"
          >
            오늘 하루 보지 않음
          </button>
          <button
            onClick={() => setClosed(true)}
            className="flex items-center gap-0.5 text-[12px] text-gray-500 px-1.5 py-1 active:text-gray-700"
          >
            닫기 <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
