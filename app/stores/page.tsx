"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  MapPin, Phone, Clock, Lock,
  ChevronLeft, ChevronRight, X, Pencil, CheckCircle2,
  Search, Navigation, Building2, List, Map as MapIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { buildings, coupons, newStoreOpenings, storeDetails } from "@/lib/mockData";
import type { Store, StoreCategory, Floor } from "@/lib/types";

const catDot: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6", 마트: "#10B981", 기타: "#9CA3AF",
};
const catEmoji: Record<StoreCategory, string> = {
  카페:"☕", 음식점:"🍽️", 편의점:"🏪", "병원/약국":"💊", 미용:"💇", 학원:"📚", 마트:"🛒", 기타:"🏢",
};
const catBg: Record<StoreCategory, string> = {
  카페:"bg-[#FEF3C7] text-[#92400E]", 음식점:"bg-[#FEE2E2] text-[#991B1B]",
  편의점:"bg-[#DBEAFE] text-[#1E40AF]", "병원/약국":"bg-[#FEE2E2] text-[#991B1B]",
  미용:"bg-[#FCE7F3] text-[#9D174D]", 학원:"bg-[#EDE9FE] text-[#5B21B6]",
  마트:"bg-[#D1FAE5] text-[#065F46]", 기타:"bg-[#F3F4F6] text-[#374151]",
};

