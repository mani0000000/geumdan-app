"use client";
import type { Coupon } from "@/lib/types";
import StoreLogo from "@/components/ui/StoreLogo";

interface Props {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
  width?: number; // default 200
}

export default function CouponCard({ coupon: c, downloaded: done, onToggle, width = 200 }: Props) {
  const dDay = Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000);
  const urgent = dDay <= 3;

  return (
    <div
      className="shrink-0 bg-white rounded-2xl overflow-hidden shadow-sm select-none flex flex-col"
      style={{ width, border: `1.5px solid ${c.color}28` }}
    >
      {/* ── 상단 컬러 스트라이프 ── */}
      <div className="h-[5px]" style={{ background: c.color }} />

      {/* ── 매장 정보 ── */}
      <div className="px-3.5 pt-3 pb-2.5 flex items-center gap-2.5">
        <StoreLogo name={c.storeName} category={c.category} size={34} rounded="rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-extrabold text-[#1d1d1f] truncate leading-tight">{c.storeName}</p>
          <p className="text-[11px] text-[#86868b] truncate mt-0.5">{c.buildingName}</p>
        </div>
        {/* COUPON badge */}
        <span
          className="shrink-0 text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded-md border"
          style={{ color: c.color, borderColor: `${c.color}50`, background: `${c.color}10` }}
        >
          COUPON
        </span>
      </div>

      {/* ── 절취선 ── */}
      <div className="relative flex items-center" style={{ height: 16 }}>
        {/* 좌측 반원 노치 */}
        <div
          className="absolute -left-2.5 w-5 h-5 rounded-full"
          style={{ background: "#f5f5f7" }}
        />
        {/* 점선 */}
        <div
          className="flex-1 border-t-2 border-dashed mx-5"
          style={{ borderColor: `${c.color}40` }}
        />
        {/* ✂ 아이콘 */}
        <span
          className="absolute left-1/2 -translate-x-1/2 text-[12px] leading-none"
          style={{ color: `${c.color}70` }}
        >
          ✂
        </span>
        {/* 우측 반원 노치 */}
        <div
          className="absolute -right-2.5 w-5 h-5 rounded-full"
          style={{ background: "#f5f5f7" }}
        />
      </div>

      {/* ── 할인 영역 ── */}
      <div className="px-3.5 pt-2.5 pb-3.5 flex-1 flex flex-col">
        {/* 할인액/율 */}
        <div className="flex items-baseline gap-1 mb-1.5">
          <span
            className="text-[34px] font-black leading-none tabular-nums"
            style={{ color: c.color }}
          >
            {c.discount}
          </span>
          <span className="text-[13px] font-bold text-[#86868b]">할인</span>
        </div>

        {/* 쿠폰 제목 */}
        <p className="text-[11px] text-[#6e6e73] leading-snug line-clamp-2 flex-1 mb-3">
          {c.title}
        </p>

        {/* 하단: 만료일 + CTA */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-bold ${urgent ? "text-[#F04452]" : "text-[#86868b]"}`}
          >
            {urgent ? `⏰ D-${dDay}` : `~${c.expiry.slice(5)}`}
          </span>
          <button
            onClick={onToggle}
            className={[
              "h-8 px-4 rounded-xl text-[12px] font-black transition-all active:scale-95",
              done
                ? "bg-[#f5f5f7] text-[#86868b]"
                : "text-white shadow-sm",
            ].join(" ")}
            style={done ? {} : { background: c.color }}
          >
            {done ? "✓ 받음" : "쿠폰받기"}
          </button>
        </div>
      </div>
    </div>
  );
}

// localStorage key for downloaded coupon IDs
export const COUPON_DL_KEY = "downloadedCoupons";

export function loadDownloaded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(COUPON_DL_KEY) ?? "[]") as string[]);
  } catch { return new Set(); }
}

export function saveDownloaded(set: Set<string>): void {
  try { localStorage.setItem(COUPON_DL_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}
