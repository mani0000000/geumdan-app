"use client";

import { useState, useEffect, useMemo } from "react";
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
import { apartments as mockApartments, listings, myHomes as initialMyHomes } from "@/lib/mockData";
import { fetchApartments } from "@/lib/db/apartments";
import { fetchRecentTransactions, type AptTransaction } from "@/lib/api/realEstate";
import { fetchRebWeeklyStats, type RebWeeklyStats } from "@/lib/api/rebApi";
import { fetchLatestPriceIndex, type PriceIndexRow } from "@/lib/db/priceIndex";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Apartment, MyHome, Listing, ListingType } from "@/lib/types";

import { LEGAL_DONGS } from "@/lib/geumdan";

// 백석동 = 아라지구 (아라1동/아라2동 행정동 지역)
const DONG_LABEL: Record<string, string> = { "백석동": "아라동(백석)" };
type MainTab = "매매" | "전월세";
type RentSubTab = "전체" | "전세" | "월세";

/** 30평대(30~39평) 우선, 없으면 마지막 사이즈 */
function getDefault30s(sizes: Apartment["sizes"]) {
  return sizes.find((s) => s.pyeong >= 30 && s.pyeong < 40) ?? sizes[sizes.length - 1];
}
/** 전세 시세 추정 (매매가 × 전세가율 60%) */
function estJeonse(avgPrice: number) {
  return Math.round(avgPrice * 0.60);
}
/** 월세 추정: 보증금 5,000만 + 월 (전세-5000) × 연6.5% / 12 */
function estWolse(avgPrice: number) {
  const jeonse = estJeonse(avgPrice);
  const deposit = 5000;
  const monthly = Math.max(30, Math.round((jeonse - deposit) * 0.065 / 12));
  return { deposit, monthly };
}

// ---------- MOLIT 아파트명 → apt ID 매핑 (실거래 데이터 병합용) ----------
const APT_NAME_MAP: Record<string, string> = {
  검단푸르지오더퍼스트: "apt1",
  검단SK뷰센트럴: "apt2",
  검단SK뷰: "apt2",
  검단한신더휴: "apt3",
  검단아이파크2단지: "apt4",
  검단아이파크: "apt4",
  검단롯데캐슬넥스티엘: "apt5",
  검단롯데캐슬: "apt5",
  검단e편한세상: "apt6",
  검단이편한세상: "apt6",
  검단파크자이1단지: "apt7",
  검단파크자이: "apt7",
  검단우미린에코뷰: "apt8",
  검단우미린: "apt8",
  검단신도시푸르지오더베뉴: "apt9",
  푸르지오더베뉴: "apt9",
  검단금호어울림센트럴: "apt10",
  금호어울림센트럴: "apt10",
  검암역로열파크씨티푸르지오1단지: "apt11",
  로열파크씨티푸르지오1단지: "apt11",
  검암역로열파크씨티푸르지오2단지: "apt12",
  로열파크씨티푸르지오2단지: "apt12",
  검단호반써밋1차: "apt13",
  검단호반써밋: "apt13",
  호반써밋검단: "apt13",
  검단신도시디에트르더힐: "apt14",
  디에트르더힐: "apt14",
  검단신도시예미지트리플에듀: "apt15",
  예미지트리플에듀: "apt15",
  검단한신더휴어반파크: "apt16",
  한신더휴어반파크: "apt16",
  제일풍경채검단1차: "apt17",
  풍경채검단: "apt17",
  왕길역로열파크씨티푸르지오: "apt18",
  왕길역로열파크씨티: "apt18",
};

function normalizeAptName(name: string) {
  return name.replace(/\s+/g, "").replace(/[·]/g, "").replace(/[()（）]/g, "");
}

function findAptId(rawName: string): string | null {
  const n = normalizeAptName(rawName);
  for (const [key, id] of Object.entries(APT_NAME_MAP)) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  return null;
}

