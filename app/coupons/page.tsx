"use client";
import { useState, useMemo, useEffect } from "react";
import {
  Search, X, Tag, Download, CheckCircle2, ChevronLeft,
  MapPin, Clock, Phone, ChevronRight, Info, Sparkles,
} from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/layout/BottomNav";
import { coupons, couponDetails } from "@/lib/mockData";
import type { Coupon, StoreCategory } from "@/lib/types";

const CATEGORIES: (StoreCategory | "전체")[] = [
  "전체", "카페", "음식점", "병원/약국", "미용", "마트",
  "베이커리", "부동산", "스터디카페", "안경원", "꽃집",
  "기타",
];
const BUILDINGS = ["전체", ...Array.from(new Set(coupons.map(c => c.buildingName)))];

function daysLeft(expiry: string) {
  return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
}

function lightenHex(hex: string, ratio = 0.42): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * ratio);
  const g = Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * ratio);
  const b = Math.round((n & 0xff) + (255 - (n & 0xff)) * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

const COUPON_DL_KEY = "downloadedCoupons";
function loadDownloaded(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(COUPON_DL_KEY) ?? "[]") as string[]);
  } catch { return new Set(); }
}
function saveDownloaded(set: Set<string>): void {
  try { localStorage.setItem(COUPON_DL_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

// ─── 바코드 모킹 ──────────────────────────────────────────────
function MockBarcode({ id, color }: { id: string; color: string }) {
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

// ─── 상세 바텀시트 (홈 위젯 카드 스타일) ───────────────────────
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
  const urgent = d <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-[#f5f5f7] rounded-t-3xl overflow-hidden max-h-[92dvh] flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="bg-[#f5f5f7] pt-3 pb-2 flex flex-col items-center shrink-0">
          <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto flex-1 pb-32">

          {/* 메인 쿠폰 카드 — 홈 위젯 스타일 풀와이드 */}
          <div className="px-4 pt-2 pb-3">
            <div
              className="relative rounded-[24px] overflow-hidden select-none"
              style={{
                background: `linear-gradient(135deg, ${coupon.color} 0%, ${lightenHex(coupon.color)} 100%)`,
              }}
            >
              {/* 좌측 노치 */}
              <div
                className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full"
                style={{ background: "#f5f5f7" }}
              />
              {/* 우측 노치 */}
              <div
                className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full"
                style={{ background: "#f5f5f7" }}
              />

              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="absolute top-3.5 right-3.5 w-8 h-8 bg-black/25 backdrop-blur-sm rounded-full flex items-center justify-center active:opacity-60 z-10"
              >
                <X size={16} className="text-white" />
              </button>

              <div className="px-5 pt-5 pb-4">
                {/* 카테고리 + COUPON 뱃지 */}
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="text-[10px] font-bold tracking-widest px-2 py-[3px] rounded-md bg-white/30 text-white">
                    COUPON
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-[3px] rounded-md bg-white/20 text-white">
                    {coupon.category}
                  </span>
                </div>

                {/* 매장명 */}
                <p className="text-[15px] font-bold text-white/95 mb-1 leading-tight">
                  {coupon.storeName}
                </p>
                <p className="text-[12px] text-white/80 mb-4">
                  {coupon.buildingName}
                </p>

                {/* 할인 강조 */}
                <div className="flex items-baseline gap-1 mb-2">
                  <p className="text-[58px] font-black text-white leading-none tabular-nums tracking-tight">
                    {coupon.discount}
                  </p>
                  <p className="text-[15px] font-bold text-white/85 ml-1">
                    {coupon.discountType === "amount" ? "원 할인" : "할인"}
                  </p>
                </div>

                {/* 혜택 타이틀 */}
                <p className="text-[13px] font-semibold text-white/95 leading-snug mb-4">
                  {coupon.title}
                </p>

                {/* 점선 구분선 */}
                <div className="border-t border-dashed border-white/30 mt-2 mb-3" />

                {/* 유효기간 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-[11px] font-bold ${urgent ? "text-yellow-200" : "text-white/90"}`}>
                      {coupon.expiry.replace(/-/g, ".")} 까지
                    </p>
                    {urgent && (
                      <p className="text-[11px] font-black text-yellow-200 mt-0.5">⏰ D-{d} 마감 임박</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold tracking-wider px-2 py-1 rounded-md bg-white/20 text-white">
                    {coupon.id.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 프로모 문구 */}
          {detail && (
            <div className="mx-4 mt-1 bg-white rounded-2xl px-4 py-4 flex items-start gap-3">
              <Sparkles size={16} className="shrink-0 mt-0.5" style={{ color: coupon.color }} fill={coupon.color} />
              <div>
                <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug">{detail.promo}</p>
                <p className="text-[14px] text-[#424245] mt-1.5 leading-relaxed">{detail.description}</p>
              </div>
            </div>
          )}

          {/* 하이라이트 */}
          {detail?.highlights && (
            <div className="mx-4 mt-3 bg-white rounded-2xl px-4 py-4">
              <p className="text-[13px] font-bold text-[#6e6e73] mb-3 uppercase tracking-wide">매장 특징</p>
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
              <p className="text-[13px] font-bold text-[#6e6e73] mb-3 uppercase tracking-wide">
                {coupon.category === "카페" || coupon.category === "음식점" ? "추천 메뉴" : "추천 상품"}
              </p>
              <div className="space-y-2.5">
                {detail.menu.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-[#1d1d1f] font-medium">{item.name}</span>
                      {item.tag && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
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
                <p className="text-[13px] font-bold text-[#6e6e73] uppercase tracking-wide">사용 조건</p>
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
              <p className="text-[13px] font-bold text-[#6e6e73] mb-3 uppercase tracking-wide">매장 정보</p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: coupon.color + "1A" }}
                  >
                    <MapPin size={13} style={{ color: coupon.color }} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">위치</p>
                    <p className="text-[15px] text-[#1d1d1f] font-medium">{detail.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: coupon.color + "1A" }}
                  >
                    <Clock size={13} style={{ color: coupon.color }} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">영업시간</p>
                    <p className="text-[15px] text-[#1d1d1f] font-medium">{detail.hours}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: coupon.color + "1A" }}
                  >
                    <Phone size={13} style={{ color: coupon.color }} />
                  </div>
                  <div>
                    <p className="text-[12px] text-[#6e6e73]">전화</p>
                    <a href={`tel:${detail.phone}`}
                      className="text-[15px] font-medium" style={{ color: coupon.color }}>{detail.phone}</a>
                  </div>
                </div>
              </div>

              {/* 지도 버튼 */}
              <button className="mt-4 w-full flex items-center justify-between bg-[#f5f5f7] rounded-xl px-4 py-3 active:bg-[#d2d2d7]">
                <div className="flex items-center gap-2">
                  <MapPin size={14} style={{ color: coupon.color }} />
                  <span className="text-[14px] font-semibold text-[#1d1d1f]">길찾기 / 지도 보기</span>
                </div>
                <ChevronRight size={14} className="text-[#86868b]" />
              </button>
            </div>
          )}

          {/* 바코드 */}
          {downloaded && (
            <div className="mx-4 mt-3">
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2 px-1 uppercase tracking-wide">쿠폰 코드</p>
              <MockBarcode id={coupon.id} color={coupon.color} />
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

// ─── 쿠폰 카드 (홈 위젯 카드 디자인 풀와이드 버전) ─────────────
function CouponListCard({ coupon, downloaded, onToggle, onDetail }: {
  coupon: Coupon;
  downloaded: boolean;
  onToggle: () => void;
  onDetail: () => void;
}) {
  const dDay = daysLeft(coupon.expiry);
  const urgent = dDay <= 3;

  return (
    <button
      onClick={onDetail}
      className="w-full text-left relative rounded-[20px] overflow-hidden select-none active:scale-[0.98] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${coupon.color} 0%, ${lightenHex(coupon.color)} 100%)`,
      }}
    >
      {/* 좌측 노치 */}
      <div
        className="absolute -left-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full"
        style={{ background: "#f5f5f7" }}
      />
      {/* 우측 노치 */}
      <div
        className="absolute -right-[9px] top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full"
        style={{ background: "#f5f5f7" }}
      />

      <div className="flex items-stretch">
        {/* 좌측: 매장 정보 */}
        <div className="flex-1 px-4 py-3.5 min-w-0">
          {/* 카테고리 뱃지 */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[9px] font-black tracking-widest px-1.5 py-[2px] rounded-md bg-white/30 text-white">
              COUPON
            </span>
            <span className="text-[9px] font-semibold px-1.5 py-[2px] rounded-md bg-white/20 text-white">
              {coupon.category}
            </span>
          </div>

          {/* 매장명 */}
          <p className="text-[15px] font-bold text-white leading-tight truncate">
            {coupon.storeName}
          </p>
          <p className="text-[11px] text-white/80 truncate mt-0.5">
            {coupon.buildingName}
          </p>

          {/* 할인 */}
          <div className="flex items-baseline gap-1 mt-2">
            <p className="text-[28px] font-black text-white leading-none tabular-nums tracking-tight">
              {coupon.discount}
            </p>
            <p className="text-[11px] font-bold text-white/85 ml-0.5">
              {coupon.discountType === "amount" ? "원" : "%"}
            </p>
          </div>

          {/* 유효기간 */}
          <div className="flex items-center gap-1.5 mt-2">
            <p className={`text-[10px] font-bold ${urgent ? "text-yellow-200" : "text-white/85"}`}>
              {coupon.expiry.replace(/-/g, ".")} 까지
            </p>
            {urgent && (
              <span className="text-[9px] font-black text-yellow-900 bg-yellow-200 px-1.5 py-0.5 rounded-full">
                D-{dDay}
              </span>
            )}
          </div>
        </div>

        {/* 점선 분리선 */}
        <div
          className="border-l border-dashed border-white/30 my-3"
        />

        {/* 우측: 다운로드 버튼 */}
        <div className="w-[88px] flex flex-col items-center justify-center px-2">
          <p className="text-[10px] font-semibold text-white/90 mb-2 line-clamp-2 text-center">
            {coupon.title}
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ background: "rgba(0,0,0,0.28)" }}
          >
            {downloaded
              ? <CheckCircle2 size={20} color="white" strokeWidth={2.4} />
              : <Download size={20} color="white" strokeWidth={2.4} />
            }
          </button>
          <p className="text-[10px] font-bold text-white mt-1.5">
            {downloaded ? "받음" : "받기"}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function CouponsPage() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<StoreCategory | "전체">("전체");
  const [building, setBuilding] = useState("전체");
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set());
  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null);

  useEffect(() => {
    setDownloaded(loadDownloaded());
  }, []);

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
    setDownloaded(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      saveDownloaded(n);
      return n;
    });
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
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

      <div className="px-4 pt-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <span className="text-4xl">🎟️</span>
            <p className="text-[15px] text-[#6e6e73]">조건에 맞는 쿠폰이 없습니다</p>
          </div>
        ) : (
          <>
            {urgent.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2.5 px-1">
                  <span className="text-[14px] font-bold text-[#F04452]">⏰ 마감임박</span>
                  <span className="text-[12px] text-[#6e6e73]">{urgent.length}장</span>
                </div>
                <div className="space-y-2.5">
                  {urgent.map(c => (
                    <CouponListCard key={c.id} coupon={c}
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
                  <div className="flex items-center gap-1.5 mb-2.5 mt-2 px-1">
                    <span className="text-[14px] font-bold text-[#1d1d1f]">이번 주 쿠폰</span>
                    <span className="text-[12px] text-[#6e6e73]">{regular.length}장</span>
                  </div>
                )}
                <div className="space-y-2.5">
                  {regular.map(c => (
                    <CouponListCard key={c.id} coupon={c}
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
