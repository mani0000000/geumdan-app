"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users,
  Star, Ticket, X, MapPin, Calendar,
  TrendingDown, Phone, Clock, PillBottle, Store, AlertTriangle,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { posts, newsItems, nearbyStops, apartments, coupons, newStoreOpenings, pharmacies as mockPharmacies, nearbyMarts } from "@/lib/mockData";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import type { Pharmacy, NearbyMart, MartClosingPattern } from "@/lib/mockData";
import { fetchAllPharmacies, fetchEmergencyRooms } from "@/lib/db/pharmacies";
import { getUserProfile } from "@/lib/db/userdata";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";
import { fetchWidgetConfig, type WidgetConfig } from "@/lib/db/widget-config";

// ─── 퀵 메뉴 ─────────────────────────────────────────────────
const quickMenus = [
  { icon: Bus,           label: "버스",    href: "/transport/",   from: "#0071e3", to: "#38BDF8" },
  { icon: HomeIcon,      label: "부동산",  href: "/real-estate/", from: "#059669", to: "#34D399" },
  { icon: Newspaper,     label: "뉴스",    href: "/news/",        from: "#DC2626", to: "#FB923C" },
  { icon: MessageCircle, label: "커뮤니티",href: "/community/",   from: "#7C3AED", to: "#A78BFA" },
  { icon: Ticket,        label: "쿠폰",    href: "/coupons/",     from: "#D97706", to: "#FBBF24" },
  { icon: Store,         label: "상가",    href: "/stores/",      from: "#0891B2", to: "#22D3EE" },
  { icon: ShoppingBag,   label: "중고거래",href: "/community/",   from: "#BE185D", to: "#F472B6" },
  { icon: Star,          label: "즐겨찾기",href: "/mypage/",      from: "#78350F", to: "#D97706" },
];

// ─── 시간 인사 ────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours();
  if (h < 6)  return "좋은 밤이에요 🌙";
  if (h < 12) return "좋은 아침이에요 ☀️";
  if (h < 18) return "좋은 오후예요 🌤️";
  return "좋은 저녁이에요 🌆";
}

