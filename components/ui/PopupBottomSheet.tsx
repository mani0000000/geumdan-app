"use client";
import { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Popup } from "@/lib/db/popups";

interface Props {
  popups: Popup[];
}

export default function PopupBottomSheet({ popups }: Props) {
  const [visible,   setVisible]   = useState(false);
  const [idx,       setIdx]       = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const activePopups = popups.filter(p => !dismissed.has(p.id));

  useEffect(() => {
    if (popups.length > 0) {
      setVisible(true);
      setIdx(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popups.length]);

  // ─── 팝업이 열려 있는 동안 배경 스크롤 완전 잠금 ─────────────
  useEffect(() => {
    const on = visible && activePopups.length > 0;
    if (!on) {
      document.body.style.overflow    = "";
      document.body.style.touchAction = "";
      return;
    }
    // scrollY 기억 후 body를 fixed → 스크롤 위치 고정
    const savedY = window.scrollY;
    document.body.style.overflow    = "hidden";
    document.body.style.position    = "fixed";
    document.body.style.top         = `-${savedY}px`;
    document.body.style.width       = "100%";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow    = "";
      document.body.style.position    = "";
      document.body.style.top         = "";
      document.body.style.width       = "";
      document.body.style.touchAction = "";
      window.scrollTo(0, savedY);
    };
  }, [visible, activePopups.length]);

  if (!visible || activePopups.length === 0) return null;

  const current = activePopups[Math.min(idx, activePopups.length - 1)];
  if (!current) return null;

  function dismissCurrent() {
    const next = new Set([...dismissed, current.id]);
    setDismissed(next);
    const remaining = activePopups.filter(p => p.id !== current.id);
    if (remaining.length === 0) setVisible(false);
    else setIdx(i => Math.min(i, remaining.length - 1));
  }

  function closeAll() {
    setDismissed(new Set(activePopups.map(p => p.id)));
    setVisible(false);
  }

  return (
    <>
      {/* ─── 딤 배경 — 클릭·터치 차단 ─────────────────────────── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 19000,         // BottomNav(9000) 보다 확실히 위
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
        onClick={closeAll}
        onTouchMove={e => e.preventDefault()}
      />

      {/* ─── 팝업 카드 ─────────────────────────────────────────── */}
      <div
        style={{
          position:     "fixed",
          left:         "50%",
          bottom:       90,                        // BottomNav(64px + 20px gap) 위
          transform:    "translateX(-50%)",
          width:        "calc(100% - 32px)",
          maxWidth:     400,
          zIndex:       20000,
          borderRadius: 24,
          overflow:     "hidden",
          background:   "white",
          boxShadow:    "0 8px 48px rgba(0,0,0,0.26), 0 2px 8px rgba(0,0,0,0.12)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 닫기 버튼 (카드 오른쪽 상단) */}
        <button
          onClick={closeAll}
          style={{
            position: "absolute", top: 12, right: 12,
            width: 30, height: 30, borderRadius: "50%",
            background: "rgba(0,0,0,0.45)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1,
          }}>
          <X size={15} color="white" strokeWidth={2.5} />
        </button>

        {/* 이미지 */}
        {current.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.image_url}
            alt={current.title}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
          />
        )}

        {/* 텍스트 */}
        <div style={{ padding: "20px 20px 16px" }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", marginBottom: 6, lineHeight: 1.4 }}>
            {current.title}
          </p>
          {current.body && (
            <p style={{ fontSize: 14, color: "#6e6e73", lineHeight: 1.6 }}>{current.body}</p>
          )}
        </div>

        {/* 액션 버튼 */}
        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
          <button onClick={dismissCurrent} style={{
            flex: 1, height: 44, borderRadius: 14,
            border: "1.5px solid #e5e5ea",
            background: "transparent",
            fontSize: 14, fontWeight: 600, color: "#86868b", cursor: "pointer",
          }}>
            닫기
          </button>
          {current.link_url ? (
            <a href={current.link_url} target="_blank" rel="noopener noreferrer" style={{
              flex: 2, height: 44, borderRadius: 14,
              background: "#3182F6",
              fontSize: 14, fontWeight: 700, color: "white",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              textDecoration: "none",
            }}>
              {current.button_text ?? "자세히 보기"}
              <ExternalLink size={13} />
            </a>
          ) : (
            <button onClick={closeAll} style={{
              flex: 2, height: 44, borderRadius: 14,
              background: "#3182F6",
              fontSize: 14, fontWeight: 700, color: "white",
              border: "none", cursor: "pointer",
            }}>
              {current.button_text ?? "확인"}
            </button>
          )}
        </div>

        {/* 여러 팝업 → 페이지 인디케이터 */}
        {activePopups.length > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "0 0 14px" }}>
            {activePopups.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                <div style={{
                  width: i === idx ? 18 : 6, height: 6,
                  borderRadius: 3,
                  background: i === idx ? "#3182F6" : "#d2d2d7",
                  transition: "all 0.2s",
                }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
