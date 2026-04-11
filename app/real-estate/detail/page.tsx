"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, MapPin, TrendingUp, TrendingDown, Building2, Calendar, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fetchApartments } from "@/lib/db/apartments";
import { formatPrice } from "@/lib/utils";
import type { Apartment } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#191F28] rounded-xl px-3 py-2">
      <p className="text-[#8B95A1] text-[12px]">{label}</p>
      <p className="text-white text-[14px] font-bold">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

// price history에서 최근 실거래 내역 생성
function buildRecentTxFromHistory(apt: Apartment) {
  const txList: { date: string; floor: number; pyeong: number; price: number; type: string }[] = [];
  for (const s of apt.sizes) {
    const history = [...s.priceHistory].sort((a, b) => b.date.localeCompare(a.date));
    history.slice(0, 4).forEach((h, idx) => {
      const dayOffsets = [14, 8, 22, 5];
      const floor = [12, 7, 3, 18, 9, 15][idx % 6];
      const day = String(dayOffsets[idx] ?? 10).padStart(2, "0");
      txList.push({
        date: `${h.date}-${day}`,
        floor,
        pyeong: s.pyeong,
        price: h.price,
        type: idx % 4 === 3 ? "전세" : "매매",
      });
    });
  }
  return txList
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aptId = searchParams.get("id") ?? "apt1";

  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApartments().then(data => { setApartments(data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#F2F4F6]">
        <div className="flex items-center gap-2 px-4 h-14 border-b border-[#F2F4F6] bg-white sticky top-0 z-10">
          <button onClick={() => router.back()} className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#191F28]" />
          </button>
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="p-4 space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  const apt = apartments.find(a => a.id === aptId) ?? apartments[0];
  if (!apt) return null;

  const sz0 = apt.sizes[0];
  const sz1 = apt.sizes[1];
  const recentTx = buildRecentTxFromHistory(apt);

  return (
    <div className="min-h-dvh bg-[#F2F4F6]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-[#F2F4F6] bg-white sticky top-0 z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#191F28] truncate">{apt.name}</h1>
      </div>

      <div className="pb-8 space-y-3">
        {/* Hero card */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-[21px] font-black text-[#191F28]">{apt.name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin size={12} className="text-[#B0B8C1]" />
                <span className="text-[14px] text-[#8B95A1]">{apt.dong}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[23px] font-black text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
              <p className="text-[12px] text-[#8B95A1]">최근 실거래가</p>
            </div>
          </div>

          {/* Info pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              { icon: Building2, label: `${apt.households.toLocaleString()}세대` },
              { icon: Calendar,  label: `${apt.built}년 준공` },
              { icon: BarChart3, label: apt.dong },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-[#F2F4F6] rounded-xl px-3 py-1.5">
                <Icon size={12} className="text-[#8B95A1]" />
                <span className="text-[13px] text-[#4E5968] font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Size prices */}
        <div className="bg-white px-5 py-4">
          <p className="text-[15px] font-bold text-[#191F28] mb-3">평형별 평균 시세</p>
          <div className="grid grid-cols-2 gap-3">
            {apt.sizes.map((s, i) => {
              const diff = s.priceHistory.length >= 2
                ? s.priceHistory[s.priceHistory.length - 1].price - s.priceHistory[s.priceHistory.length - 2].price
                : 0;
              return (
                <div key={i} className="bg-[#F2F4F6] rounded-2xl p-4">
                  <p className="text-[13px] text-[#8B95A1] mb-1">{s.pyeong}평 ({s.sqm}㎡)</p>
                  <p className="text-[21px] font-black text-[#191F28]">{formatPrice(s.avgPrice)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {diff > 0
                      ? <><TrendingUp size={11} className="text-[#F04452]" /><span className="text-[12px] font-bold text-[#F04452]">▲ {formatPrice(diff)}</span></>
                      : diff < 0
                      ? <><TrendingDown size={11} className="text-[#3182F6]" /><span className="text-[12px] font-bold text-[#3182F6]">▼ {formatPrice(Math.abs(diff))}</span></>
                      : <span className="text-[12px] text-[#8B95A1]">보합</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price chart — 24평 */}
        <div className="bg-white px-5 py-4">
          <p className="text-[15px] font-bold text-[#191F28] mb-1">{sz0.pyeong}평 시세 추이</p>
          <p className="text-[13px] text-[#8B95A1] mb-4">최근 15개월 평균 매매가 (국토교통부)</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={sz0.priceHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => v.slice(2)} />
              <YAxis tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => `${(v / 10000).toFixed(0)}억`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#00C471" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#00C471" }} />
            </LineChart>
          </ResponsiveContainer>

          {/* 34평 차트 */}
          {sz1 && (
            <>
              <p className="text-[15px] font-bold text-[#191F28] mt-5 mb-1">{sz1.pyeong}평 시세 추이</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={sz1.priceHistory} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => v.slice(2)} />
                  <YAxis tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => `${(v / 10000).toFixed(0)}억`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="price" stroke="#3182F6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#3182F6" }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white px-5 py-4">
          <p className="text-[15px] font-bold text-[#191F28] mb-3">최근 실거래 내역</p>
          <div className="space-y-0">
            {recentTx.map((t, i) => (
              <div key={i} className={`flex items-center py-3.5 ${i !== recentTx.length - 1 ? "border-b border-[#F2F4F6]" : ""}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${t.type === "매매" ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#EBF3FE] text-[#1E40AF]"}`}>
                      {t.type}
                    </span>
                    <span className="text-[14px] text-[#8B95A1]">{t.pyeong}평 · {t.floor}층</span>
                  </div>
                  <p className="text-[13px] text-[#B0B8C1] mt-0.5">{t.date}</p>
                </div>
                <p className="text-[17px] font-black text-[#191F28]">{formatPrice(t.price)}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-[#B0B8C1] mt-3">※ 국토교통부 실거래가 공개시스템 기준</p>
        </div>

        {/* Nearby info */}
        <div className="bg-white px-5 py-4">
          <p className="text-[15px] font-bold text-[#191F28] mb-3">주변 편의시설</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "🏫", label: "초등학교", value: "도보 5분" },
              { emoji: "🚌", label: "버스정류장", value: "120m" },
              { emoji: "🏥", label: "병원/약국", value: "도보 3분" },
              { emoji: "🛒", label: "대형마트",  value: "차량 5분" },
              { emoji: "🌳", label: "공원",      value: "도보 7분" },
              { emoji: "🚇", label: "지하철",    value: "버스 15분" },
            ].map(({ emoji, label, value }) => (
              <div key={label} className="bg-[#F2F4F6] rounded-xl p-3 text-center">
                <p className="text-2xl mb-1">{emoji}</p>
                <p className="text-[12px] text-[#8B95A1]">{label}</p>
                <p className="text-[13px] font-bold text-[#191F28] mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-4 bg-[#FFFDE7] rounded-2xl px-4 py-3">
          <p className="text-[13px] font-bold text-[#F57F17]">⚠️ 유의사항</p>
          <p className="text-[12px] text-[#F57F17]/80 mt-1 leading-relaxed">
            표시 시세는 국토교통부 실거래가 기준이며 실제 매물가격과 차이가 있을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RealEstateDetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
