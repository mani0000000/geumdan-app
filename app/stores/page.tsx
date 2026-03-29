"use client";

import { useState, useEffect, useMemo } from "react";
import {
  MapPin, Phone, Clock, Lock, ParkingSquare,
  ChevronLeft, ChevronRight, X, Info, Pencil,
  CheckCircle2, Navigation, Building2, ChevronDown
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { buildings } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import type { Store, StoreCategory, Floor } from "@/lib/types";

const categoryColors: Record<StoreCategory, { bg: string; text: string; dot: string }> = {
  카페:       { bg: "bg-amber-100",   text: "text-amber-800",   dot: "#F59E0B" },
  음식점:     { bg: "bg-orange-100",  text: "text-orange-800",  dot: "#F97316" },
  편의점:     { bg: "bg-blue-100",    text: "text-blue-800",    dot: "#3B82F6" },
  "병원/약국": { bg: "bg-red-100",    text: "text-red-800",     dot: "#EF4444" },
  미용:       { bg: "bg-pink-100",    text: "text-pink-800",    dot: "#EC4899" },
  학원:       { bg: "bg-purple-100",  text: "text-purple-800",  dot: "#8B5CF6" },
  마트:       { bg: "bg-green-100",   text: "text-green-800",   dot: "#10B981" },
  기타:       { bg: "bg-gray-100",    text: "text-gray-700",    dot: "#9CA3AF" },
};

const categoryEmoji: Record<StoreCategory, string> = {
  카페: "☕",
  음식점: "🍽️",
  편의점: "🏪",
  "병원/약국": "💊",
  미용: "💇",
  학원: "📚",
  마트: "🛒",
  기타: "🏢",
};

// 주변 상가건물 목 데이터 (내 위치 기반 거리 계산용)
const NEARBY_BUILDINGS = [
  { id: "b1",  name: "롯데마트 검단점",         address: "인천 서구 원당대로 581 (마전동)",  lat: 37.5485, lng: 126.6848, floors: 3, stores: 22, hasData: true },
  { id: "nb2", name: "JS프라자2 메디컬",        address: "인천 서구 완정로 14 (마전동)",     lat: 37.5505, lng: 126.6828, floors: 6, stores: 15, hasData: false },
  { id: "nb3", name: "코벤트워크 검단",         address: "인천 서구 이음대로 392 (원당동)",  lat: 37.5441, lng: 126.6875, floors: 5, stores: 30, hasData: false },
  { id: "nb4", name: "검단탑종합병원",          address: "인천 서구 청마로19번길 5",         lat: 37.5463, lng: 126.6812, floors: 7, stores: 18, hasData: false },
  { id: "nb5", name: "금강프라자 검단아라",     address: "인천 서구 이음대로 475 (원당동)",  lat: 37.5449, lng: 126.6895, floors: 4, stores: 14, hasData: false },
  { id: "nb6", name: "검단사거리 상가",         address: "인천 서구 검단로 480 (왕길동)",    lat: 37.5390, lng: 126.6941, floors: 3, stores: 20, hasData: false },
  { id: "nb7", name: "당하 웰스트리트",         address: "인천 서구 당하로 83 (당하동)",     lat: 37.5461, lng: 126.6876, floors: 4, stores: 16, hasData: false },
  { id: "nb8", name: "마전역 근린상가",         address: "인천 서구 원당대로 491 (마전동)",  lat: 37.5472, lng: 126.6840, floors: 3, stores: 11, hasData: false },
];

function StoreUnit({
  store,
  onSelect,
  isSelected,
}: {
  store: Store;
  onSelect: (s: Store) => void;
  isSelected: boolean;
}) {
  const colors = categoryColors[store.category];
  const isVacant = store.name === "공실";

  return (
    <g
      onClick={() => !isVacant && onSelect(store)}
      style={{
        cursor: isVacant ? "default" : "pointer",
      }}
    >
      <rect
        x={`${store.x}%`}
        y={`${store.y}%`}
        width={`${store.w}%`}
        height={`${store.h}%`}
        rx="4"
        fill={isVacant ? "#F9FAFB" : isSelected ? "#DBEAFE" : "white"}
        stroke={isSelected ? "#2563EB" : isVacant ? "#E5E7EB" : "#E5E7EB"}
        strokeWidth={isSelected ? 2 : 1}
      />
      {/* Color indicator */}
      {!isVacant && (
        <rect
          x={`${store.x}%`}
          y={`${store.y}%`}
          width={`${store.w}%`}
          height="3%"
          rx="4"
          fill={colors.dot}
          opacity={0.8}
        />
      )}
      {/* Store name */}
      <foreignObject
        x={`${store.x + 1}%`}
        y={`${store.y + 4}%`}
        width={`${store.w - 2}%`}
        height={`${store.h - 5}%`}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            textAlign: "center",
          }}
        >
          {!isVacant && (
            <span style={{ fontSize: "14px", lineHeight: 1 }}>
              {categoryEmoji[store.category]}
            </span>
          )}
          <span
            style={{
              fontSize: "9px",
              fontWeight: isVacant ? 400 : 600,
              color: isVacant ? "#9CA3AF" : "#1F2937",
              lineHeight: 1.2,
              marginTop: "2px",
              wordBreak: "keep-all",
            }}
          >
            {store.name}
          </span>
          {store.isOpen === false && !isVacant && (
            <span style={{ fontSize: "8px", color: "#EF4444", marginTop: "1px" }}>
              영업종료
            </span>
          )}
        </div>
      </foreignObject>
    </g>
  );
}

