"use client";
import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  MapPin, Phone, Clock, Lock, Tag,
  ChevronLeft, ChevronRight, X, Pencil, CheckCircle2,
  Search, Navigation, Building2, List, Map as MapIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import CouponCard, { loadDownloaded, saveDownloaded } from "@/components/ui/CouponCard";
import { fetchBuildingWithFloors, fetchBuildings, fetchAllStoresFlat } from "@/lib/db/buildings";
import { fetchRecommendedKeywords, fetchPopularKeywords, logSearch } from "@/lib/db/search-keywords";
import { fetchActiveBanners, type Banner } from "@/lib/db/banners";
import BannerCarousel from "@/components/ui/BannerCarousel";
import { fetchActiveCoupons, fetchActiveOpenings, fetchStoreDetail, type StoreDetail } from "@/lib/db/stores";
import type { Store, StoreCategory, Floor, Building } from "@/lib/types";
import type { BuildingRow, FlatStore } from "@/lib/db/buildings";

const catDot: Record<StoreCategory, string> = {
  카페: "#F59E0B", 음식점: "#F97316", 편의점: "#3B82F6",
  "병원/약국": "#EF4444", 미용: "#EC4899", 학원: "#8B5CF6",
  마트: "#10B981", "헬스/운동": "#0EA5E9", 반려동물: "#F472B6",
  세탁: "#6366F1", 기타: "#9CA3AF",
};
const catEmoji: Record<StoreCategory, string> = {
  카페:"☕", 음식점:"🍽️", 편의점:"🏪", "병원/약국":"💊", 미용:"💇",
  학원:"📚", 마트:"🛒", "헬스/운동":"💪", 반려동물:"🐾", 세탁:"👕", 기타:"🏢",
};
const catBg: Record<StoreCategory, string> = {
  카페:"bg-[#FEF3C7] text-[#92400E]", 음식점:"bg-[#FFF0E6] text-[#C2410C]",
  편의점:"bg-[#e8f1fd] text-[#1E40AF]", "병원/약국":"bg-[#FEE2E2] text-[#991B1B]",
  미용:"bg-[#FCE7F3] text-[#9D174D]", 학원:"bg-[#EDE9FE] text-[#5B21B6]",
  마트:"bg-[#D1FAE5] text-[#065F46]", "헬스/운동":"bg-[#E0F2FE] text-[#0369A1]",
  반려동물:"bg-[#FDF2F8] text-[#9D174D]", 세탁:"bg-[#EEF2FF] text-[#4338CA]",
  기타:"bg-[#F3F4F6] text-[#374151]",
};

// 건물 이미지 매핑 (Unsplash 무료 이미지)
const BUILDING_IMAGES: Record<string, string> = {
  "b_jk":     "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=280&fit=crop&auto=format",
  "b_metro2": "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=600&h=280&fit=crop&auto=format",
  "b_aplus":  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=280&fit=crop&auto=format",
  "b_syace2": "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&h=280&fit=crop&auto=format",
  "b_sung":   "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=280&fit=crop&auto=format",
  "b_covent": "https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?w=600&h=280&fit=crop&auto=format",
  "b_sinahn": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=280&fit=crop&auto=format",
  "b_daseung":"https://images.unsplash.com/photo-1582139329536-e7284fece509?w=600&h=280&fit=crop&auto=format",
};
const DEFAULT_IMG = "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&h=280&fit=crop&auto=format";

// DB BuildingRow를 화면용 building 객체로 변환
type NearbyBuilding = {
  id: string; name: string; address: string;
  lat: number; lng: number; floors: number; stores: number;
  hasData: boolean; image: string; categories: StoreCategory[]; km: number;
};

