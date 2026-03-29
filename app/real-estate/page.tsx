"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp, TrendingDown, MapPin, Search,
  Plus, X, Phone, ChevronUp, ChevronDown, Star,
  Building2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { apartments, listings, myHomes as initialMyHomes } from "@/lib/mockData";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Apartment, MyHome, Listing, ListingType } from "@/lib/types";

const dongs = ["전체", "당하동", "불로동", "마전동", "왕길동"];
type MainTab = "실거래" | "매물" | "전월세";

// ---------- Custom Tooltip ----------
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 rounded-lg px-3 py-2">
      <p className="text-gray-400 text-[11px]">{label}</p>
      <p className="text-white text-[13px] font-bold">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// ---------- My Home Card — gradient style ----------
function MyHomeCard({ home, onRemove }: { home: MyHome; onRemove: () => void }) {
  const diff = home.currentPrice - home.prevPrice;
  const gradients: Record<string, string> = {
    "내 집":    "from-emerald-500 to-teal-500",
    "관심 매물": "from-blue-500 to-indigo-500",
    "투자 관심": "from-purple-500 to-violet-500",
  };
  const grad = gradients[home.label] ?? gradients["관심 매물"];

  return (
    <div className={`relative shrink-0 w-[168px] bg-gradient-to-br ${grad} rounded-2xl p-4`}>
      <button
        onClick={onRemove}
        className="absolute top-2.5 right-2.5 w-5 h-5 bg-white/20 rounded-full flex items-center justify-center"
      >
        <X size={10} className="text-white" />
      </button>
      <span className="text-white/70 text-[10px] font-semibold">{home.label}</span>
      <p className="text-white text-[20px] font-black mt-1.5 leading-tight">
        {formatPrice(home.currentPrice)}
      </p>
      <p className="text-white/80 text-[12px] mt-1 leading-snug line-clamp-2">{home.aptName}</p>
      <p className="text-white/55 text-[11px] mt-0.5">{home.dong} · {home.pyeong}평 {home.floor}층</p>
      <div className="mt-2 flex items-center gap-1">
        {diff > 0 ? (
          <>
            <TrendingUp size={11} className="text-white" />
            <span className="text-white text-[11px] font-semibold">▲ {diff.toLocaleString()}만</span>
          </>
        ) : diff < 0 ? (
          <>
            <TrendingDown size={11} className="text-white" />
            <span className="text-white text-[11px] font-semibold">▼ {Math.abs(diff).toLocaleString()}만</span>
          </>
        ) : (
          <span className="text-white/55 text-[11px]">보합</span>
        )}
      </div>
    </div>
  );
}