/** 실거래 내역으로 avgPrice·recentDeal을 덮어씌운 apartment 배열 반환 */
function mergeTxIntoApartments(
  apts: Apartment[],
  txs: AptTransaction[]
): Apartment[] {
  if (!txs.length) return apts;

  // aptId:pyeong → prices[]
  const priceMap = new Map<string, number[]>();
  // aptId → latest tx
  const latestTxMap = new Map<string, AptTransaction>();

  for (const tx of txs) {
    const id = findAptId(tx.aptName);
    if (!id || !tx.price) continue;
    const key = `${id}:${tx.pyeong}`;
    if (!priceMap.has(key)) priceMap.set(key, []);
    priceMap.get(key)!.push(tx.price);
    const prev = latestTxMap.get(id);
    if (!prev || tx.dealDate > prev.dealDate) latestTxMap.set(id, tx);
  }

  return apts.map((apt) => {
    const sizes = apt.sizes.map((sz) => {
      const prices = priceMap.get(`${apt.id}:${sz.pyeong}`);
      if (!prices?.length) return sz;
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return { ...sz, avgPrice: avg };
    });
    const latestTx = latestTxMap.get(apt.id);
    const recentDeal = latestTx
      ? { price: latestTx.price, date: latestTx.dealDate, floor: latestTx.floor, pyeong: latestTx.pyeong }
      : apt.recentDeal;
    return { ...apt, sizes, recentDeal };
  });
}

// ---------- Price Change Tag ----------
function PriceChangeTag({ curr, prev }: { curr: number; prev: number }) {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-[12px] text-gray-400">보합</span>;
  const pct = ((Math.abs(diff) / prev) * 100).toFixed(1);
  return diff > 0 ? (
    <span className="flex items-center gap-0.5 text-[12px] font-semibold text-red-500">
      <TrendingUp size={11} />▲ {Math.abs(diff).toLocaleString()}만 ({pct}%)
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-[12px] font-semibold text-blue-500">
      <TrendingDown size={11} />▼ {Math.abs(diff).toLocaleString()}만 ({pct}%)
    </span>
  );
}

// ---------- Custom Tooltip ----------
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 rounded-lg px-3 py-2">
      <p className="text-gray-400 text-[12px]">{label}</p>
      <p className="text-white text-[14px] font-bold">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// ---------- My Home Card (horizontal scroll) ----------
function MyHomeCard({ home, onRemove }: { home: MyHome; onRemove: () => void }) {
  const diff = home.currentPrice - home.prevPrice;
  return (
    <div className="relative shrink-0 w-[160px] bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100">
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center"
      >
        <X size={11} className="text-gray-500" />
      </button>
      <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2"
        style={{ background: home.label === "내 집" ? "#EFF6FF" : "#F0FDF4", color: home.label === "내 집" ? "#3B82F6" : "#10B981" }}>
        {home.label}
      </span>
      <p className="text-[14px] font-bold text-gray-900 leading-tight line-clamp-2">{home.aptName}</p>
      <p className="text-[12px] text-gray-400 mt-0.5">{home.dong} · {home.pyeong}평 {home.floor}층</p>
      <p className="text-[16px] font-black text-emerald-600 mt-2">{formatPrice(home.currentPrice)}</p>
      <div className="mt-1">
        <PriceChangeTag curr={home.currentPrice} prev={home.prevPrice} />
      </div>
    </div>
  );
}

