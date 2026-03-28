"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, MapPin, Search } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { apartments } from "@/lib/mockData";
import { formatPrice } from "@/lib/utils";
import type { Apartment } from "@/lib/types";

const dongs = ["전체","당하동","불로동","마전동","왕길동"];

function Tooltip2({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#191F28] rounded-xl px-3 py-2">
      <p className="text-[#8B95A1] text-[11px]">{label}</p>
      <p className="text-white text-[13px] font-bold">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

function AptCard({ apt, selected, onClick, onDetail }: { apt: Apartment; selected: boolean; onClick: () => void; onDetail: () => void }) {
  const sz = apt.sizes[0];
  const hist = sz.priceHistory;
  const diff = hist.length >= 2 ? hist[hist.length-1].price - hist[hist.length-2].price : 0;
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl overflow-hidden cursor-pointer transition-all active:opacity-80 ${selected ? "ring-2 ring-[#3182F6]" : ""}`}>
      <div className="px-4 py-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-[#191F28]">{apt.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin size={12} className="text-[#B0B8C1]" />
              <span className="text-[12px] text-[#8B95A1]">{apt.dong} · {apt.built}년 · {apt.households.toLocaleString()}세대</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[17px] font-black text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
            <p className="text-[11px] text-[#8B95A1]">{apt.recentDeal?.pyeong}평 실거래</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F2F4F6]">
          <div className="flex gap-2">
            {apt.sizes.map((s,i) => (
              <div key={i} className="bg-[#F2F4F6] rounded-lg px-2.5 py-1.5 text-center">
                <p className="text-[11px] text-[#8B95A1]">{s.pyeong}평</p>
                <p className="text-[13px] font-bold text-[#191F28]">{formatPrice(s.avgPrice)}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {diff > 0
              ? <><TrendingUp size={13} className="text-[#F04452]" /><span className="text-[12px] font-bold text-[#F04452]">▲ {formatPrice(diff)}</span></>
              : diff < 0
              ? <><TrendingDown size={13} className="text-[#3182F6]" /><span className="text-[12px] font-bold text-[#3182F6]">▼ {formatPrice(Math.abs(diff))}</span></>
              : <span className="text-[12px] text-[#8B95A1]">보합</span>
            }
          </div>
        </div>
      </div>
      {selected && (
        <div className="border-t border-[#F2F4F6] px-2 pt-2 pb-3">
          <p className="text-[12px] font-semibold text-[#8B95A1] px-2 mb-2">{sz.pyeong}평 시세 추이</p>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={sz.priceHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F6" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => v.slice(2)} />
              <YAxis tick={{ fontSize: 10, fill: "#B0B8C1" }} tickFormatter={v => `${(v/10000).toFixed(0)}억`} />
              <Tooltip content={<Tooltip2 />} />
              <Line type="monotone" dataKey="price" stroke="#00C471" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#00C471" }} />
            </LineChart>
          </ResponsiveContainer>
          <button onClick={e => { e.stopPropagation(); onDetail(); }}
            className="mt-2 w-full h-9 rounded-xl bg-[#EBF3FE] text-[#3182F6] text-[13px] font-bold active:bg-[#D1E8FF] transition-colors">
            상세 정보 보기
          </button>
        </div>
      )}
    </div>
  );
}

export default function RealEstatePage() {
  const router = useRouter();
  const [dongFilter, setDongFilter] = useState("전체");
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const avg = Math.round(apartments.reduce((s,a) => s + (a.recentDeal?.price ?? 0), 0) / apartments.length);
  const filtered = apartments.filter(a => (dongFilter === "전체" || a.dong === dongFilter) && (!q || a.name.includes(q)));

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="부동산 시세" />

      {/* Summary */}
      <div className="mx-4 mt-4 mb-3 bg-[#00C471] rounded-2xl px-4 py-5">
        <p className="text-white/80 text-[13px]">검단 신도시 평균 실거래가</p>
        <p className="text-white text-[28px] font-black mt-1">{formatPrice(avg)}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp size={14} className="text-white/70" />
          <span className="text-white/70 text-[12px]">전월 대비 평균 +1.2% 상승</span>
        </div>
        <div className="flex gap-5 mt-3">
          <div>
            <p className="text-white/60 text-[11px]">총 단지</p>
            <p className="text-white text-[14px] font-bold">{apartments.length}개</p>
          </div>
          <div>
            <p className="text-white/60 text-[11px]">이번 주 거래</p>
            <p className="text-white text-[14px] font-bold">12건</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6]">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {dongs.map(d => (
            <button key={d} onClick={() => setDongFilter(d)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors active:opacity-70 ${dongFilter === d ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
              {d}
            </button>
          ))}
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-[#F2F4F6] rounded-xl px-3 h-9">
            <Search size={14} className="text-[#B0B8C1]" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="단지명 검색"
              className="flex-1 bg-transparent text-[13px] text-[#191F28] placeholder:text-[#B0B8C1] outline-none" />
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-3">
        {filtered.map(apt => (
          <AptCard key={apt.id} apt={apt} selected={selected === apt.id}
            onClick={() => setSelected(selected === apt.id ? null : apt.id)}
            onDetail={() => router.push(`/geumdan-app/real-estate/detail/?id=${apt.id}`)} />
        ))}
      </div>

      <div className="mx-4 my-4 bg-[#FFFDE7] rounded-2xl px-4 py-3">
        <p className="text-[12px] font-bold text-[#F57F17]">⚠️ 유의사항</p>
        <p className="text-[11px] text-[#F57F17]/80 mt-1 leading-relaxed">
          표시 시세는 국토교통부 실거래가 기준이며 실제 매물과 차이가 있을 수 있습니다.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
