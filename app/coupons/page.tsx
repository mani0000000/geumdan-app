"use client";
import { useState, useMemo } from "react";
import {
  Search, X, Tag, Download, CheckCircle2, ChevronLeft,
  MapPin, Clock, Phone, ChevronRight, Info, Star,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { coupons, couponDetails } from "@/lib/mockData";
import type { Coupon, StoreCategory } from "@/lib/types";

const CATEGORIES: (StoreCategory | "전체")[] = [
  "전체", "카페", "음식점", "병원/약국", "미용", "마트", "기타",
];
const BUILDINGS = ["전체", ...Array.from(new Set(coupons.map(c => c.buildingName)))];

function daysLeft(expiry: string) {
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

function ExpiryBadge({ expiry }: { expiry: string }) {
  const d = daysLeft(expiry);
  if (d <= 3) return <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#F04452]">D-{d}</span>;
  if (d <= 7) return <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706]">D-{d}</span>;
  return <span className="text-[12px] text-[#6e6e73]">~ {expiry.slice(5)}</span>;
}

// ─── 바코드 모킹 ──────────────────────────────────────────────
function MockBarcode({ id, color }: { id: string; color: string }) {
  // id 해시 → 바 패턴 생성
  const bars = Array.from({ length: 40 }, (_, i) => {
    const w = ((id.charCodeAt(i % id.length) * (i + 7)) % 3) + 1;
    return w;
  });
  return (
    <div className="flex flex-col items-center gap-2 py-4 px-6 bg-white rounded-2xl border border-[#f5f5f7]">
      <div className="flex items-end gap-[2px] h-12">
        {bars.map((w, i) => (
          <div key={i} style={{ width: w, height: i % 5 === 0 ? 48 : 36, background: i % 2 === 0 ? "#1d1d1f" : "transparent" }} />
        ))}
      </div>
      <p className="text-[12px] text-[#6e6e73] tracking-widest font-mono">
        {id.toUpperCase()}-{Date.now().toString().slice(-6)}
      </p>
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
        <span className="text-[13px] font-semibold" style={{ color }}>쿠폰 제시 후 결제</span>
      </div>
    </div>
  );
}

// ─── 상세 바텀시트 ────────────────────────────────────────────
function CouponDetailSheet({
  coupon,
  downloaded,
  onToggle,
  onClose,
}: {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const detail = couponDetails[coupon.id];
  const d = daysLeft(coupon.expiry);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-[#f5f5f7] rounded-t-3xl overflow-hidden max-h-[92dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="bg-white pt-3 pb-0 flex flex-col items-center shrink-0">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full mb-3" />

          {/* 컬러 톱바 */}
          <div className="w-full h-1.5" style={{ background: coupon.color }} />

          {/* 헤더: 로고 + 매장명 + 닫기 */}
          <div className="w-full flex items-center gap-3 px-5 py-4">
            <StoreLogo name={coupon.storeName} category={coupon.category} size={52} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-[13px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: coupon.color }}>{coupon.category}</span>
                <span className="text-[12px] bg-[#f5f5f7] text-[#424245] px-2 py-0.5 rounded-full">{coupon.buildingName}</span>
                <ExpiryBadge expiry={coupon.expiry} />
              </div>
              <p className="text-[17px] font-black text-[#1d1d1f] leading-snug">{coupon.storeName}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-[#f5f5f7] rounded-full flex items-center justify-center active:opacity-60 shrink-0">
              <X size={16} className="text-[#424245]" />
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto flex-1 pb-32">

          {/* 할인 강조 카드 */}
          <div className="mx-4 mt-3 rounded-2xl p-5 flex items-center gap-4"
            style={{ background: coupon.color + "18" }}>
            <div className="flex-1">
              <p className="text-[14px] font-semibold mb-1" style={{ color: coupon.color }}>이번 주 혜택</p>
              <p className="text-[17px] font-bold text-[#1d1d1f] leading-snug">{coupon.title}</p>
            </div>
            <div className="text-[34px] font-black shrink-0" style={{ color: coupon.color }}>
              {coupon.discount}
            </div>
          </div>

          {/* 프로모 문구 */}
          {detail && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4 flex items-start gap-3">
              <Star size={16} className="shrink-0 mt-0.5" style={{ color: coupon.color }} fill={coupon.color} />
              <div>
                <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug">{detail.promo}</p>
                <p className="text-[14px] text-[#424245] mt-1.5 leading-relaxed">{detail.description}</p>
              </div>
            </div>
          )}

          {/* 하이라이트 */}
          {detail?.highlights && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4">
              <p className="text-[14px] font-bold text-[#6e6e73] mb-3">매장 특징</p>
              <div className="space-y-2.5">
                {detail.highlights.map((h, i) => (
                  <p key={i} className="text-[15px] text-[#1d1d1f]">{h}</p>
                ))}
              </div>
            </div>
          )}

          {/* 추천 메뉴 / 상품 */}
          {detail?.menu && detail.menu.length > 0 && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4">
              <p className="text-[14px] font-bold text-[#6e6e73] mb-3">
                {coupon.category === "카페" || coupon.category === "음식점" ? "추천 메뉴" : "추천 상품"}
              </p>
              <div className="space-y-2.5">
                {detail.menu.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-[#1d1d1f] font-medium">{item.name}</span>
                      {item.tag && (
                        <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
                          style={{ background: coupon.color }}>{item.tag}</span>
                      )}
                    </div>
                    <span className="text-[14px] font-semibold text-[#424245]">{item.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용 조건 */}
          {detail?.conditions && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-[#6e6e73]" />
                <p className="text-[14px] font-bold text-[#6e6e73]">사용 조건</p>
              </div>
              <div className="space-y-2">
                {detail.conditions.map((c, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#86868b] mt-2 shrink-0" />
                    <p className="text-[14px] text-[#424245] leading-snug">{c}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매장 정보 */}
          {detail && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4">
              <p className="text-[14px] font-bold text-[#6e6e73] mb-3">매장 정보</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f1fd] flex items-center justify-center shrink-0">
                    <MapPin size={13} className="text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#6e6e73]">위치</p>
                    <p className="text-[15px] text-[#1d1d1f] font-medium">{detail.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f1fd] flex items-center justify-center shrink-0">
                    <Clock size={13} className="text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#6e6e73]">영업시간</p>
                    <p className="text-[15px] text-[#1d1d1f] font-medium">{detail.hours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e8f1fd] flex items-center justify-center shrink-0">
                    <Phone size={13} className="text-[#0071e3]" />
                  </div>
                  <div>
                    <p className="text-[13px] text-[#6e6e73]">전화</p>
                    <a href={`tel:${detail.phone}`}
                      className="text-[15px] text-[#0071e3] font-medium">{detail.phone}</a>
                  </div>
                </div>
              </div>

              {/* 지도 버튼 */}
              <button className="mt-4 w-full flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3 active:bg-[#d2d2d7]">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#0071e3]" />
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">길찾기 / 지도 보기</span>
                </div>
                <ChevronRight size={14} className="text-[#86868b]" />
              </button>
            </div>
          )}

          {/* 바코드 */}
          {downloaded && (
            <div className="mx-4 mt-3">
              <p className="text-[14px] font-bold text-[#6e6e73] mb-2 px-1">쿠폰 코드</p>
              <MockBarcode id={coupon.id} color={coupon.color} />
            </div>
          )}

          {/* 만료 경고 */}
          {d <= 7 && (
            <div className="mx-4 mt-3 rounded-xl px-4 py-3 flex items-center gap-2"
              style={{ background: d <= 3 ? "#FEE2E2" : "#FEF3C7" }}>
              <span className="text-[14px]">⏰</span>
              <p className="text-[14px] font-semibold" style={{ color: d <= 3 ? "#F04452" : "#D97706" }}>
                {d <= 3 ? `마감 ${d}일 전! 지금 바로 사용하세요` : `${d}일 후 만료됩니다`}
              </p>
            </div>
          )}
        </div>

        {/* 하단 고정 CTA */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#f5f5f7] px-5 py-4 pb-8">
          <button
            onClick={() => { onToggle(); }}
            className={`w-full h-13 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all active:opacity-70 ${
              downloaded ? "bg-[#f5f5f7] text-[#6e6e73]" : "text-white"
            }`}
            style={downloaded ? {} : { background: coupon.color }}
          >
            {downloaded
              ? <><CheckCircle2 size={18} /> 사용 완료</>
              : <><Download size={18} /> 쿠폰 받기</>}
          </button>
        </div>
      </div>

      {/* 딤드 배경 */}
      <div className="absolute inset-0 bg-black/50 -z-10" />
    </div>
  );
}

// ─── 쿠폰 카드 ────────────────────────────────────────────────
function CouponCard({ coupon, downloaded, onToggle, onDetail }: {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
  onDetail: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="h-1" style={{ background: coupon.color }} />
      <button className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F8FAFB]"
        onClick={onDetail}>
        <StoreLogo name={coupon.storeName} category={coupon.category} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="text-[13px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: coupon.color }}>{coupon.category}</span>
            <span className="text-[12px] bg-[#f5f5f7] text-[#424245] px-2 py-0.5 rounded-full">{coupon.buildingName}</span>
            <ExpiryBadge expiry={coupon.expiry} />
          </div>
          <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug">{coupon.storeName}</p>
          <p className="text-[14px] text-[#6e6e73] mt-0.5 leading-snug">{coupon.title}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[19px] font-black" style={{ color: coupon.color }}>{coupon.discount}</span>
          <button
            onClick={e => { e.stopPropagation(); onToggle(); }}
            className={`flex items-center gap-1.5 h-8 px-3.5 rounded-xl text-[13px] font-bold transition-all active:opacity-70 ${
              downloaded ? "bg-[#f5f5f7] text-[#6e6e73]" : "text-white"
            }`}
            style={downloaded ? {} : { background: coupon.color }}>
            {downloaded ? <><CheckCircle2 size={12} />완료</> : <><Download size={12} />받기</>}
          </button>
        </div>
      </button>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function CouponsPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StoreCategory | "전체">("전체");
  const [building, setBuilding] = useState("전체");
  const [downloaded, setDownloaded] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );
  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null);

  const filtered = useMemo(() => coupons.filter(c => {
    if (cat !== "전체" && c.category !== cat) return false;
    if (building !== "전체" && c.buildingName !== building) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!c.storeName.toLowerCase().includes(q) &&
          !c.title.toLowerCase().includes(q) &&
          !c.category.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [query, cat, building]);

  const urgent  = filtered.filter(c => daysLeft(c.expiry) <= 3);
  const regular = filtered.filter(c => daysLeft(c.expiry) > 3);

  function toggle(id: string) {
    setDownloaded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-20">
      {/* 헤더 */}
      <div className="bg-white sticky top-0 z-40 border-b border-[#f5f5f7]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link href="/home/" className="active:opacity-60">
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </Link>
          <h1 className="text-[18px] font-bold text-[#1d1d1f] flex-1">쿠폰 센터</h1>
          <div className="flex items-center gap-1 bg-[#FEF3C7] px-2.5 py-1 rounded-full">
            <Tag size={12} className="text-[#D97706]" />
            <span className="text-[13px] font-bold text-[#D97706]">총 {coupons.length}장</span>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-[#f5f5f7] rounded-xl px-3.5 h-11">
            <Search size={15} className="text-[#6e6e73] shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="매장명, 혜택 검색"
              className="flex-1 bg-transparent text-[15px] focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b]" />
            {query && <button onClick={() => setQuery("")}><X size={15} className="text-[#6e6e73]" /></button>}
          </div>
        </div>
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${cat === c ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {BUILDINGS.map(b => (
            <button key={b} onClick={() => setBuilding(b)}
              className={`shrink-0 h-7 px-3 rounded-full text-[12px] font-semibold transition-colors border ${building === b ? "bg-[#0071e3] text-white border-[#0071e3]" : "bg-white text-[#424245] border-[#d2d2d7]"}`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <span className="text-4xl">🎟️</span>
            <p className="text-[15px] text-[#6e6e73]">조건에 맞는 쿠폰이 없습니다</p>
          </div>
        ) : (
          <>
            {urgent.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[14px] font-bold text-[#F04452]">⏰ 마감임박</span>
                  <span className="text-[12px] text-[#6e6e73]">{urgent.length}장</span>
                </div>
                <div className="space-y-2.5">
                  {urgent.map(c => (
                    <CouponCard key={c.id} coupon={c}
                      downloaded={downloaded.has(c.id)}
                      onToggle={() => toggle(c.id)}
                      onDetail={() => setDetailCoupon(c)} />
                  ))}
                </div>
              </div>
            )}
            {regular.length > 0 && (
              <div>
                {urgent.length > 0 && (
                  <div className="flex items-center gap-1.5 mb-2 mt-1">
                    <span className="text-[14px] font-bold text-[#1d1d1f]">이번 주 쿠폰</span>
                    <span className="text-[12px] text-[#6e6e73]">{regular.length}장</span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {regular.map(c => (
                    <CouponCard key={c.id} coupon={c}
                      downloaded={downloaded.has(c.id)}
                      onToggle={() => toggle(c.id)}
                      onDetail={() => setDetailCoupon(c)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />

      {/* 상세 바텀시트 */}
      {detailCoupon && (
        <CouponDetailSheet
          coupon={detailCoupon}
          downloaded={downloaded.has(detailCoupon.id)}
          onToggle={() => toggle(detailCoupon.id)}
          onClose={() => setDetailCoupon(null)}
        />
      )}
    </div>
  );
}
