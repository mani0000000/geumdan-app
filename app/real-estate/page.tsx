"use client";

import { useState } from "react";
import {
  TrendingUp, TrendingDown, MapPin, Home, Search,
  ChevronRight, BarChart2
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { apartments } from "@/lib/mockData";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Apartment } from "@/lib/types";

const dongs = ["전체", "당하동", "불로동", "마전동", "왕길동"];

function PriceChangeTag({ history }: { history: { price: number }[] }) {
  if (history.length < 2) return null;
  const prev = history[history.length - 2].price;
  const curr = history[history.length - 1].price;
  const diff = curr - prev;
  const pct = ((diff / prev) * 100).toFixed(1);
  if (diff === 0) return <span className="text-[11px] text-gray-400">보합</span>;
  return diff > 0 ? (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-red-500">
      <TrendingUp size={11} />▲ {Math.abs(diff).toLocaleString()}만 ({pct}%)
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-[11px] font-semibold text-blue-500">
      <TrendingDown size={11} />▼ {Math.abs(diff).toLocaleString()}만 ({pct}%)
    </span>
  );
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 rounded-lg px-3 py-2">
      <p className="text-gray-400 text-[11px]">{label}</p>
      <p className="text-white text-[13px] font-bold">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

function ApartmentCard({
  apt,
  isSelected,
  onClick,
}: {
  apt: Apartment;
  isSelected: boolean;
  onClick: () => void;
}) {
  const mainSize = apt.sizes[0];
  const history = mainSize.priceHistory;
  return (
    <div
      className={cn(
        "bg-white rounded-2xl card-shadow press-effect overflow-hidden transition-all",
        isSelected && "ring-2 ring-blue-500"
      )}
      onClick={onClick}
    >
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-gray-900">{apt.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={12} className="text-gray-400" />
              <span className="text-[12px] text-gray-400">{apt.dong}</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.built}년</span>
              <span className="text-gray-200">·</span>
              <span className="text-[12px] text-gray-400">{apt.households.toLocaleString()}세대</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[16px] font-black text-emerald-600">
              {formatPrice(apt.recentDeal?.price ?? 0)}
            </p>
            <p className="text-[11px] text-gray-400">{apt.recentDeal?.pyeong}평 실거래</p>
          </div>
        </div>

        {/* Size Tabs */}
        <div className="flex gap-2 mt-3">
          {apt.sizes.map((sz, i) => (
            <div
              key={i}
              className="bg-gray-100 rounded-lg px-2.5 py-1.5 text-center"
            >
              <p className="text-[12px] font-semibold text-gray-700">{sz.pyeong}평</p>
              <p className="text-[11px] text-emerald-600 font-bold">{formatPrice(sz.avgPrice)}</p>
            </div>
          ))}
        </div>

        {/* Price Change */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <span className="text-[12px] text-gray-500">전월 대비</span>
          <PriceChangeTag history={history} />
        </div>
      </div>

      {/* Mini Chart (expanded) */}
      {isSelected && (
        <div className="border-t border-gray-100 px-2 pt-2 pb-3">
          <p className="text-[12px] font-semibold text-gray-600 px-2 mb-2">시세 추이 ({mainSize.pyeong}평)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={mainSize.priceHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickFormatter={(v) => v.slice(2)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}억`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#10B981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#10B981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function RealEstatePage() {
  const [activeDong, setActiveDong] = useState("전체");
  const [selectedApt, setSelectedApt] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = apartments.filter((a) => {
    if (activeDong !== "전체" && a.dong !== activeDong) return false;
    if (searchQuery && !a.name.includes(searchQuery) && !a.dong.includes(searchQuery)) return false;
    return true;
  });

  const avgPrice = Math.round(
    apartments.reduce((sum, a) => sum + (a.recentDeal?.price ?? 0), 0) / apartments.length
  );

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="부동산 시세" showNotification />

      {/* Summary Banner */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl p-4 mb-3">
        <p className="text-emerald-100 text-[12px] font-medium">검단 신도시 평균 실거래가</p>
        <p className="text-white text-[24px] font-black mt-1">{formatPrice(avgPrice)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp size={14} className="text-emerald-300" />
          <span className="text-emerald-200 text-[12px]">전월 대비 평균 +1.2% 상승</span>
        </div>
        <div className="mt-3 flex gap-4">
          <div>
            <p className="text-emerald-200 text-[11px]">총 단지 수</p>
            <p className="text-white text-[14px] font-bold">{apartments.length}개 단지</p>
          </div>
          <div>
            <p className="text-emerald-200 text-[11px]">최근 거래</p>
            <p className="text-white text-[14px] font-bold">이번 주 12건</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-gray-100">
        <div className="px-4 py-3 flex gap-2 overflow-x-auto">
          {dongs.map((dong) => (
            <button
              key={dong}
              onClick={() => setActiveDong(dong)}
              className={cn(
                "shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium press-effect",
                activeDong === dong ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              {dong}
            </button>
          ))}
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
            <Search size={15} className="text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단지명 검색"
              className="flex-1 bg-transparent text-[13px] focus:outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Apartment List */}
      <div className="px-4 pt-3 space-y-3">
        {filtered.map((apt) => (
          <ApartmentCard
            key={apt.id}
            apt={apt}
            isSelected={selectedApt === apt.id}
            onClick={() => setSelectedApt(selectedApt === apt.id ? null : apt.id)}
          />
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">🏠</p>
            <p className="text-gray-500 text-sm">검색된 단지가 없습니다</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mx-4 my-4 bg-yellow-50 rounded-xl px-4 py-3">
        <p className="text-[12px] text-yellow-700 font-semibold">⚠️ 유의사항</p>
        <p className="text-[11px] text-yellow-600 mt-1 leading-relaxed">
          표시된 시세는 국토교통부 실거래가 기준입니다. 실제 매물 가격과 차이가 있을 수 있으며,
          투자 결정 시 반드시 전문가와 상담하시기 바랍니다.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