// ---------- Add Modal ----------
function AddHomeModal({ onClose, onAdd, existing }: {
  onClose: () => void; onAdd: (home: MyHome) => void; existing: string[];
}) {
  const [step, setStep] = useState<"select" | "detail">("select");
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null);
  const [selectedPyeong, setSelectedPyeong] = useState(0);
  const [floor, setFloor] = useState("10");
  const [label, setLabel] = useState("관심 매물");

  function handleConfirm() {
    if (!selectedApt) return;
    const sz = selectedApt.sizes[selectedPyeong];
    const history = sz.priceHistory;
    onAdd({
      id: `mh_${Date.now()}`,
      aptId: selectedApt.id,
      aptName: selectedApt.name,
      dong: selectedApt.dong,
      pyeong: sz.pyeong,
      floor: parseInt(floor) || 10,
      label,
      currentPrice: history[history.length - 1].price,
      prevPrice: history[history.length - 2]?.price ?? history[history.length - 1].price,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full bg-white rounded-t-3xl px-5 py-6 pb-10" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        {step === "select" ? (
          <>
            <p className="text-[16px] font-bold text-gray-900 mb-4">단지 선택</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {apartments.map((apt) => (
                <button key={apt.id}
                  onClick={() => { setSelectedApt(apt); setStep("detail"); }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border transition-colors",
                    existing.includes(apt.id)
                      ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 active:bg-gray-50"
                  )}
                  disabled={existing.includes(apt.id)}
                >
                  <p className="text-[14px] font-semibold text-gray-900">{apt.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">{apt.dong} · {apt.built}년 · {apt.households.toLocaleString()}세대</p>
                  {existing.includes(apt.id) && <span className="text-[11px] text-gray-400">이미 추가됨</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep("select")} className="flex items-center gap-1 text-blue-600 text-[13px] mb-4">← 다시 선택</button>
            <p className="text-[16px] font-bold text-gray-900 mb-1">{selectedApt?.name}</p>
            <p className="text-[12px] text-gray-400 mb-4">{selectedApt?.dong}</p>
            <div className="space-y-4">
              <div>
                <p className="text-[12px] font-semibold text-gray-600 mb-2">평형</p>
                <div className="flex gap-2">
                  {selectedApt?.sizes.map((sz, i) => (
                    <button key={i} onClick={() => setSelectedPyeong(i)}
                      className={cn("px-4 py-2 rounded-xl text-[13px] font-semibold border transition-colors",
                        selectedPyeong === i ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-100"
                      )}>
                      {sz.pyeong}평
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-600 mb-2">층수</p>
                <input type="number" value={floor} onChange={(e) => setFloor(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] focus:outline-none focus:border-blue-400"
                  placeholder="층수 입력" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-600 mb-2">구분</p>
                <div className="flex gap-2">
                  {["내 집", "관심 매물", "투자 관심"].map((l) => (
                    <button key={l} onClick={() => setLabel(l)}
                      className={cn("px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors",
                        label === l ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-100"
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleConfirm}
              className="w-full mt-6 bg-blue-600 text-white rounded-2xl py-3.5 text-[15px] font-bold">
              추가하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Apartment Card ----------
function ApartmentCard({ apt, isSelected, onClick, filterPyeong }: {
  apt: Apartment; isSelected: boolean; onClick: () => void; filterPyeong: string;
}) {
  const displaySize = filterPyeong !== "전체"
    ? apt.sizes.find(s => String(s.pyeong) + "평" === filterPyeong) ?? apt.sizes[0]
    : apt.sizes[0];
  const history = displaySize.priceHistory;
  const prev = history[history.length - 2]?.price ?? history[history.length - 1].price;
  const curr = history[history.length - 1].price;
  const diff = curr - prev;

  return (
    <div className={cn("bg-white rounded-2xl overflow-hidden transition-all shadow-sm", isSelected && "ring-2 ring-blue-500")}
      onClick={onClick}>
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[15px] font-bold text-gray-900">{apt.name}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <MapPin size={12} className="text-gray-400 shrink-0" />
              <span className="text-[12px] text-gray-400">{apt.dong}</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.built}년</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.households.toLocaleString()}세대</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[16px] font-black text-emerald-600">{formatPrice(curr)}</p>
            <p className="text-[11px] text-gray-400">{displaySize.pyeong}평 평균</p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          {apt.sizes.map((sz, i) => (
            <div key={i} className={cn("rounded-xl px-3 py-2 text-center",
              filterPyeong !== "전체" && String(sz.pyeong) + "평" === filterPyeong
                ? "bg-blue-50 ring-1 ring-blue-200" : "bg-gray-50"
            )}>
              <p className="text-[12px] font-semibold text-gray-700">{sz.pyeong}평</p>
              <p className="text-[11px] text-emerald-600 font-bold">{formatPrice(sz.avgPrice)}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-500">전월 대비</span>
            {diff === 0 ? (
              <span className="text-[11px] text-gray-400">보합</span>
            ) : diff > 0 ? (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
                <TrendingUp size={11} />▲ {diff.toLocaleString()}만
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-500">
                <TrendingDown size={11} />▼ {Math.abs(diff).toLocaleString()}만
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[12px] text-gray-400">
            {isSelected ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>시세 추이</span>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="border-t border-gray-100 px-2 pt-2 pb-3">
          <p className="text-[12px] font-semibold text-gray-600 px-2 mb-2">시세 추이 ({displaySize.pyeong}평)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={history} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(2)} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}억`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#10B981" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ---------- Listing Card ----------
function ListingCard({ listing, onCall }: { listing: Listing; onCall: () => void }) {
  const [expanded, setExpanded] = useState(false);

  function priceLabel() {
    if (listing.type === "월세") return `${formatPrice(listing.price)} / ${listing.monthlyRent?.toLocaleString()}만`;
    return formatPrice(listing.price);
  }

  const typeColor: Record<ListingType, string> = {
    매매: "bg-red-50 text-red-600", 전세: "bg-blue-50 text-blue-600", 월세: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", typeColor[listing.type])}>{listing.type}</span>
              {listing.isNew && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">NEW</span>}
            </div>
            <p className="text-[15px] font-bold text-gray-900">{listing.aptName}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {listing.dong} · {listing.pyeong}평({listing.sqm}㎡) · {listing.floor}/{listing.totalFloors}층 · {listing.direction}
            </p>
          </div>
          <div className="text-right shrink-0">
            {listing.type === "월세" && <p className="text-[10px] text-gray-400 mb-0.5">보증금/월세</p>}
            <p className="text-[16px] font-black text-gray-900">{priceLabel()}</p>
            <p className="text-[10px] text-gray-400">{listing.listedAt.slice(5)} 등록</p>
          </div>
        </div>
        {listing.features.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {listing.features.map((f) => (
              <span key={f} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1 text-[12px] text-gray-500">
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "접기" : "상세 보기"}
          </button>
          <button onClick={onCall}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[12px] font-semibold">
            <Phone size={12} />{listing.agencyName}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-[13px] text-gray-700 leading-relaxed">{listing.description}</p>
          <p className="text-[12px] text-gray-400 mt-2">📞 {listing.agencyPhone}</p>
        </div>
      )}
    </div>
  );
}

// ---------- Sub-filter row ----------
function FilterRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5">
      <span className="text-[11px] font-semibold text-gray-400 shrink-0 w-7">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {options.map((opt) => (
          <button key={opt} onClick={() => onChange(opt)}
            className={cn("shrink-0 h-7 px-3 rounded-full text-[12px] font-medium transition-colors",
              value === opt ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
            )}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Main Page ----------
export default function RealEstatePage() {
  const [myHomes, setMyHomes] = useState<MyHome[]>(initialMyHomes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("실거래");
  const [activeDong, setActiveDong] = useState("전체");
  const [filterApt, setFilterApt] = useState("전체");
  const [filterPyeong, setFilterPyeong] = useState("전체");
  const [filterType, setFilterType] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApt, setSelectedApt] = useState<string | null>(null);

  // Derived filter options
  const aptOptions = useMemo(() => ["전체", ...apartments.map((a) => a.name)], []);
  const pyeongOptions = useMemo(() => {
    const set = new Set(apartments.flatMap((a) => a.sizes.map((s) => s.pyeong)));
    return ["전체", ...[...set].sort((a, b) => a - b).map((p) => `${p}평`)];
  }, []);
  const typeOptions = ["전체", "매매", "전세", "월세"];

  // Filtered apartments
  const filteredApts = useMemo(() => apartments.filter((a) => {
    if (activeDong !== "전체" && a.dong !== activeDong) return false;
    if (filterApt !== "전체" && a.name !== filterApt) return false;
    if (filterPyeong !== "전체" && !a.sizes.some((s) => `${s.pyeong}평` === filterPyeong)) return false;
    if (searchQuery && !a.name.includes(searchQuery) && !a.dong.includes(searchQuery)) return false;
    return true;
  }), [activeDong, filterApt, filterPyeong, searchQuery]);

  // Filtered listings
  const filteredListings = useMemo(() => listings.filter((l) => {
    if (activeDong !== "전체" && l.dong !== activeDong) return false;
    if (filterApt !== "전체" && l.aptName !== filterApt) return false;
    if (filterPyeong !== "전체" && `${l.pyeong}평` !== filterPyeong) return false;
    if (filterType !== "전체" && l.type !== filterType) return false;
    if (searchQuery && !l.aptName.includes(searchQuery)) return false;
    if (mainTab === "매물" && l.type !== "매매") return false;
    if (mainTab === "전월세" && l.type === "매매") return false;
    return true;
  }), [activeDong, filterApt, filterPyeong, filterType, searchQuery, mainTab]);

  const avgPrice = Math.round(
    apartments.reduce((sum, a) => sum + (a.recentDeal?.price ?? 0), 0) / apartments.length
  );

  // Reset sub-filters when dong changes
  function handleDongChange(dong: string) {
    setActiveDong(dong);
    setFilterApt("전체");
  }

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-[70px]">
      <Header title="부동산 시세" showNotification />

      {/* 내 집 시세 */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-amber-400 fill-amber-400" />
            <p className="text-[14px] font-bold text-gray-900">내 집 시세</p>
          </div>
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-[12px] text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full">
            <Plus size={13} />단지 추가
          </button>
        </div>

        {myHomes.length === 0 ? (
          <button onClick={() => setShowAddModal(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2">
            <Building2 size={24} className="text-gray-300" />
            <p className="text-[13px] text-gray-400">내 집 또는 관심 단지를 추가해보세요</p>
          </button>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {myHomes.map((home) => (
              <MyHomeCard key={home.id} home={home}
                onRemove={() => setMyHomes((prev) => prev.filter((h) => h.id !== home.id))} />
            ))}
            <button onClick={() => setShowAddModal(true)}
              className="shrink-0 w-[72px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1.5">
              <Plus size={20} className="text-gray-300" />
              <span className="text-[11px] text-gray-400">추가</span>
            </button>
          </div>
        )}
      </div>

      {/* 검단 신도시 평균 실거래가 — 심플 버전 */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl px-4 py-3.5 mb-3 flex items-center justify-between">
        <div>
          <p className="text-emerald-100 text-[12px] font-medium">검단 신도시 평균 실거래가</p>
          <p className="text-white text-[26px] font-black mt-0.5">{formatPrice(avgPrice)}</p>
        </div>
        <div className="text-right">
          <span className="flex items-center justify-end gap-1 text-emerald-200 text-[13px] font-semibold">
            <TrendingUp size={14} />+1.2%
          </span>
          <p className="text-emerald-300 text-[11px] mt-1">전월 대비</p>
          <p className="text-emerald-300 text-[11px] mt-0.5">{apartments.length}개 단지 · {listings.length}건 매물</p>
        </div>
      </div>

      {/* Sticky 필터 영역 */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-gray-100">
        {/* 메인 탭 */}
        <div className="flex px-4 pt-3">
          {(["실거래", "매물", "전월세"] as MainTab[]).map((tab) => (
            <button key={tab} onClick={() => { setMainTab(tab); setFilterType("전체"); }}
              className={cn("flex-1 py-2 text-[14px] font-semibold border-b-2 transition-colors",
                mainTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"
              )}>
              {tab}
            </button>
          ))}
        </div>

        {/* 동네 필터 */}
        <div className="px-4 pt-2.5 pb-1 flex gap-2 overflow-x-auto scrollbar-hide">
          {dongs.map((dong) => (
            <button key={dong} onClick={() => handleDongChange(dong)}
              className={cn("shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium",
                activeDong === dong ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              )}>
              {dong}
            </button>
          ))}
        </div>

        {/* 하위 필터: 단지 */}
        <FilterRow label="단지" options={aptOptions} value={filterApt} onChange={setFilterApt} />

        {/* 하위 필터: 평수 */}
        <FilterRow label="평수" options={pyeongOptions} value={filterPyeong} onChange={setFilterPyeong} />

        {/* 하위 필터: 종류 (매물·전월세 탭에서만) */}
        {mainTab !== "실거래" && (
          <FilterRow
            label="종류"
            options={mainTab === "매물" ? ["전체", "매매"] : ["전체", "전세", "월세"]}
            value={filterType}
            onChange={setFilterType}
          />
        )}

        {/* 검색 */}
        <div className="px-4 pt-1.5 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
            <Search size={15} className="text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단지명 검색"
              className="flex-1 bg-transparent text-[13px] focus:outline-none text-gray-700 placeholder:text-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}><X size={14} className="text-gray-400" /></button>
            )}
          </div>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="px-4 pt-3 space-y-3">
        {mainTab === "실거래" && (
          <>
            {filteredApts.map((apt) => (
              <ApartmentCard key={apt.id} apt={apt} filterPyeong={filterPyeong}
                isSelected={selectedApt === apt.id}
                onClick={() => setSelectedApt(selectedApt === apt.id ? null : apt.id)} />
            ))}
            {filteredApts.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-2xl mb-2">🏠</p>
                <p className="text-gray-500 text-[14px]">검색된 단지가 없습니다</p>
              </div>
            )}
          </>
        )}

        {(mainTab === "매물" || mainTab === "전월세") && (
          <>
            <p className="text-[12px] text-gray-400 pt-1">총 {filteredListings.length}건</p>
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing}
                onCall={() => { window.location.href = `tel:${listing.agencyPhone}`; }} />
            ))}
            {filteredListings.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-2xl mb-2">🏘️</p>
                <p className="text-gray-500 text-[14px]">등록된 매물이 없습니다</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 유의사항 */}
      <div className="mx-4 my-4 bg-yellow-50 rounded-xl px-4 py-3">
        <p className="text-[12px] text-yellow-700 font-semibold">⚠️ 유의사항</p>
        <p className="text-[11px] text-yellow-600 mt-1 leading-relaxed">
          실거래가는 국토교통부 기준입니다. 매물 정보는 공인중개사 등록 기준이며 실제와 차이가 있을 수 있습니다.
          투자 결정 시 반드시 전문가와 상담하시기 바랍니다.
        </p>
      </div>

      <BottomNav />

      {showAddModal && (
        <AddHomeModal onClose={() => setShowAddModal(false)}
          onAdd={(home) => setMyHomes((prev) => [...prev, home])}
          existing={myHomes.map((h) => h.aptId)} />
      )}
    </div>
  );
}
