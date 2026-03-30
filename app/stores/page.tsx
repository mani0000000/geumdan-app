"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Phone, Clock, Lock,
  ChevronLeft, ChevronRight, X, Pencil, CheckCircle2,
  Search, Navigation, Building2, List, Map as MapIcon,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { buildings } from "@/lib/mockData";
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

// ─── 지도 좌표 변환 ──────────────────────────────────────────
const MAP_LAT_MIN = 37.5345, MAP_LAT_MAX = 37.5550;
const MAP_LNG_MIN = 126.6710, MAP_LNG_MAX = 126.6960;
function toMapXY(lat: number, lng: number) {
  return {
    x: ((lng - MAP_LNG_MIN) / (MAP_LNG_MAX - MAP_LNG_MIN)) * 100,
    y: 100 - ((lat - MAP_LAT_MIN) / (MAP_LAT_MAX - MAP_LAT_MIN)) * 100,
  };
}

// ─── 지도 뷰 ────────────────────────────────────────────────
function MapView({
  buildings: bList,
  selectedId,
  onSelect,
}: {
  buildings: typeof NEARBY_BUILDINGS;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mx-4 mt-3 mb-3 bg-white rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#F2F4F6]">
        <p className="text-[14px] font-bold text-[#191F28]">검단신도시 상가 지도</p>
        <p className="text-[12px] text-[#8B95A1] mt-0.5">핀을 눌러 매장 정보를 확인하세요</p>
      </div>
      <div className="relative bg-[#EEF2EE] overflow-hidden">
        <svg viewBox="0 0 100 67" className="w-full" style={{ aspectRatio: "1.5/1" }}>
          <rect width="100" height="67" fill="#EEF2EE" />
          {/* 도로 */}
          <rect x="0" y="30" width="100" height="4" fill="#D9DFD9" opacity="0.8" />
          <rect x="45" y="0" width="4" height="67" fill="#D9DFD9" opacity="0.8" />
          <rect x="20" y="0" width="2.5" height="67" fill="#E0E5E0" opacity="0.6" />
          <rect x="72" y="0" width="2.5" height="67" fill="#E0E5E0" opacity="0.6" />
          <text x="50" y="28.5" textAnchor="middle" fontSize="2.5" fill="#9CA3AF">검단로</text>
          <text x="43" y="16" textAnchor="middle" fontSize="2.2" fill="#9CA3AF" transform="rotate(-90,43,16)">아라로</text>
          {bList.map(nb => {
            const { x, y } = toMapXY(nb.lat, nb.lng);
            const isSel = selectedId === nb.id;
            return (
              <g key={nb.id} onClick={() => onSelect(nb.id)} style={{ cursor: "pointer" }}>
                <circle cx={`${x}`} cy={`${y}`} r={isSel ? "4.5" : "3.5"}
                  fill={isSel ? "#3182F6" : nb.hasData ? "#1B64DA" : "#8B95A1"}
                  stroke="white" strokeWidth="1" />
                <text x={`${x}`} y={`${y - 5.5}`} textAnchor="middle" fontSize="2.8" fill="#191F28" fontWeight="bold">
                  {nb.name.slice(0, 5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="px-4 py-2.5 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#1B64DA]" />
          <span className="text-[12px] text-[#4E5968]">지도 데이터 있음</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#8B95A1]" />
          <span className="text-[12px] text-[#8B95A1]">준비 중</span>
        </div>
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
  const [showNearby, setShowNearby] = useState(false);

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
          <MapView
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
        <div className="px-4 pt-4 pb-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Navigation size={13} className="text-[#3182F6]" />
            <span className="text-[13px] font-semibold text-[#4E5968]">내 주변 상가건물</span>
            {userPos && <span className="text-[11px] text-[#00C471] bg-[#D1FAE5] px-2 py-0.5 rounded-full">위치 확인됨</span>}
            {locationLoading && <span className="text-[11px] text-[#8B95A1]">위치 확인 중...</span>}
          </div>
          {nearbyWithDist.map(nb => (
            <button key={nb.id} onClick={() => setSelectedBuildingId(nb.id)}
              className="w-full bg-white rounded-2xl px-4 py-4 flex items-center gap-3 active:bg-[#F2F4F6] text-left shadow-sm">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${nb.hasData ? "bg-[#EBF3FE]" : "bg-[#F2F4F6]"}`}>
                <Building2 size={20} className={nb.hasData ? "text-[#3182F6]" : "text-[#8B95A1]"} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[16px] font-bold text-[#191F28] truncate">{nb.name}</p>
                  {nb.hasData && <span className="text-[11px] font-bold bg-[#3182F6] text-white px-1.5 py-0.5 rounded-full shrink-0">지도</span>}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin size={11} className="text-[#B0B8C1]" />
                  <p className="text-[13px] text-[#8B95A1] truncate">{nb.address}</p>
                </div>
                <p className="text-[12px] text-[#B0B8C1] mt-0.5">{nb.floors}층 건물 · 총 {nb.stores}개 매장</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[16px] font-bold text-[#3182F6]">{distLabel(nb.km)}</p>
                <ChevronRight size={16} className="text-[#B0B8C1] ml-auto mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && selected.name !== "공실" && (
        <StoreSheet store={selected} onClose={() => setSelected(null)}
          onDetail={() => { setSelected(null); router.push(`/stores/detail/?id=${selected.id}`); }} />
      )}
      <BottomNav />
    </div>
  );
}