// 주변 상가건물 목 데이터 (내 위치 기반 거리 계산용)
const NEARBY_BUILDINGS = [
  { id: "b1",  name: "검단 센트럴 타워",       address: "인천 서구 당하로 123",      lat: 37.5448, lng: 126.6863, floors: 5, stores: 18, hasData: true },
  { id: "nb2", name: "당하 스퀘어몰",           address: "인천 서구 당하동 456",      lat: 37.5462, lng: 126.6878, floors: 4, stores: 12, hasData: false },
  { id: "nb3", name: "검단 플리마켓 타운",      address: "인천 서구 불로동 789",      lat: 37.5435, lng: 126.6844, floors: 2, stores: 24, hasData: false },
  { id: "nb4", name: "불로대곡 상가단지 A동",   address: "인천 서구 대곡동 321",      lat: 37.5421, lng: 126.6831, floors: 3, stores: 9,  hasData: false },
  { id: "nb5", name: "마전 주민센터 상가",      address: "인천 서구 마전로 654",      lat: 37.5470, lng: 126.6901, floors: 2, stores: 6,  hasData: false },
  { id: "nb6", name: "원당 금곡 상권 A",        address: "인천 서구 금곡대로 100",    lat: 37.5535, lng: 126.6730, floors: 3, stores: 11, hasData: false },
  { id: "nb7", name: "오류왕길 근린상가",       address: "인천 서구 오류동 200",      lat: 37.5500, lng: 126.6940, floors: 2, stores: 8,  hasData: false },
  { id: "nb8", name: "백석 아라 타운",          address: "인천 서구 백석동 300",      lat: 37.5360, lng: 126.6800, floors: 4, stores: 14, hasData: false },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distLabel(km: number) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// ─── SVG 층 지도 ─────────────────────────────────────────────
function FloorSVG({ floor, selectedId, onSelect }: { floor: Floor; selectedId: string | null; onSelect: (s: Store) => void }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ aspectRatio: "1.5/1" }}>
      <rect width="100" height="100" fill="#F9FAFB" />
      <rect x="2" y="2" width="96" height="96" rx="3" fill="#F9FAFB" stroke="#E5E8EB" strokeWidth="1" />
      {floor.hasRestroom && (
        <>
          <rect x="44" y="44" width="12" height="12" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5" />
          <text x="50" y="52" textAnchor="middle" fontSize="5.5" fill="#2563EB" fontWeight="bold">WC</text>
        </>
      )}
      {floor.stores.map(s => {
        const vacant = s.name === "공실";
        const sel = selectedId === s.id;
        return (
          <g key={s.id} onClick={() => !vacant && onSelect(s)} style={{ cursor: vacant ? "default" : "pointer" }}>
            <rect x={`${s.x}%`} y={`${s.y}%`} width={`${s.w}%`} height={`${s.h}%`} rx="3"
              fill={sel ? "#EBF3FE" : "white"} stroke={sel ? "#3182F6" : "#E5E8EB"} strokeWidth={sel ? 1.5 : 0.8} />
            {!vacant && (
              <rect x={`${s.x}%`} y={`${s.y}%`} width={`${s.w}%`} height="3%"
                fill={catDot[s.category]} rx="3" opacity="0.9" />
            )}
            <foreignObject x={`${s.x+1}%`} y={`${s.y+4}%`} width={`${s.w-2}%`} height={`${s.h-5}%`}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", textAlign:"center" }}>
                {!vacant && <span style={{ fontSize:"12px" }}>{catEmoji[s.category]}</span>}
                <span style={{ fontSize:"8px", fontWeight: vacant ? 400 : 600, color: vacant ? "#9CA3AF" : "#1F2937", lineHeight:1.2, marginTop:"2px", wordBreak:"keep-all" }}>
                  {s.name}
                </span>
                {!vacant && s.isOpen === false && <span style={{ fontSize:"7px", color:"#EF4444" }}>영업종료</span>}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}

// ─── 매장 바텀시트 ────────────────────────────────────────────
function StoreSheet({ store, onClose, onDetail }: { store: Store; onClose: () => void; onDetail: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-[#E5E8EB] rounded-full" /></div>
        <div className="px-5 pt-4 pb-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
              <h2 className="text-[21px] font-bold text-[#191F28] mt-1">{store.name}</h2>
              {store.isOpen !== undefined && (
                <span className={`text-[13px] font-medium ${store.isOpen ? "text-[#00C471]" : "text-[#F04452]"}`}>
                  {store.isOpen ? "● 영업 중" : "● 영업 종료"}
                </span>
              )}
            </div>
            <button onClick={onClose} className="active:opacity-60"><X size={22} className="text-[#8B95A1]" /></button>
          </div>
          <div className="space-y-2.5">
            {store.hours && (
              <div className="flex items-center gap-3 bg-[#F2F4F6] rounded-xl px-3 py-3">
                <Clock size={16} className="text-[#8B95A1] shrink-0" />
                <div><p className="text-[12px] text-[#8B95A1]">영업시간</p><p className="text-[15px] font-medium text-[#191F28]">{store.hours}</p></div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#F2F4F6] rounded-xl px-3 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[#8B95A1] shrink-0" />
                  <div><p className="text-[12px] text-[#8B95A1]">전화번호</p><p className="text-[15px] font-medium text-[#191F28]">{store.phone}</p></div>
                </div>
                <a href={`tel:${store.phone}`} className="h-9 px-4 bg-[#3182F6] rounded-xl text-white text-[14px] font-bold flex items-center active:opacity-80">전화</a>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <button onClick={onDetail}
              className="w-full h-12 bg-[#3182F6] rounded-xl flex items-center justify-center gap-2 text-[15px] text-white font-bold active:bg-[#1B64DA]">
              매장 상세 정보 보기
            </button>
            {!sent
              ? <button onClick={() => setSent(true)}
                  className="w-full h-11 border border-[#E5E8EB] rounded-xl flex items-center justify-center gap-2 text-[14px] text-[#4E5968] font-medium active:bg-[#F2F4F6]">
                  <Pencil size={14} className="text-[#8B95A1]" />정보 수정 제안하기
                </button>
              : <div className="w-full h-11 bg-[#D1FAE5] rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-[#00C471]" />
                  <span className="text-[14px] text-[#065F46] font-medium">제안이 접수됐어요</span>
                </div>
            }
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

// 업종별 대표 이미지 (Unsplash 특정 사진 ID — 안정적으로 로드됨)
const catHeroImage: Record<StoreCategory, string> = {
  카페:       "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=260&fit=crop&auto=format",
  음식점:     "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=260&fit=crop&auto=format",
  편의점:     "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&h=260&fit=crop&auto=format",
  "병원/약국":"https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=260&fit=crop&auto=format",
  미용:       "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=260&fit=crop&auto=format",
  학원:       "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=260&fit=crop&auto=format",
  마트:       "https://images.unsplash.com/photo-1534723452862-4c874986a2f6?w=600&h=260&fit=crop&auto=format",
  기타:       "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=260&fit=crop&auto=format",
};

// ─── 매장 리스트 상세 시트 ──────────────────────────────────
type EnrichedStore = Store & { floorLabel: string; buildingName: string };

function StoreListDetailSheet({ store, onClose }: { store: EnrichedStore; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const detail = storeDetails[store.id];
  const coupon = coupons.find(c => c.storeId === store.id);
  const opening = newStoreOpenings.find(o => o.storeId === store.id);
  const color = catDot[store.category];
  const dDay = coupon ? Math.ceil((new Date(coupon.expiry).getTime() - Date.now()) / 86400000) : null;
  const heroImg = catHeroImage[store.category];

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* ── 대표 이미지 헤더 ── */}
        <div className="relative shrink-0" style={{ height: 220 }}>
          {/* 이미지 or 컬러 fallback */}
          {!imgFailed ? (
            <img
              src={heroImg}
              alt={store.name}
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}>
              <span style={{ fontSize: 72 }}>{catEmoji[store.category]}</span>
            </div>
          )}

          {/* 하단 그라디언트 오버레이 */}
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.08) 0%, rgba(0,0,0,.0) 35%, rgba(0,0,0,.55) 75%, rgba(0,0,0,.82) 100%)" }} />

          {/* 드래그 핸들 */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2">
            <div className="w-10 h-1 rounded-full bg-white/50" />
          </div>

          {/* 닫기 버튼 */}
          <button onClick={onClose}
            className="absolute top-3.5 right-4 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center active:opacity-60 backdrop-blur-sm">
            <X size={16} className="text-white" />
          </button>

          {/* 영업 상태 뱃지 */}
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${
              store.isOpen !== false ? "bg-[#00C471]/90 text-white" : "bg-black/40 text-white"}`}>
              {store.isOpen !== false ? "● 영업 중" : "● 영업 종료"}
            </span>
            {store.isPremium && (
              <span className="text-[10px] font-black bg-[#F59E0B]/90 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">★ PREMIUM</span>
            )}
            {opening?.isNew && (
              <span className="text-[10px] font-black bg-[#F04452]/90 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm">NEW</span>
            )}
          </div>

          {/* 매장명 + 위치 — 이미지 하단 */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1 min-w-0">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]} inline-block mb-1.5`}>
                  {catEmoji[store.category]} {store.category}
                </span>
                <p className="text-[22px] font-black text-white leading-tight drop-shadow-sm">{store.name}</p>
                <p className="text-[12px] text-white/80 mt-0.5">{store.buildingName} · {store.floorLabel}</p>
              </div>
              <div className="shrink-0 ring-2 ring-white/40 rounded-2xl shadow-lg overflow-hidden">
                <StoreLogo name={store.name} category={store.category} size={48} rounded="rounded-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* 스크롤 바디 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* 기본 정보 */}
          <div className="space-y-2">
            {store.hours && (
              <div className="flex items-center gap-3 bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <Clock size={15} className="text-[#8B95A1] shrink-0" />
                <div>
                  <p className="text-[11px] text-[#B0B8C1]">영업시간</p>
                  <p className="text-[14px] font-semibold text-[#191F28]">{store.hours}</p>
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-[#8B95A1] shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#B0B8C1]">전화번호</p>
                    <p className="text-[14px] font-semibold text-[#191F28]">{store.phone}</p>
                  </div>
                </div>
                <a href={`tel:${store.phone}`} className="h-8 px-3.5 rounded-xl text-white text-[13px] font-bold flex items-center active:opacity-80"
                  style={{ background: color }}>전화</a>
              </div>
            )}
            {detail?.priceRange && (
              <div className="flex items-center gap-3 bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <span className="text-[15px] shrink-0">💰</span>
                <div>
                  <p className="text-[11px] text-[#B0B8C1]">가격대</p>
                  <p className="text-[14px] font-semibold text-[#191F28]">{detail.priceRange}</p>
                </div>
              </div>
            )}
          </div>

          {/* 소개 */}
          {detail?.description && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">매장 소개</p>
              <p className="text-[14px] text-[#4E5968] leading-relaxed bg-[#F8F9FB] rounded-xl px-3.5 py-3">{detail.description}</p>
            </div>
          )}

          {/* 하이라이트 태그 */}
          {detail?.tags && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">주요 특징</p>
              <div className="space-y-1.5">
                {detail.tags.map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-[#F8F9FB] rounded-xl px-3.5 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-[13px] text-[#4E5968]">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메뉴 (카페/음식점/마트) */}
          {detail?.menu && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">대표 메뉴</p>
              <div className="space-y-1.5">
                {detail.menu.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F9FB] rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[#191F28]">{m.name}</span>
                      {m.tag && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>{m.tag}</span>}
                    </div>
                    <span className="text-[14px] font-bold text-[#191F28]">{m.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 서비스 목록 (미용/병원/학원 등) */}
          {detail?.services && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">제공 서비스</p>
              <div className="grid grid-cols-2 gap-1.5">
                {detail.services.map((s, i) => (
                  <div key={i} className="bg-[#F8F9FB] rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[12px] text-[#4E5968] leading-snug">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 공지/주의사항 */}
          {detail?.notice && (
            <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3" style={{ background: `${color}15` }}>
              <span className="text-[15px] shrink-0 mt-0.5">📌</span>
              <p className="text-[13px] font-medium" style={{ color }}>{detail.notice}</p>
            </div>
          )}

          {/* 이번 주 쿠폰 */}
          {coupon && dDay !== null && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">이번 주 쿠폰</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${coupon.color}33` }}>
                <div className="px-4 pt-3 pb-2" style={{ background: `${coupon.color}14` }}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[26px] font-black" style={{ color: coupon.color }}>{coupon.discount}</span>
                    <span className="text-[12px] font-bold text-[#8B95A1]">할인</span>
                  </div>
                  <p className="text-[12px] text-[#4E5968] mt-0.5">{coupon.title}</p>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between bg-white">
                  <span className={`text-[11px] font-bold ${dDay <= 3 ? "text-[#F04452]" : "text-[#B0B8C1]"}`}>
                    {dDay <= 3 ? `⏰ D-${dDay}` : `~${coupon.expiry.slice(5)}`}
                  </span>
                  <span className="text-[12px] font-bold text-white px-3 py-1 rounded-lg" style={{ background: coupon.color }}>쿠폰받기</span>
                </div>
              </div>
            </div>
          )}

          {/* 오픈 혜택 */}
          {opening?.openBenefit && (
            <div>
              <p className="text-[13px] font-bold text-[#8B95A1] mb-2">오픈 혜택</p>
              <div className="bg-[#FFF0F0] rounded-xl px-3.5 py-3 space-y-1.5">
                {opening.openBenefit.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[11px] font-black text-white bg-[#F04452] rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[13px] text-[#4E5968]">{d}</p>
                  </div>
                ))}
                {opening.openBenefit.validUntil && (
                  <p className="text-[11px] text-[#F04452] font-medium pt-1">혜택 기간: ~{opening.openBenefit.validUntil.slice(5).replace("-", "/")}</p>
                )}
              </div>
            </div>
          )}

          {/* 수정 제안 */}
          <div className="pb-2">
            {!sent
              ? <button onClick={() => setSent(true)}
                  className="w-full h-10 border border-[#E5E8EB] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#4E5968] font-medium active:bg-[#F2F4F6]">
                  <Pencil size={13} className="text-[#8B95A1]" />정보 수정 제안하기
                </button>
              : <div className="w-full h-10 bg-[#D1FAE5] rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00C471]" />
                  <span className="text-[13px] text-[#065F46] font-medium">제안이 접수됐어요</span>
                </div>
            }
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

// ─── 매장 리스트 뷰 ──────────────────────────────────────────
const ALL_CATS = Object.keys(catDot) as StoreCategory[];

function StoreListView() {
  const [catFilter, setCatFilter] = useState<StoreCategory | "전체">("전체");
  const [selectedStore, setSelectedStore] = useState<EnrichedStore | null>(null);

  // 모든 건물의 매장을 flatten
  const allStores = useMemo<EnrichedStore[]>(() => {
    const list: EnrichedStore[] = [];
    buildings.forEach(b => {
      b.floors.forEach(f => {
        f.stores.forEach(s => {
          if (s.name !== "공실") list.push({ ...s, floorLabel: f.label, buildingName: b.name });
        });
      });
    });
    return list;
  }, []);

  const filtered = useMemo(() =>
    catFilter === "전체" ? allStores : allStores.filter(s => s.category === catFilter),
    [allStores, catFilter]
  );

  // 업종별 그룹핑 (필터 전체일 때만)
  const grouped = useMemo(() => {
    if (catFilter !== "전체") return null;
    const map = new Map<StoreCategory, EnrichedStore[]>();
    ALL_CATS.forEach(c => {
      const group = allStores.filter(s => s.category === c);
      if (group.length > 0) map.set(c, group);
    });
    return map;
  }, [allStores, catFilter]);

  const newOpeningIds = new Set(newStoreOpenings.map(o => o.storeId));
  const couponStoreIds = new Set(coupons.map(c => c.storeId));
  const [dlState, setDlState] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );

  function StoreCard({ store }: { store: EnrichedStore }) {
    const hasNew = newOpeningIds.has(store.id);
    const hasCoupon = couponStoreIds.has(store.id);
    return (
      <button onClick={() => setSelectedStore(store)}
        className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 active:bg-[#F2F4F6] text-left shadow-sm">
        <div className="relative shrink-0">
          <StoreLogo name={store.name} category={store.category} size={44} />
          {hasNew && (
            <span className="absolute -top-1 -right-1 text-[9px] font-black bg-[#F04452] text-white px-1 py-0.5 rounded-full leading-none">N</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[15px] font-bold text-[#191F28] truncate">{store.name}</p>
            {store.isPremium && <span className="shrink-0 text-[9px] font-black bg-[#FEF3C7] text-[#B45309] px-1 py-0.5 rounded-full">★</span>}
          </div>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="text-[12px] text-[#8B95A1]">{store.buildingName}</span>
            <span className="text-[12px] text-[#B0B8C1]">·</span>
            <span className="text-[12px] font-semibold" style={{ color: catDot[store.category] }}>{store.floorLabel}</span>
            {store.hours && <>
              <span className="text-[12px] text-[#B0B8C1]">·</span>
              <span className="text-[12px] text-[#8B95A1]">{store.hours}</span>
            </>}
          </div>
          {hasCoupon && (
            <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#F04452] bg-[#FFF0F0] px-1.5 py-0.5 rounded-full">
              🏷️ 쿠폰 있음
            </span>
          )}
        </div>
        <span className={`shrink-0 text-[11px] font-bold px-2 py-1 rounded-full ${store.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F3F4F6] text-[#9CA3AF]"}`}>
          {store.isOpen !== false ? "영업 중" : "영업 종료"}
        </span>
      </button>
    );
  }

  return (
    <div>
      {/* ── 신규 오픈 ── */}
      {newStoreOpenings.some(o => o.isNew) && (
        <div className="pt-4 pb-2">
          <div className="flex items-center gap-1.5 px-4 mb-2.5">
            <span className="text-[14px] font-bold text-[#191F28]">이번 주 신규 오픈</span>
            <span className="text-[10px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
          </div>
          <div className="px-4 space-y-2">
            {newStoreOpenings.filter(o => o.isNew).map(o => {
              const store = allStores.find(s => s.id === o.storeId);
              return (
                <button key={o.id}
                  onClick={() => store && setSelectedStore(store)}
                  className="w-full bg-white rounded-2xl overflow-hidden shadow-sm active:opacity-80 text-left flex items-center gap-3 px-3 py-3">
                  <div className="shrink-0">
                    <StoreLogo name={o.storeName} category={o.category} size={40} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-[14px] font-bold text-[#191F28] truncate">{o.storeName}</p>
                      <span className="shrink-0 text-[10px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mb-1">{o.floor} · {o.openDate.slice(5)} 오픈</p>
                    {o.openBenefit && (
                      <p className="text-[12px] text-[#F04452] font-medium leading-snug line-clamp-1">{o.openBenefit.summary}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[#B0B8C1] text-lg">›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 이번 주 쿠폰 ── */}
      <div className="pt-2 pb-2">
        <div className="flex items-center gap-1.5 px-4 mb-2.5">
          <span className="text-[14px] font-bold text-[#191F28]">이번 주 쿠폰</span>
          <span className="text-[11px] text-[#8B95A1]">{coupons.length}장</span>
        </div>
        <div className="flex gap-3 overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          {coupons.map(c => {
            const done = dlState.has(c.id);
            const dDay = Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000);
            const urgent = dDay <= 3;
            return (
              <div key={c.id} className="shrink-0 w-[200px] rounded-2xl overflow-hidden shadow-sm"
                style={{ border: `1.5px solid ${c.color}22` }}>
                <div className="px-3.5 pt-3 pb-2.5" style={{ background: `${c.color}14` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <StoreLogo name={c.storeName} category={c.category} size={28} rounded="rounded-lg" />
                    <p className="text-[13px] font-extrabold text-[#191F28] truncate">{c.storeName}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[22px] font-black" style={{ color: c.color }}>{c.discount}</span>
                    <span className="text-[11px] text-[#8B95A1]">할인</span>
                  </div>
                </div>
                <div className="relative flex items-center" style={{ height: "12px" }}>
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ borderTop: `2px dashed ${c.color}44` }} />
                  <div className="absolute -left-[5px] w-[10px] h-[10px] rounded-full bg-[#F2F4F6]" />
                  <div className="absolute -right-[5px] w-[10px] h-[10px] rounded-full bg-[#F2F4F6]" />
                </div>
                <div className="px-3.5 pt-1.5 pb-3 bg-white">
                  <p className="text-[11px] text-[#4E5968] line-clamp-2 mb-2">{c.title}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold ${urgent ? "text-[#F04452]" : "text-[#B0B8C1]"}`}>
                      {urgent ? `⏰ D-${dDay}` : `~${c.expiry.slice(5)}`}
                    </span>
                    <button onClick={() => setDlState(d => { const n = new Set(d); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                      className="h-6 px-2.5 rounded-lg text-[11px] font-extrabold active:opacity-70 text-white"
                      style={{ background: done ? "#B0B8C1" : c.color }}>
                      {done ? "✓ 완료" : "받기"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 업종 필터 ── */}
      <div className="pt-2 pb-1">
        <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
          {([
            { key: "전체", label: "전체", icon: "🏪" },
            ...ALL_CATS.map(c => ({ key: c, label: c, icon: catEmoji[c] })),
          ] as { key: StoreCategory | "전체"; label: string; icon: string }[]).map(item => {
            const count = item.key === "전체" ? allStores.length : allStores.filter(s => s.category === item.key).length;
            const active = catFilter === item.key;
            return (
              <button key={item.key} onClick={() => setCatFilter(item.key)}
                className={`shrink-0 flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-all border ${
                  active ? "text-white border-transparent shadow-sm" : "bg-white text-[#4E5968] border-[#E5E8EB]"
                }`}
                style={active ? { background: item.key === "전체" ? "#191F28" : catDot[item.key as StoreCategory] } : {}}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
                <span className={`text-[11px] font-black ${active ? "text-white/80" : "text-[#B0B8C1]"}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 매장 목록 ── */}
      <div className="px-4 pt-2 pb-4">
        {grouped ? (
          // 전체 모드: 업종별 그룹
          Array.from(grouped.entries()).map(([cat, stores]) => (
            <div key={cat} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[16px]">{catEmoji[cat]}</span>
                <span className="text-[14px] font-bold text-[#191F28]">{cat}</span>
                <span className="text-[12px] text-[#B0B8C1]">{stores.length}개</span>
              </div>
              <div className="space-y-2">
                {stores.map(s => <StoreCard key={s.id} store={s} />)}
              </div>
            </div>
          ))
        ) : (
          // 필터 모드: 단순 리스트
          <div className="space-y-2">
            <p className="text-[13px] text-[#8B95A1] mb-1">총 {filtered.length}개 매장</p>
            {filtered.map(s => <StoreCard key={s.id} store={s} />)}
          </div>
        )}
      </div>

      {selectedStore && (
        <StoreListDetailSheet store={selectedStore} onClose={() => setSelectedStore(null)} />
      )}
    </div>
  );
}

// ─── 검색 결과 ────────────────────────────────────────────────
interface SearchResult { store: Store; floorLabel: string; buildingName: string; }

function SearchResults({ results, onSelect }: { results: SearchResult[]; onSelect: (s: Store) => void }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-2">
        <span className="text-3xl">🔍</span>
        <p className="text-[15px] text-[#8B95A1]">검색 결과가 없습니다</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 px-4 pt-2 pb-4">
      <p className="text-[13px] text-[#8B95A1]">총 {results.length}건</p>
      {results.map(({ store, floorLabel, buildingName }) => (
        <button key={store.id} onClick={() => onSelect(store)}
          className="w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] text-left">
          <div className="flex items-center gap-3">
            <StoreLogo name={store.name} category={store.category} size={40} />
            <div>
              <p className="text-[15px] font-semibold text-[#191F28]">{store.name}</p>
              <p className="text-[13px] text-[#8B95A1]">{buildingName} · {floorLabel}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
            <span className={`text-[11px] font-medium ${store.isOpen !== false ? "text-[#00C471]" : "text-[#F04452]"}`}>
              {store.isOpen !== false ? "영업 중" : "영업 종료"}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── 실제 지도 (Leaflet) — SSR 비활성화 ─────────────────────
const StoreMapView = dynamic(() => import("./StoreMapView"), {
  ssr: false,
  loading: () => (
    <div className="mx-4 mt-3 mb-3 rounded-2xl bg-[#F2F4F6] flex items-center justify-center border border-[#E5E8EB]"
      style={{ height: 440 }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#3182F6] border-t-transparent rounded-full animate-spin"
          style={{ borderWidth: 3 }} />
        <p className="text-[13px] text-[#8B95A1]">지도 불러오는 중...</p>
      </div>
    </div>
  ),
});


// ─── 건물 상세 (층별 / 업종별) ──────────────────────────────
function BuildingDetail({
  buildingData,
  nearbyInfo,
  onBack,
}: {
  buildingData: typeof buildings[0] | null;
  nearbyInfo: typeof NEARBY_BUILDINGS[0];
  onBack: () => void;
}) {
  const [tab, setTab] = useState<"층별" | "업종별">("층별");
  const [floorIdx, setFloorIdx] = useState(1);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [catFilter, setCatFilter] = useState<StoreCategory | "전체">("전체");
  const router = useRouter();

  if (!buildingData) {
    return (
      <div className="pb-20">
        <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6] px-4 flex items-center h-12">
          <button onClick={onBack} className="mr-3 active:opacity-60">
            <ChevronLeft size={22} className="text-[#191F28]" />
          </button>
          <p className="text-[16px] font-bold text-[#191F28]">{nearbyInfo.name}</p>
        </div>
        <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
          <span className="text-5xl mb-4">🏗️</span>
          <p className="text-[17px] font-bold text-[#191F28]">정보 준비 중</p>
          <p className="text-[14px] text-[#8B95A1] mt-2">이 건물의 상세 정보는 곧 업데이트될 예정이에요</p>
          <div className="mt-4 bg-[#F2F4F6] rounded-xl px-4 py-3 text-left w-full">
            <p className="text-[13px] text-[#4E5968]">{nearbyInfo.address}</p>
            <p className="text-[13px] text-[#8B95A1] mt-1">{nearbyInfo.floors}층 · 약 {nearbyInfo.stores}개 매장</p>
          </div>
        </div>
      </div>
    );
  }

  const allStores: { store: Store; floorLabel: string }[] = [];
  buildingData.floors.forEach(f => f.stores.forEach(s => {
    if (s.name !== "공실") allStores.push({ store: s, floorLabel: f.label });
  }));
  const categories = Array.from(new Set(allStores.map(({ store }) => store.category))) as StoreCategory[];
  const filteredStores = catFilter === "전체" ? allStores : allStores.filter(({ store }) => store.category === catFilter);
  const currentFloor = buildingData.floors[floorIdx];

  return (
    <div className="pb-20">
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6]">
        <div className="px-4 flex items-center h-12">
          <button onClick={onBack} className="mr-3 active:opacity-60">
            <ChevronLeft size={22} className="text-[#191F28]" />
          </button>
          <p className="text-[16px] font-bold text-[#191F28]">{buildingData.name}</p>
        </div>
        <div className="flex border-t border-[#F2F4F6]">
          {(["층별", "업종별"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-10 text-[14px] font-semibold border-b-2 transition-colors ${tab === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "층별" ? (
        <div className="mx-4 mt-3">
          <div className="bg-white rounded-2xl px-4 py-3 mb-3 flex items-center justify-between">
            <button onClick={() => { setFloorIdx(i => Math.max(0, i-1)); setSelectedStore(null); }}
              disabled={floorIdx === 0}
              className="w-9 h-9 bg-[#F2F4F6] rounded-xl flex items-center justify-center disabled:opacity-30 active:opacity-60">
              <ChevronLeft size={18} className="text-[#191F28]" />
            </button>
            <div className="flex items-center gap-2">
              {buildingData.floors.map((f, i) => (
                <button key={f.label} onClick={() => { setFloorIdx(i); setSelectedStore(null); }}
                  className={`w-10 h-10 rounded-xl text-[14px] font-bold transition-colors ${i === floorIdx ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setFloorIdx(i => Math.min(buildingData.floors.length-1, i+1)); setSelectedStore(null); }}
              disabled={floorIdx === buildingData.floors.length-1}
              className="w-9 h-9 bg-[#F2F4F6] rounded-xl flex items-center justify-center disabled:opacity-30 active:opacity-60">
              <ChevronRight size={18} className="text-[#191F28]" />
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden mb-3">
            <div className="p-3">
              <FloorSVG floor={currentFloor} selectedId={selectedStore?.id ?? null} onSelect={setSelectedStore} />
            </div>
            <div className="px-4 py-3 border-t border-[#F2F4F6] flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentFloor.hasRestroom ? "bg-[#3182F6]" : "bg-[#E5E8EB]"}`} />
                <span className="text-[13px] text-[#8B95A1]">화장실 {currentFloor.hasRestroom ? "있음" : "없음"}</span>
              </div>
              {currentFloor.hasRestroom && currentFloor.restroomCode && (
                <button onClick={() => setShowCode(!showCode)} className="flex items-center gap-1 active:opacity-60">
                  <Lock size={12} className="text-[#3182F6]" />
                  <span className="text-[13px] text-[#3182F6] font-medium">{showCode ? `비번: ${currentFloor.restroomCode}` : "비번 보기"}</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[15px] font-bold text-[#191F28] mb-2.5">{currentFloor.label} 입점 매장</p>
          <div className="space-y-2">
            {currentFloor.stores.filter(s => s.name !== "공실").map(s => (
              <button key={s.id} onClick={() => setSelectedStore(s)}
                className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] ${selectedStore?.id === s.id ? "ring-2 ring-[#3182F6]" : ""}`}>
                <div className="flex items-center gap-3">
                  <StoreLogo name={s.name} category={s.category} size={40} />
                  <div className="text-left">
                    <p className="text-[15px] font-medium text-[#191F28]">{s.name}</p>
                    {s.hours && <p className="text-[13px] text-[#8B95A1]">{s.hours}</p>}
                  </div>
                </div>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                  {s.isOpen !== false ? "영업 중" : "영업 종료"}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {(["전체", ...categories] as (StoreCategory | "전체")[]).map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`shrink-0 px-3 h-8 rounded-full text-[13px] font-semibold transition-colors ${catFilter === c ? "bg-[#3182F6] text-white" : "bg-white text-[#4E5968]"}`}>
                {c === "전체" ? "전체" : `${catEmoji[c as StoreCategory]} ${c}`}
              </button>
            ))}
          </div>
          <div className="px-4 space-y-2">
            <p className="text-[13px] text-[#8B95A1]">총 {filteredStores.length}개 매장</p>
            {filteredStores.map(({ store, floorLabel }) => (
              <button key={store.id} onClick={() => setSelectedStore(store)}
                className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] ${selectedStore?.id === store.id ? "ring-2 ring-[#3182F6]" : ""}`}>
                <div className="flex items-center gap-3">
                  <StoreLogo name={store.name} category={store.category} size={40} />
                  <div className="text-left">
                    <p className="text-[15px] font-medium text-[#191F28]">{store.name}</p>
                    <p className="text-[13px] text-[#8B95A1]">{floorLabel}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
                  <span className={`text-[11px] font-medium ${store.isOpen !== false ? "text-[#00C471]" : "text-[#F04452]"}`}>
                    {store.isOpen !== false ? "영업 중" : "영업 종료"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedStore && (
        <StoreSheet store={selectedStore} onClose={() => setSelectedStore(null)}
          onDetail={() => { setSelectedStore(null); router.push(`/stores/detail/?id=${selectedStore.id}`); }} />
      )}
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function StoresPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"리스트" | "지도">("리스트");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // 위치 권한 요청
  function requestLocation() {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      () => {
        // 위치 거부 시 검단신도시 기본 좌표
        setUserPos({ lat: 37.5446, lng: 126.6861 });
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  // 검색 결과
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];
    buildings.forEach(building => {
      building.floors.forEach(f => {
        f.stores.forEach(s => {
          if (s.name === "공실") return;
          if (s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) {
            results.push({ store: s, floorLabel: f.label, buildingName: building.name });
          }
        });
      });
    });
    return results;
  }, [searchQuery]);

  // 주변 건물 거리 계산
  const nearbyWithDist = useMemo(() => {
    const base = userPos ?? { lat: 37.5446, lng: 126.6861 };
    return NEARBY_BUILDINGS
      .map(b => ({ ...b, km: haversineKm(base.lat, base.lng, b.lat, b.lng) }))
      .sort((a, b) => a.km - b.km);
  }, [userPos]);

  const isSearching = searchQuery.trim().length > 0;

  // 선택된 건물 정보
  const selectedNearby = selectedBuildingId
    ? nearbyWithDist.find(n => n.id === selectedBuildingId) ?? null
    : null;
  const selectedBuildingData = selectedBuildingId === "b1" ? buildings[0] : null;

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="상가" />

      {/* 검색바 + 토글 */}
      <div className="bg-white px-4 pt-3 pb-3 sticky top-[56px] z-30 border-b border-[#F2F4F6]">
        <div className="flex items-center gap-2 bg-[#F2F4F6] rounded-xl px-3.5 h-11">
          <Search size={16} className="text-[#8B95A1] shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="매장명 또는 카테고리 검색 (예: 카페, 스타벅스)"
            className="flex-1 bg-transparent text-[15px] focus:outline-none text-[#191F28] placeholder:text-[#B0B8C1]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="active:opacity-60">
              <X size={16} className="text-[#8B95A1]" />
            </button>
          )}
        </div>
        {!isSearching && (
          <div className="flex gap-2 mt-2.5">
            {(["리스트", "지도"] as const).map(mode => (
              <button key={mode} onClick={() => { setViewMode(mode); setSelectedBuildingId(null); }}
                className={`flex-1 h-9 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${viewMode === mode ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
                {mode === "리스트" ? <List size={15} /> : <MapIcon size={15} />}
                {mode === "리스트" ? "매장 리스트" : "상가 지도"}
              </button>
            ))}
          </div>
        )}
      </div>

      {isSearching ? (
        <SearchResults results={searchResults} onSelect={(s) => setSelected(s)} />
      ) : selectedBuildingId && selectedNearby ? (
        /* ─── 건물 상세 뷰 ─── */
        <BuildingDetail
          buildingData={selectedBuildingData}
          nearbyInfo={selectedNearby}
          onBack={() => setSelectedBuildingId(null)}
        />
      ) : viewMode === "지도" ? (
        /* ─── 지도 모드 ─── */
        <>
          <StoreMapView
            buildings={nearbyWithDist}
            selectedId={selectedBuildingId}
            onSelect={id => setSelectedBuildingId(id)}
          />
          <div className="px-4 pb-4 space-y-2">
            {nearbyWithDist.map(nb => (
              <button key={nb.id} onClick={() => setSelectedBuildingId(nb.id)}
                className="w-full bg-white rounded-xl px-4 py-3 flex items-center gap-3 active:bg-[#F2F4F6] text-left">
                <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-[#3182F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#191F28] truncate">{nb.name}</p>
                    {nb.hasData && <span className="text-[11px] font-bold bg-[#3182F6] text-white px-1.5 py-0.5 rounded-full shrink-0">지도</span>}
                  </div>
                  <p className="text-[13px] text-[#8B95A1] truncate mt-0.5">{nb.address}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-[#3182F6]">{distLabel(nb.km)}</p>
                  <p className="text-[12px] text-[#B0B8C1]">{nb.floors}층 · {nb.stores}개</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        /* ─── 리스트 모드 ─── */
        <StoreListView />
      )}

      {selected && selected.name !== "공실" && (
        <StoreSheet store={selected} onClose={() => setSelected(null)}
          onDetail={() => { setSelected(null); router.push(`/stores/detail/?id=${selected.id}`); }} />
      )}
      <BottomNav />
    </div>
  );
}
