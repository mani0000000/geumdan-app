"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users,
  Star, Ticket, X, MapPin, Calendar, Train,
  TrendingDown, Phone, Clock, PillBottle, Store, AlertTriangle, RefreshCw, Settings2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import CouponCard, { loadDownloaded, saveDownloaded } from "@/components/ui/CouponCard";
import { posts, newsItems, apartments, coupons as mockCoupons, newStoreOpenings, pharmacies as mockPharmacies, nearbyMarts } from "@/lib/mockData";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import type { Pharmacy, NearbyMart, MartClosingPattern } from "@/lib/mockData";
import { fetchAllPharmacies, fetchEmergencyRooms } from "@/lib/db/pharmacies";
import { getUserProfile } from "@/lib/db/userdata";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";
import { fetchArrivalsByStationId, GEUMDAN_BUS_STATIONS, type BusArrival } from "@/lib/api/bus";
import { getAllSubwayStations, fetchSubwayArrivals, estimateNextArrivals, type SubwayStationWithDist, type SubwayArrival } from "@/lib/api/subway";
import { fetchWidgetConfig, type WidgetConfig, DEFAULT_WIDGETS } from "@/lib/db/widget-config";
import { fetchActiveCoupons } from "@/lib/db/stores";
import type { Coupon } from "@/lib/types";
import { fetchActiveBanners, type Banner } from "@/lib/db/banners";
import BannerCarousel from "@/components/ui/BannerCarousel";

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
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    weather.pm10Label === "좋음" ? "bg-blue-300/25 text-blue-100"
                    : weather.pm10Label === "보통" ? "bg-white/20 text-white/80"
                    : weather.pm10Label === "나쁨" ? "bg-orange-300/35 text-orange-200"
                    : "bg-red-400/40 text-red-200"
                  }`}>
                    미세 {weather.pm10}㎍ · {weather.pm10Label}
                  </span>
                )}
                {weather.pm25 != null && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    weather.pm25Label === "좋음" ? "bg-blue-300/25 text-blue-100"
                    : weather.pm25Label === "보통" ? "bg-white/20 text-white/80"
                    : weather.pm25Label === "나쁨" ? "bg-orange-300/35 text-orange-200"
                    : "bg-red-400/40 text-red-200"
                  }`}>
                    초미세 {weather.pm25}㎍ · {weather.pm25Label}
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
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [downloaded, setDownloaded] = useState<Set<string>>(() => loadDownloaded());

  useEffect(() => {
    fetchActiveCoupons().then(data => {
      setCoupons(data.length > 0 ? data : mockCoupons);
    });
  }, []);

  function toggle(id: string) {
    setDownloaded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      saveDownloaded(n);
      return n;
    });
  }

  if (coupons.length === 0) return null;

  return (
    <section className="mb-1">
      <SectionLabel
        label="이번 주 쿠폰"
        badge={<Tag size={14} className="text-[#F59E0B]" />}
        href="/coupons/"
      />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {coupons.map(c => (
          <CouponCard
            key={c.id}
            coupon={c}
            downloaded={downloaded.has(c.id)}
            onToggle={() => toggle(c.id)}
          />
        ))}
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
      <SectionLabel
        label="신규 오픈"
        badge={<span className="text-[10px] font-black bg-[#F04452] text-white px-2 py-0.5 rounded-full tracking-wide">NEW</span>}
        href="/stores/"
      />
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
      <div className="flex gap-2 mb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {(["커뮤니티", "뉴스", "시세"] as SosikTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`h-8 px-4 rounded-full text-[13px] font-bold transition-all shrink-0 ${
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
            <Link href="/community/"
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
            <Link href="/news/"
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
                <Link href="/real-estate/"
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
            <Link href="/real-estate/"
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
      <SectionLabel label="주변 마트" />
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

// ─── 약국 영업 상태 계산 ──────────────────────────────────────
function withinHoursStr(hoursStr: string, cur: number): boolean {
  if (/24시간/.test(hoursStr)) return true;
  for (const m of [...hoursStr.matchAll(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/g)]) {
    const s = +m[1] * 60 + +m[2], e = +m[3] * 60 + +m[4];
    if (e < s ? (cur >= s || cur < e) : (cur >= s && cur < e)) return true;
  }
  return false;
}

function getPharmacyStatus(p: Pharmacy, now: Date): {
  isOpen: boolean;
  todayHours: string | null;
  todayLabel: string;
} {
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const h = now.getHours();
  const isNight = h >= 21 || h < 6;
  const cur = h * 60 + now.getMinutes();

  if (isNight && p.nightHours) {
    return { isOpen: withinHoursStr(p.nightHours, cur), todayHours: p.nightHours, todayLabel: "심야" };
  }
  if (isWeekend) {
    if (p.weekendHours) return { isOpen: withinHoursStr(p.weekendHours, cur), todayHours: p.weekendHours, todayLabel: "주말" };
    return { isOpen: false, todayHours: null, todayLabel: "주말 미운영" };
  }
  if (p.weekdayHours) {
    return { isOpen: withinHoursStr(p.weekdayHours, cur), todayHours: p.weekdayHours, todayLabel: "평일" };
  }
  return { isOpen: p.isOpenNow, todayHours: null, todayLabel: "" };
}

// ─── 지도 팝업 ────────────────────────────────────────────────
function MapModal({ name, address, onClose }: { name: string; address: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#f5f5f7]">
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#1d1d1f] truncate">{name}</p>
              <p className="text-[12px] text-[#6e6e73] mt-0.5 line-clamp-1">{address}</p>
            </div>
            <button onClick={onClose} className="ml-3 shrink-0 active:opacity-60">
              <X size={20} className="text-[#6e6e73]" />
            </button>
          </div>
          <div style={{ height: 300 }}>
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&hl=ko`}
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title={name}
            />
          </div>
          <div className="px-5 pb-10 pt-3">
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 bg-[#0071e3] rounded-xl flex items-center justify-center gap-2 text-white text-[14px] font-bold active:bg-[#0058b0]"
              onClick={e => e.stopPropagation()}
            >
              <MapPin size={15} />
              지도 앱으로 열기
            </a>
          </div>
        </div>
      </div>
    </div>
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
    address: "인천 서구 청마로 19번길 5 (당하동)",
    phone: "032-590-0114",
    distance: "1.5km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: false,
    level: "지역응급의료기관",
  },
  {
    id: "er2",
    name: "인천검단 온누리병원",
    address: "인천 서구 완정로 199 (왕길동)",
    phone: "032-568-9111",
    distance: "2.2km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: false,
    level: "지역응급의료기관",
  },
  {
    id: "er3",
    name: "가톨릭대학교 인천성모병원",
    address: "인천 부평구 동수로 56 (부평동)",
    phone: "1544-9004",
    distance: "8.5km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "권역응급의료센터",
  },
  {
    id: "er4",
    name: "가천대 길병원",
    address: "인천 남동구 남동대로 774번길 21 (구월동)",
    phone: "1577-2299",
    distance: "13.5km",
    isOpen: true,
    hours: "24시간 응급실 운영",
    isPediatric: true,
    level: "권역응급의료센터",
  },
  {
    id: "er5",
    name: "인하대학교병원",
    address: "인천 중구 인항로 27 (신흥동)",
    phone: "032-890-2300",
    distance: "16.0km",
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
  const [mapTarget, setMapTarget] = useState<{ name: string; address: string } | null>(null);

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
              {displayed.map(p => {
                const { isOpen, todayHours, todayLabel } = getPharmacyStatus(p, now);
                return (
                  <div key={p.id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${isOpen ? "bg-[#D1FAE5]" : "bg-[#f5f5f7]"}`}>
                      <PillBottle size={18} className={isOpen ? "text-[#065F46]" : "text-[#86868b]"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 이름 + 거리 */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span className="text-[14px] font-bold text-[#1d1d1f]">{p.name}</span>
                          {p.tags.includes("24시") && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] shrink-0">24시간</span>
                          )}
                        </div>
                        {p.distance && <span className="text-[12px] text-[#86868b] shrink-0">{p.distance}</span>}
                      </div>
                      {/* 주소 */}
                      <p className="text-[12px] text-[#6e6e73] mt-0.5 truncate">{p.address}</p>
                      {/* 영업 상태 + 오늘 시간 */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          isOpen
                            ? "bg-[#D1FAE5] text-[#065F46]"
                            : todayLabel === "주말 미운영"
                              ? "bg-[#f5f5f7] text-[#86868b]"
                              : "bg-[#FEE2E2] text-[#C0392B]"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOpen ? "bg-[#059669]" : "bg-[#86868b]"}`} />
                          {isOpen ? "영업 중" : todayLabel === "주말 미운영" ? "주말 미운영" : "영업 종료"}
                        </span>
                        {todayHours && (
                          <span className="text-[12px] text-[#424245] font-semibold">
                            {todayLabel && todayLabel !== "주말 미운영" ? `${todayLabel} · ` : ""}{todayHours.replace(/^(매일|평일|토·일)\s*/, "")}
                          </span>
                        )}
                      </div>
                      {/* 기타 운영 시간 */}
                      <div className="flex gap-3 mt-1.5 flex-wrap">
                        {p.weekdayHours && todayLabel !== "평일" && (
                          <span className="text-[11px] text-[#86868b]">
                            <span className="font-semibold text-[#424245]">평일</span> {p.weekdayHours}
                          </span>
                        )}
                        {p.weekendHours && todayLabel !== "주말" && (
                          <span className="text-[11px] text-[#86868b]">
                            <span className="font-semibold text-[#0071e3]">주말</span> {p.weekendHours.replace(/^토·일\s*/, "")}
                          </span>
                        )}
                        {p.nightHours && todayLabel !== "심야" && (
                          <span className="text-[11px] text-[#86868b]">
                            <span className="font-semibold text-[#6366F1]">심야</span> {p.nightHours.replace(/^(매일|평일)\s*/, "")}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* 버튼 */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setMapTarget({ name: p.name, address: p.address })}
                          className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#d0e4fb]">
                          <MapPin size={14} className="text-[#0071e3]" />
                        </button>
                        <a href={`tel:${p.phone}`} className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#d0e4fb]">
                          <Phone size={14} className="text-[#0071e3]" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-[#FEE2E2]">
                  {mainType === "소아응급실"
                    ? <span className="text-[18px]">👶</span>
                    : <AlertTriangle size={18} className="text-[#F04452]" />}
                </div>
                <div className="flex-1 min-w-0">
                  {/* 이름 + 거리 */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-bold text-[#1d1d1f] leading-snug">{er.name}</span>
                    <span className="text-[12px] text-[#86868b] shrink-0">{er.distance}</span>
                  </div>
                  {/* 분류 + 소아과 뱃지 */}
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#F04452]">{er.level}</span>
                    {er.isPediatric && mainType === "응급실" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]">소아과 가능</span>
                    )}
                  </div>
                  {/* 주소 */}
                  <p className="text-[12px] text-[#6e6e73] mt-1 truncate">{er.address}</p>
                  {/* 영업 상태 + 운영 시간 */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#D1FAE5] text-[#065F46]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0" />
                      운영 중
                    </span>
                    <span className="text-[12px] text-[#424245] font-semibold">{er.hours}</span>
                  </div>
                </div>
                {/* 버튼 */}
                <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMapTarget({ name: er.name, address: er.address })}
                      className="w-8 h-8 bg-[#FEE2E2] rounded-xl flex items-center justify-center active:opacity-70">
                      <MapPin size={14} className="text-[#F04452]" />
                    </button>
                    <a href={`tel:${er.phone}`} className="w-8 h-8 bg-[#FEE2E2] rounded-xl flex items-center justify-center active:opacity-70">
                      <Phone size={14} className="text-[#F04452]" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {mapTarget && (
        <MapModal
          name={mapTarget.name}
          address={mapTarget.address}
          onClose={() => setMapTarget(null)}
        />
      )}
    </section>
  );
}

// ─── 홈 위젯 사용자 설정 ─────────────────────────────────────
const USER_WIDGET_KEY = "homeWidgetUserConfig";

function loadUserWidgets(): WidgetConfig[] | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem(USER_WIDGET_KEY);
    return s ? (JSON.parse(s) as WidgetConfig[]) : null;
  } catch { return null; }
}

function saveUserWidgets(ws: WidgetConfig[]): void {
  try { localStorage.setItem(USER_WIDGET_KEY, JSON.stringify(ws)); } catch {}
}

function WidgetSettingsSheet({
  widgets,
  onSave,
  onClose,
}: {
  widgets: WidgetConfig[];
  onSave: (ws: WidgetConfig[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<WidgetConfig[]>(widgets);

  function move(i: number, dir: -1 | 1) {
    const t = i + dir;
    if (t < 0 || t >= draft.length) return;
    const next = [...draft];
    [next[i], next[t]] = [next[t], next[i]];
    setDraft(next.map((w, idx) => ({ ...w, sort_order: idx + 1 })));
  }

  function toggle(id: string) {
    setDraft(d => d.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }

  function reset() {
    setDraft(DEFAULT_WIDGETS.map((w, i) => ({ ...w, sort_order: i + 1 })));
  }

  return (
    <div className="fixed inset-0 z-[200]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center">
        <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
          </div>
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#f5f5f7]">
            <div>
              <p className="text-[17px] font-bold text-[#1d1d1f]">홈 화면 설정</p>
              <p className="text-[12px] text-[#86868b] mt-0.5">위젯 순서와 표시 여부를 설정하세요</p>
            </div>
            <button onClick={onClose} className="active:opacity-60 p-1">
              <X size={20} className="text-[#6e6e73]" />
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
            {draft.map((w, i) => (
              <div key={w.id}
                className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#f5f5f7] transition-opacity ${!w.enabled ? "opacity-40" : ""}`}>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="p-0.5 disabled:opacity-20 active:opacity-50 transition-opacity">
                    <ChevronUp size={15} className="text-[#86868b]" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === draft.length - 1}
                    className="p-0.5 disabled:opacity-20 active:opacity-50 transition-opacity">
                    <ChevronDown size={15} className="text-[#86868b]" />
                  </button>
                </div>
                <span className="text-[12px] font-black text-[#86868b] w-4 text-center shrink-0">{i + 1}</span>
                <span className="flex-1 text-[15px] font-semibold text-[#1d1d1f]">{w.label}</span>
                <button onClick={() => toggle(w.id)}
                  className={`w-[46px] h-[26px] rounded-full transition-colors relative shrink-0 ${w.enabled ? "bg-[#0071e3]" : "bg-[#d2d2d7]"}`}>
                  <span className={`absolute top-[3px] w-5 h-5 bg-white rounded-full shadow transition-all ${w.enabled ? "left-[23px]" : "left-[3px]"}`} />
                </button>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 flex gap-3">
            <button onClick={reset}
              className="h-12 px-5 rounded-2xl border border-[#d2d2d7] text-[14px] font-semibold text-[#6e6e73] active:bg-[#f5f5f7] transition-colors shrink-0">
              초기화
            </button>
            <button onClick={() => { onSave(draft); onClose(); }}
              className="flex-1 h-12 rounded-2xl bg-[#0071e3] text-white text-[15px] font-bold active:bg-[#0058b0] transition-colors">
              완료
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 섹션 헤더 (모든 위젯 공통) ──────────────────────────────
function SectionLabel({
  label,
  badge,
  href,
  linkLabel = "전체보기",
}: {
  label: string;
  badge?: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-5 pb-2.5">
      <div className="flex items-center gap-2">
        <span className="text-[16px] font-extrabold text-[#1d1d1f]">{label}</span>
        {badge}
      </div>
      {href && (
        <Link href={href} className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5">
          {linkLabel} <ChevronRight size={13} />
        </Link>
      )}
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

// ─── 홈 교통 위젯 (전광판 스타일) ────────────────────────────
const STOP_NAME: Record<string, string> = Object.fromEntries(
  GEUMDAN_BUS_STATIONS.map(s => [s.stationId, s.name])
);
const ALL_SUBWAY_STATIONS = getAllSubwayStations();

// 버스 노선 1행
function BusRow({ a, delay }: { a: BusArrival; delay: number }) {
  const arriving = a.arrivalMin <= 2;
  const close    = a.arrivalMin <= 7;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-t border-[#f5f5f7] animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}>
      {/* 노선 번호 */}
      <div className={`rounded-xl px-2.5 py-2 shrink-0 min-w-[52px] text-center ${arriving ? "bg-[#F04452]" : "bg-[#0071e3]"}`}>
        <span className="text-white text-[16px] font-black leading-none tracking-tight">{a.routeNo}</span>
        {a.isExpress && <p className="text-yellow-200 text-[9px] font-bold mt-0.5">급행</p>}
      </div>
      {/* 목적지 */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{a.destination}</p>
        {a.remainingStops > 0 && (
          <p className="text-[11px] text-[#86868b] mt-0.5">{a.remainingStops}정거장 전</p>
        )}
      </div>
      {/* 도착 시간 */}
      <div className={`shrink-0 rounded-2xl px-3 py-2 min-w-[58px] text-center ${
        arriving ? "bg-[#FEE2E2]" : close ? "bg-[#FFF7ED]" : "bg-[#EFF6FF]"
      }`}>
        {arriving ? (
          <span className="text-[#F04452] text-[13px] font-black animate-led-blink">곧도착</span>
        ) : (
          <>
            <span className={`text-[22px] font-black leading-none block ${close ? "text-[#F97316]" : "text-[#0071e3]"}`}>{a.arrivalMin}</span>
            <span className={`text-[10px] ${close ? "text-[#F97316]/70" : "text-[#0071e3]/60"}`}>분 후</span>
          </>
        )}
      </div>
    </div>
  );
}

// 지하철 방향 1행
function SubwayRow({ arrival, lineColor, isEst, delay }: {
  arrival: SubwayArrival; lineColor: string; isEst: boolean; delay: number;
}) {
  const arriving = arrival.arrivalMin <= 2;
  const close    = arrival.arrivalMin <= 7;
  const hasPos   = arrival.currentStation && arrival.currentStation !== "시간표";
  const dirArrow = arrival.direction === "상행" ? "↑" : "↓";

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-t border-[#f5f5f7] animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}>
      {/* 방향 배지 */}
      <div className="rounded-xl px-2.5 py-2 shrink-0 min-w-[52px] text-center" style={{ background: lineColor + "18" }}>
        <span className="text-[18px] font-black leading-none" style={{ color: lineColor }}>{dirArrow}</span>
        {arrival.isExpress && (
          <p className="text-[9px] font-bold mt-0.5" style={{ color: lineColor }}>{arrival.trainTypeName ?? "급행"}</p>
        )}
      </div>
      {/* 종착역 + 현재 위치 */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{arrival.terminalStation} 방면</p>
        <p className="text-[11px] text-[#86868b] mt-0.5">
          {hasPos ? `${arrival.currentStation} 출발` : isEst ? "시간표 기준" : ""}
        </p>
      </div>
      {/* 도착 시간 */}
      <div className={`shrink-0 rounded-2xl px-3 py-2 min-w-[58px] text-center ${
        arriving ? "bg-[#FEE2E2]" : close ? "bg-[#FFF7ED]" : "bg-[#f5f5f7]"
      }`}>
        {arriving ? (
          <span className="text-[#F04452] text-[13px] font-black animate-led-blink">곧도착</span>
        ) : (
          <>
            <span className={`text-[22px] font-black leading-none block ${close ? "text-[#F97316]" : "text-[#1d1d1f]"}`}>{arrival.arrivalMin}</span>
            <span className={`text-[10px] ${close ? "text-[#F97316]/70" : "text-[#86868b]"}`}>분 후</span>
          </>
        )}
      </div>
    </div>
  );
}

function HomeTransportWidget() {
  const router = useRouter();

  const [favStops] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("favStops") ?? "[]")); } catch { return new Set(); }
  });
  const [favRoutes] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("favRoutes") ?? "[]")); } catch { return new Set(); }
  });
  const [busArrivals, setBusArrivals] = useState<Record<string, BusArrival[]>>({});
  const [busLoading, setBusLoading] = useState<Set<string>>(new Set());

  const [favSubways] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("favSubways") ?? "[]")); } catch { return new Set(); }
  });
  const [subwayArrivals, setSubwayArrivals] = useState<Record<string, SubwayArrival[]>>({});
  const [subwayLoading, setSubwayLoading] = useState<Set<string>>(new Set());
  const [globalRefreshing, setGlobalRefreshing] = useState(false);

  const favStopIds = [...favStops];
  const favSubwayStations: SubwayStationWithDist[] = ALL_SUBWAY_STATIONS.filter(s => favSubways.has(s.id));
  const routeFavKey = (stopId: string, a: BusArrival) => `${stopId}::${a.routeId || a.routeNo}`;

  const refreshBusStop = useCallback(async (stopId: string) => {
    setBusLoading(prev => new Set([...prev, stopId]));
    try {
      const data = await fetchArrivalsByStationId(stopId);
      setBusArrivals(prev => ({ ...prev, [stopId]: data }));
    } catch { /* ignore */ } finally {
      setBusLoading(prev => { const n = new Set(prev); n.delete(stopId); return n; });
    }
  }, []);

  const refreshSubwayStation = useCallback(async (station: SubwayStationWithDist) => {
    setSubwayLoading(prev => new Set([...prev, station.id]));
    try {
      const data = await fetchSubwayArrivals(station);
      setSubwayArrivals(prev => ({ ...prev, [station.id]: data }));
    } catch { /* ignore */ } finally {
      setSubwayLoading(prev => { const n = new Set(prev); n.delete(station.id); return n; });
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setGlobalRefreshing(true);
    await Promise.all([
      ...favStopIds.map(id => refreshBusStop(id)),
      ...favSubwayStations.map(st => refreshSubwayStation(st)),
    ]);
    setGlobalRefreshing(false);
  }, [favStopIds, favSubwayStations, refreshBusStop, refreshSubwayStation]);

  useEffect(() => {
    favStopIds.forEach(id => refreshBusStop(id));
    favSubwayStations.forEach(st => refreshSubwayStation(st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBus    = favStops.size > 0;
  const hasSubway = favSubwayStations.length > 0;

  if (!hasBus && !hasSubway) {
    return (
      <section className="mx-4 mb-1">
        <button onClick={() => router.push("/transport/")}
          className="w-full rounded-2xl bg-white px-4 py-4 flex items-center gap-3 active:bg-[#f5f5f7] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
            <Bus size={18} className="text-[#0071e3]" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-bold text-[#1d1d1f]">즐겨찾기한 교통수단이 없어요</p>
            <p className="text-[12px] text-[#86868b] mt-0.5">교통 탭에서 버스·지하철을 즐겨찾기해 보세요</p>
          </div>
          <ChevronRight size={16} className="text-[#d2d2d7] shrink-0" />
        </button>
      </section>
    );
  }

  return (
    <section className="mx-4 mb-1 space-y-2.5">

      {/* ── 버스 정류장 카드 ── */}
      {hasBus && favStopIds.map(stopId => {
        const stopArrivals = busArrivals[stopId] ?? [];
        const hasFavRoutes = stopArrivals.some(a => favRoutes.has(routeFavKey(stopId, a)));
        const displayed = hasFavRoutes
          ? stopArrivals.filter(a => favRoutes.has(routeFavKey(stopId, a)))
          : stopArrivals.slice(0, 3);
        const stopName = STOP_NAME[stopId] ?? "정류장";
        const isLoading = busLoading.has(stopId);

        return (
          <div key={stopId} className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{ borderLeft: "4px solid #0071e3" }}>
            {/* 정류장 헤더 */}
            <div className="px-4 pt-3.5 pb-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Bus size={14} className="text-[#0071e3]" />
              </div>
              <span className="text-[#1d1d1f] font-extrabold text-[15px] flex-1 truncate">{stopName}</span>
              <button onClick={() => refreshBusStop(stopId)} disabled={isLoading}
                className="w-8 h-8 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:bg-[#e5e5ea] disabled:opacity-40">
                <RefreshCw size={13} className={`text-[#86868b] ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {/* 도착 정보 */}
            {isLoading ? (
              <div className="px-4 pb-4 space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
              </div>
            ) : displayed.length === 0 ? (
              <p className="px-4 pb-4 text-[#86868b] text-[13px]">도착 정보 없음</p>
            ) : displayed.map((a, i) => (
              <BusRow key={i} a={a} delay={i * 60} />
            ))}
          </div>
        );
      })}

      {/* ── 지하철 역 카드 ── */}
      {hasSubway && favSubwayStations.map(st => {
        const live = subwayArrivals[st.id];
        const displayArrivals = live && live.length > 0 ? live : estimateNextArrivals(st.timetable);
        const isEst = !live || live.length === 0;
        const nextUp   = displayArrivals.find(a => a.direction === "상행");
        const nextDown = displayArrivals.find(a => a.direction === "하행");
        const isLoading = subwayLoading.has(st.id);

        return (
          <div key={st.id} className="bg-white rounded-2xl overflow-hidden shadow-sm"
            style={{ borderLeft: `4px solid ${st.lineColor}` }}>
            {/* 역 헤더 */}
            <div className="px-4 pt-3.5 pb-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: st.lineColor + "18" }}>
                <Train size={14} style={{ color: st.lineColor }} />
              </div>
              <div className="flex-1 min-w-0 flex items-baseline gap-1.5">
                <span className="text-[#1d1d1f] font-extrabold text-[15px] truncate">{st.displayName}</span>
                <span className="text-[11px] font-bold shrink-0" style={{ color: st.lineColor }}>{st.line}</span>
              </div>
              <button onClick={() => refreshSubwayStation(st)} disabled={isLoading}
                className="w-8 h-8 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:bg-[#e5e5ea] disabled:opacity-40">
                <RefreshCw size={13} className={`text-[#86868b] ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {/* 도착 정보 */}
            {isLoading ? (
              <div className="px-4 pb-4 space-y-2">
                {[1, 2].map(i => <div key={i} className="h-10 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
              </div>
            ) : !nextUp && !nextDown ? (
              <p className="px-4 pb-4 text-[#86868b] text-[13px]">운행 종료 또는 정보 없음</p>
            ) : (
              <>
                {nextUp   && <SubwayRow arrival={nextUp}   lineColor={st.lineColor} isEst={isEst} delay={0}  />}
                {nextDown && <SubwayRow arrival={nextDown} lineColor={st.lineColor} isEst={isEst} delay={60} />}
              </>
            )}
          </div>
        );
      })}

      {/* ── 하단 액션 바 ── */}
      <div className="bg-white rounded-2xl flex overflow-hidden shadow-sm">
        <button onClick={refreshAll} disabled={globalRefreshing}
          className="flex items-center justify-center gap-1.5 py-3.5 px-5 active:bg-[#f5f5f7] disabled:opacity-50">
          <RefreshCw size={14} className={`text-[#86868b] ${globalRefreshing ? "animate-spin" : ""}`} />
          <span className="text-[13px] text-[#86868b] font-medium">새로고침</span>
        </button>
        <div className="w-px bg-[#f5f5f7]" />
        <button onClick={() => router.push("/transport/")}
          className="flex-1 py-3.5 flex items-center justify-center gap-1 active:bg-[#f5f5f7]">
          <span className="text-[13px] text-[#0071e3] font-semibold">전체보기</span>
          <ChevronRight size={14} className="text-[#0071e3]" />
        </button>
      </div>
    </section>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userNickname, setUserNickname] = useState("검단주민");
  const [homeBanners, setHomeBanners] = useState<Banner[]>([]);

  useEffect(() => {
    fetchWeather().then(w => { setWeather(w); setWeatherLoading(false); });
    getUserProfile().then(p => setUserNickname(p.nickname));
    fetchActiveBanners().then(setHomeBanners);
    const local = loadUserWidgets();
    if (local) {
      setWidgets(local);
    } else {
      fetchWidgetConfig().then(cfg => setWidgets(cfg));
    }
  }, []);

  function handleSaveWidgets(updated: WidgetConfig[]) {
    setWidgets(updated);
    saveUserWidgets(updated);
  }

  // 위젯 ID → 렌더 함수 맵 (weather/router 클로저 캡처)
  const widgetRenderers: Record<string, () => React.ReactNode> = {
    greeting: () => <GreetingBanner weather={weather} nickname={userNickname} />,
    banners: () => homeBanners.length > 0 ? <BannerCarousel banners={homeBanners} /> : null,
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
    coupons: () => <CouponSection />,
    openings: () => <NewOpeningsSection />,
    mart: () => <MartSection />,
    pharmacy: () => (
      <>
        <SectionLabel label="약국·응급실" />
        <PharmacySection />
      </>
    ),
    transport: () => (
      <>
        <SectionLabel label="교통" href="/transport/" linkLabel="전체보기" />
        <HomeTransportWidget />
      </>
    ),
    sosik: () => (
      <>
        <SectionLabel label="검단 소식" href="/community/" />
        <SosikSection />
      </>
    ),
  };

  const activeWidgets = widgets.length > 0
    ? widgets.filter(w => w.enabled)
    : DEFAULT_WIDGETS;

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-20">
      <Header
        showLocation
        rightAction={
          <button onClick={() => setShowSettings(true)}
            className="active:opacity-50 transition-opacity p-0.5">
            <Settings2 size={21} className="text-[#1d1d1f]" />
          </button>
        }
      />

      {showSettings && (
        <WidgetSettingsSheet
          widgets={widgets.length > 0 ? widgets : DEFAULT_WIDGETS}
          onSave={handleSaveWidgets}
          onClose={() => setShowSettings(false)}
        />
      )}

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
