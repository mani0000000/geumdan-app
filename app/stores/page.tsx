"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapPin, Phone, Clock, Lock, ParkingSquare,
  ChevronLeft, ChevronRight, X, Info, Pencil,
  CheckCircle2, Navigation, Building2, ChevronDown,
  Search, List, Map as MapIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { buildings } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import type { Store, StoreCategory, Floor } from "@/lib/types";

// ─── 카테고리 색상 / 이모지 ──────────────────────────────────
const categoryColors: Record<StoreCategory, { bg: string; text: string; dot: string }> = {
  카페:       { bg: "bg-amber-100",   text: "text-amber-800",   dot: "#F59E0B" },
  음식점:     { bg: "bg-orange-100",  text: "text-orange-800",  dot: "#F97316" },
  편의점:     { bg: "bg-blue-100",    text: "text-blue-800",    dot: "#3B82F6" },
  "병원/약국": { bg: "bg-red-100",   text: "text-red-800",     dot: "#EF4444" },
  미용:       { bg: "bg-pink-100",    text: "text-pink-800",    dot: "#EC4899" },
  학원:       { bg: "bg-purple-100",  text: "text-purple-800",  dot: "#8B5CF6" },
  마트:       { bg: "bg-green-100",   text: "text-green-800",   dot: "#10B981" },
  기타:       { bg: "bg-gray-100",    text: "text-gray-700",    dot: "#9CA3AF" },
};

const categoryEmoji: Record<StoreCategory, string> = {
  카페: "☕", 음식점: "🍽️", 편의점: "🏪", "병원/약국": "💊",
  미용: "💇", 학원: "📚", 마트: "🛒", 기타: "🏢",
};

// ─── 건물 데이터 (지도용 좌표 포함) ─────────────────────────
const ALL_BUILDINGS = [
  { id: "b1",  name: "롯데마트 검단점",     address: "인천 서구 원당대로 581 (마전동)",  lat: 37.5485, lng: 126.6848, floors: 3,  stores: 22, hasData: true },
  { id: "nb2", name: "JS프라자2 메디컬",    address: "인천 서구 완정로 14 (마전동)",     lat: 37.5505, lng: 126.6828, floors: 6,  stores: 15, hasData: false },
  { id: "nb3", name: "코벤트워크 검단",     address: "인천 서구 이음대로 392 (원당동)",  lat: 37.5441, lng: 126.6875, floors: 5,  stores: 30, hasData: false },
  { id: "nb4", name: "검단탑종합병원",      address: "인천 서구 청마로19번길 5",         lat: 37.5463, lng: 126.6812, floors: 7,  stores: 18, hasData: false },
  { id: "nb5", name: "금강프라자 검단아라", address: "인천 서구 이음대로 475 (원당동)",  lat: 37.5449, lng: 126.6895, floors: 4,  stores: 14, hasData: false },
  { id: "nb6", name: "검단사거리 상가",     address: "인천 서구 검단로 480 (왕길동)",    lat: 37.5390, lng: 126.6941, floors: 3,  stores: 20, hasData: false },
  { id: "nb7", name: "당하 웰스트리트",     address: "인천 서구 당하로 83 (당하동)",     lat: 37.5461, lng: 126.6876, floors: 4,  stores: 16, hasData: false },
  { id: "nb8", name: "마전역 근린상가",     address: "인천 서구 원당대로 491 (마전동)",  lat: 37.5472, lng: 126.6840, floors: 3,  stores: 11, hasData: false },
];

// 지도 좌표 범위
const MAP_LAT_MIN = 37.5375, MAP_LAT_MAX = 37.5515;
const MAP_LNG_MIN = 126.6795, MAP_LNG_MAX = 126.6955;

function toMapXY(lat: number, lng: number) {
  const x = ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * 100;
  const y = 100 - ((lat - MAP_LAT_MIN) / (MAP_LAT_MAX - MAP_LAT_MIN)) * 100;
  return { x, y };
}

// ─── 거리 계산 ────────────────────────────────────────────────
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