// ---------- Add Modal ----------
function AddHomeModal({
  onClose,
  onAdd,
  existing,
  apartments,
}: {
  onClose: () => void;
  onAdd: (home: MyHome) => void;
  existing: string[];
  apartments: Apartment[];
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
    <div
      className="fixed inset-0 z-[300] flex items-end bg-black/40"
      onPointerDown={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl px-5 py-6 pb-10"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* 핸들 + 닫기 */}
        <div className="flex items-center justify-between mb-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto absolute left-1/2 -translate-x-1/2" />
          <div className="w-10" />
          <button
            onPointerDown={(e) => { e.stopPropagation(); onClose(); }}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full"
          >
            <X size={15} className="text-gray-500" />
          </button>
        </div>
        {step === "select" ? (
          <>
            <p className="text-[17px] font-bold text-gray-900 mb-4">단지 선택</p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {apartments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => { setSelectedApt(apt); setStep("detail"); }}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl border transition-colors",
                    existing.includes(apt.id)
                      ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                      : "border-gray-200 active:bg-gray-50"
                  )}
                  disabled={existing.includes(apt.id)}
                >
                  <p className="text-[15px] font-semibold text-gray-900">{apt.name}</p>
                  <p className="text-[13px] text-gray-400 mt-0.5">
                    {DONG_LABEL[apt.dong] ?? apt.dong} · {apt.built}년 · {apt.households.toLocaleString()}세대
                  </p>
                  {existing.includes(apt.id) && <span className="text-[12px] text-gray-400">이미 추가됨</span>}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button onClick={() => setStep("select")} className="flex items-center gap-1 text-blue-600 text-[14px] mb-4">
              ← 다시 선택
            </button>
            <p className="text-[17px] font-bold text-gray-900 mb-1">{selectedApt?.name}</p>
            <p className="text-[13px] text-gray-400 mb-4">{selectedApt?.dong}</p>

            <div className="space-y-4">
              <div>
                <p className="text-[13px] font-semibold text-gray-600 mb-2">평형</p>
                <div className="flex gap-2">
                  {selectedApt?.sizes.map((sz, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedPyeong(i)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[14px] font-semibold border transition-colors",
                        selectedPyeong === i ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-100"
                      )}
                    >
                      {sz.pyeong}평
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[13px] font-semibold text-gray-600 mb-2">층수</p>
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-[15px] focus:outline-none focus:border-blue-400"
                  placeholder="층수 입력"
                />
              </div>

              <div>
                <p className="text-[13px] font-semibold text-gray-600 mb-2">구분</p>
                <div className="flex gap-2">
                  {["내 집", "관심 매물", "투자 관심"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLabel(l)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors",
                        label === l ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 text-gray-700 border-gray-100"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full mt-6 bg-blue-600 text-white rounded-2xl py-3.5 text-[16px] font-bold"
            >
              추가하기
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Apartment Card ----------
function ApartmentCard({ apt, isSelected, onToggle, txLoaded, tab }: {
  apt: Apartment; isSelected: boolean; onToggle: () => void; txLoaded: boolean; tab: MainTab;
}) {
  const [activePyeong, setActivePyeong] = useState(() => getDefault30s(apt.sizes).pyeong);

  const sz = apt.sizes.find((s) => s.pyeong === activePyeong) ?? apt.sizes[0];
  const history = sz.priceHistory;
  const prev = history[history.length - 2]?.price ?? history[history.length - 1].price;
  const curr = history[history.length - 1].price;
  const jeonse = estJeonse(sz.avgPrice);
  const wolse = estWolse(sz.avgPrice);

  return (
    <div
      className={cn(
        "bg-white rounded-2xl overflow-hidden transition-all shadow-sm",
        isSelected && "ring-2 ring-blue-500"
      )}
    >
      <div className="px-4 py-4" onClick={onToggle}>
        {/* 헤더: 단지명 + 대표 시세 */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-[15px] font-bold text-gray-900 leading-snug">{apt.name}</p>
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              <MapPin size={11} className="text-gray-400 shrink-0" />
              <span className="text-[12px] text-gray-400">{apt.dong}</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.built}년</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.households.toLocaleString()}세대</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            {tab === "매매" ? (
              <>
                <p className="text-[18px] font-black text-emerald-600">{formatPrice(sz.avgPrice)}</p>
                <p className="text-[11px] text-gray-400">
                  {activePyeong}평 {txLoaded ? "실거래 기준" : "참고 시세"}
                </p>
              </>
            ) : (
              <>
                <p className="text-[18px] font-black text-blue-600">{formatPrice(jeonse)}</p>
                <p className="text-[11px] text-gray-400">{activePyeong}평 전세 추정</p>
              </>
            )}
          </div>
        </div>

        {/* 평형 선택 칩 */}
        <div className="flex gap-1.5 mt-3" onClick={(e) => e.stopPropagation()}>
          {apt.sizes.map((s) => (
            <button
              key={s.pyeong}
              onClick={() => setActivePyeong(s.pyeong)}
              className={cn(
                "h-7 px-3 rounded-full text-[12px] font-semibold transition-colors",
                activePyeong === s.pyeong
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {s.pyeong}평
            </button>
          ))}
          {txLoaded && (
            <span className="ml-1 self-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">
              실거래
            </span>
          )}
        </div>

        {/* 시세 정보 행 */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tab === "매매" ? (
            <>
              <div className="bg-emerald-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-emerald-600 font-medium">매매 시세</p>
                <p className="text-[14px] font-black text-emerald-700 mt-0.5">{formatPrice(sz.avgPrice)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-blue-500 font-medium">전세 (추정)</p>
                <p className="text-[14px] font-black text-blue-700 mt-0.5">{formatPrice(jeonse)}</p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-blue-500 font-medium">전세 시세</p>
                <p className="text-[14px] font-black text-blue-700 mt-0.5">{formatPrice(jeonse)}</p>
              </div>
              <div className="bg-purple-50 rounded-xl px-3 py-2">
                <p className="text-[11px] text-purple-500 font-medium">월세 (추정)</p>
                <p className="text-[13px] font-black text-purple-700 mt-0.5">
                  {wolse.deposit.toLocaleString()} / 월 {wolse.monthly}만
                </p>
              </div>
            </>
          )}
        </div>

        {/* 실거래 최근 건 */}
        {apt.recentDeal && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-gray-400">
            <span className="text-gray-300">│</span>
            <span>최근거래</span>
            <span className="font-semibold text-gray-700">{formatPrice(apt.recentDeal.price)}</span>
            <span>{apt.recentDeal.pyeong}평 {apt.recentDeal.floor}층 · {apt.recentDeal.date}</span>
          </div>
        )}

        {/* 하단 변동률 + 차트 토글 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] text-gray-400">전월 대비</span>
            <PriceChangeTag curr={curr} prev={prev} />
          </div>
          <div className="flex items-center gap-1 text-[12px] text-gray-400">
            {isSelected ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span>시세 추이</span>
          </div>
        </div>
      </div>

      {/* 시세 추이 차트 */}
      {isSelected && (
        <div className="border-t border-gray-100 px-2 pt-2 pb-3">
          <p className="text-[13px] font-semibold text-gray-600 px-2 mb-1">
            {activePyeong}평 {tab === "매매" ? "매매" : "전세"} 시세 추이
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart
              data={tab === "매매"
                ? history
                : history.map((h) => ({ ...h, price: estJeonse(h.price) }))
              }
              margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => v.slice(2)} />
              <YAxis tick={{ fontSize: 10, fill: "#9CA3AF" }} tickFormatter={(v) => `${(v / 10000).toFixed(0)}억`} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone" dataKey="price"
                stroke={tab === "매매" ? "#10B981" : "#3B82F6"}
                strokeWidth={2} dot={false}
                activeDot={{ r: 4, fill: tab === "매매" ? "#10B981" : "#3B82F6" }}
              />
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
    if (listing.type === "월세") {
      return `${formatPrice(listing.price)} / ${listing.monthlyRent?.toLocaleString()}만`;
    }
    return formatPrice(listing.price);
  }

  const typeColor: Record<ListingType, string> = {
    매매: "bg-red-50 text-red-600",
    전세: "bg-blue-50 text-blue-600",
    월세: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={cn("text-[12px] font-bold px-2 py-0.5 rounded-full", typeColor[listing.type])}>
                {listing.type}
              </span>
              {listing.isNew && (
                <span className="text-[11px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">NEW</span>
              )}
            </div>
            <p className="text-[16px] font-bold text-gray-900">{listing.aptName}</p>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {listing.dong} · {listing.pyeong}평({listing.sqm}㎡) · {listing.floor}/{listing.totalFloors}층 · {listing.direction}
            </p>
          </div>
          <div className="text-right shrink-0">
            {listing.type === "월세" && (
              <p className="text-[11px] text-gray-400 mb-0.5">보증금/월세</p>
            )}
            <p className="text-[17px] font-black text-gray-900">{priceLabel()}</p>
            <p className="text-[11px] text-gray-400">{listing.listedAt.slice(5)} 등록</p>
          </div>
        </div>

        {listing.features.length > 0 && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {listing.features.map((f) => (
              <span key={f} className="text-[12px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{f}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[13px] text-gray-500"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {expanded ? "접기" : "상세 보기"}
          </button>
          <button
            onClick={onCall}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[13px] font-semibold"
          >
            <Phone size={12} />
            {listing.agencyName}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-[14px] text-gray-700 leading-relaxed">{listing.description}</p>
          <p className="text-[13px] text-gray-400 mt-2">📞 {listing.agencyPhone}</p>
        </div>
      )}
    </div>
  );
}

// ---------- Main Page ----------
export default function RealEstatePage() {
  const [apartments, setApartments] = useState<Apartment[]>(mockApartments);
  const [recentTx, setRecentTx] = useState<AptTransaction[]>([]);
  const [txPricesLoaded, setTxPricesLoaded] = useState(false);
  const [myHomes, setMyHomes] = useState<MyHome[]>(initialMyHomes);
  const [showAddModal, setShowAddModal] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("매매");
  const [rentSub, setRentSub] = useState<RentSubTab>("전체");
  const [activeDong, setActiveDong] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [rebStats, setRebStats] = useState<RebWeeklyStats | null>(null);
  const [kbIndex, setKbIndex] = useState<PriceIndexRow | null>(null);

  useEffect(() => {
    // 아파트 목록 + 실거래 데이터를 동시에 로드 후 병합
    Promise.all([
      fetchApartments(),
      fetchRecentTransactions(),
    ]).then(([apts, txs]) => {
      const merged = mergeTxIntoApartments(apts, txs);
      setApartments(merged);
      setRecentTx(txs);
      setTxPricesLoaded(txs.length > 0);
    });
    fetchRebWeeklyStats().then(setRebStats);
    fetchLatestPriceIndex("kb").then(setKbIndex);
  }, []);

  // 실제 아파트 데이터가 있는 동만 필터 탭에 노출 (동적 필터)
  const availableDongs = useMemo(() => {
    const dongsWithData = new Set(apartments.map((a) => a.dong));
    return ["전체", ...LEGAL_DONGS.filter((d) => dongsWithData.has(d))];
  }, [apartments]);

  const filteredApts = apartments.filter((a) => {
    if (activeDong !== "전체" && a.dong !== activeDong) return false;
    if (searchQuery && !a.name.includes(searchQuery) && !a.dong.includes(searchQuery)) return false;
    return true;
  });

  const filteredListings = listings.filter((l) => {
    if (activeDong !== "전체" && l.dong !== activeDong) return false;
    if (searchQuery && !l.aptName.includes(searchQuery)) return false;
    if (mainTab === "매매" && l.type !== "매매") return false;
    if (mainTab === "전월세") {
      if (rentSub === "전세" && l.type !== "전세") return false;
      if (rentSub === "월세" && l.type !== "월세") return false;
      if (rentSub === "전체" && l.type === "매매") return false;
    }
    return true;
  });

  const avgPrice = Math.round(
    apartments.reduce((sum, a) => sum + (a.recentDeal?.price ?? 0), 0) / apartments.length
  );

  // 전월 대비 평균 변동률 — KB 지수 → R-ONE → 자체 계산 순 우선순위
  const priceChangePct: number = (() => {
    if (kbIndex?.change_rate != null) return kbIndex.change_rate;
    if (rebStats?.changeRate != null) return rebStats.changeRate;
    // 자체 계산: 아파트별 최근 2개월 비교 평균
    const diffs: number[] = [];
    for (const apt of apartments) {
      for (const sz of apt.sizes) {
        const h = sz.priceHistory;
        if (h.length < 2) continue;
        const curr = h[h.length - 1].price;
        const prev = h[h.length - 2].price;
        if (prev > 0) diffs.push(((curr - prev) / prev) * 100);
      }
    }
    if (!diffs.length) return 0;
    return diffs.reduce((a, b) => a + b, 0) / diffs.length;
  })();

  const priceChangeLabel = (() => {
    if (kbIndex?.change_rate != null) return `KB부동산 ${kbIndex.period.slice(0, 4)}.${kbIndex.period.slice(4, 6)}`;
    if (rebStats?.changeRate != null) return "한국부동산원 주간";
    return "전월 대비 평균";
  })();

  function handleCall(phone: string) {
    window.location.href = `tel:${phone}`;
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-[70px]">
      <Header title="부동산 시세" />

      {/* 내 집 시세 section */}
      <div className="bg-white mt-0 px-4 pt-4 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={15} className="text-amber-400 fill-amber-400" />
            <p className="text-[15px] font-bold text-gray-900">내 집 시세</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-[13px] text-blue-600 font-semibold bg-blue-50 px-3 py-1.5 rounded-full"
          >
            <Plus size={13} />
            단지 추가
          </button>
        </div>

        {myHomes.length === 0 ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2"
          >
            <Building2 size={24} className="text-gray-300" />
            <p className="text-[14px] text-gray-400">내 집 또는 관심 단지를 추가해보세요</p>
          </button>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {myHomes.map((home) => (
              <MyHomeCard
                key={home.id}
                home={home}
                onRemove={() => setMyHomes((prev) => prev.filter((h) => h.id !== home.id))}
              />
            ))}
            <button
              onClick={() => setShowAddModal(true)}
              className="shrink-0 w-[70px] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-1.5"
            >
              <Plus size={20} className="text-gray-300" />
              <span className="text-[12px] text-gray-400">추가</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Banner */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 mb-3">
        <div className="flex items-center gap-2">
          <p className="text-emerald-100 text-[13px] font-medium">검단 신도시 평균 시세</p>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white">
            {txPricesLoaded ? "실거래 기준" : kbIndex ? "KB부동산" : "참고값"}
          </span>
        </div>
        <p className="text-white text-[25px] font-black mt-1">{formatPrice(avgPrice)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          {priceChangePct >= 0
            ? <TrendingUp size={14} className="text-emerald-300" />
            : <TrendingDown size={14} className="text-red-300" />}
          <span className="text-emerald-200 text-[13px]">
            {priceChangeLabel} {priceChangePct >= 0 ? "+" : ""}{priceChangePct.toFixed(2)}%{" "}
            {priceChangePct >= 0 ? "상승" : "하락"}
          </span>
        </div>
        <div className="mt-3 flex gap-4">
          <div>
            <p className="text-emerald-200 text-[12px]">총 단지 수</p>
            <p className="text-white text-[15px] font-bold">{apartments.length}개 단지</p>
          </div>
          <div>
            <p className="text-emerald-200 text-[12px]">최근 거래</p>
            <p className="text-white text-[15px] font-bold">
              {recentTx.length > 0 ? `이번 달 ${recentTx.length}건` : "집계 중"}
            </p>
          </div>
          <div>
            <p className="text-emerald-200 text-[12px]">매물 수</p>
            <p className="text-white text-[15px] font-bold">총 {listings.length}건</p>
          </div>
        </div>
        <p className="text-emerald-300/70 text-[11px] mt-2">
          {kbIndex
            ? `KB부동산 ${kbIndex.period.slice(0, 4)}.${kbIndex.period.slice(4, 6)} 지수 기준`
            : txPricesLoaded
              ? "국토교통부 실거래가 기반"
              : "시세는 참고용이며 실제와 다를 수 있습니다"}
        </p>
      </div>

      {/* Main Tab + Dong filter (sticky) */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-gray-100">
        {/* Main tabs */}
        <div className="flex px-4 pt-3">
          {(["매매", "전월세"] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={cn(
                "flex-1 py-2 text-[15px] font-semibold border-b-2 transition-colors",
                mainTab === tab ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Rent sub-tab */}
        {mainTab === "전월세" && (
          <div className="px-4 pt-2 pb-1 flex gap-2">
            {(["전체", "전세", "월세"] as RentSubTab[]).map((sub) => (
              <button
                key={sub}
                onClick={() => setRentSub(sub)}
                className={cn(
                  "h-7 px-3 rounded-full text-[13px] font-semibold transition-colors",
                  rentSub === sub ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                )}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Dong filter — 아파트 데이터가 있는 동만 표시 */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {availableDongs.map((dong) => (
            <button
              key={dong}
              onClick={() => setActiveDong(dong)}
              className={cn(
                "shrink-0 h-8 px-3.5 rounded-full text-[14px] font-medium",
                activeDong === dong ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              {DONG_LABEL[dong] ?? dong}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
            <Search size={15} className="text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단지명 검색"
              className="flex-1 bg-transparent text-[14px] focus:outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-3 space-y-3">
        {/* 단지 시세 카드 (매매·전월세 공통) */}
        {filteredApts.map((apt) => (
          <ApartmentCard
            key={apt.id}
            apt={apt}
            isSelected={selectedApt === apt.id}
            onToggle={() => setSelectedApt(selectedApt === apt.id ? null : apt.id)}
            txLoaded={txPricesLoaded}
            tab={mainTab}
          />
        ))}
        {filteredApts.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-2xl mb-2">🏠</p>
            <p className="text-gray-500 text-sm">검색된 단지가 없습니다</p>
          </div>
        )}

        {/* 매매 탭 전용: 이번달 실거래 + 매물 */}
        {mainTab === "매매" && (
          <>
            {recentTx.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                  <TrendingUp size={15} className="text-emerald-600" />
                  <p className="text-[15px] font-bold text-gray-900">이번 달 실거래</p>
                  <span className="ml-auto text-[12px] text-gray-400">국토교통부</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {recentTx.map((tx, i) => (
                    <div key={i} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900">{tx.aptName}</p>
                        <p className="text-[12px] text-gray-400 mt-0.5">
                          {tx.dong} · {tx.pyeong}평 · {tx.floor}층 · {tx.dealDate}
                        </p>
                      </div>
                      <p className="text-[14px] font-bold text-emerald-600">{formatPrice(tx.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 매매 매물 */}
            {filteredListings.length > 0 && (
              <div>
                <p className="text-[13px] font-semibold text-gray-500 pt-1 pb-2">
                  매매 매물 · 총 {filteredListings.length}건
                </p>
                <div className="space-y-3">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onCall={() => handleCall(listing.agencyPhone)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* 전월세 탭 전용: 전월세 매물 */}
        {mainTab === "전월세" && (
          <>
            {filteredListings.length > 0 ? (
              <div>
                <p className="text-[13px] font-semibold text-gray-500 pt-1 pb-2">
                  전월세 매물 · 총 {filteredListings.length}건
                </p>
                <div className="space-y-3">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onCall={() => handleCall(listing.agencyPhone)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-2xl mb-2">🏘️</p>
                <p className="text-gray-500 text-sm">등록된 매물이 없습니다</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mx-4 my-4 bg-yellow-50 rounded-xl px-4 py-3">
        <p className="text-[13px] text-yellow-700 font-semibold">⚠️ 유의사항</p>
        <p className="text-[12px] text-yellow-600 mt-1 leading-relaxed">
          실거래가는 국토교통부 기준입니다. 매물 정보는 공인중개사 등록 기준이며 실제와 차이가 있을 수 있습니다.
          투자 결정 시 반드시 전문가와 상담하시기 바랍니다.
        </p>
      </div>

      <BottomNav />

      {showAddModal && (
        <AddHomeModal
          onClose={() => setShowAddModal(false)}
          onAdd={(home) => setMyHomes((prev) => [...prev, home])}
          existing={myHomes.map((h) => h.aptId)}
          apartments={apartments}
        />
      )}
    </div>
  );
}