function FloorMap({
  floor,
  selectedStore,
  onSelectStore,
}: {
  floor: Floor;
  selectedStore: Store | null;
  onSelectStore: (s: Store) => void;
}) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 100"
        className="w-full"
        style={{ aspectRatio: "1.4 / 1" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect x="0" y="0" width="100" height="100" fill="#F3F4F6" />

        {/* Floor boundary */}
        <rect
          x="3"
          y="3"
          width="94"
          height="94"
          rx="3"
          fill="#F9FAFB"
          stroke="#D1D5DB"
          strokeWidth="1"
        />

        {/* Restroom indicator */}
        {floor.hasRestroom && (
          <g>
            <rect x="44" y="44" width="12" height="12" rx="2" fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.5" />
            <text x="50" y="52" textAnchor="middle" fontSize="6" fill="#2563EB" fontWeight="bold">
              WC
            </text>
          </g>
        )}

        {/* Stores */}
        {floor.stores.map((store) => (
          <StoreUnit
            key={store.id}
            store={store}
            isSelected={selectedStore?.id === store.id}
            onSelect={onSelectStore}
          />
        ))}
      </svg>
    </div>
  );
}

function StoreDetailSheet({
  store,
  onClose,
}: {
  store: Store;
  onClose: () => void;
}) {
  const colors = categoryColors[store.category];
  const [suggestSent, setSuggestSent] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full max-w-[430px] mx-auto bg-white rounded-t-2xl overflow-hidden"
        style={{ maxHeight: "70dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pt-4 pb-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", colors.bg, colors.text)}>
                  {store.category}
                </span>
                {store.isOpen !== undefined && (
                  <span className={cn(
                    "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                    store.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {store.isOpen ? "영업 중" : "영업 종료"}
                  </span>
                )}
              </div>
              <h2 className="text-[20px] font-bold text-gray-900">{store.name}</h2>
            </div>
            <button onClick={onClose} className="press-effect">
              <X size={22} className="text-gray-500" />
            </button>
          </div>

          {/* Info */}
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
                  <a href={`tel:${store.phone}`} className="text-[14px] text-blue-600 font-medium">
                    {store.phone}
                  </a>
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

          {/* Suggest Edit */}
          <div className="mt-5">
            {!suggestSent ? (
              <button
                onClick={() => setSuggestSent(true)}
                className="w-full h-11 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[13px] text-gray-600 font-medium press-effect"
              >
                <Pencil size={15} className="text-gray-500" />
                정보 수정 제안하기
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

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
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

export default function StoresPage() {
  const building = buildings[0];
  const [currentFloorIdx, setCurrentFloorIdx] = useState(1); // default 1F
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showRestroomCode, setShowRestroomCode] = useState(false);
  const [showNearby, setShowNearby] = useState(true);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const floor = building.floors[currentFloorIdx];
  const totalFloors = building.floors.length;

  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocationLoading(false); },
      () => { setUserPos({ lat: 37.5446, lng: 126.6861 }); setLocationLoading(false); },
      { timeout: 8000 }
    );
  }, []);

  const nearbyWithDist = useMemo(() => {
    const base = userPos ?? { lat: 37.5446, lng: 126.6861 };
    return NEARBY_BUILDINGS
      .map(b => ({ ...b, km: haversineKm(base.lat, base.lng, b.lat, b.lng) }))
      .sort((a, b) => a.km - b.km);
  }, [userPos]);

  const goFloor = (dir: "up" | "down") => {
    const next = dir === "up" ? currentFloorIdx - 1 : currentFloorIdx + 1;
    if (next >= 0 && next < totalFloors) {
      setCurrentFloorIdx(next);
      setSelectedStore(null);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="상가 지도" showNotification />

      {/* 내 주변 상가건물 */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl overflow-hidden card-shadow">
        <button
          onClick={() => setShowNearby(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3.5 press-effect">
          <div className="flex items-center gap-2">
            <Navigation size={15} className="text-blue-600" />
            <span className="text-[15px] font-bold text-gray-900">내 주변 상가건물</span>
            {userPos && !locationLoading && (
              <span className="text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">위치 확인됨</span>
            )}
            {locationLoading && (
              <span className="text-[11px] text-gray-400">위치 확인 중...</span>
            )}
          </div>
          <ChevronDown size={16} className={cn("text-gray-400 transition-transform", showNearby && "rotate-180")} />
        </button>
        {showNearby && (
          <div className="divide-y divide-gray-100">
            {nearbyWithDist.map(nb => (
              <div key={nb.id} className="px-4 py-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">{nb.name}</p>
                    {nb.hasData && (
                      <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full shrink-0">지도</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin size={10} className="text-gray-400" />
                    <p className="text-[12px] text-gray-400 truncate">{nb.address}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[14px] font-bold text-blue-600">{distLabel(nb.km)}</p>
                  <p className="text-[11px] text-gray-400">{nb.floors}층 · {nb.stores}개</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Building Info */}
      <div className="mx-4 mt-4 mb-3 bg-white rounded-2xl px-4 py-3.5 card-shadow">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-gray-900">{building.name}</h2>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={12} className="text-gray-400" />
              <span className="text-[12px] text-gray-500">{building.address}</span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">
            {building.openTime}
          </span>
        </div>
        <div className="flex gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <ParkingSquare size={14} className="text-blue-600" />
            <span className="text-[12px] text-gray-600">{building.parkingInfo}</span>
          </div>
        </div>
      </div>

      {/* Floor Map Section */}
      <div className="mx-4 bg-white rounded-2xl overflow-hidden card-shadow mb-3">
        {/* Floor Selector */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={() => goFloor("up")}
            disabled={currentFloorIdx === 0}
            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center press-effect disabled:opacity-30"
          >
            <ChevronLeft size={18} className="text-gray-700" />
          </button>

          <div className="flex items-center gap-2">
            {building.floors.map((f, idx) => (
              <button
                key={f.label}
                onClick={() => { setCurrentFloorIdx(idx); setSelectedStore(null); }}
                className={cn(
                  "w-10 h-10 rounded-xl text-[13px] font-bold press-effect transition-colors",
                  idx === currentFloorIdx
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => goFloor("down")}
            disabled={currentFloorIdx === totalFloors - 1}
            className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center press-effect disabled:opacity-30"
          >
            <ChevronRight size={18} className="text-gray-700" />
          </button>
        </div>

        {/* Map */}
        <div className="p-3">
          <FloorMap
            floor={floor}
            selectedStore={selectedStore}
            onSelectStore={setSelectedStore}
          />
        </div>

        {/* Floor amenities */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full",
              floor.hasRestroom ? "bg-blue-500" : "bg-gray-300"
            )} />
            <span className="text-[12px] text-gray-600">
              화장실 {floor.hasRestroom ? "있음" : "없음"}
            </span>
          </div>
          {floor.hasRestroom && floor.restroomCode && (
            <button
              onClick={() => setShowRestroomCode(!showRestroomCode)}
              className="flex items-center gap-1 press-effect"
            >
              <Lock size={13} className="text-blue-600" />
              <span className="text-[12px] text-blue-600 font-medium">
                비번 {showRestroomCode ? floor.restroomCode : "보기"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Category Legend */}
      <div className="mx-4 mb-4 bg-white rounded-2xl px-4 py-3.5 card-shadow">
        <p className="text-[12px] font-semibold text-gray-600 mb-2.5">범례</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(categoryColors) as StoreCategory[]).map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: categoryColors[cat].dot }}
              />
              <span className="text-[11px] text-gray-600 truncate">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Store List for current floor */}
      <div className="mx-4 mb-4">
        <p className="text-[14px] font-bold text-gray-900 mb-2.5">
          {floor.label} 매장 목록
        </p>
        <div className="space-y-2">
          {floor.stores
            .filter((s) => s.name !== "공실")
            .map((store) => (
            <div
              key={store.id}
              className={cn(
                "bg-white rounded-xl px-4 py-3 card-shadow press-effect flex items-center justify-between",
                selectedStore?.id === store.id && "ring-2 ring-blue-500"
              )}
              onClick={() => setSelectedStore(store)}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{categoryEmoji[store.category]}</span>
                <div>
                  <p className="text-[14px] font-semibold text-gray-900">{store.name}</p>
                  {store.hours && (
                    <p className="text-[12px] text-gray-400">{store.hours}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  store.isOpen !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                )}>
                  {store.isOpen !== false ? "영업 중" : "영업 종료"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store Detail Sheet */}
      {selectedStore && selectedStore.name !== "공실" && (
        <StoreDetailSheet
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}