// ─── 주간 날씨 모달 ────────────────────────────────────────────
function WeeklyModal({ weekly, onClose }: {
  weekly: NonNullable<WeatherData["weekly"]>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[300]">
      {/* 배경 클릭 시 닫기 */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* 시트 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center">
        <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#f5f5f7]">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#0071e3]" />
              <span className="text-[17px] font-bold text-[#1d1d1f]">주간 날씨</span>
            </div>
            <button onClick={onClose} className="active:opacity-60">
              <X size={20} className="text-[#6e6e73]" />
            </button>
          </div>
          <div className="px-4 py-3 pb-10 space-y-1">
            {weekly.map((day, i) => (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                  day.isToday ? "bg-[#e8f1fd]" : "hover:bg-[#f5f5f7]"
                }`}>
                <div className="w-14 shrink-0">
                  <p className={`text-[14px] font-bold ${day.isToday ? "text-[#0071e3]" : "text-[#424245]"}`}>
                    {day.isToday ? "오늘" : day.dayLabel}
                  </p>
                  <p className="text-[12px] text-[#86868b]">{day.date}</p>
                </div>
                <span className="text-[25px] w-8 shrink-0">{day.emoji}</span>
                <div className="flex-1">
                  {day.precipitation > 0 && (
                    <p className="text-[12px] text-[#0071e3]">💧 {day.precipitation}mm</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[15px] font-bold text-[#F04452]">{day.high}°</span>
                  <span className="text-[13px] text-[#86868b]">/</span>
                  <span className="text-[15px] font-semibold text-[#0071e3]">{day.low}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 날씨 위젯 ────────────────────────────────────────────────
function WeatherWidget({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  if (loading) {
    return (
      <div className="mx-4 mt-3 mb-1 bg-[#0071e3] rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-white/20 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-20 bg-white/20 rounded-lg" />
            <div className="h-3 w-36 bg-white/20 rounded-lg" />
          </div>
          <div className="h-8 w-16 bg-white/20 rounded-xl" />
        </div>
      </div>
    );
  }
  if (!weather) return null;

  const gradient =
    weather.weatherCode <= 1 ? "from-[#0071e3] to-[#0EA5E9]"
    : weather.weatherCode <= 3 ? "from-[#424245] to-[#6B7684]"
    : weather.weatherCode >= 61 ? "from-[#0058b0] to-[#0071e3]"
    : "from-[#0071e3] to-[#6366F1]";

  // 어제 대비 온도 차이
  const tempDiff = weather.yesterdayTemp != null ? weather.temp - weather.yesterdayTemp : null;

  return (
    <>
      <div className={`mx-4 mt-3 mb-1 bg-gradient-to-br ${gradient} rounded-2xl overflow-hidden`}>
        {/* 항상 보이는 바 */}
        <button onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:opacity-80">
          <span className="text-[33px] leading-none shrink-0">{weather.emoji}</span>
          <div className="flex-1 text-left">
            <div className="flex items-baseline gap-2">
              <span className="text-[29px] font-black text-white leading-none">{weather.temp}°</span>
              <span className="text-[14px] text-white/80">{weather.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[13px] text-white/60">최고 {weather.high}° · 최저 {weather.low}°</span>
              {tempDiff !== null && (
                <span className={`flex items-center gap-0.5 text-[12px] font-bold px-1.5 py-0.5 rounded-full ${
                  tempDiff > 0 ? "bg-red-400/30 text-red-100" : tempDiff < 0 ? "bg-blue-300/30 text-blue-100" : "bg-white/20 text-white/70"
                }`}>
                  {tempDiff > 0 ? <TrendingUp size={10} /> : tempDiff < 0 ? <TrendingDown size={10} /> : null}
                  어제보다 {tempDiff > 0 ? `+${tempDiff}°` : tempDiff < 0 ? `${tempDiff}°` : "동일"}
                </span>
              )}
            </div>
            {(weather.pm10 != null || weather.pm25 != null) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {weather.pm10 != null && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    weather.pm10Label === "좋음" ? "bg-blue-300/25 text-blue-100"
                    : weather.pm10Label === "보통" ? "bg-white/20 text-white/75"
                    : weather.pm10Label === "나쁨" ? "bg-orange-300/30 text-orange-200"
                    : "bg-red-400/30 text-red-200"
                  }`}>
                    미세먼지 {weather.pm10Label}
                  </span>
                )}
                {weather.pm25 != null && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    weather.pm25Label === "좋음" ? "bg-blue-300/25 text-blue-100"
                    : weather.pm25Label === "보통" ? "bg-white/20 text-white/75"
                    : weather.pm25Label === "나쁨" ? "bg-orange-300/30 text-orange-200"
                    : "bg-red-400/30 text-red-200"
                  }`}>
                    초미세먼지 {weather.pm25Label}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowWeekly(true); }}
            className="shrink-0 bg-white/20 rounded-xl px-3 py-2 active:bg-white/30">
            <span className="text-[12px] font-bold text-white">주간</span>
          </button>
          {expanded
            ? <ChevronUp size={15} className="text-white/60 shrink-0" />
            : <ChevronDown size={15} className="text-white/60 shrink-0" />}
        </button>

        {/* 확장 영역 */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-white/20">
            <div className="flex items-center gap-4 py-2.5 mb-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Droplets size={12} className="text-white/70" />
                <span className="text-[13px] text-white/80">습도 {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={12} className="text-white/70" />
                <span className="text-[13px] text-white/80">바람 {weather.windSpeed}m/s</span>
              </div>
              <span className="text-[13px] text-white/60 ml-auto">체감 {weather.feelsLike}°</span>
              {weather.pm10 != null && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                  weather.pm10Label === "좋음" ? "bg-blue-300/30 text-blue-100"
                  : weather.pm10Label === "보통" ? "bg-green-300/30 text-green-100"
                  : weather.pm10Label === "나쁨" ? "bg-orange-300/30 text-orange-100"
                  : "bg-red-400/30 text-red-100"
                }`}>
                  미세 {weather.pm10}㎍ {weather.pm10Label}
                </span>
              )}
              {weather.pm25 != null && (
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                  weather.pm25Label === "좋음" ? "bg-blue-300/30 text-blue-100"
                  : weather.pm25Label === "보통" ? "bg-green-300/30 text-green-100"
                  : weather.pm25Label === "나쁨" ? "bg-orange-300/30 text-orange-100"
                  : "bg-red-400/30 text-red-100"
                }`}>
                  초미세 {weather.pm25}㎍ {weather.pm25Label}
                </span>
              )}
            </div>
            {weather.hourly.length > 0 && (
              <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {weather.hourly.map(h => (
                  <div key={h.hour} className="flex flex-col items-center gap-1.5 shrink-0">
                    <span className="text-[12px] text-white/60">{h.hour}</span>
                    <span className="text-[19px]">{h.emoji}</span>
                    <span className="text-[13px] text-white font-bold">{h.temp}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showWeekly && weather.weekly && (
        <WeeklyModal weekly={weather.weekly} onClose={() => setShowWeekly(false)} />
      )}
    </>
  );
}

// ─── 쿠폰 섹션 ────────────────────────────────────────────────
function CouponSection() {
  const [downloaded, setDownloaded] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );

  return (
    <section className="mb-1">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
            <Tag size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[15px] font-bold text-[#1d1d1f]">이번 주 쿠폰</span>
        </div>
        <Link href="/coupons" className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5">
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {coupons.map(c => {
          const done = downloaded.has(c.id);
          const dDay = Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000);
          const urgent = dDay <= 3;
          return (
            <div key={c.id} className="shrink-0 w-[230px]">
              {/* 쿠폰 래퍼 — 반원 노치 절취선 구조 */}
              <div className="relative rounded-2xl overflow-hidden shadow-md"
                style={{ background: "white", border: `1.5px solid ${c.color}22` }}>

                {/* ── 상단 컬러 영역 ── */}
                <div className="px-4 pt-3.5 pb-3" style={{ background: `${c.color}14` }}>
                  <div className="flex items-center gap-2.5">
                    <StoreLogo name={c.storeName} category={c.category} size={36} rounded="rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-extrabold text-[#1d1d1f] truncate">{c.storeName}</p>
                      <p className="text-[11px] text-[#6e6e73] truncate mt-0.5">{c.buildingName}</p>
                    </div>
                  </div>
                </div>

                {/* ── 절취선 노치 ── */}
                <div className="relative flex items-center" style={{ height: "14px" }}>
                  {/* 배경 선 */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                    style={{ borderTop: `2px dashed ${c.color}55` }} />
                  {/* 좌측 반원 */}
                  <div className="absolute -left-[7px] w-[14px] h-[14px] rounded-full bg-[#f5f5f7] border-r-0"
                    style={{ border: `1.5px solid ${c.color}22`, borderLeft: "none" }} />
                  {/* 우측 반원 */}
                  <div className="absolute -right-[7px] w-[14px] h-[14px] rounded-full bg-[#f5f5f7] border-l-0"
                    style={{ border: `1.5px solid ${c.color}22`, borderRight: "none" }} />
                </div>

                {/* ── 하단 흰 영역 ── */}
                <div className="px-4 pt-2 pb-3.5">
                  {/* 할인 금액 크게 */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[28px] font-black leading-none" style={{ color: c.color }}>
                      {c.discount}
                    </span>
                    <span className="text-[12px] font-bold text-[#6e6e73]">할인</span>
                  </div>
                  {/* 쿠폰 제목 */}
                  <p className="text-[12px] text-[#424245] leading-snug line-clamp-2 mb-2.5">{c.title}</p>
                  {/* 하단: 만료일 + 받기 버튼 */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${urgent ? "text-[#F04452]" : "text-[#86868b]"}`}>
                      {urgent ? `⏰ D-${dDay}` : `~${c.expiry.slice(5)}`}
                    </span>
                    <button
                      onClick={() => setDownloaded(d => { const n = new Set(d); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                      className={`h-7 px-3.5 rounded-lg text-[12px] font-extrabold active:opacity-70 transition-all ${
                        done ? "bg-[#f5f5f7] text-[#86868b]" : "text-white shadow-sm"
                      }`}
                      style={done ? {} : { background: c.color }}>
                      {done ? "✓ 완료" : "쿠폰받기"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── 신규 오픈 ────────────────────────────────────────────────
function OpenBenefitSheet({ store, onClose }: { store: typeof newStoreOpenings[0]; onClose: () => void }) {
  const b = store.openBenefit;
  if (!b) return null;
  const dDay = b.validUntil
    ? Math.ceil((new Date(b.validUntil).getTime() - Date.now()) / 86400000)
    : null;
  return (
    <div className="fixed inset-0 z-[300] flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-[#d2d2d7] rounded-full" /></div>
        {/* 헤더 */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F0] flex items-center justify-center text-xl">{store.emoji}</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-[#1d1d1f]">{store.storeName}</span>
                {store.isNew && <span className="text-[10px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>}
              </div>
              <p className="text-[12px] text-[#6e6e73] mt-0.5">검단 센트럴 타워 {store.floor} · {store.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="active:opacity-60 mt-0.5">
            <X size={20} className="text-[#6e6e73]" />
          </button>
        </div>
        {/* D-day 배너 */}
        {dDay !== null && (
          <div className={`mx-5 mb-3 rounded-xl px-4 py-2.5 flex items-center justify-between ${dDay <= 3 ? "bg-[#FFF0F0]" : "bg-[#e8f1fd]"}`}>
            <span className="text-[13px] font-semibold text-[#424245]">혜택 마감까지</span>
            <span className={`text-[15px] font-black ${dDay <= 3 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "오늘 마감!" : "종료"}
            </span>
          </div>
        )}
        {/* 혜택 항목 */}
        <div className="px-5 pb-2">
          <p className="text-[13px] font-bold text-[#6e6e73] mb-2.5">오픈 혜택 안내</p>
          <div className="space-y-2">
            {b.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <div className="w-5 h-5 rounded-full bg-[#0071e3] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>
                <p className="text-[14px] text-[#1d1d1f] leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>
        {/* 유효기간 */}
        {b.validUntil && (
          <p className="text-[12px] text-[#86868b] text-center pt-2 pb-2">
            혜택 기간: ~{b.validUntil.slice(5).replace("-", "/")}
          </p>
        )}
        <div className="px-5 pb-10 pt-1">
          <button onClick={onClose}
            className="w-full h-12 bg-[#0071e3] rounded-xl text-white text-[15px] font-bold active:bg-[#0058b0]">
            확인
          </button>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 z-0" />
    </div>
  );
}

// 카테고리별 그라디언트
const catGradients: Record<string, [string, string]> = {
  "카페":       ["#F59E0B", "#FB923C"],
  "음식점":     ["#EF4444", "#F97316"],
  "편의점":     ["#3B82F6", "#06B6D4"],
  "병원/약국":  ["#EF4444", "#F472B6"],
  "미용":       ["#EC4899", "#C026D3"],
  "학원":       ["#8B5CF6", "#6366F1"],
  "마트":       ["#10B981", "#059669"],
  "기타":       ["#6B7280", "#4B5563"],
};

function NewOpeningsSection() {
  const [sheetStore, setSheetStore] = useState<typeof newStoreOpenings[0] | null>(null);

  return (
    <section className="mb-1">
      <div className="flex items-center justify-between px-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[16px] font-black text-[#1d1d1f]">신규 오픈</span>
          <span className="text-[10px] font-black bg-[#F04452] text-white px-2 py-0.5 rounded-full tracking-wide">NEW</span>
        </div>
        <Link href="/stores" className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5">
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {newStoreOpenings.map(s => {
          const [from, to] = catGradients[s.category] ?? catGradients["기타"];
          return (
            <button key={s.id} onClick={() => setSheetStore(s)}
              className="shrink-0 w-[156px] bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform border border-[#f0f0f0]">

              {/* 컬러 상단 블록 */}
              <div className="relative h-[108px] flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
                <span className="text-[52px] leading-none">{s.emoji}</span>
                {s.isNew && (
                  <div className="absolute top-2.5 right-2.5 bg-white/90 rounded-full px-1.5 py-0.5">
                    <span className="text-[9px] font-black text-[#F04452]">NEW</span>
                  </div>
                )}
                {s.openBenefit && (
                  <div className="absolute bottom-2 left-2 right-2 bg-black/30 rounded-lg px-2 py-1 backdrop-blur-sm">
                    <p className="text-[10px] text-white font-semibold truncate">{s.openBenefit.summary}</p>
                  </div>
                )}
              </div>

              {/* 하단 정보 */}
              <div className="px-3 py-2.5">
                <p className="text-[13px] font-bold text-[#1d1d1f] truncate">{s.storeName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] font-semibold text-[#0071e3]">{s.floor}</span>
                  <span className="text-[10px] text-[#d2d2d7]">·</span>
                  <span className="text-[11px] text-[#6e6e73]">{s.category}</span>
                </div>
                <p className="text-[10px] text-[#86868b] mt-0.5">{s.openDate.slice(5)} 오픈</p>
              </div>
            </button>
          );
        })}
      </div>
      {sheetStore && <OpenBenefitSheet store={sheetStore} onClose={() => setSheetStore(null)} />}
    </section>
  );
}

// ─── 소식 탭 섹션 ─────────────────────────────────────────────
type SosikTab = "커뮤니티" | "뉴스" | "시세";

function SosikSection() {
  const router = useRouter();
  const [tab, setTab] = useState<SosikTab>("커뮤니티");
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const hotPosts = posts.filter(p => p.isHot).slice(0, 4);

  useEffect(() => {
    fetchGeumdanNews().then(result => {
      if (result.articles.length > 0) setRealNews(result.articles.slice(0, 4));
    });
  }, []);

  const topNews = realNews.length > 0 ? realNews : newsItems.slice(0, 4);

  return (
    <section className="mx-4 mb-1">
      {/* 탭 필 스타일 */}
      <div className="flex gap-2 mb-3">
        {(["커뮤니티", "뉴스", "시세"] as SosikTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-8 px-4 rounded-full text-[13px] font-bold transition-all ${
              tab === t ? "bg-[#1d1d1f] text-white" : "bg-white text-[#86868b]"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── 커뮤니티 ── */}
      {tab === "커뮤니티" && hotPosts.length > 0 && (
        <div className="space-y-2">
          {/* 피처드 HOT 포스트 */}
          <button onClick={() => router.push(`/community/detail/?id=${hotPosts[0].id}`)}
            className="w-full text-left rounded-2xl overflow-hidden active:opacity-90"
            style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)" }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                  {hotPosts[0].category}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-orange-300 font-bold">
                  <Flame size={10} />HOT
                </span>
              </div>
              <p className="text-[18px] font-black text-white leading-snug mb-3 line-clamp-2">
                {hotPosts[0].title}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-white/60">{hotPosts[0].authorDong}</span>
                  <span className="text-[12px] text-white/40">·</span>
                  <span className="text-[12px] text-white/60">{formatRelativeTime(hotPosts[0].createdAt)}</span>
                </div>
                <span className="text-[13px] font-bold text-white">❤️ {hotPosts[0].likeCount}</span>
              </div>
            </div>
          </button>

          {/* 나머지 포스트 리스트 */}
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
            {hotPosts.slice(1).map(post => (
              <button key={post.id}
                onClick={() => router.push(`/community/detail/?id=${post.id}`)}
                className="w-full px-4 py-3 flex items-start gap-2.5 active:bg-[#f5f5f7] text-left">
                <span className="text-[11px] font-bold bg-[#F3F0FF] text-[#7C3AED] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  {post.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[12px] text-[#6e6e73]">{post.authorDong}</span>
                    <span className="text-[12px] text-[#86868b] ml-auto">❤️ {post.likeCount}</span>
                  </div>
                </div>
              </button>
            ))}
            <Link href="/community"
              className="flex items-center justify-center gap-1 py-3 text-[13px] text-[#0071e3] font-semibold">
              전체 보기 <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── 뉴스 ── */}
      {tab === "뉴스" && topNews.length > 0 && (
        <div className="space-y-2">
          {/* 피처드 뉴스 카드 */}
          <a href={(topNews[0] as NewsArticle).url || "#"} target="_blank" rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden active:opacity-90"
            style={{ background: "linear-gradient(135deg, #0071e3, #6366F1)" }}>
            <div className="p-4">
              <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                {topNews[0].source}
              </span>
              <p className="text-[18px] font-black text-white leading-snug mt-3 mb-2 line-clamp-3">
                {topNews[0].title}
              </p>
              <span className="text-[12px] text-white/60">{formatRelativeTime(topNews[0].publishedAt)}</span>
            </div>
          </a>

          {/* 나머지 뉴스 리스트 */}
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
            {topNews.slice(1).map(item => (
              <a key={item.id}
                href={(item as NewsArticle).url || "#"} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 active:bg-[#f5f5f7]">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#1d1d1f] leading-snug line-clamp-2">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-[#0071e3] font-semibold">{item.source}</span>
                    <span className="text-[11px] text-[#86868b]">{formatRelativeTime(item.publishedAt)}</span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[#d2d2d7] shrink-0 mt-1" />
              </a>
            ))}
            <Link href="/news"
              className="flex items-center justify-center gap-1 py-3 text-[13px] text-[#0071e3] font-semibold">
              뉴스 전체 보기 <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* ── 시세 ── */}
      {tab === "시세" && (
        <div className="space-y-2">
          {/* 피처드 시세 카드 */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-bold text-white/80">검단신도시 실거래가</span>
                <Link href="/real-estate"
                  className="flex items-center gap-0.5 text-[12px] text-white/60">
                  전체보기 <ChevronRight size={11} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {apartments.slice(0, 2).map(apt => (
                  <button key={apt.id} onClick={() => router.push("/real-estate/")}
                    className="bg-white/15 rounded-xl px-3 py-2.5 text-left active:bg-white/25">
                    <p className="text-[11px] text-white/70 truncate mb-0.5">{apt.name}</p>
                    <p className="text-[19px] font-black text-white leading-none">
                      {formatPrice(apt.recentDeal?.price ?? 0)}
                    </p>
                    <p className="text-[10px] text-white/60 mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 나머지 아파트 리스트 */}
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
            {apartments.slice(2, 5).map(apt => (
              <button key={apt.id} onClick={() => router.push("/real-estate/")}
                className="w-full px-4 py-3 flex items-center justify-between active:bg-[#f5f5f7]">
                <div className="text-left min-w-0 flex-1 pr-2">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{apt.name}</p>
                  <p className="text-[12px] text-[#6e6e73] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold text-[#059669]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                  <p className="text-[11px] text-[#6e6e73]">실거래</p>
                </div>
              </button>
            ))}
            <Link href="/real-estate"
              className="flex items-center justify-center gap-1 py-3 text-[13px] text-[#0071e3] font-semibold">
              시세 전체 보기 <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── 마트 의무휴업 유틸 ──────────────────────────────────────────
/** date 기준 해당 월의 n번째 요일(0=일~6=토) 날짜 반환 */
function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): Date {
  const d = new Date(year, month, 1);
  let count = 0;
  while (true) {
    if (d.getDay() === weekday) { count++; if (count === nth) return new Date(d); }
    d.setDate(d.getDate() + 1);
  }
}

/** 해당 날짜가 해당 마트의 의무휴업일인지 */
function isMandatoryClosed(date: Date, pattern: MartClosingPattern): boolean {
  if (pattern === "open")   return false;
  if (pattern === "closed") return true;
  if (date.getDay() !== 0)  return false; // 일요일이 아니면 false
  const y = date.getFullYear(), m = date.getMonth();
  const sundays = [1, 2, 3, 4, 5].map(n => {
    try { return nthWeekdayOfMonth(y, m, 0, n); } catch { return null; }
  }).filter(Boolean) as Date[];
  const idx = sundays.findIndex(s => s.toDateString() === date.toDateString()) + 1; // 1~5
  if (pattern === "2nd4th") return idx === 2 || idx === 4;
  if (pattern === "1st3rd") return idx === 1 || idx === 3;
  return false;
}

/** 특정 날짜 기준 마트 영업 여부 */
function getMartStatus(mart: NearbyMart, date: Date): {
  isOpen: boolean;
  hours: string | null;
  reason?: string;
} {
  const day = date.getDay(); // 0=일, 6=토
  if (isMandatoryClosed(date, mart.closingPattern)) {
    return { isOpen: false, hours: null, reason: "의무휴업일" };
  }
  if (day === 0) {
    return mart.sundayHours
      ? { isOpen: true, hours: mart.sundayHours }
      : { isOpen: false, hours: null, reason: "일요일 휴무" };
  }
  if (day === 6) return { isOpen: true, hours: mart.saturdayHours };
  return { isOpen: true, hours: mart.weekdayHours };
}

// ─── 마트 위젯 ────────────────────────────────────────────────
function MartSection() {
  const now   = new Date();
  const today = now.getDay();  // 0=일, 6=토
  const isWeekend = today === 0 || today === 6;

  if (!isWeekend) return null;

  // 오늘 + 내일(토→일) 상태 계산
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const showTomorrow = today === 6; // 토요일이면 내일(일) 경고 함께 표시

  // 오늘 기준 휴무인 마트
  const closedToday = nearbyMarts.filter(m => !getMartStatus(m, now).isOpen);
  // 내일 기준 휴무인 마트 (토요일에만)
  const closedTomorrow = showTomorrow
    ? nearbyMarts.filter(m => !getMartStatus(m, tomorrow).isOpen)
    : [];

  return (
    <>
      <p className="text-[13px] font-bold text-[#6e6e73] uppercase tracking-wide px-4 mb-1.5 mt-3">주변 마트</p>
      <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">

        {/* 배너 */}
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          closedToday.length > 0 ? "bg-[#FEF3C7]" : "bg-[#F0FDF4]"
        }`}>
          <ShoppingBag size={13} className={closedToday.length > 0 ? "text-[#D97706]" : "text-[#059669]"} />
          <span className={`text-[13px] font-semibold ${closedToday.length > 0 ? "text-[#D97706]" : "text-[#059669]"}`}>
            {closedToday.length > 0
              ? `오늘 ${closedToday.length}곳 휴무 — 미리 확인하세요`
              : "오늘 주변 마트 모두 정상 영업 중"
            }
          </span>
        </div>

        {/* 내일 경고 (토요일에 일요일 휴무 예고) */}
        {showTomorrow && closedTomorrow.length > 0 && (
          <div className="px-4 py-2 bg-[#FEE2E2] flex items-center gap-2 border-t border-white">
            <span className="text-[13px]">⚠️</span>
            <span className="text-[13px] font-semibold text-[#F04452]">
              내일(일) {closedTomorrow.map(m => m.brand).join("·")} 의무휴업
            </span>
          </div>
        )}

        {/* 마트 목록 */}
        <div className="divide-y divide-[#f5f5f7]">
          {nearbyMarts.map(mart => {
            const todayStatus = getMartStatus(mart, now);
            const tmrStatus   = showTomorrow ? getMartStatus(mart, tomorrow) : null;

            return (
              <div key={mart.id} className="px-4 py-3.5 flex items-center gap-3">
                {/* 로고 */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  todayStatus.isOpen ? "bg-[#F0FDF4]" : "bg-[#f5f5f7]"
                }`}>
                  <ShoppingBag size={17} className={todayStatus.isOpen ? "text-[#059669]" : "text-[#6e6e73]"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1d1d1f]">{mart.name}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                      mart.type === "대형마트"
                        ? "bg-[#EDE9FE] text-[#6D28D9]"
                        : "bg-[#E0F2FE] text-[#0369A1]"
                    }`}>{mart.type}</span>
                  </div>

                  {/* 오늘 상태 */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[12px] font-semibold ${todayStatus.isOpen ? "text-[#059669]" : "text-[#F04452]"}`}>
                      {todayStatus.isOpen ? `영업 중 · ${todayStatus.hours}` : `오늘 휴무${todayStatus.reason ? ` (${todayStatus.reason})` : ""}`}
                    </span>
                  </div>

                  {/* 내일 상태 (토요일에) */}
                  {tmrStatus && !tmrStatus.isOpen && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[11px] text-[#F04452]">⚠ 내일 의무휴업</span>
                    </div>
                  )}

                  {/* 의무휴업 안내 */}
                  {mart.notice && mart.type === "대형마트" && (
                    <p className="text-[11px] text-[#86868b] mt-0.5">{mart.notice}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[12px] text-[#6e6e73]">{mart.distance}</span>
                  <a href={`tel:${mart.phone}`}
                    className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#e8f1fd]">
                    <Phone size={14} className="text-[#0071e3]" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </section>
    </>
  );
}

// ─── 약국 위젯 ────────────────────────────────────────────────
type PharmacyFilter = "전체" | "주말" | "심야";
type EmergencyType = "약국" | "응급실" | "소아응급실";

interface EmergencyRoom {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  isOpen: boolean;
  hours: string;
  isPediatric: boolean;
  level: string; // 응급의료기관 분류
}

const emergencyRooms: EmergencyRoom[] = [
  {
    id: "er1",
    name: "검단탑병원",
    address: "인천 서구 검단로 345",
    phone: "032-561-1119",
    distance: "1.4km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: false,
    level: "지역응급의료기관",
  },
  {
    id: "er2",
    name: "인천성모병원",
    address: "인천 부평구 동수로 56",
    phone: "032-280-5114",
    distance: "6.2km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "권역응급의료센터",
  },
  {
    id: "er3",
    name: "나사렛국제병원",
    address: "인천 부평구 부평대로 56",
    phone: "032-570-2114",
    distance: "7.1km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "지역응급의료센터",
  },
  {
    id: "er4",
    name: "가천대 길병원",
    address: "인천 남동구 남동대로 774",
    phone: "032-460-3114",
    distance: "11.3km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "권역응급의료센터",
  },
  {
    id: "er5",
    name: "인하대병원",
    address: "인천 중구 인항로 27",
    phone: "032-890-2114",
    distance: "13.8km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "권역응급의료센터",
  },
];

function PharmacySection() {
  const [mainType, setMainType] = useState<EmergencyType>("약국");
  const [filter, setFilter] = useState<PharmacyFilter>("전체");
  const [showAll, setShowAll] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(mockPharmacies);
  const [erData, setErData] = useState<EmergencyRoom[]>(emergencyRooms);

  useEffect(() => {
    fetchAllPharmacies().then(data => { if (data.length > 0) setPharmacies(data); });
    fetchEmergencyRooms("all").then(data => { if (data.length > 0) setErData(data); });
  }, []);

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const hour = now.getHours();
  const isNight = hour >= 21 || hour < 6;

  const filtered = pharmacies.filter(p => {
    if (filter === "주말") return p.tags.includes("주말");
    if (filter === "심야") return p.tags.includes("심야");
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 3);

  const filterBtns: PharmacyFilter[] = ["전체", "주말", "심야"];

  const erList = erData.filter(e =>
    mainType === "소아응급실" ? e.isPediatric : true
  );

  return (
    <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* 상태 배너 */}
        {(isWeekend || isNight) && mainType === "약국" && (
          <div className={`px-4 py-2.5 flex items-center gap-2 ${isNight ? "bg-[#1B2B4B]" : "bg-[#e8f1fd]"}`}>
            <Clock size={13} className={isNight ? "text-blue-300" : "text-[#0071e3]"} />
            <span className={`text-[12px] font-semibold ${isNight ? "text-blue-200" : "text-[#0071e3]"}`}>
              {isNight ? "지금은 심야 시간이에요 — 운영 중인 약국을 확인하세요" : "오늘은 주말이에요 — 운영 약국을 확인하세요"}
            </span>
          </div>
        )}
        {(mainType === "응급실" || mainType === "소아응급실") && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-[#FEF2F2]">
            <AlertTriangle size={13} className="text-[#F04452]" />
            <span className="text-[12px] font-semibold text-[#F04452]">
              응급 시 119에 먼저 연락하세요 — 가까운 응급실 안내
            </span>
          </div>
        )}

        {/* 메인 타입 탭 */}
        <div className="flex border-b border-[#f5f5f7]">
          {(["약국", "응급실", "소아응급실"] as EmergencyType[]).map(t => (
            <button key={t} onClick={() => { setMainType(t); setShowAll(false); }}
              className={`flex-1 h-10 text-[13px] font-bold border-b-2 transition-colors ${mainType === t
                ? t === "약국" ? "text-[#0071e3] border-[#0071e3]"
                  : t === "응급실" ? "text-[#F04452] border-[#F04452]"
                  : "text-[#F97316] border-[#F97316]"
                : "text-[#86868b] border-transparent"}`}>
              {t === "약국" ? "💊 약국" : t === "응급실" ? "🚨 응급실" : "👶 소아응급실"}
            </button>
          ))}
        </div>

        {mainType === "약국" ? (
          <>
            {/* 약국 서브필터 */}
            <div className="flex gap-2 px-4 pt-3 pb-2">
              {filterBtns.map(f => (
                <button key={f} onClick={() => { setFilter(f); setShowAll(false); }}
                  className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${filter === f ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                  {f === "심야" ? "🌙 심야" : f === "주말" ? "📅 주말" : "전체"}
                </button>
              ))}
            </div>
            {/* 약국 목록 */}
            <div className="divide-y divide-[#f5f5f7]">
              {displayed.map(p => (
                <div key={p.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.isOpenNow ? "bg-[#D1FAE5]" : "bg-[#f5f5f7]"}`}>
                    <PillBottle size={18} className={p.isOpenNow ? "text-[#065F46]" : "text-[#6e6e73]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-[#1d1d1f]">{p.name}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${p.isOpenNow ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                        {p.isOpenNow ? "영업 중" : "영업 종료"}
                      </span>
                      {p.tags.includes("24시") && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">24시</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#6e6e73] mt-0.5">{p.address}</p>
                    <div className="flex flex-col gap-0.5 mt-1.5">
                      {p.weekendHours && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#0071e3] w-6 shrink-0">주말</span>
                          <span className="text-[12px] text-[#424245]">{p.weekendHours}</span>
                        </div>
                      )}
                      {p.nightHours && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#6366F1] w-6 shrink-0">심야</span>
                          <span className="text-[12px] text-[#424245]">{p.nightHours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {p.distance && <span className="text-[12px] text-[#6e6e73]">{p.distance}</span>}
                    <a href={`tel:${p.phone}`} className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#e8f1fd]">
                      <Phone size={14} className="text-[#0071e3]" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length > 3 && (
              <button onClick={() => setShowAll(v => !v)}
                className="w-full py-3 flex items-center justify-center gap-1.5 border-t border-[#f5f5f7] active:bg-[#f5f5f7]">
                <span className="text-[13px] font-semibold text-[#424245]">{showAll ? "접기" : `${filtered.length - 3}개 더 보기`}</span>
                {showAll ? <ChevronUp size={14} className="text-[#6e6e73]" /> : <ChevronDown size={14} className="text-[#6e6e73]" />}
              </button>
            )}
          </>
        ) : (
          /* 응급실 / 소아응급실 목록 */
          <div className="divide-y divide-[#f5f5f7]">
            {erList.map(er => (
              <div key={er.id} className="px-4 py-3.5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FEE2E2]">
                  {mainType === "소아응급실"
                    ? <span className="text-[18px]">👶</span>
                    : <AlertTriangle size={18} className="text-[#F04452]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1d1d1f]">{er.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#F04452]">{er.level}</span>
                    {er.isPediatric && mainType === "응급실" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]">소아과</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6e6e73] mt-0.5">{er.address}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock size={11} className="text-[#6e6e73]" />
                    <span className="text-[12px] text-[#424245]">{er.hours}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[12px] text-[#6e6e73]">{er.distance}</span>
                  <a href={`tel:${er.phone}`} className="w-8 h-8 bg-[#FEE2E2] rounded-xl flex items-center justify-center active:opacity-70">
                    <Phone size={14} className="text-[#F04452]" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 섹션 헤더 ────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 mb-2.5 mt-5">
      <span className="text-[13px] font-black text-[#1d1d1f] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#e5e5ea]" />
    </div>
  );
}

// ─── 인사 배너 ──────────────────────────────────────────────
function getPersonalizedMessage(name: string, weather: WeatherData | null): { sub: string; main: string } {
  const hour = new Date().getHours();
  const temp = weather?.temp;
  const code = weather?.weatherCode ?? -1;
  const pm10 = weather?.pm10;

  // 날씨 상황별
  if (weather) {
    if (pm10 != null && pm10 > 80)
      return { sub: `${name}님, 오늘 미세먼지가 심해요 😷`, main: "외출 시 마스크 꼭 챙기세요" };
    if (code >= 95)
      return { sub: `${name}님, 지금 뇌우가 치고 있어요 ⛈️`, main: "외출은 잠시 미뤄보세요" };
    if (code >= 71 && code <= 77)
      return { sub: `${name}님, 오늘 눈이 내려요 ❄️`, main: "도로가 미끄러우니 조심하세요" };
    if (code >= 61 && code <= 67)
      return { sub: `${name}님, 오늘 비가 와요 🌧️`, main: "우산 챙기는 거 잊지 마세요" };
    if (temp != null && temp <= 0)
      return { sub: `${name}님, 오늘 날씨가 영하예요 🥶`, main: "두꺼운 옷 챙기고 따뜻하게 다니세요" };
    if (temp != null && temp <= 8)
      return { sub: `${name}님, 오늘은 날씨가 쌀쌀해요 🧥`, main: "따뜻하게 입고 나가세요" };
    if (temp != null && temp >= 33)
      return { sub: `${name}님, 오늘 폭염이에요 🔥`, main: "수분 보충 자주 해주세요" };
    if (temp != null && temp >= 28)
      return { sub: `${name}님, 오늘 많이 덥네요 ☀️`, main: "시원한 곳에서 더위 피하세요" };
    if (code === 0 || code === 1) {
      if (hour >= 6 && hour < 9)
        return { sub: `${name}님, 맑은 아침이에요 ☀️`, main: "상쾌한 하루 시작하세요" };
      if (hour >= 18)
        return { sub: `${name}님, 오늘 저녁 하늘이 맑아요 🌆`, main: "산책하기 좋은 날씨예요" };
    }
  }

  // 시간대별 fallback
  if (hour < 6)  return { sub: `${name}님, 늦은 밤이에요 🌙`, main: "오늘도 고생 많으셨어요" };
  if (hour < 9)  return { sub: `${name}님, 좋은 아침이에요 ☀️`, main: "오늘 하루도 활기차게 시작해요" };
  if (hour < 12) return { sub: `${name}님, 오전을 달리는 중이에요 💪`, main: "검단의 소식 확인해보세요" };
  if (hour < 14) return { sub: `${name}님, 점심 맛있게 드셨나요? 🍱`, main: "근처 맛집 둘러볼까요" };
  if (hour < 18) return { sub: `${name}님, 오후도 힘내세요 😊`, main: "검단의 새 소식을 확인하세요" };
  if (hour < 21) return { sub: `${name}님, 편안한 저녁이에요 🌆`, main: "오늘 하루도 수고하셨어요" };
  return { sub: `${name}님, 오늘도 고생하셨어요 🌙`, main: "편안한 밤 되세요" };
}

function GreetingBanner({ weather, nickname }: { weather: WeatherData | null; nickname: string }) {
  const { sub, main } = getPersonalizedMessage(nickname, weather);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="px-4 pt-5 pb-2">
      <p className="text-[12px] font-semibold text-[#86868b] mb-1 tracking-wide">
        {dateStr} &nbsp;·&nbsp; {sub.replace(/^.+?님,\s*/, "")}
      </p>
      <h1 className="text-[26px] font-black text-[#1d1d1f] leading-tight tracking-tight">{main}</h1>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig[] | null>(null);
  const [userNickname, setUserNickname] = useState("검단주민");

  useEffect(() => {
    fetchWeather().then(w => { setWeather(w); setWeatherLoading(false); });
    fetchWidgetConfig().then(setWidgetConfig);
    getUserProfile().then(p => setUserNickname(p.nickname));
  }, []);

  const stop = nearbyStops[0];
  const bus = stop?.routes[0];

  // 위젯 ID → 렌더 함수 맵 (weather/router 클로저 캡처)
  const widgetRenderers: Record<string, () => React.ReactNode> = {
    greeting: () => <GreetingBanner weather={weather} nickname={userNickname} />,
    weather: () => <WeatherWidget weather={weather} loading={weatherLoading} />,
    quickmenu: () => (
      <div className="px-4 mt-3 mb-1">
        <div className="grid grid-cols-4 gap-2.5">
          {quickMenus.map(({ icon: Icon, label, href, from }) => (
            <Link key={label} href={href}
              className="flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-white active:scale-95 transition-transform shadow-sm">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${from}1a` }}>
                <Icon size={19} strokeWidth={2} style={{ color: from }} />
              </div>
              <span className="text-[11px] font-semibold text-[#1d1d1f]">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    ),
    coupons: () => (
      <>
        <SectionLabel label="이번 주 혜택" />
        <CouponSection />
      </>
    ),
    openings: () => (
      <>
        <SectionLabel label="신규 오픈" />
        <NewOpeningsSection />
      </>
    ),
    mart: () => <MartSection />,
    pharmacy: () => (
      <>
        <SectionLabel label="주말·심야 약국" />
        <PharmacySection />
      </>
    ),
    transport: () => stop && bus ? (
      <>
        <SectionLabel label="교통" />
        <section className="mx-4 mb-1">
          <button onClick={() => router.push("/transport/")}
            className="w-full rounded-2xl overflow-hidden active:opacity-90"
            style={{ background: "linear-gradient(135deg, #0071e3, #0EA5E9)" }}>
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                      <Bus size={13} className="text-white" />
                    </div>
                    <span className="text-[12px] text-white/70">{stop.name}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-black text-white leading-none">{bus.routeNo}번</span>
                    <span className="text-[15px] text-white/80">{bus.destination} 방면</span>
                  </div>
                  {bus.isExpress && (
                    <span className="inline-flex items-center gap-1 mt-1.5 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                      ⚡ 급행
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-xl px-3.5 py-2.5 text-center min-w-[68px] shadow-md">
                  <span className="text-[30px] font-black text-[#0071e3] leading-none block">
                    {bus.arrivalMin}
                  </span>
                  <span className="text-[11px] text-[#0071e3]/70 font-semibold">분 후</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/20">
              <span className="text-[12px] text-white/60">실시간 교통 전체 보기</span>
              <ChevronRight size={14} className="text-white/50" />
            </div>
          </button>
        </section>
      </>
    ) : null,
    sosik: () => (
      <>
        <SectionLabel label="검단 소식" />
        <SosikSection />
      </>
    ),
  };

  // config 로드 전에는 기본 순서로 렌더링
  const activeWidgets = widgetConfig
    ? widgetConfig.filter(w => w.enabled)
    : Object.keys(widgetRenderers).map((id, i) => ({ id, enabled: true, sort_order: i + 1, label: id }));

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-20">
      <Header showLocation />

      {activeWidgets.map(w => {
        const render = widgetRenderers[w.id];
        if (!render) return null;
        return <React.Fragment key={w.id}>{render()}</React.Fragment>;
      })}

      <div className="h-4" />
      <BottomNav />
    </div>
  );
}