function rowToNearby(row: BuildingRow, userLat: number, userLng: number): NearbyBuilding {
  return {
    id: row.id, name: row.name, address: row.address,
    lat: row.lat ?? 37.586, lng: row.lng ?? 126.706,
    floors: row.floors ?? 1, stores: row.total_stores ?? 0,
    hasData: row.has_data,
    image: BUILDING_IMAGES[row.id] ?? DEFAULT_IMG,
    categories: (row.categories ?? []) as StoreCategory[],
    km: haversineKm(userLat, userLng, row.lat ?? 37.586, row.lng ?? 126.706),
  };
}

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
      <rect x="2" y="2" width="96" height="96" rx="3" fill="#F9FAFB" stroke="#d2d2d7" strokeWidth="1" />
      {floor.hasRestroom && (
        <>
          <rect x="44" y="44" width="12" height="12" rx="2" fill="#e8f1fd" stroke="#93C5FD" strokeWidth="0.5" />
          <text x="50" y="52" textAnchor="middle" fontSize="5.5" fill="#2563EB" fontWeight="bold">WC</text>
        </>
      )}
      {floor.stores.map(s => {
        const vacant = s.name === "공실";
        const sel = selectedId === s.id;
        return (
          <g key={s.id} onClick={() => !vacant && onSelect(s)} style={{ cursor: vacant ? "default" : "pointer" }}>
            <rect x={`${s.x}%`} y={`${s.y}%`} width={`${s.w}%`} height={`${s.h}%`} rx="3"
              fill={sel ? "#e8f1fd" : "white"} stroke={sel ? "#0071e3" : "#d2d2d7"} strokeWidth={sel ? 1.5 : 0.8} />
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

// ─── 바텀시트 공통 래퍼 ──────────────────────────────────────
function SheetBackdrop({ zIndex, onClose, children }: { zIndex: number; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0" style={{ zIndex }}>
      {/* backdrop — 먼저 DOM에 → sheet보다 z 낮음, 클릭 시 닫기 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} style={{ zIndex: 1 }} />
      {/* sheet panel — 나중에 DOM에 → z:2 로 backdrop 위 */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px]" style={{ zIndex: 2 }}
        onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── 매장 바텀시트 ────────────────────────────────────────────
function StoreSheet({ store, onClose, onDetail }: { store: Store; onClose: () => void; onDetail: () => void }) {
  const [sent, setSent] = useState(false);
  return (
    <SheetBackdrop zIndex={300} onClose={onClose}>
      <div className="bg-white rounded-t-3xl overflow-hidden">
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-[#d2d2d7] rounded-full" /></div>
        <div className="px-5 pt-4 pb-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
              <h2 className="text-[21px] font-bold text-[#1d1d1f] mt-1">{store.name}</h2>
              {store.isOpen !== undefined && (
                <span className={`text-[13px] font-medium ${store.isOpen ? "text-[#00C471]" : "text-[#F04452]"}`}>
                  {store.isOpen ? "● 영업 중" : "● 영업 종료"}
                </span>
              )}
            </div>
            <button onClick={onClose} className="active:opacity-60"><X size={22} className="text-[#6e6e73]" /></button>
          </div>
          <div className="space-y-2.5">
            {store.hours && (
              <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-3 py-3">
                <Clock size={16} className="text-[#6e6e73] shrink-0" />
                <div><p className="text-[12px] text-[#6e6e73]">영업시간</p><p className="text-[15px] font-medium text-[#1d1d1f]">{store.hours}</p></div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-[#6e6e73] shrink-0" />
                  <div><p className="text-[12px] text-[#6e6e73]">전화번호</p><p className="text-[15px] font-medium text-[#1d1d1f]">{store.phone}</p></div>
                </div>
                <a href={`tel:${store.phone}`} className="h-9 px-4 bg-[#0071e3] rounded-xl text-white text-[14px] font-bold flex items-center active:opacity-80">전화</a>
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            <button onClick={onDetail}
              className="w-full h-12 bg-[#0071e3] rounded-xl flex items-center justify-center gap-2 text-[15px] text-white font-bold active:bg-[#0058b0]">
              매장 상세 정보 보기
            </button>
            {!sent
              ? <button onClick={() => setSent(true)}
                  className="w-full h-11 border border-[#d2d2d7] rounded-xl flex items-center justify-center gap-2 text-[14px] text-[#424245] font-medium active:bg-[#f5f5f7]">
                  <Pencil size={14} className="text-[#6e6e73]" />정보 수정 제안하기
                </button>
              : <div className="w-full h-11 bg-[#D1FAE5] rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} className="text-[#00C471]" />
                  <span className="text-[14px] text-[#065F46] font-medium">제안이 접수됐어요</span>
                </div>
            }
          </div>
        </div>
      </div>
    </SheetBackdrop>
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
  "헬스/운동":"https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&h=260&fit=crop&auto=format",
  반려동물:   "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=260&fit=crop&auto=format",
  세탁:       "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=600&h=260&fit=crop&auto=format",
  기타:       "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=260&fit=crop&auto=format",
};

// ─── 상가 건물 바텀시트 (리스트뷰용) ─────────────────────────
function BuildingBottomSheet({
  nearbyInfo, buildingData, loading, onClose, onSelectStore,
}: {
  nearbyInfo: NearbyBuilding;
  buildingData: Building | null;
  loading: boolean;
  onClose: () => void;
  onSelectStore: (s: EnrichedStore) => void;
}) {
  const [floorIdx, setFloorIdx] = useState(-1);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const allStores: { store: Store; floorLabel: string }[] = buildingData
    ? buildingData.floors.flatMap(f => f.stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: f.label })))
    : [];
  const visible = floorIdx === -1
    ? allStores
    : (buildingData ? buildingData.floors[floorIdx].stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: buildingData.floors[floorIdx].label })) : []);

  return (
    <div className="fixed inset-0" style={{ zIndex: 300 }}>
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 1 }} onClick={onClose} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl"
        style={{ zIndex: 2, maxHeight: "86%", boxShadow: "0 -4px 32px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 건물 이미지 헤더 */}
        <div className="relative shrink-0" style={{ height: 160 }}>
          {!imgFailed && nearbyInfo.image ? (
            <img src={nearbyInfo.image} alt={nearbyInfo.name} onError={() => setImgFailed(true)}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#1849A3] flex items-center justify-center">
              <Building2 size={40} className="text-white/60" />
            </div>
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,.6) 100%)" }} />
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <div className="w-10 h-1 rounded-full bg-white/50" />
          </div>
          <button onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center active:opacity-60 backdrop-blur-sm">
            <X size={14} className="text-white" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p className="text-[18px] font-bold text-white leading-tight drop-shadow">{nearbyInfo.name}</p>
            <p className="text-[11px] text-white/75 mt-0.5">
              {nearbyInfo.floors}층 · {nearbyInfo.stores}개 매장
              {nearbyInfo.km > 0 && ` · ${distLabel(nearbyInfo.km)}`}
            </p>
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="flex flex-col items-center justify-center flex-1 py-12 gap-3">
            <div className="w-8 h-8 border-[3px] border-[#0071e3] border-t-transparent rounded-full animate-spin" />
            <p className="text-[13px] text-[#6e6e73]">매장 정보 불러오는 중...</p>
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && !buildingData && (
          <div className="flex flex-col items-center justify-center flex-1 pb-10 px-8">
            <span className="text-5xl mb-3">🏗️</span>
            <p className="text-[16px] font-bold text-[#1d1d1f]">정보 준비 중</p>
            <p className="text-[13px] text-[#6e6e73] mt-1 text-center leading-relaxed">
              이 건물의 상세 정보는 곧 업데이트돼요
            </p>
            <div className="mt-4 bg-[#f5f5f7] rounded-2xl px-5 py-4 w-full">
              <p className="text-[13px] text-[#424245]">{nearbyInfo.address}</p>
              <p className="text-[13px] text-[#6e6e73] mt-1">{nearbyInfo.floors}층 · 약 {nearbyInfo.stores}개 매장</p>
            </div>
          </div>
        )}

        {/* 매장 목록 */}
        {!loading && buildingData && (
          <>
            {/* 층 탭 */}
            <div className="flex gap-2 px-4 py-2.5 border-b border-[#f5f5f7] overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setFloorIdx(-1)}
                className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${floorIdx === -1 ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                전체 {allStores.length}개
              </button>
              {buildingData.floors.map((f, i) => (
                <button key={f.label} onClick={() => setFloorIdx(i)}
                  className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${i === floorIdx ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* 매장 리스트 */}
            <div className="overflow-y-auto flex-1">
              {visible.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-[13px] text-[#86868b]">입점 매장 없음</div>
              ) : (
                visible.map(({ store: s, floorLabel }) => (
                  <button key={s.id}
                    onClick={() => onSelectStore({ ...s, floorLabel, buildingName: nearbyInfo.name })}
                    className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#f5f5f7] border-b border-[#f5f5f7] text-left">
                    <StoreLogo name={s.name} category={s.category} size={44} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[15px] font-semibold text-[#1d1d1f]">{s.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catBg[s.category]}`}>
                          {catEmoji[s.category]} {s.category}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#6e6e73] mt-0.5">
                        {floorIdx === -1 ? `${floorLabel} · ` : ""}{s.hours ?? "영업시간 미등록"}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                        {s.isOpen !== false ? "영업 중" : "영업 종료"}
                      </span>
                      <ChevronRight size={13} className="text-[#86868b]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 매장 리스트 상세 시트 ──────────────────────────────────
type EnrichedStore = Store & { floorLabel: string; buildingName: string };

function StoreListDetailSheet({
  store, onClose, allCoupons, allOpenings,
}: {
  store: EnrichedStore;
  onClose: () => void;
  allCoupons: import("@/lib/types").Coupon[];
  allOpenings: import("@/lib/types").NewStoreOpening[];
}) {
  const [sent, setSent] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [detail, setDetail] = useState<StoreDetail | null>(null);
  const coupon = allCoupons.find(c => c.storeId === store.id);
  const opening = allOpenings.find(o => o.storeId === store.id);

  useEffect(() => {
    fetchStoreDetail(store.id).then(setDetail);
  }, [store.id]);
  const color = catDot[store.category];
  const dDay = coupon ? Math.ceil((new Date(coupon.expiry).getTime() - Date.now()) / 86400000) : null;
  const heroImg = catHeroImage[store.category];

  return (
    <SheetBackdrop zIndex={300} onClose={onClose}>
      <div className="bg-white rounded-t-3xl overflow-hidden max-h-[90dvh] flex flex-col">

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
                <Clock size={15} className="text-[#6e6e73] shrink-0" />
                <div>
                  <p className="text-[11px] text-[#86868b]">영업시간</p>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">{store.hours}</p>
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center justify-between bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <div className="flex items-center gap-3">
                  <Phone size={15} className="text-[#6e6e73] shrink-0" />
                  <div>
                    <p className="text-[11px] text-[#86868b]">전화번호</p>
                    <p className="text-[14px] font-semibold text-[#1d1d1f]">{store.phone}</p>
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
                  <p className="text-[11px] text-[#86868b]">가격대</p>
                  <p className="text-[14px] font-semibold text-[#1d1d1f]">{detail.priceRange}</p>
                </div>
              </div>
            )}
          </div>

          {/* 소개 */}
          {detail?.description && (
            <div>
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">매장 소개</p>
              <p className="text-[14px] text-[#424245] leading-relaxed bg-[#F8F9FB] rounded-xl px-3.5 py-3">{detail.description}</p>
            </div>
          )}

          {/* 하이라이트 태그 */}
          {detail?.tags && (
            <div>
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">주요 특징</p>
              <div className="space-y-1.5">
                {detail.tags.map((t, i) => (
                  <div key={i} className="flex items-center gap-2.5 bg-[#F8F9FB] rounded-xl px-3.5 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <p className="text-[13px] text-[#424245]">{t}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 메뉴 (카페/음식점/마트) */}
          {detail?.menu && (
            <div>
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">대표 메뉴</p>
              <div className="space-y-1.5">
                {detail.menu.map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#F8F9FB] rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium text-[#1d1d1f]">{m.name}</span>
                      {m.tag && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>{m.tag}</span>}
                    </div>
                    <span className="text-[14px] font-bold text-[#1d1d1f]">{m.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 서비스 목록 (미용/병원/학원 등) */}
          {detail?.services && (
            <div>
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">제공 서비스</p>
              <div className="grid grid-cols-2 gap-1.5">
                {detail.services.map((s, i) => (
                  <div key={i} className="bg-[#F8F9FB] rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[12px] text-[#424245] leading-snug">{s}</span>
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
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">이번 주 쿠폰</p>
              <div className="rounded-2xl overflow-hidden" style={{ border: `1.5px solid ${coupon.color}33` }}>
                <div className="px-4 pt-3 pb-2" style={{ background: `${coupon.color}14` }}>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[26px] font-black" style={{ color: coupon.color }}>{coupon.discount}</span>
                    <span className="text-[12px] font-bold text-[#6e6e73]">할인</span>
                  </div>
                  <p className="text-[12px] text-[#424245] mt-0.5">{coupon.title}</p>
                </div>
                <div className="px-4 py-2.5 flex items-center justify-between bg-white">
                  <span className={`text-[11px] font-bold ${dDay <= 3 ? "text-[#F04452]" : "text-[#86868b]"}`}>
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
              <p className="text-[13px] font-bold text-[#6e6e73] mb-2">오픈 혜택</p>
              <div className="bg-[#FFF0F0] rounded-xl px-3.5 py-3 space-y-1.5">
                {opening.openBenefit.details.map((d, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[11px] font-black text-white bg-[#F04452] rounded-full w-4 h-4 flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-[13px] text-[#424245]">{d}</p>
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
                  className="w-full h-10 border border-[#d2d2d7] rounded-xl flex items-center justify-center gap-2 text-[13px] text-[#424245] font-medium active:bg-[#f5f5f7]">
                  <Pencil size={13} className="text-[#6e6e73]" />정보 수정 제안하기
                </button>
              : <div className="w-full h-10 bg-[#D1FAE5] rounded-xl flex items-center justify-center gap-2">
                  <CheckCircle2 size={15} className="text-[#00C471]" />
                  <span className="text-[13px] text-[#065F46] font-medium">제안이 접수됐어요</span>
                </div>
            }
          </div>
        </div>
      </div>
    </SheetBackdrop>
  );
}

// ─── 신규오픈 날짜 헬퍼 ─────────────────────────────────────
function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=일, 1=월
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diffToMon); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return { mon, sun };
}
function classifyOpening(openDate: string): "week" | "month" | "none" {
  const d = new Date(openDate);
  const now = new Date();
  const { mon, sun } = getWeekBounds();
  if (d >= mon && d <= sun) return "week";
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return "month";
  return "none";
}

// ─── 매장 리스트 뷰 ──────────────────────────────────────────
const ALL_CATS = Object.keys(catDot) as StoreCategory[];

const catGrads: Record<StoreCategory, [string, string]> = {
  카페:       ["#F59E0B", "#FB923C"],
  음식점:     ["#EF4444", "#F97316"],
  편의점:     ["#3B82F6", "#06B6D4"],
  "병원/약국":["#EF4444", "#F472B6"],
  미용:       ["#EC4899", "#C026D3"],
  학원:       ["#8B5CF6", "#6366F1"],
  마트:       ["#10B981", "#059669"],
  "헬스/운동":["#0EA5E9", "#6366F1"],
  반려동물:   ["#F472B6", "#EC4899"],
  세탁:       ["#6366F1", "#8B5CF6"],
  기타:       ["#6B7280", "#4B5563"],
};

// 매장 카드 — 매거진형 2열 그리드. memo로 리렌더 최소화 (props는 안정적 참조여야 함)
const StoreCard = memo(function StoreCard({
  store, hasNew, hasCoupon, onSelect,
}: {
  store: EnrichedStore;
  hasNew: boolean;
  hasCoupon: boolean;
  onSelect: (s: EnrichedStore) => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [heroFailed, setHeroFailed] = useState(false);
  const heroThumb = !!store.thumbnail_url && !thumbFailed ? store.thumbnail_url! : null;
  const [gFrom, gTo] = catGrads[store.category];
  const isOpen = store.isOpen !== false;
  return (
    <button onClick={() => onSelect(store)}
      className="bg-white rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-[#eeeef0] flex flex-col h-full">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ aspectRatio: "5/3" }}>
        {heroThumb ? (
          <img src={heroThumb} alt={store.name}
            loading="lazy" decoding="async"
            onError={() => setThumbFailed(true)}
            className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full relative">
            {!heroFailed && (
              <img src={catHeroImage[store.category]} alt=""
                loading="lazy" decoding="async"
                onError={() => setHeroFailed(true)}
                className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${gFrom}cc, ${gTo}99)` }} />
            <div className="absolute inset-0 opacity-15"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
                backgroundSize: "10px 10px",
              }} />
            <div className="absolute right-1 -bottom-3 opacity-25"
              style={{ fontSize: 78, lineHeight: 1 }}>
              {catEmoji[store.category]}
            </div>
          </div>
        )}

        {/* 좌상단 뱃지 */}
        {(hasNew || store.isPremium || hasCoupon) && (
          <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1">
            {hasNew && (
              <span className="text-[9px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-md shadow-sm">
                NEW
              </span>
            )}
            {store.isPremium && (
              <span className="text-[9px] font-black bg-gradient-to-r from-[#F59E0B] to-[#F97316] text-white px-1.5 py-0.5 rounded-md shadow-sm">
                ★ PREMIUM
              </span>
            )}
            {hasCoupon && (
              <span className="text-[9px] font-black bg-white/95 text-[#0071e3] px-1.5 py-0.5 rounded-md shadow-sm flex items-center gap-0.5 backdrop-blur-md">
                <Tag size={8} strokeWidth={3} /> 쿠폰
              </span>
            )}
          </div>
        )}

        {/* 우상단 영업 상태 */}
        <div className="absolute top-1.5 right-1.5">
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md backdrop-blur-md shadow-sm ${
            isOpen ? "bg-[#00C471]/95 text-white" : "bg-black/60 text-white"
          }`}>
            {isOpen ? "● 영업중" : "영업종료"}
          </span>
        </div>

        {/* 하단 그라디언트 (가독성) */}
        <div className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />

        {/* 좌측 하단 로고 (오버랩) */}
        <div className="absolute -bottom-3.5 left-2.5">
          <div className="ring-[2.5px] ring-white rounded-xl shadow-md overflow-hidden bg-white">
            <StoreLogo name={store.name} category={store.category} size={38} rounded="rounded-xl" />
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="pt-5 pb-2.5 px-2.5 flex-1 flex flex-col gap-1">
        <span className={`self-start text-[9.5px] font-black px-1.5 py-0.5 rounded-md ${catBg[store.category]}`}>
          {catEmoji[store.category]} {store.category}
        </span>

        <p className="text-[14px] font-black text-[#1d1d1f] leading-tight line-clamp-1">
          {store.name}
        </p>

        <div className="flex items-center gap-0.5 text-[11px] text-[#6e6e73]">
          <MapPin size={9} className="shrink-0 text-[#86868b]" />
          <span className="truncate min-w-0">{store.buildingName}</span>
        </div>

        <div className="flex items-center justify-between gap-1 text-[10.5px] mt-auto">
          <span className="font-black px-1.5 py-0.5 rounded-md text-white shrink-0"
            style={{ background: catDot[store.category] }}>
            {store.floorLabel}
          </span>
          {store.hours ? (
            <span className="text-[#86868b] truncate flex items-center gap-0.5 min-w-0">
              <Clock size={9} className="shrink-0 text-[#a1a1a6]" />
              <span className="truncate">{store.hours}</span>
            </span>
          ) : store.phone ? (
            <span className="text-[#86868b] truncate flex items-center gap-0.5 min-w-0">
              <Phone size={9} className="shrink-0 text-[#a1a1a6]" />
              <span className="truncate">{store.phone}</span>
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
});

const STORE_TABS = ["인기", "전체", "신규"] as const;
type StoreTabKey = (typeof STORE_TABS)[number];
const PAGE_SIZE = 12;
const POPULAR_LIMIT = 24;

function StoreListView() {
  const [tab, setTab] = useState<StoreTabKey>("인기");
  const [catFilter, setCatFilter] = useState<StoreCategory | "전체">("전체");
  const [selectedStore, setSelectedStore] = useState<EnrichedStore | null>(null);
  const [dbStores, setDbStores] = useState<FlatStore[]>([]);
  const [dbCoupons, setDbCoupons] = useState<import("@/lib/types").Coupon[]>([]);
  const [dbOpenings, setDbOpenings] = useState<import("@/lib/types").NewStoreOpening[]>([]);
  const [dlState, setDlState] = useState<Set<string>>(() => loadDownloaded());
  const [banners, setBanners] = useState<Banner[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAllStoresFlat().then(setDbStores);
    fetchActiveCoupons().then(setDbCoupons);
    fetchActiveOpenings().then(setDbOpenings);
    fetchActiveBanners().then(setBanners);
  }, []);

  const allStores = useMemo<EnrichedStore[]>(() =>
    dbStores.map(s => ({ ...s, floorLabel: s.floorLabel, buildingName: s.buildingName })),
    [dbStores]
  );

  const newOpeningIds = useMemo(() => new Set(dbOpenings.map(o => o.storeId)), [dbOpenings]);
  const couponStoreIds = useMemo(() => new Set(dbCoupons.map(c => c.storeId)), [dbCoupons]);

  // 인기 매장: 프리미엄 + 쿠폰 + 신규 오픈 시그널 점수 합산 후 상위 N개
  const popularStores = useMemo(() => {
    const scored = allStores
      .map(s => {
        let score = 0;
        if (s.isPremium) score += 100;
        if (couponStoreIds.has(s.id)) score += 50;
        if (newOpeningIds.has(s.id)) score += 30;
        if (s.isOpen !== false) score += 5;
        return { s, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, POPULAR_LIMIT)
      .map(({ s }) => s);
    return scored;
  }, [allStores, couponStoreIds, newOpeningIds]);

  const newStores = useMemo(
    () => allStores.filter(s => newOpeningIds.has(s.id)),
    [allStores, newOpeningIds]
  );

  const baseList = useMemo<EnrichedStore[]>(() => {
    let list: EnrichedStore[];
    if (tab === "인기") list = popularStores;
    else if (tab === "신규") list = newStores;
    else list = allStores;
    return catFilter === "전체" ? list : list.filter(s => s.category === catFilter);
  }, [tab, catFilter, popularStores, newStores, allStores]);

  // 전체 탭만 lazy load 적용. 인기/신규는 이미 작은 셋이라 한 번에 렌더.
  const isLazy = tab === "전체";
  const visibleList = useMemo(
    () => (isLazy ? baseList.slice(0, visibleCount) : baseList),
    [isLazy, baseList, visibleCount]
  );
  const hasMore = isLazy && visibleCount < baseList.length;

  // 전체 탭에서 카테고리=전체일 때만 업종별 그룹핑
  const grouped = useMemo(() => {
    if (tab !== "전체" || catFilter !== "전체") return null;
    const map = new Map<StoreCategory, EnrichedStore[]>();
    ALL_CATS.forEach(c => {
      const group = visibleList.filter(s => s.category === c);
      if (group.length > 0) map.set(c, group);
    });
    return map;
  }, [tab, catFilter, visibleList]);

  // 탭/필터 전환 시 visibleCount 초기화
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [tab, catFilter]);

  // IntersectionObserver — sentinel 노출 시 다음 페이지 로드
  useEffect(() => {
    if (!hasMore) return;
    const target = sentinelRef.current;
    if (!target) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount(c => Math.min(c + PAGE_SIZE, baseList.length));
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasMore, baseList.length]);

  const handleSelectStore = useCallback((s: EnrichedStore) => setSelectedStore(s), []);

  const tabCounts = {
    인기: popularStores.length,
    전체: allStores.length,
    신규: newStores.length,
  } as const;

  return (
    <div>
      {/* ── 이번 주 행사 배너 ── */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* ── 신규 오픈 ── */}
      {(() => {
        const weekOpenings  = dbOpenings.filter(o => classifyOpening(o.openDate) === "week");
        const monthOpenings = dbOpenings.filter(o => classifyOpening(o.openDate) === "month");
        if (weekOpenings.length === 0 && monthOpenings.length === 0) return null;

        function OpeningGroup({ items, label, badge, color }: {
          items: import("@/lib/types").NewStoreOpening[];
          label: string; badge: string; color: string;
        }) {
          if (items.length === 0) return null;
          const [featured, ...rest] = items;
          const store = allStores.find(s => s.id === featured.storeId);
          const [gFrom, gTo] = catGrads[featured.category] ?? ["#6B7280", "#4B5563"];
          return (
            <div>
              <div className="flex items-center gap-2.5 px-4 mb-3">
                <div className="w-1.5 h-5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[16px] font-black text-[#1d1d1f]">{label}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: color }}>{badge}</span>
                <span className="text-[11px] text-[#86868b]">{items.length}개</span>
                <div className="flex-1 h-px bg-[#e5e5ea]" />
              </div>
              <div className="px-4 space-y-2">
                <button onClick={() => store && setSelectedStore(store)}
                  className="w-full rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">{featured.category}</span>
                      <span className="text-[10px] font-black bg-black/20 text-white px-2 py-0.5 rounded-full">{badge}</span>
                    </div>
                    <p className="text-[22px] font-black text-white leading-tight">{featured.storeName}</p>
                    <p className="text-[13px] text-white/70 mt-1">{featured.floor} · {featured.openDate.slice(5).replace("-", "/")} 오픈</p>
                    {featured.openBenefit && (
                      <div className="mt-3 bg-black/20 rounded-xl px-3 py-2.5">
                        <p className="text-[12px] text-white font-semibold leading-snug">{featured.openBenefit.summary}</p>
                      </div>
                    )}
                  </div>
                </button>
                {rest.length > 0 && (
                  <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
                    {rest.map(o => {
                      const s = allStores.find(x => x.id === o.storeId);
                      return (
                        <button key={o.id} onClick={() => s && setSelectedStore(s)}
                          className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#f5f5f7] text-left">
                          <StoreLogo name={o.storeName} category={o.category} size={42} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{o.storeName}</p>
                            <p className="text-[12px] text-[#6e6e73] mt-0.5">{o.floor} · {o.openDate.slice(5).replace("-", "/")} 오픈</p>
                            {o.openBenefit && (
                              <p className="text-[12px] text-[#F04452] font-medium line-clamp-1 mt-0.5">{o.openBenefit.summary}</p>
                            )}
                          </div>
                          <ChevronRight size={14} className="shrink-0 text-[#d2d2d7]" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="pt-4 pb-3 space-y-5">
            <OpeningGroup items={weekOpenings} label="이번 주 신규 오픈" badge="NEW" color="#F04452" />
            <OpeningGroup items={monthOpenings} label="이번달 오픈" badge="이달" color="#FF9500" />
          </div>
        );
      })()}

      {/* ── 이번 주 쿠폰 ── */}
      {(() => {
        const validCoupons = dbCoupons.filter(c =>
          Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000) > 0
        );
        if (validCoupons.length === 0) return null;

        function toggleCoupon(id: string) {
          setDlState(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            saveDownloaded(n);
            return n;
          });
        }

        return (
          <div className="pt-1 pb-3">
            <div className="flex items-center gap-3 px-4 mb-3">
              <div className="w-1.5 h-5 rounded-full bg-[#F04452] shrink-0" />
              <span className="text-[16px] font-black text-[#1d1d1f]">이번 주 쿠폰</span>
              <span className="text-[11px] font-bold bg-[#FEE2E2] text-[#F04452] px-2 py-0.5 rounded-full">{validCoupons.length}장</span>
              <div className="flex-1 h-px bg-[#e5e5ea]" />
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
              {validCoupons.map(c => (
                <CouponCard
                  key={c.id}
                  coupon={c}
                  downloaded={dlState.has(c.id)}
                  onToggle={() => toggleCoupon(c.id)}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── 매장 목록 — 탭 + 업종 필터 + Lazy Load ── */}
      <div className="pt-3 pb-1">
        <div className="flex items-center gap-3 px-4 mb-3">
          <div className="w-1.5 h-5 rounded-full bg-[#0071e3] shrink-0" />
          <span className="text-[16px] font-black text-[#1d1d1f]">매장 둘러보기</span>
          <span className="text-[11px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full">{allStores.length}개</span>
          <div className="flex-1 h-px bg-[#e5e5ea]" />
        </div>

        {/* 탭 — 인기 / 전체 / 신규 */}
        <div className="px-4 mb-2.5">
          <div className="flex gap-1 bg-[#f5f5f7] rounded-2xl p-1">
            {STORE_TABS.map(t => {
              const active = tab === t;
              const icon = t === "인기" ? "🔥" : t === "신규" ? "✨" : "📋";
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 h-9 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1 transition-all ${
                    active ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
                  }`}>
                  <span>{icon}</span>
                  <span>{t}</span>
                  <span className={`text-[10px] font-bold ${active ? "text-[#0071e3]" : "text-[#86868b]"}`}>
                    {tabCounts[t]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 업종 필터 */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
          {(["전체", ...ALL_CATS] as (StoreCategory | "전체")[]).map(cat => {
            const active = catFilter === cat;
            const color = cat === "전체" ? "#1d1d1f" : catDot[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)}
                className={`shrink-0 h-8 px-4 rounded-full text-[13px] font-bold transition-all ${
                  active ? "text-white shadow-sm" : "bg-white text-[#6e6e73]"
                }`}
                style={active ? { background: color } : {}}>
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 pt-2 pb-6">
        {visibleList.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-2">
            <span className="text-3xl">
              {tab === "인기" ? "🔥" : tab === "신규" ? "✨" : "🏪"}
            </span>
            <p className="text-[14px] font-semibold text-[#424245]">
              {tab === "인기" ? "추천할 매장이 곧 등록돼요" : tab === "신규" ? "신규 오픈 매장이 없어요" : "조건에 맞는 매장이 없어요"}
            </p>
            <p className="text-[12px] text-[#86868b]">다른 업종을 선택해 보세요</p>
          </div>
        ) : grouped ? (
          // 전체 탭 + 카테고리=전체 → 업종별 그룹핑 + 그라디언트 헤더 + 2열 그리드
          <>
            {Array.from(grouped.entries()).map(([cat, stores]) => {
              const [gFrom, gTo] = catGrads[cat];
              return (
                <div key={cat} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${gFrom}, ${gTo})` }}>
                      <span className="text-[14px]">{catEmoji[cat]}</span>
                    </div>
                    <span className="text-[15px] font-black text-[#1d1d1f]">{cat}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                      style={{ background: catDot[cat] }}>
                      {stores.length}
                    </span>
                    <div className="flex-1 h-px bg-[#e5e5ea]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {stores.map(s => (
                      <StoreCard
                        key={s.id}
                        store={s}
                        hasNew={newOpeningIds.has(s.id)}
                        hasCoupon={couponStoreIds.has(s.id)}
                        onSelect={handleSelectStore}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {/* Lazy load sentinel (전체 탭에서만) */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[#86868b]">매장 더 불러오는 중...</p>
              </div>
            )}
          </>
        ) : (
          // 단일 그리드 (인기/신규 탭, 또는 전체 탭+업종 필터)
          <>
            <p className="text-[12px] font-semibold text-[#86868b] mb-2.5">
              {tab === "전체" && hasMore
                ? `${visibleList.length} / ${baseList.length}개 표시 중`
                : `${visibleList.length}개 매장`}
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {visibleList.map(s => (
                <StoreCard
                  key={s.id}
                  store={s}
                  hasNew={newOpeningIds.has(s.id)}
                  hasCoupon={couponStoreIds.has(s.id)}
                  onSelect={handleSelectStore}
                />
              ))}
            </div>
            {/* Lazy load sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex flex-col items-center justify-center py-6 gap-2">
                <div className="w-6 h-6 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] text-[#86868b]">매장 더 불러오는 중...</p>
              </div>
            )}
          </>
        )}
      </div>

      {selectedStore && (
        <StoreListDetailSheet
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
          allCoupons={dbCoupons}
          allOpenings={dbOpenings}
        />
      )}
    </div>
  );
}

// ─── 검색 결과 ────────────────────────────────────────────────
interface SearchResult { store: Store; floorLabel: string; buildingName: string; }

function SearchResults({ results, onSelect }: { results: SearchResult[]; onSelect: (s: Store) => void }) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <span className="text-4xl">🔍</span>
        <p className="text-[15px] font-semibold text-[#424245]">검색 결과가 없습니다</p>
        <p className="text-[13px] text-[#86868b]">다른 키워드로 검색해 보세요</p>
      </div>
    );
  }
  return (
    <div className="px-4 pt-3 pb-4">
      <p className="text-[12px] font-semibold text-[#86868b] mb-2.5">총 {results.length}건</p>
      <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
        {results.map(({ store, floorLabel, buildingName }) => (
          <button key={store.id} onClick={() => onSelect(store)}
            className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-[#f5f5f7] text-left">
            <StoreLogo name={store.name} category={store.category} size={42} />
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{store.name}</p>
              <p className="text-[12px] text-[#6e6e73]">{buildingName} · {floorLabel}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catBg[store.category]}`}>{store.category}</span>
              <span className={`text-[11px] font-bold ${store.isOpen !== false ? "text-[#00C471]" : "text-[#F04452]"}`}>
                {store.isOpen !== false ? "● 영업 중" : "● 영업 종료"}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 실제 지도 (Leaflet) — SSR 비활성화 ─────────────────────
const StoreMapView = dynamic(() => import("./StoreMapView"), {
  ssr: false,
  loading: () => (
    <div className="mx-4 mt-3 mb-3 rounded-2xl bg-[#f5f5f7] flex items-center justify-center border border-[#d2d2d7]"
      style={{ height: 440 }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#0071e3] border-t-transparent rounded-full animate-spin"
          style={{ borderWidth: 3 }} />
        <p className="text-[13px] text-[#6e6e73]">지도 불러오는 중...</p>
      </div>
    </div>
  ),
});


// ─── 지도 모드 건물 매장 시트 ────────────────────────────────
function MapBuildingSheet({
  nearbyInfo,
  buildingData,
  onClose,
  onSelectStore,
}: {
  nearbyInfo: NearbyBuilding;
  buildingData: Building | null;
  onClose: () => void;
  onSelectStore: (store: EnrichedStore) => void;
}) {
  const [floorIdx, setFloorIdx] = useState<number>(-1);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const allStores: { store: Store; floorLabel: string }[] = buildingData
    ? buildingData.floors.flatMap(f => f.stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: f.label })))
    : [];

  const visibleStores: { store: Store; floorLabel: string }[] = floorIdx === -1
    ? allStores
    : (buildingData ? buildingData.floors[floorIdx].stores.filter(s => s.name !== "공실").map(s => ({ store: s, floorLabel: buildingData.floors[floorIdx].label })) : []);

  return (
    <div className="fixed inset-0" style={{ zIndex: 200 }}>
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/50" style={{ zIndex: 1 }} onClick={onClose} />
      {/* 시트 */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl"
        style={{ zIndex: 2, maxHeight: "82%", boxShadow: "0 -4px 32px rgba(0,0,0,.22)", display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {/* 건물 이미지 헤더 */}
        <div className="relative shrink-0" style={{ height: 160 }}>
          {!imgFailed && nearbyInfo.image ? (
            <img src={nearbyInfo.image} alt={nearbyInfo.name} onError={() => setImgFailed(true)}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0071e3] to-[#1849A3] flex items-center justify-center">
              <Building2 size={36} className="text-white/70" />
            </div>
          )}
          {/* 그라디언트 오버레이 */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,.55) 100%)" }} />
          {/* 핸들 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <div className="w-10 h-1 rounded-full bg-white/50" />
          </div>
          {/* 닫기 */}
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center active:opacity-60 backdrop-blur-sm">
            <X size={14} className="text-white" />
          </button>
          {/* 건물명 */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <p className="text-[17px] font-bold text-white leading-tight drop-shadow">{nearbyInfo.name}</p>
            <p className="text-[11px] text-white/75 mt-0.5">{nearbyInfo.address} · {nearbyInfo.floors}층 · {nearbyInfo.stores}개 매장</p>
          </div>
        </div>

        {buildingData ? (
          <>
            {/* 층 탭 */}
            <div className="flex gap-2 px-4 py-2 border-b border-[#f5f5f7] overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
              <button onClick={() => setFloorIdx(-1)}
                className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${floorIdx === -1 ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                전체
              </button>
              {buildingData.floors.map((f, i) => (
                <button key={f.label} onClick={() => setFloorIdx(i)}
                  className={`shrink-0 px-3.5 h-8 rounded-xl text-[13px] font-bold transition-colors ${i === floorIdx ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {/* 매장 리스트 — 스크롤 가능 */}
            <div style={{ overflowY: "auto", flex: 1, WebkitOverflowScrolling: "touch" }}>
              {visibleStores.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-[13px] text-[#86868b]">입점 매장 없음</div>
              ) : (
                visibleStores.map(({ store: s, floorLabel }) => (
                  <button key={s.id}
                    onClick={() => onSelectStore({ ...s, floorLabel, buildingName: nearbyInfo.name })}
                    className="w-full px-4 py-3 flex items-center gap-3 active:bg-[#f5f5f7] border-b border-[#f5f5f7] text-left">
                    <StoreLogo name={s.name} category={s.category} size={42} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">{s.name}</p>
                      <p className="text-[12px] text-[#6e6e73] mt-0.5">
                        {catEmoji[s.category]} {s.category}
                        {floorIdx === -1 ? ` · ${floorLabel}` : ""}
                        {s.hours ? ` · ${s.hours}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.isOpen !== false ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#FEE2E2] text-[#991B1B]"}`}>
                        {s.isOpen !== false ? "영업 중" : "영업 종료"}
                      </span>
                      <ChevronRight size={13} className="text-[#86868b]" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 pb-10 px-8">
            <span className="text-5xl mb-3">🏗️</span>
            <p className="text-[16px] font-bold text-[#1d1d1f]">정보 준비 중</p>
            <p className="text-[13px] text-[#6e6e73] mt-1 text-center">이 건물의 상세 정보는 곧 업데이트돼요</p>
            <div className="mt-4 bg-[#f5f5f7] rounded-2xl px-5 py-4 w-full">
              <p className="text-[13px] text-[#424245]">{nearbyInfo.floors}층 · 약 {nearbyInfo.stores}개 매장</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 건물 상세 (층별 / 업종별) ──────────────────────────────
function BuildingDetail({
  buildingData,
  nearbyInfo,
  onBack,
}: {
  buildingData: Building | null;
  nearbyInfo: NearbyBuilding;
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
      <div className="pb-28">
        <div className="bg-white sticky top-[56px] z-30 border-b border-[#f5f5f7] px-4 flex items-center h-12">
          <button onClick={onBack} className="mr-3 active:opacity-60">
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <p className="text-[16px] font-bold text-[#1d1d1f]">{nearbyInfo.name}</p>
        </div>
        <div className="flex flex-col items-center justify-center pt-24 text-center px-8">
          <span className="text-5xl mb-4">🏗️</span>
          <p className="text-[17px] font-bold text-[#1d1d1f]">정보 준비 중</p>
          <p className="text-[14px] text-[#6e6e73] mt-2">이 건물의 상세 정보는 곧 업데이트될 예정이에요</p>
          <div className="mt-4 bg-[#f5f5f7] rounded-xl px-4 py-3 text-left w-full">
            <p className="text-[13px] text-[#424245]">{nearbyInfo.address}</p>
            <p className="text-[13px] text-[#6e6e73] mt-1">{nearbyInfo.floors}층 · 약 {nearbyInfo.stores}개 매장</p>
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
    <div className="pb-28">
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#f5f5f7]">
        <div className="px-4 flex items-center h-12">
          <button onClick={onBack} className="mr-3 active:opacity-60">
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <p className="text-[16px] font-bold text-[#1d1d1f]">{buildingData.name}</p>
        </div>
        <div className="flex border-t border-[#f5f5f7]">
          {(["층별", "업종별"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-10 text-[14px] font-semibold border-b-2 transition-colors ${tab === t ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"}`}>
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
              className="w-9 h-9 bg-[#f5f5f7] rounded-xl flex items-center justify-center disabled:opacity-30 active:opacity-60">
              <ChevronLeft size={18} className="text-[#1d1d1f]" />
            </button>
            <div className="flex items-center gap-2">
              {buildingData.floors.map((f, i) => (
                <button key={f.label} onClick={() => { setFloorIdx(i); setSelectedStore(null); }}
                  className={`w-10 h-10 rounded-xl text-[14px] font-bold transition-colors ${i === floorIdx ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setFloorIdx(i => Math.min(buildingData.floors.length-1, i+1)); setSelectedStore(null); }}
              disabled={floorIdx === buildingData.floors.length-1}
              className="w-9 h-9 bg-[#f5f5f7] rounded-xl flex items-center justify-center disabled:opacity-30 active:opacity-60">
              <ChevronRight size={18} className="text-[#1d1d1f]" />
            </button>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden mb-3">
            <div className="p-3">
              <FloorSVG floor={currentFloor} selectedId={selectedStore?.id ?? null} onSelect={setSelectedStore} />
            </div>
            <div className="px-4 py-3 border-t border-[#f5f5f7] flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${currentFloor.hasRestroom ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`} />
                <span className="text-[13px] text-[#6e6e73]">화장실 {currentFloor.hasRestroom ? "있음" : "없음"}</span>
              </div>
              {currentFloor.hasRestroom && currentFloor.restroomCode && (
                <button onClick={() => setShowCode(!showCode)} className="flex items-center gap-1 active:opacity-60">
                  <Lock size={12} className="text-[#0071e3]" />
                  <span className="text-[13px] text-[#0071e3] font-medium">{showCode ? `비번: ${currentFloor.restroomCode}` : "비번 보기"}</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-[15px] font-bold text-[#1d1d1f] mb-2.5">{currentFloor.label} 입점 매장</p>
          <div className="space-y-2">
            {currentFloor.stores.filter(s => s.name !== "공실").map(s => (
              <button key={s.id} onClick={() => setSelectedStore(s)}
                className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#f5f5f7] ${selectedStore?.id === s.id ? "ring-2 ring-[#0071e3]" : ""}`}>
                <div className="flex items-center gap-3">
                  <StoreLogo name={s.name} category={s.category} size={40} />
                  <div className="text-left">
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{s.name}</p>
                    {s.hours && <p className="text-[13px] text-[#6e6e73]">{s.hours}</p>}
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
                className={`shrink-0 px-3 h-8 rounded-full text-[13px] font-semibold transition-colors ${catFilter === c ? "bg-[#0071e3] text-white" : "bg-white text-[#424245]"}`}>
                {c === "전체" ? "전체" : `${catEmoji[c as StoreCategory]} ${c}`}
              </button>
            ))}
          </div>
          <div className="px-4 space-y-2">
            <p className="text-[13px] text-[#6e6e73]">총 {filteredStores.length}개 매장</p>
            {filteredStores.map(({ store, floorLabel }) => (
              <button key={store.id} onClick={() => setSelectedStore(store)}
                className={`w-full bg-white rounded-xl px-4 py-3 flex items-center justify-between active:bg-[#f5f5f7] ${selectedStore?.id === store.id ? "ring-2 ring-[#0071e3]" : ""}`}>
                <div className="flex items-center gap-3">
                  <StoreLogo name={store.name} category={store.category} size={40} />
                  <div className="text-left">
                    <p className="text-[15px] font-medium text-[#1d1d1f]">{store.name}</p>
                    <p className="text-[13px] text-[#6e6e73]">{floorLabel}</p>
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [recommendedKws, setRecommendedKws] = useState<string[]>([]);
  const [popularKws, setPopularKws] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"리스트" | "지도">("리스트");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBuildingData, setSelectedBuildingData] = useState<Building | null>(null);
  const [mapCatFilter, setMapCatFilter] = useState<StoreCategory | "전체">("전체");
  const [mapDetailStore, setMapDetailStore] = useState<EnrichedStore | null>(null);
  const [dbBuildings, setDbBuildings] = useState<BuildingRow[]>([]);
  const [allDbStores, setAllDbStores] = useState<FlatStore[]>([]);
  const [mapCoupons, setMapCoupons] = useState<import("@/lib/types").Coupon[]>([]);
  const [mapOpenings, setMapOpenings] = useState<import("@/lib/types").NewStoreOpening[]>([]);

  // DB 데이터 로드
  useEffect(() => {
    fetchBuildings().then(setDbBuildings);
    fetchAllStoresFlat().then(setAllDbStores);
    fetchActiveCoupons().then(setMapCoupons);
    fetchActiveOpenings().then(setMapOpenings);
    fetchRecommendedKeywords().then(setRecommendedKws);
    fetchPopularKeywords().then(setPopularKws);
  }, []);

  function handleSearchSelect(kw: string) {
    setSearchQuery(kw);
    setSearchFocused(false);
    if (kw.trim().length >= 2) logSearch(kw.trim());
    searchInputRef.current?.blur();
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchQuery.trim().length >= 2) {
      logSearch(searchQuery.trim());
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
    if (e.key === "Escape") {
      setSearchFocused(false);
      searchInputRef.current?.blur();
    }
  }

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
        // 위치 거부 시 검단신도시 실제 좌표
        setUserPos({ lat: 37.586, lng: 126.706 });
        setLocationLoading(false);
      },
      { timeout: 8000 }
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) { setSelectedBuildingData(null); return; }
    fetchBuildingWithFloors(selectedBuildingId).then(data => setSelectedBuildingData(data));
  }, [selectedBuildingId]);

  // 검색 결과
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allDbStores
      .filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .map(s => ({ store: s, floorLabel: s.floorLabel, buildingName: s.buildingName }));
  }, [searchQuery, allDbStores]);

  // 주변 건물 거리 계산
  const nearbyWithDist = useMemo<NearbyBuilding[]>(() => {
    const base = userPos ?? { lat: 37.586, lng: 126.706 };
    return dbBuildings
      .map(row => rowToNearby(row, base.lat, base.lng))
      .sort((a, b) => a.km - b.km);
  }, [userPos, dbBuildings]);

  const isSearching = searchQuery.trim().length > 0;

  // 선택된 건물 정보
  const selectedNearby = selectedBuildingId
    ? nearbyWithDist.find(n => n.id === selectedBuildingId) ?? null
    : null;

  // 지도 필터: 선택 업종이 없는 건물 ID set
  const dimmedIds = useMemo(() => {
    if (mapCatFilter === "전체") return new Set<string>();
    return new Set(nearbyWithDist.filter(b => !b.categories.includes(mapCatFilter as StoreCategory)).map(b => b.id));
  }, [mapCatFilter, nearbyWithDist]);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="상가" />

      {/* 검색바 + 토글 */}
      <div className="bg-white px-4 pt-3 pb-3 sticky top-[56px] z-30 border-b border-[#f5f5f7]">
        <div className={`flex items-center gap-2.5 rounded-2xl px-4 h-12 transition-all ${searchFocused ? "bg-white ring-2 ring-[#0071e3] shadow-sm" : "bg-[#f5f5f7]"}`}>
          <Search size={16} className={`shrink-0 transition-colors ${searchFocused ? "text-[#0071e3]" : "text-[#86868b]"}`} />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="매장명, 업종 검색 (예: 카페, 스타벅스)"
            className="flex-1 bg-transparent text-[15px] focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b]"
          />
          {(searchQuery || searchFocused) && (
            <button onMouseDown={e => e.preventDefault()} onClick={() => { setSearchQuery(""); setSearchFocused(false); searchInputRef.current?.blur(); }} className="active:opacity-60">
              <X size={16} className="text-[#86868b]" />
            </button>
          )}
        </div>
        {!isSearching && !searchFocused && (
          <div className="flex gap-1 mt-2.5 bg-[#f5f5f7] rounded-2xl p-1">
            {(["리스트", "지도"] as const).map(mode => (
              <button key={mode} onClick={() => { setViewMode(mode); setSelectedBuildingId(null); }}
                className={`flex-1 h-9 rounded-xl text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                  viewMode === mode ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b]"
                }`}>
                {mode === "리스트" ? <List size={14} /> : <MapIcon size={14} />}
                {mode === "리스트" ? "매장 리스트" : "상가 지도"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 키워드 검색 패널 */}
      {searchFocused && !isSearching && (
        <div className="bg-white min-h-[calc(100dvh-170px)]" onMouseDown={e => e.preventDefault()}>
          {recommendedKws.length > 0 && (
            <div className="px-4 pt-5 pb-4 border-b border-[#f5f5f7]">
              <p className="text-[12px] font-bold text-[#86868b] mb-3 uppercase tracking-wide">추천 검색어</p>
              <div className="flex flex-wrap gap-2">
                {recommendedKws.map(kw => (
                  <button key={kw} onClick={() => handleSearchSelect(kw)}
                    className="h-9 px-4 bg-[#f5f5f7] rounded-full text-[14px] font-semibold text-[#1d1d1f] active:bg-[#e5e5ea] transition-colors">
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {popularKws.length > 0 && (
            <div className="px-4 pt-4 pb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[12px] font-bold text-[#86868b] uppercase tracking-wide">실시간 인기 검색어</p>
                <p className="text-[10px] text-[#86868b]">최근 7일 기준</p>
              </div>
              <div className="space-y-1">
                {popularKws.map((kw, i) => (
                  <button key={kw} onClick={() => handleSearchSelect(kw)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl active:bg-[#f5f5f7] transition-colors text-left">
                    <span className={`text-[13px] font-black w-5 text-center shrink-0 ${i < 3 ? "text-[#F04452]" : "text-[#86868b]"}`}>{i + 1}</span>
                    <span className="text-[15px] text-[#1d1d1f] font-medium flex-1">{kw}</span>
                    {i < 3 && <span className="text-[10px] font-bold text-[#F04452] bg-[#FFF0F0] px-1.5 py-0.5 rounded-full shrink-0">HOT</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recommendedKws.length === 0 && popularKws.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Search size={32} className="text-[#d2d2d7]" />
              <p className="text-[14px] text-[#86868b]">검색어를 입력해 보세요</p>
            </div>
          )}
        </div>
      )}

      {isSearching ? (
        <SearchResults results={searchResults} onSelect={(s) => { setSelected(s); setSearchFocused(false); }} />
      ) : searchFocused ? null : selectedBuildingId && selectedNearby && viewMode !== "지도" ? (
        /* ─── 건물 상세 뷰 (리스트 모드) ─── */
        <BuildingDetail
          buildingData={selectedBuildingData}
          nearbyInfo={selectedNearby}
          onBack={() => setSelectedBuildingId(null)}
        />
      ) : viewMode === "지도" ? (
        /* ─── 지도 모드 ─── */
        <>
          <div className="fixed left-0 right-0" style={{ top: 170, bottom: 58, zIndex: 10 }}>
            {/* 업종별 필터 바 */}
            <div className="absolute top-0 left-0 right-0 z-[50] pt-2 pb-1.5"
              style={{ background: "linear-gradient(180deg,rgba(255,255,255,.96) 70%,transparent)" }}>
              <div className="flex gap-2 px-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {(["전체", ...ALL_CATS] as (StoreCategory | "전체")[]).map(cat => (
                  <button key={cat} onClick={() => setMapCatFilter(cat)}
                    className={`shrink-0 flex items-center gap-1 px-3 h-8 rounded-full text-[12px] font-bold shadow-sm transition-all border ${mapCatFilter === cat ? "bg-[#0071e3] text-white border-transparent" : "bg-white text-[#424245] border-[#d2d2d7]"}`}>
                    {cat === "전체" ? "🏢 전체" : `${catEmoji[cat as StoreCategory]} ${cat}`}
                  </button>
                ))}
              </div>
            </div>

            {/* 지도 */}
            <StoreMapView
              buildings={nearbyWithDist}
              selectedId={selectedBuildingId}
              onSelect={id => setSelectedBuildingId(selectedBuildingId === id ? null : id)}
              dimmedIds={dimmedIds}
            />
          </div>

          {/* 건물 탭 시 매장 시트 — fixed로 전체 뷰포트 덮음 */}
          {selectedBuildingId && selectedNearby && !mapDetailStore && (
            <MapBuildingSheet
              nearbyInfo={selectedNearby}
              buildingData={selectedBuildingData}
              onClose={() => setSelectedBuildingId(null)}
              onSelectStore={setMapDetailStore}
            />
          )}
        </>
      ) : (
        /* ─── 리스트 모드 ─── */
        <StoreListView />
      )}

      {/* 지도 모드 매장 상세 — viewport 기준 fixed, 최상위 레이어 */}
      {mapDetailStore && (
        <StoreListDetailSheet
          store={mapDetailStore}
          onClose={() => setMapDetailStore(null)}
          allCoupons={mapCoupons}
          allOpenings={mapOpenings}
        />
      )}

      {selected && selected.name !== "공실" && (
        <StoreSheet store={selected} onClose={() => setSelected(null)}
          onDetail={() => { setSelected(null); router.push(`/stores/detail/?id=${selected.id}`); }} />
      )}
      <BottomNav />
    </div>
  );
}