// ─── 매장 상세 시트 ─────────────────────────────────────────
function StoreDetailSheet({ store, onClose }: { store: Store; onClose: () => void }) {
  const colors = categoryColors[store.category];
  const [suggestSent, setSuggestSent] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-white rounded-t-2xl overflow-hidden"
        style={{ maxHeight: "70dvh" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="px-5 pt-4 pb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                  {store.category}
                </span>
                {store.isOpen !== undefined && (
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    store.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {store.isOpen ? "영업 중" : "영업 종료"}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-bold text-gray-900">{store.name}</h2>
            </div>
            <button onClick={onClose} className="press-effect"><X size={22} className="text-gray-500" /></button>
          </div>
          <div className="mt-4 space-y-3">
            {store.hours && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Clock size={16} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">영업시간</p>
                  <p className="text-[14px] text-gray-800 font-medium">{store.hours}</p>
                </div>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={16} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">전화번호</p>
                  <a href={`tel:${store.phone}`} className="text-[14px] text-blue-600 font-medium">{store.phone}</a>
                </div>
              </div>
            )}
            {store.description && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Info size={16} className="text-gray-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">소개</p>
                  <p className="text-[14px] text-gray-800">{store.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-5">
            {!suggestSent ? (
              <button onClick={() => setSuggestSent(true)}
                className="w-full h-11 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[13px] text-gray-600 font-medium press-effect">
                <Pencil size={15} className="text-gray-500" />정보 수정 제안하기
              </button>
            ) : (
              <div className="w-full h-11 bg-green-50 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <span className="text-[13px] text-green-700 font-medium">제안이 접수되었습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

// ─── 건물 상세 (층별 / 업종별 리스트) ────────────────────────
function BuildingDetail({
  buildingId,
  onBack,
}: {
  buildingId: string;
  onBack: () => void;
}) {
  const nb = ALL_BUILDINGS.find(b => b.id === buildingId)!;
  const bd = buildings.find(b => b.id === buildingId);
  const [detailTab, setDetailTab] = useState<"층별" | "업종별">("층별");
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [selectedCat, setSelectedCat] = useState<StoreCategory | "전체">("전체");
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showRestroomCode, setShowRestroomCode] = useState(false);

  // All stores across all floors
  const allStores: Store[] = useMemo(() => {
    if (!bd) return [];
    return bd.floors.flatMap(f => f.stores.filter(s => s.name !== "공실"));
  }, [bd]);

  const allCategories: StoreCategory[] = useMemo(() => {
    const cats = new Set(allStores.map(s => s.category));
    return Array.from(cats);
  }, [allStores]);

  const currentFloor: Floor | undefined = bd?.floors[selectedFloor];

  const filteredByFloor = currentFloor?.stores.filter(s => s.name !== "공실") ?? [];
  const filteredByCat = selectedCat === "전체"
    ? allStores
    : allStores.filter(s => s.category === selectedCat);

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="상가 지도" showNotification />

      {/* 뒤로 + 건물명 */}
      <div className="sticky top-[56px] z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="press-effect">
          <ChevronLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-gray-900 truncate">{nb.name}</p>
          <div className="flex items-center gap-1">
            <MapPin size={11} className="text-gray-400" />
            <p className="text-[11px] text-gray-400 truncate">{nb.address}</p>
          </div>
        </div>
        {nb.hasData && (
          <span className="text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shrink-0">상세 있음</span>
        )}
      </div>

      {!bd ? (
        /* ── 데이터 없는 건물 ── */
        <div className="mx-4 mt-4 bg-white rounded-2xl p-6 text-center card-shadow">
          <span className="text-4xl mb-3 block">🏗️</span>
          <p className="text-[15px] font-bold text-gray-700">매장 정보 등록 예정</p>
          <p className="text-[13px] text-gray-400 mt-1">
            {nb.floors}층 건물 · 약 {nb.stores}개 매장
          </p>
          <p className="text-[12px] text-gray-400 mt-3 leading-relaxed">
            이 건물의 상세 정보를 준비 중입니다.<br />
            정보 등록을 원하시면 제안해 주세요.
          </p>
          <button className="mt-4 h-10 px-5 bg-blue-50 text-blue-600 rounded-xl text-[13px] font-bold press-effect">
            정보 등록 제안하기
          </button>
        </div>
      ) : (
        <>
          {/* 건물 기본 정보 */}
          <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl px-4 py-3.5 card-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{bd.openTime}</span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <ParkingSquare size={14} className="text-blue-600" />
                <span className="text-[12px] text-gray-600">{bd.parkingInfo}</span>
              </div>
            </div>
          </div>

          {/* 층별 / 업종별 탭 */}
          <div className="mx-4 mb-3 bg-white rounded-2xl overflow-hidden card-shadow">
            <div className="flex border-b border-gray-100">
              {(["층별", "업종별"] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={cn(
                    "flex-1 h-11 text-[14px] font-semibold border-b-2 transition-colors press-effect",
                    detailTab === t ? "text-blue-600 border-blue-600" : "text-gray-400 border-transparent"
                  )}>
                  {t === "층별" ? "🏢 층별" : "🗂️ 업종별"}
                </button>
              ))}
            </div>

            {detailTab === "층별" ? (
              <>
                {/* 층 선택 */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {bd.floors.map((f, idx) => (
                    <button key={f.label} onClick={() => { setSelectedFloor(idx); setShowRestroomCode(false); }}
                      className={cn(
                        "shrink-0 w-12 h-10 rounded-xl text-[13px] font-bold press-effect transition-colors",
                        idx === selectedFloor ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      )}>
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* 화장실 */}
                {currentFloor && (
                  <div className="px-4 pb-2 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("w-2.5 h-2.5 rounded-full", currentFloor.hasRestroom ? "bg-blue-500" : "bg-gray-300")} />
                      <span className="text-[12px] text-gray-500">화장실 {currentFloor.hasRestroom ? "있음" : "없음"}</span>
                    </div>
                    {currentFloor.hasRestroom && currentFloor.restroomCode && (
                      <button onClick={() => setShowRestroomCode(!showRestroomCode)} className="flex items-center gap-1 press-effect">
                        <Lock size={12} className="text-blue-600" />
                        <span className="text-[12px] text-blue-600 font-medium">
                          비번 {showRestroomCode ? currentFloor.restroomCode : "보기"}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* 매장 리스트 */}
                <div className="divide-y divide-gray-50 pb-2">
                  {filteredByFloor.length === 0 ? (
                    <p className="text-[13px] text-gray-400 text-center py-6">매장 정보가 없습니다</p>
                  ) : filteredByFloor.map(store => (
                    <button key={store.id} onClick={() => setSelectedStore(store)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left">
                      <span className="text-xl shrink-0">{categoryEmoji[store.category]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-gray-900">{store.name}</p>
                        {store.hours && <p className="text-[12px] text-gray-400">{store.hours}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                          categoryColors[store.category].bg, categoryColors[store.category].text
                        )}>{store.category}</span>
                        {store.isOpen !== undefined && (
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            store.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          )}>{store.isOpen ? "영업중" : "종료"}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* 업종 필터 */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                  {(["전체", ...allCategories] as (StoreCategory | "전체")[]).map(cat => (
                    <button key={cat} onClick={() => setSelectedCat(cat)}
                      className={cn(
                        "shrink-0 h-8 px-3 rounded-xl text-[12px] font-semibold press-effect transition-colors",
                        selectedCat === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                      )}>
                      {cat === "전체" ? "전체" : `${categoryEmoji[cat]} ${cat}`}
                    </button>
                  ))}
                </div>

                {/* 매장 리스트 */}
                <div className="divide-y divide-gray-50 pb-2">
                  {filteredByCat.length === 0 ? (
                    <p className="text-[13px] text-gray-400 text-center py-6">해당 업종 매장이 없습니다</p>
                  ) : filteredByCat.map(store => {
                    const floorLabel = bd.floors.find(f => f.stores.some(s => s.id === store.id))?.label ?? "";
                    return (
                      <button key={store.id} onClick={() => setSelectedStore(store)}
                        className="w-full px-4 py-3.5 flex items-center gap-3 active:bg-gray-50 transition-colors text-left">
                        <span className="text-xl shrink-0">{categoryEmoji[store.category]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-gray-900">{store.name}</p>
                          {store.hours && <p className="text-[12px] text-gray-400">{store.hours}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                            categoryColors[store.category].bg, categoryColors[store.category].text
                          )}>{store.category}</span>
                          <span className="text-[11px] text-gray-400 font-medium">{floorLabel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {selectedStore && (
        <StoreDetailSheet store={selectedStore} onClose={() => setSelectedStore(null)} />
      )}

      <BottomNav />
    </div>
  );
}

// ─── 지도 모드 ───────────────────────────────────────────────
function MapView({
  buildings: bldgs,
  onSelectBuilding,
}: {
  buildings: typeof ALL_BUILDINGS;
  onSelectBuilding: (id: string) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hovered = bldgs.find(b => b.id === hoveredId);

  return (
    <div className="mx-4 mt-4 mb-3">
      {/* 지도 컨테이너 */}
      <div
        className="relative w-full rounded-2xl overflow-hidden card-shadow"
        style={{
          paddingBottom: "95%",
          background: "linear-gradient(135deg, #e8f4f8 0%, #d4ecd4 50%, #e8f0e8 100%)",
        }}
      >
        {/* 도로 표시 (SVG) */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* 주요 도로 */}
          <line x1="0" y1="28" x2="100" y2="28" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="0" y1="55" x2="100" y2="55" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="30" y1="0" x2="30" y2="100" stroke="#CBD5E1" strokeWidth="1.5" />
          <line x1="65" y1="0" x2="65" y2="100" stroke="#CBD5E1" strokeWidth="1.5" />
          {/* 보조 도로 */}
          <line x1="0" y1="70" x2="100" y2="70" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3,2" />
          <line x1="50" y1="0" x2="50" y2="100" stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3,2" />
          {/* 지역 레이블 */}
          <text x="5" y="14" fontSize="3.5" fill="#94A3B8" fontWeight="600">마전동</text>
          <text x="38" y="14" fontSize="3.5" fill="#94A3B8" fontWeight="600">원당동</text>
          <text x="70" y="14" fontSize="3.5" fill="#94A3B8" fontWeight="600">왕길동</text>
          <text x="5" y="45" fontSize="3.5" fill="#94A3B8" fontWeight="600">당하동</text>
          <text x="38" y="45" fontSize="3.5" fill="#94A3B8" fontWeight="600">불로동</text>
          <text x="5" y="84" fontSize="3.5" fill="#94A3B8" fontWeight="600">구도심</text>
        </svg>

        {/* 건물 마커 */}
        {bldgs.map(b => {
          const { x, y } = toMapXY(b.lat, b.lng);
          const isHovered = hoveredId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => {
                if (isHovered) onSelectBuilding(b.id);
                else setHoveredId(b.id);
              }}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -100%)",
                zIndex: isHovered ? 20 : 10,
              }}
            >
              {/* 말풍선 (hover 시) */}
              {isHovered && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none shadow-lg">
                  {b.name}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: "4px solid #111827",
                  }} />
                </div>
              )}
              {/* 핀 */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all",
                b.hasData
                  ? isHovered ? "bg-blue-700 scale-110" : "bg-blue-600"
                  : isHovered ? "bg-orange-500 scale-110" : "bg-orange-400"
              )}>
                <Building2 size={14} className="text-white" />
              </div>
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 px-1 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600" />
          <span className="text-[11px] text-gray-500">상세 정보 있음</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-orange-400" />
          <span className="text-[11px] text-gray-500">기본 정보</span>
        </div>
        <span className="text-[11px] text-gray-400 ml-auto">핀 탭 → 한 번 더 탭으로 이동</span>
      </div>

      {/* 선택된 건물 정보 */}
      {hovered && (
        <div className="mt-3 bg-white rounded-2xl px-4 py-3.5 card-shadow flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            hovered.hasData ? "bg-blue-50" : "bg-orange-50"
          )}>
            <Building2 size={18} className={hovered.hasData ? "text-blue-600" : "text-orange-500"} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-900 truncate">{hovered.name}</p>
            <p className="text-[12px] text-gray-400 truncate">{hovered.address}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{hovered.floors}층 · 약 {hovered.stores}개 매장</p>
          </div>
          <button
            onClick={() => onSelectBuilding(hovered.id)}
            className="shrink-0 h-9 px-4 bg-blue-600 text-white rounded-xl text-[12px] font-bold press-effect"
          >
            매장 보기
          </button>
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function StoresPage() {
  const [viewMode, setViewMode] = useState<"리스트" | "지도">("리스트");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => { setUserPos({ lat: 37.5446, lng: 126.6861 }); setLocationLoading(false); },
      { timeout: 8000 }
    );
  }, []);

  const buildingsWithDist = useMemo(() => {
    const base = userPos ?? { lat: 37.5446, lng: 126.6861 };
    return ALL_BUILDINGS
      .map(b => ({ ...b, km: haversineKm(base.lat, base.lng, b.lat, b.lng) }))
      .sort((a, b) => a.km - b.km);
  }, [userPos]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return buildingsWithDist;
    const q = searchQuery.trim().toLowerCase();
    return buildingsWithDist.filter(b =>
      b.name.includes(q) || b.address.includes(q)
    );
  }, [buildingsWithDist, searchQuery]);

  // 건물 상세 뷰
  if (selectedBuildingId) {
    return (
      <BuildingDetail
        buildingId={selectedBuildingId}
        onBack={() => setSelectedBuildingId(null)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="상가 지도" showNotification />

      {/* 검색 + 뷰 토글 */}
      <div className="bg-white px-4 pt-3 pb-3 sticky top-[56px] z-20 border-b border-gray-100">
        {/* 검색창 */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-11 mb-3">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="상가 건물 검색..."
            className="flex-1 bg-transparent text-[14px] text-gray-800 placeholder-gray-400 outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="press-effect">
              <X size={15} className="text-gray-400" />
            </button>
          )}
        </div>

        {/* 뷰 토글 */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("리스트")}
            className={cn(
              "flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold press-effect transition-colors",
              viewMode === "리스트" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
            )}
          >
            <List size={14} />
            리스트 모두
          </button>
          <button
            onClick={() => setViewMode("지도")}
            className={cn(
              "flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[13px] font-semibold press-effect transition-colors",
              viewMode === "지도" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
            )}
          >
            <MapIcon size={14} />
            지도 모두
          </button>
        </div>
      </div>

      {/* 위치 표시 */}
      {(userPos || locationLoading) && (
        <div className="px-4 py-2 flex items-center gap-1.5">
          <Navigation size={12} className="text-blue-500" />
          <span className="text-[12px] text-gray-400">
            {locationLoading ? "위치 확인 중..." : "내 위치 기준 거리순"}
          </span>
        </div>
      )}

      {/* ── 지도 모드 ── */}
      {viewMode === "지도" && (
        <MapView
          buildings={filtered}
          onSelectBuilding={id => setSelectedBuildingId(id)}
        />
      )}

      {/* ── 리스트 모드 ── */}
      {viewMode === "리스트" && (
        <div className="mx-4 mt-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl card-shadow">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-gray-500 text-[14px]">검색 결과가 없습니다</p>
            </div>
          ) : filtered.map(b => (
            <button
              key={b.id}
              onClick={() => setSelectedBuildingId(b.id)}
              className="w-full bg-white rounded-2xl px-4 py-3.5 card-shadow press-effect flex items-center gap-3 text-left"
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                b.hasData ? "bg-blue-50" : "bg-gray-100"
              )}>
                <Building2 size={20} className={b.hasData ? "text-blue-600" : "text-gray-400"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[14px] font-bold text-gray-900 truncate">{b.name}</p>
                  {b.hasData && (
                    <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">지도</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={10} className="text-gray-400" />
                  <p className="text-[12px] text-gray-400 truncate">{b.address}</p>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{b.floors}층 · 약 {b.stores}개 매장</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[14px] font-bold text-blue-600">{distLabel(b.km)}</p>
                <ChevronRight size={16} className="text-gray-300 mt-1 ml-auto" />
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
