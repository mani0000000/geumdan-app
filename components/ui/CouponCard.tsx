"use client";
import { Download } from "lucide-react";
import type { Coupon } from "@/lib/types";

interface Props {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
  width?: number;
}

function lightenHex(hex: string, ratio = 0.42): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio);
  const g = Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio);
  const b = Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export default function CouponCard({ coupon: c, downloaded: done, onToggle, width = 200 }: Props) {
  const dDay = Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000);
  const urgent = dDay <= 3;

  return (
    <div
      className="shrink-0 relative rounded-[20px] overflow-hidden select-none"
      style={{
        width,
        background: `linear-gradient(135deg, ${c.color} 0%, ${lightenHex(c.color)} 100%)`,
      }}
    >
      {/* 우측 노치 */}
      <div
        className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full"
        style={{ background: "#F5F6F8" }}
      />

      <div className="flex flex-col px-4 pt-4 pb-3.5" style={{ gap: 10 }}>

        {/* 상단: 제목 + COUPON 뱃지 */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold text-white/70 leading-tight line-clamp-1 flex-1">
            {c.title}
          </p>
          <span className="shrink-0 text-[8px] font-black tracking-widest px-1.5 py-[3px] rounded-md bg-white/20 text-white/90">
            COUPON
          </span>
        </div>

        {/* 할인 금액/율 */}
        <div>
          <p className="text-[40px] font-black text-white leading-none tabular-nums tracking-tight">
            {c.discount}
          </p>
          <p className="text-[11px] font-bold text-white/55 mt-0.5">
            {c.discountType === "amount" ? "원 할인" : "할인"}
          </p>
        </div>

        {/* 매장·건물 */}
        <p className="text-[10px] text-white/50 truncate">
          {c.storeName} · {c.buildingName}
        </p>

        {/* 점선 구분선 */}
        <div className="border-t border-dashed border-white/20" />

        {/* 하단: 유효기간 + 다운로드 버튼 */}
        <div className="flex items-center justify-between pr-1">
          <div>
            <p className={`text-[10px] font-semibold leading-tight ${urgent ? "text-yellow-300" : "text-white/60"}`}>
              {c.expiry.replace(/-/g, ".")} 23:59까지
            </p>
            {urgent && (
              <p className="text-[10px] font-black text-yellow-300 mt-0.5">⏰ D-{dDay}</p>
            )}
          </div>
          <button
            onClick={onToggle}
            className="w-[38px] h-[38px] rounded-full flex items-center justify-center active:scale-90 transition-all shrink-0"
            style={{ background: "rgba(0,0,0,0.32)" }}
          >
            {done
              ? <span className="text-white text-[14px] font-black">✓</span>
              : <Download size={16} color="white" strokeWidth={2.5} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}

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
