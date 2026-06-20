"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Star, Building2, Calendar, Users, TrendingUp } from "lucide-react";
import { apartments } from "@/lib/mockData";
import { addFavoriteApt, removeFavoriteApt, isFavoriteApt } from "@/lib/db/userdata";

function estJeonse(avgPrice: number) { return Math.round(avgPrice * 0.60); }
function estWolse(avgPrice: number) {
  const jeonse = estJeonse(avgPrice);
  const deposit = 5000;
  const monthly = Math.max(30, Math.round((jeonse - deposit) * 0.065 / 12));
  return { deposit, monthly };
}
function eok(manwon: number) { return (manwon / 10000).toFixed(1); }

function MiniChart({ history, color = "#3182F6" }: { history: { date: string; price: number }[]; color?: string }) {
  if (history.length < 2) return null;
  const w = 300, h = 90, pad = 8;
  const prices = history.map(p => p.price);
  const min = Math.min(...prices), max = Math.max(...prices);
  const span = max - min || 1;
  const pts = history.map((p, i) => ({
    x: pad + (i / (history.length - 1)) * (w - pad * 2),
    y: pad + (1 - (p.price - min) / span) * (h - pad * 2),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: 90 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 3.5 : 0} fill={color} />
      ))}
    </svg>
  );
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aptId = searchParams.get("id") ?? "";
  const apt = apartments.find(a => a.id === aptId);
  const [szIdx, setSzIdx] = useState(0);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (aptId) isFavoriteApt(aptId).then(setFavorited);
  }, [aptId]);

  if (!apt) {
    return (
      <div className="min-h-dvh bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-center px-8">
          <p className="text-4xl mb-3">🏠</p>
          <p className="text-[17px] font-bold text-[#1d1d1f]">단지를 찾을 수 없어요</p>
          <button onClick={() => router.push("/community/?tab=시세")}
            className="mt-4 h-11 px-6 bg-[#3182F6] rounded-xl text-white text-[15px] font-bold">
            시세 목록으로
          </button>
        </div>
      </div>
    );
  }

  const sz = apt.sizes[Math.min(szIdx, apt.sizes.length - 1)] ?? apt.sizes[0];
  const jeonse = estJeonse(sz.avgPrice);
  const wolse = estWolse(sz.avgPrice);
  const history = sz.priceHistory;
  const first = history[0]?.price ?? sz.avgPrice;
  const last = history[history.length - 1]?.price ?? sz.avgPrice;
  const chg = last - first;

  async function toggleFav() {
    if (favorited) {
      setFavorited(false);
      await removeFavoriteApt(apt!.id);
    } else {
      setFavorited(true);
      await addFavoriteApt({ apt_id: apt!.id, apt_name: apt!.name, dong: apt!.dong });
    }
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <div className="flex items-center justify-between px-4 h-14 bg-white sticky top-0 z-10 border-b border-[#f5f5f7]">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f] truncate mx-2">{apt.name}</h1>
        <button onClick={toggleFav} className="active:opacity-60">
          <Star size={22} className={favorited ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#86868b]"} />
        </button>
      </div>

      <div className="pb-10 space-y-3">
        {/* Hero */}
        <div className="bg-white px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="w-[72px] h-[72px] rounded-2xl bg-[#e8f1fd] flex items-center justify-center text-4xl shrink-0">🏠</div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[22px] font-black text-[#1d1d1f]">{apt.name}</h2>
              <p className="text-[14px] text-[#6e6e73] mt-1">{apt.dong}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1 text-[13px] text-[#424245]">
                  <Calendar size={13} className="text-[#6e6e73]" /> {apt.built}년 준공
                </span>
                <span className="flex items-center gap-1 text-[13px] text-[#424245]">
                  <Users size={13} className="text-[#6e6e73]" /> {apt.households.toLocaleString()}세대
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 평형 선택 */}
        {apt.sizes.length > 1 && (
          <div className="bg-white px-5 py-4">
            <p className="text-[14px] font-bold text-[#6e6e73] mb-2">평형 선택</p>
            <div className="flex gap-2 flex-wrap">
              {apt.sizes.map((s, i) => (
                <button key={i} onClick={() => setSzIdx(i)}
                  className={`h-9 px-4 rounded-xl text-[14px] font-bold transition-colors ${
                    i === szIdx ? "bg-[#3182F6] text-white" : "bg-[#f5f5f7] text-[#424245]"
                  }`}>
                  {s.pyeong}평 ({s.sqm}㎡)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 시세 */}
        <div className="bg-white px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[16px] font-bold text-[#1d1d1f]">{sz.pyeong}평 시세</p>
            <span className={`flex items-center gap-1 text-[13px] font-bold ${chg >= 0 ? "text-[#F04452]" : "text-[#3182F6]"}`}>
              <TrendingUp size={13} /> {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toLocaleString()}만
            </span>
          </div>
          <div className="bg-[#f5f5f7] rounded-xl px-4 py-4 mb-3">
            <p className="text-[12px] text-[#6e6e73]">평균 매매가</p>
            <p className="text-[26px] font-black text-[#1d1d1f]">{eok(sz.avgPrice)}억원</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">{sz.avgPrice.toLocaleString()}만원</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-[#f5f5f7] rounded-xl px-4 py-3">
              <p className="text-[12px] text-[#6e6e73]">전세 추정</p>
              <p className="text-[16px] font-black text-[#1d1d1f]">{eok(jeonse)}억원</p>
            </div>
            <div className="bg-[#f5f5f7] rounded-xl px-4 py-3">
              <p className="text-[12px] text-[#6e6e73]">월세 추정</p>
              <p className="text-[16px] font-black text-[#1d1d1f]">
                {wolse.deposit.toLocaleString()} / {wolse.monthly}만
              </p>
            </div>
          </div>
          <p className="text-[13px] font-bold text-[#6e6e73] mb-1">최근 15개월 추이</p>
          <MiniChart history={history} />
        </div>

        {/* 최근 실거래 */}
        {apt.recentDeal && (
          <div className="bg-white px-5 py-4">
            <p className="text-[16px] font-bold text-[#1d1d1f] mb-3">최근 실거래</p>
            <div className="flex items-center gap-3 bg-[#f5f5f7] rounded-xl px-4 py-3">
              <Building2 size={18} className="text-[#3182F6] shrink-0" />
              <div className="flex-1">
                <p className="text-[15px] font-bold text-[#1d1d1f]">
                  {eok(apt.recentDeal.price)}억원 ({apt.recentDeal.price.toLocaleString()}만)
                </p>
                <p className="text-[13px] text-[#6e6e73]">
                  {apt.recentDeal.pyeong}평 · {apt.recentDeal.floor}층 · {apt.recentDeal.date}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mx-4">
          <button onClick={() => router.push("/community/?tab=시세")}
            className="w-full h-12 border border-[#d2d2d7] bg-white rounded-2xl flex items-center justify-center gap-2 text-[14px] text-[#424245] font-medium active:bg-[#f5f5f7]">
            전체 시세 보기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RealEstateDetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
