"use client";
import { useState, useMemo } from "react";
import { Search, X, Tag, Download, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { coupons } from "@/lib/mockData";
import type { Coupon, StoreCategory } from "@/lib/types";

const CATEGORIES: (StoreCategory | "전체")[] = [
  "전체", "카페", "음식점", "병원/약국", "미용", "마트", "기타",
];

const FLOORS = ["전체", "B1", "1F", "2F", "3F", "4F"];

function daysLeft(expiry: string) {
  const diff = Math.ceil(
    (new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function ExpiryBadge({ expiry }: { expiry: string }) {
  const days = daysLeft(expiry);
  if (days <= 3) return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#F04452]">
      D-{days}
    </span>
  );
  if (days <= 7) return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">
      D-{days}
    </span>
  );
  return (
    <span className="text-[11px] text-[#8B95A1]">~ {expiry.slice(5)}</span>
  );
}

function CouponCard({ coupon, downloaded, onToggle }: {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* 컬러 상단 바 */}
      <div className="h-1" style={{ background: coupon.color }} />
      <div className="px-4 py-3.5 flex items-center gap-3">
        {/* 로고 */}
        <StoreLogo name={coupon.storeName} category={coupon.category} size={44} />

        {/* 중간: 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: coupon.color }}>
              {coupon.category}
            </span>
            <span className="text-[11px] bg-[#F2F4F6] text-[#4E5968] px-2 py-0.5 rounded-full">
              {coupon.floor}
            </span>
            <ExpiryBadge expiry={coupon.expiry} />
          </div>
          <p className="text-[14px] font-bold text-[#191F28] leading-snug">{coupon.storeName}</p>
          <p className="text-[13px] text-[#8B95A1] mt-0.5 leading-snug">{coupon.title}</p>
        </div>

        {/* 오른쪽: 할인액 + 버튼 */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[19px] font-black" style={{ color: coupon.color }}>
            {coupon.discount}
          </span>
          <button
            onClick={onToggle}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[12px] font-bold transition-all active:opacity-70 ${
              downloaded ? "bg-[#F2F4F6] text-[#8B95A1]" : "text-white"
            }`}
            style={downloaded ? {} : { background: coupon.color }}>
            {downloaded
              ? <><CheckCircle2 size={12} />완료</>
              : <><Download size={12} />받기</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StoreCategory | "전체">("전체");
  const [floor, setFloor] = useState("전체");
  const [downloaded, setDownloaded] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );

  const filtered = useMemo(() => {
    return coupons.filter(c => {
      if (cat !== "전체" && c.category !== cat) return false;
      if (floor !== "전체" && c.floor !== floor) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!c.storeName.toLowerCase().includes(q) &&
            !c.title.toLowerCase().includes(q) &&
            !c.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [query, cat, floor]);

  // 다운로드 가능 / 마감임박 분리
  const urgent = filtered.filter(c => daysLeft(c.expiry) <= 3);
  const regular = filtered.filter(c => daysLeft(c.expiry) > 3);

  function toggle(id: string) {
    setDownloaded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      {/* 헤더 */}
      <div className="bg-white sticky top-0 z-40 border-b border-[#F2F4F6]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/home/" className="active:opacity-60">
            <ChevronLeft size={22} className="text-[#191F28]" />
          </Link>
          <h1 className="text-[18px] font-bold text-[#191F28] flex-1">쿠폰 센터</h1>
          <div className="flex items-center gap-1 bg-[#FEF3C7] px-2.5 py-1 rounded-full">
            <Tag size={12} className="text-[#D97706]" />
            <span className="text-[13px] font-bold text-[#D97706]">총 {coupons.length}장</span>
          </div>
        </div>

        {/* 검색 */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-[#F2F4F6] rounded-xl px-3.5 h-11">
            <Search size={15} className="text-[#8B95A1] shrink-0" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="매장명, 혜택 검색"
              className="flex-1 bg-transparent text-[15px] focus:outline-none text-[#191F28] placeholder:text-[#B0B8C1]"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={15} className="text-[#8B95A1]" />
              </button>
            )}
          </div>
        </div>

        {/* 업종 필터 */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${
                cat === c ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968]"
              }`}>
              {c}
            </button>
          ))}
        </div>

        {/* 층 필터 */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {FLOORS.map(f => (
            <button key={f} onClick={() => setFloor(f)}
              className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors border ${
                floor === f
                  ? "bg-[#3182F6] text-white border-[#3182F6]"
                  : "bg-white text-[#4E5968] border-[#E5E8EB]"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <span className="text-4xl">🎟️</span>
            <p className="text-[15px] text-[#8B95A1]">조건에 맞는 쿠폰이 없습니다</p>
          </div>
        ) : (
          <>
            {/* 마감임박 */}
            {urgent.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[14px] font-bold text-[#F04452]">⏰ 마감임박</span>
                  <span className="text-[12px] text-[#8B95A1]">{urgent.length}장</span>
                </div>
                <div className="space-y-2.5">
                  {urgent.map(c => (
                    <CouponCard key={c.id} coupon={c}
                      downloaded={downloaded.has(c.id)}
                      onToggle={() => toggle(c.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* 일반 쿠폰 */}
            {regular.length > 0 && (
              <div>
                {urgent.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2 mt-1">
                    <span className="text-[14px] font-bold text-[#191F28]">이번 주 쿠폰</span>
                    <span className="text-[12px] text-[#8B95A1]">{regular.length}장</span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {regular.map(c => (
                    <CouponCard key={c.id} coupon={c}
                      downloaded={downloaded.has(c.id)}
                      onToggle={() => toggle(c.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
