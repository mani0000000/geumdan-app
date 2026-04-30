"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users,
  Star, Ticket, X, MapPin, Calendar, Train,
  TrendingDown, Phone, Clock, PillBottle, Store, AlertTriangle, RefreshCw, Settings2, ExternalLink,
  LocateFixed, Loader2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import CouponCard, { loadDownloaded, saveDownloaded } from "@/components/ui/CouponCard";
import { posts, newsItems, apartments, myHomes as initialMyHomes, coupons as mockCoupons, pharmacies as mockPharmacies } from "@/lib/mockData";
import { fetchThisMonthOpenings } from "@/lib/db/stores";
import type { NewStoreOpening } from "@/lib/types";
import { fetchGeumdanNews, type NewsArticle } from "@/lib/api/news";
import type { Pharmacy } from "@/lib/mockData";
import { fetchMarts, type Mart, type MartClosingPattern } from "@/lib/db/marts";
import { fetchAllPharmacies, fetchEmergencyRooms } from "@/lib/db/pharmacies";
import { getUserProfile } from "@/lib/db/userdata";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";
import { fetchArrivalsByStationId, GEUMDAN_BUS_STATIONS, haversineM, type BusArrival } from "@/lib/api/bus";
import { GEUMDAN_CENTER } from "@/lib/geumdan";
import { getAllSubwayStations, fetchSubwayArrivals, estimateNextArrivals, type SubwayStationWithDist, type SubwayArrival } from "@/lib/api/subway";
import { fetchWidgetConfig, type WidgetConfig, DEFAULT_WIDGETS } from "@/lib/db/widget-config";
import { fetchActiveCoupons } from "@/lib/db/stores";
import type { Coupon } from "@/lib/types";
import { fetchActiveBanners, type Banner } from "@/lib/db/banners";
import BannerCarousel from "@/components/ui/BannerCarousel";
import { fetchYouTubeVideosFromDB } from "@/lib/db/youtube";
import { fetchInstagramPosts } from "@/lib/db/instagram";
import { fetchPublishedPlaces, CATEGORY_META, type Place } from "@/lib/db/places";
import {
  fetchUpcomingSportsMatches, fetchSportsAssets, TEAM_META, LEAGUE_STYLES, TEAM_LOGOS, LEAGUE_STANDINGS,
  DEFAULT_SPORTS_ASSETS,
  type SportsMatch, type TeamCode, type Standing, type SportsAssets,
} from "@/lib/db/sports";
import { getTideReport, type TideReport, type ConditionRating } from "@/lib/api/tides";
import type { YouTubeVideo } from "@/lib/api/news";
import type { NewsItem } from "@/lib/types";

// ─── 퀵 메뉴 ─────────────────────────────────────────────────
const quickMenus = [
  { icon: Bus,           label: "버스",    href: "/transport/",   color: "#3B5BDB" },
  { icon: HomeIcon,      label: "부동산",  href: "/community/?tab=시세", color: "#2F9E44" },
  { icon: Newspaper,     label: "뉴스",    href: "/news/",        color: "#E03131" },
  { icon: MessageCircle, label: "커뮤니티",href: "/community/",   color: "#7048E8" },
  { icon: Ticket,        label: "쿠폰",    href: "/coupons/",     color: "#E67700" },
  { icon: Store,         label: "상가",    href: "/stores/",      color: "#0C8599" },
  { icon: ShoppingBag,   label: "중고거래",href: "/community/",   color: "#C2255C" },
  { icon: Star,          label: "즐겨찾기",href: "/mypage/",      color: "#D9480F" },
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
      <div className="mx-4 mt-3 mb-3 bg-[#0071e3] rounded-2xl p-4 animate-pulse">
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
      <div className={`mx-4 mt-3 mb-3 bg-gradient-to-br ${gradient} rounded-2xl overflow-hidden`}>
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
function OpenBenefitSheet({ store, onClose }: { store: NewStoreOpening; onClose: () => void }) {
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
  const [openings, setOpenings] = useState<NewStoreOpening[]>([]);
  const [sheetStore, setSheetStore] = useState<NewStoreOpening | null>(null);

  useEffect(() => {
    fetchThisMonthOpenings().then(setOpenings);
  }, []);

  if (openings.length === 0) return null;

  return (
    <section className="mb-1">
      <SectionLabel
        label="이번달 오픈"
        badge={<span className="text-[10px] font-black bg-[#F04452] text-white px-2 py-0.5 rounded-full tracking-wide">NEW</span>}
        href="/stores/"
      />
      <div className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {openings.map(s => {
          const [from, to] = catGradients[s.category] ?? catGradients["기타"];
          return (
            <button key={s.id} onClick={() => setSheetStore(s)}
              className="shrink-0 w-[156px] bg-white rounded-2xl overflow-hidden shadow-sm active:scale-95 transition-transform border border-[#f0f0f0]">
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

// ─── 커뮤니티 위젯 ────────────────────────────────────────────
function CommunityWidget() {
  const router = useRouter();
  const hotPosts = posts.filter(p => p.isHot).slice(0, 4);
  if (hotPosts.length === 0) return null;
  return (
    <section className="mx-4 mb-1 space-y-2">
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
    </section>
  );
}

// ─── 뉴스 위젯 ────────────────────────────────────────────────
function NewsWidget() {
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  useEffect(() => {
    fetchGeumdanNews().then(result => {
      if (result.articles.length > 0) setRealNews(result.articles.slice(0, 4));
    });
  }, []);
  const topNews = realNews.length > 0 ? realNews : newsItems.slice(0, 4);
  if (topNews.length === 0) return null;
  return (
    <section className="mx-4 mb-1 space-y-2">
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
    </section>
  );
}

// ─── 유튜브 위젯 ─────────────────────────────────────────────
function YouTubeSection() {
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  useEffect(() => { fetchYouTubeVideosFromDB(6).then(r => setVideos(r.videos)); }, []);
  if (!videos?.length) return null;
  return (
    <>
      <SectionLabel label="유튜브 소식" href="/news/" linkLabel="전체보기" />
      <section className="mb-1">
        <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {videos.map(v => (
              <a key={v.videoId} href={v.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 w-[240px] bg-white rounded-2xl overflow-hidden active:opacity-80 shadow-sm">
                <div className="relative w-full aspect-video bg-[#f5f5f7]">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  {/* 재생 버튼 — 우측 상단 */}
                  <div className="absolute top-2 right-2">
                    <div className="w-8 h-8 bg-[#FF0000]/90 rounded-full flex items-center justify-center shadow-md">
                      <div className="w-0 h-0 border-y-[5px] border-y-transparent border-l-[9px] border-l-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[13px] font-semibold text-[#1d1d1f] line-clamp-2 leading-snug">{v.title}</p>
                  <p className="text-[12px] text-[#86868b] mt-1">{v.channelName}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── 인스타그램 위젯 ──────────────────────────────────────────
function InstagramSection() {
  const [posts, setPosts] = useState<NewsItem[] | null>(null);
  useEffect(() => { fetchInstagramPosts(6).then(setPosts); }, []);
  if (!posts?.length) return null;
  return (
    <>
      <SectionLabel label="인스타 소식" href="/news/" linkLabel="전체보기" />
      <section className="mb-1">
        <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {posts.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden active:opacity-80">
                <div className="w-full aspect-square bg-[#f5f5f7]">
                  {p.thumbnail
                    ? <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[28px]">📷</div>
                  }
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-bold text-[#DD2A7B]">{p.source}</p>
                  <p className="text-[11px] text-[#4E5968] mt-0.5 line-clamp-2 leading-snug">{p.title}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
// ─── 가볼만한곳 상세 바텀시트 ────────────────────────────────
function PlaceDetailSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const meta = CATEGORY_META[place.category];
  const q = encodeURIComponent(place.address || place.name);
  const mapUrl = place.lat && place.lng
    ? `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.lat},${place.lng}`
    : `https://map.kakao.com/link/search/${q}`;

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden max-h-[85dvh] flex flex-col">
          {/* 핸들 */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
          </div>

          {/* 스크롤 영역 */}
          <div className="overflow-y-auto flex-1">
            {/* 썸네일 */}
            <div className="w-full h-[200px] relative shrink-0">
              {place.thumbnail_url
                ? <img src={place.thumbnail_url} alt={place.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-[64px]" style={{ background: meta.bg }}>🗺️</div>
              }
              <button onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center active:opacity-70">
                <X size={16} className="text-white" />
              </button>
              <span className="absolute bottom-3 left-3 text-[12px] font-bold px-2.5 py-1 rounded-lg"
                style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            </div>

            {/* 기본 정보 */}
            <div className="px-5 pt-4 pb-3">
              <h2 className="text-[20px] font-black text-[#1d1d1f]">{place.name}</h2>
              {(place.distance_km != null || place.drive_min != null) && (
                <p className="text-[13px] text-[#3182F6] font-semibold mt-0.5">
                  {place.distance_km != null ? `${place.distance_km}km` : ""}
                  {place.distance_km != null && place.drive_min != null ? " · " : ""}
                  {place.drive_min != null ? `차로 ${place.drive_min}분` : ""}
                </p>
              )}
              <p className="text-[14px] text-[#424245] mt-2 leading-relaxed">{place.description || place.short_desc}</p>

              {/* 태그 */}
              {place.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {place.tags.map(t => (
                    <span key={t} className="text-[12px] px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#424245] font-medium">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* 상세 정보 */}
            <div className="mx-4 mb-3 bg-[#f5f5f7] rounded-2xl px-4 py-3 space-y-2.5">
              {place.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={14} className="text-[#3182F6] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[#1d1d1f]">{place.address}</p>
                </div>
              )}
              {place.operating_hours && (
                <div className="flex items-start gap-2.5">
                  <Clock size={14} className="text-[#3182F6] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[#1d1d1f]">{place.operating_hours}</p>
                </div>
              )}
              {place.admission_fee && (
                <div className="flex items-start gap-2.5">
                  <Tag size={14} className="text-[#3182F6] mt-0.5 shrink-0" />
                  <p className="text-[13px] text-[#1d1d1f]">{place.admission_fee}</p>
                </div>
              )}
              {place.phone && (
                <div className="flex items-start gap-2.5">
                  <Phone size={14} className="text-[#3182F6] mt-0.5 shrink-0" />
                  <a href={`tel:${place.phone}`} className="text-[13px] text-[#0071e3]">{place.phone}</a>
                </div>
              )}
            </div>

            {/* 지도/홈피 버튼 */}
            <div className="px-4 pb-10 flex gap-2">
              <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                className="flex-1 h-11 rounded-xl bg-[#FEE500] text-[#3C1E1E] flex items-center justify-center gap-1.5 text-[14px] font-bold active:opacity-80">
                <MapPin size={15} />카카오맵
              </a>
              {place.website && (
                <a href={place.website} target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-11 rounded-xl bg-[#3182F6] text-white flex items-center justify-center gap-1.5 text-[14px] font-bold active:opacity-80">
                  <ExternalLink size={15} />홈페이지
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 가볼만한곳 위젯 ─────────────────────────────────────────
function PlacesSection() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [selected, setSelected] = useState<Place | null>(null);
  useEffect(() => { fetchPublishedPlaces().then(setPlaces).catch(() => setPlaces([])); }, []);
  if (!places?.length) return null;
  return (
    <>
      <SectionLabel label="가볼만한곳" href="/transport/?tab=가볼만한곳" linkLabel="전체보기" />
      <section className="mb-1">
        <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {places.slice(0, 8).map(p => {
              const meta = CATEGORY_META[p.category];
              return (
                <button key={p.id} onClick={() => setSelected(p)}
                  className="shrink-0 w-[210px] bg-white rounded-2xl overflow-hidden active:opacity-80 shadow-sm text-left">
                  <div className="w-full h-[130px] relative">
                    {p.thumbnail_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-[48px]"
                          style={{ background: meta.bg }}>
                          🗺️
                        </div>
                    }
                    <span className="absolute top-2 left-2 text-[11px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{p.name}</p>
                    <p className="text-[12px] text-[#86868b] mt-0.5 line-clamp-2 leading-snug">{p.short_desc}</p>
                    {(p.distance_km != null || p.drive_min != null) && (
                      <p className="text-[12px] text-[#3182F6] mt-1.5 font-semibold">
                        {p.distance_km != null ? `${p.distance_km}km` : ""}
                        {p.distance_km != null && p.drive_min != null ? " · " : ""}
                        {p.drive_min != null ? `차로 ${p.drive_min}분` : ""}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
      {selected && <PlaceDetailSheet place={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

// ─── 조석/해루질/낚시 위젯 ──────────────────────────────────────
// timeOffsetMin: 인천 기준 대비 시간 보정(분), rangeRatio: 조차 비율
const TIDE_SPOTS = {
  haerujil: [
    { name: "강화 여차리 갯벌",     type: "갯벌", dist: "약 45km", timeOffsetMin:  20, rangeRatio: 1.05, lat: 37.6124, lng: 126.4343 },
    { name: "영종도 북쪽 갯벌",     type: "갯벌", dist: "약 20km", timeOffsetMin:  -5, rangeRatio: 0.97, lat: 37.5396, lng: 126.4768 },
    { name: "소래습지생태공원",     type: "갯벌", dist: "약 15km", timeOffsetMin:  10, rangeRatio: 0.90, lat: 37.4278, lng: 126.7373 },
    { name: "시흥 오이도 갯벌",     type: "갯벌", dist: "약 35km", timeOffsetMin:  25, rangeRatio: 0.87, lat: 37.3476, lng: 126.6765 },
    { name: "대부도 방아머리 갯벌", type: "갯벌", dist: "약 50km", timeOffsetMin:  35, rangeRatio: 0.80, lat: 37.2543, lng: 126.5671 },
  ],
  fishing: [
    { name: "소래포구 방파제",    type: "방파제", dist: "약 15km", timeOffsetMin:  10, rangeRatio: 0.90, lat: 37.4264, lng: 126.7456 },
    { name: "인천항 갑문 선착장", type: "선착장", dist: "약 18km", timeOffsetMin:   0, rangeRatio: 1.00, lat: 37.4604, lng: 126.5949 },
    { name: "영종도 삼목선착장",  type: "선착장", dist: "약 22km", timeOffsetMin:  -5, rangeRatio: 0.97, lat: 37.4959, lng: 126.4462 },
    { name: "강화 외포리 선착장", type: "선착장", dist: "약 45km", timeOffsetMin:  25, rangeRatio: 1.02, lat: 37.6441, lng: 126.4176 },
    { name: "대부도 방아머리항",  type: "항구",   dist: "약 50km", timeOffsetMin:  35, rangeRatio: 0.80, lat: 37.2543, lng: 126.5671 },
  ],
};

function TideSection() {
  const [report, setReport] = useState<TideReport | null>(null);
  const [tab, setTab] = useState<"haerujil" | "fishing">("haerujil");
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);

  useEffect(() => {
    setReport(getTideReport(new Date()));
  }, []);

  if (!report) return null;

  const { multtae, todayTides, nextLowTide, haerujil, fishing, seasonalNote } = report;
  const activity = tab === "haerujil" ? haerujil : fishing;

  const sizeLabel = multtae.size === "large" ? "대조기" : multtae.size === "medium" ? "중간" : "소조기";
  const sizeColor = multtae.size === "large" ? "#0071e3" : multtae.size === "medium" ? "#34C759" : "#8E8E93";

  const ratingMeta: Record<ConditionRating, { label: string; bg: string; text: string; accent: string }> = {
    excellent: { label: "최적",   bg: "#F0FDF4", text: "#15803D", accent: "#16A34A" },
    good:      { label: "가능",   bg: "#EFF6FF", text: "#1D4ED8", accent: "#2563EB" },
    poor:      { label: "어려움", bg: "#FFF1F2", text: "#BE123C", accent: "#E11D48" },
  };
  const rm = ratingMeta[activity.rating];

  const spots = TIDE_SPOTS[tab];
  const maxH = Math.max(...todayTides.map(t => t.heightM));
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  // 분 → HH:MM 변환 (인라인)
  const toTime = (min: number) => {
    const m = ((min % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  };

  return (
    <>
      <SectionLabel label="서해안 물때 정보" />
      <section className="mx-4 mb-1 space-y-3">

        {/* ── 물때 + 조석 차트 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[26px] font-black text-[#1d1d1f] leading-none">{multtae.number}물</span>
                <span className="text-[16px] font-bold text-[#1d1d1f]">{multtae.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: sizeColor }}>
                  {sizeLabel}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                음력 {multtae.lunarMonth}월 {multtae.lunarDay}일 · 인천 조차 {multtae.rangeM}m
              </p>
            </div>
            {nextLowTide && (
              <div className="bg-blue-50 rounded-xl px-3 py-2 text-center min-w-[68px]">
                <p className="text-[9px] text-blue-400 font-semibold">다음 저조</p>
                <p className="text-[18px] font-black text-[#0071e3] leading-tight">{nextLowTide.timeStr}</p>
              </div>
            )}
          </div>

          {/* 조석 곡선 차트 */}
          {(() => {
            const W = 320; const H = 72; const PAD_X = 28; const PAD_Y = 8;
            const minH2 = Math.min(...todayTides.map(t => t.heightM));
            const range = maxH - minH2 || 1;
            const toX = (i: number) => PAD_X + (i / (todayTides.length - 1)) * (W - PAD_X * 2);
            const toY = (h: number) => PAD_Y + (1 - (h - minH2) / range) * (H - PAD_Y * 2);
            const pts = todayTides.map((t, i) => ({ x: toX(i), y: toY(t.heightM) }));
            // 스무스 베지어 곡선
            let d = `M${pts[0].x},${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
              const cp1x = (pts[i - 1].x + pts[i].x) / 2;
              d += ` C${cp1x},${pts[i - 1].y} ${cp1x},${pts[i].y} ${pts[i].x},${pts[i].y}`;
            }
            const fill = `${d} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;
            const nowX = PAD_X + (nowMin / 1440) * (W - PAD_X * 2);
            return (
              <div className="border-t border-gray-50 px-3 pt-2 pb-1">
                <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full" style={{ height: 96 }}>
                  <defs>
                    <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0071e3" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  {/* 그라데이션 fill */}
                  <path d={fill} fill="url(#tideGrad)" />
                  {/* 곡선 선 */}
                  <path d={d} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinecap="round" />
                  {/* 현재 시각 세로선 */}
                  {nowX >= PAD_X && nowX <= W - PAD_X && (
                    <line x1={nowX} y1={PAD_Y} x2={nowX} y2={H}
                      stroke="#F97316" strokeWidth="1.5" strokeDasharray="3,3" />
                  )}
                  {/* 데이터 포인트 레이블 */}
                  {pts.map((p, i) => {
                    const t = todayTides[i];
                    const isLow = t.type === "low";
                    return (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={3.5} fill={isLow ? "#BFDBFE" : "#0071e3"} stroke="white" strokeWidth="1.5" />
                        <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="8" fontWeight="700"
                          fill={isLow ? "#9CA3AF" : "#0071e3"}>{t.heightM}m</text>
                        <text x={p.x} y={H + 11} textAnchor="middle" fontSize="9" fontWeight="600" fill="#1d1d1f">{t.timeStr}</text>
                        <text x={p.x} y={H + 21} textAnchor="middle" fontSize="8" fill="#9CA3AF">{isLow ? "저조" : "고조"}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            );
          })()}
        </div>

        {/* ── 탭 ── */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([["haerujil", "🦀 해루질"], ["fishing", "🎣 낚시"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
                tab === key ? "bg-white text-[#1d1d1f] shadow-sm" : "text-gray-400"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 활동 조건 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3" style={{ background: rm.bg }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-extrabold" style={{ color: rm.text }}>
                  {tab === "haerujil" ? "해루질" : "낚시"} {rm.label}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: rm.accent }}>
                  {activity.title}
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3].map(n => (
                  <div key={n} className="w-4 h-4 rounded-full"
                    style={{ background: n <= activity.stars ? rm.accent : "rgba(0,0,0,0.1)" }} />
                ))}
              </div>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: rm.text }}>
              {activity.reason}
            </p>
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-[12px] text-gray-600 font-medium">💡 {activity.tip}</p>
          </div>
        </div>

        {/* ── 추천 스팟 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-[12px] font-bold text-gray-700">
              📍 {tab === "haerujil" ? "해루질" : "낚시"} 추천 스팟
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {spots.map((s, i) => {
              // 스팟별 조석 보정
              const spotRange = parseFloat((multtae.rangeM * s.rangeRatio).toFixed(1));
              const spotLowTides = todayTides
                .filter(t => t.type === "low")
                .map(t => {
                  const corrMin = ((t.minutes + s.timeOffsetMin) + 1440) % 1440;
                  return { ...t, minutes: corrMin, timeStr: toTime(corrMin) };
                });
              const nextSpotLow = spotLowTides.find(t => t.minutes > nowMin) ?? spotLowTides[0];
              const sameAsIncheon = Math.abs(s.timeOffsetMin) < 5 && Math.abs(s.rangeRatio - 1) < 0.03;

              return (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-400">{s.type} · {s.dist}</span>
                      {!sameAsIncheon && nextSpotLow && (
                        <>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-500">
                            저조 <span className="font-semibold text-[#0071e3]">{nextSpotLow.timeStr}</span>
                          </span>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-500">조차 <span className="font-semibold">{spotRange}m</span></span>
                        </>
                      )}
                      {sameAsIncheon && (
                        <>
                          <span className="text-[10px] text-gray-300">·</span>
                          <span className="text-[10px] text-gray-400">인천과 동일</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMapTarget({ name: s.name, address: s.name, lat: s.lat, lng: s.lng })}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-50 text-[11px] font-bold text-yellow-700"
                  >
                    지도 ↗
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 계절 안내 ── */}
        {seasonalNote && (
          <div className="rounded-xl bg-amber-50 px-4 py-3">
            <p className="text-[12px] text-amber-800 leading-relaxed">🌊 {seasonalNote}</p>
          </div>
        )}
      </section>
      {mapTarget && <MapBottomSheet {...mapTarget} onClose={() => setMapTarget(null)} />}
    </>
  );
}

// ─── 스포츠 위젯 헬퍼 ────────────────────────────────────────
function _nameToColor(name: string): string {
  const palette = ["#1e40af","#6d28d9","#be185d","#065f46","#b45309","#991b1b","#0e7490","#4d7c0f"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function _getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 3).toUpperCase();
}

function _getMatchResult(m: SportsMatch): "WIN" | "LOSE" | "DRAW" | null {
  if (m.home_score == null || m.away_score == null) return null;
  const incheonName = TEAM_META[m.team_code].name;
  const isHome = m.home_team === incheonName;
  const myScore = isHome ? m.home_score : m.away_score;
  const oppScore = isHome ? m.away_score : m.home_score;
  if (myScore > oppScore) return "WIN";
  if (myScore < oppScore) return "LOSE";
  return "DRAW";
}

function SportTeamLogo({
  teamCode, teamName, size = 56, logoUrl,
}: { teamCode?: TeamCode; teamName: string; size?: number; logoUrl?: string }) {
  const logo = teamCode ? TEAM_LOGOS[teamCode] : null;
  const bg = logo?.bg ?? _nameToColor(teamName);
  const abbr = logo?.abbr ?? _getInitials(teamName);
  const fg = logo?.fg ?? "#ffffff";
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: size + 16 }}>
      <div className="rounded-full flex items-center justify-center font-black overflow-hidden"
        style={{ width: size, height: size, background: logoUrl ? "transparent" : bg, color: fg, fontSize: Math.floor(size * 0.3) }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={teamName} className="w-full h-full object-cover" />
        ) : abbr}
      </div>
      <p className="text-[10px] text-[#3d3d3d] text-center font-semibold leading-tight"
        style={{ width: size + 16, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {teamName}
      </p>
    </div>
  );
}

// ─── 경기 카드 (가로 배너 스타일) ────────────────────────────
function MatchCard({ m, assets, formatMatchDate }: {
  m: SportsMatch;
  assets: SportsAssets;
  formatMatchDate: (iso: string) => string;
}) {
  const meta = TEAM_META[m.team_code];
  const isLive = m.status === "live";
  const isFinished = m.status === "finished";
  const hasScore = m.home_score != null && m.away_score != null;
  const result = isFinished ? _getMatchResult(m) : null;
  const incheonName = meta.name;
  const isHome = m.home_team === incheonName;
  const teamLogoUrl = assets.teamLogos[m.team_code];

  const homeLogoUrl = isHome ? teamLogoUrl : assets.awayTeamLogos?.[m.home_team];
  const awayLogoUrl = !isHome ? teamLogoUrl : assets.awayTeamLogos?.[m.away_team];
  const homeTeamCode: TeamCode | undefined = isHome ? m.team_code : undefined;
  const awayTeamCode: TeamCode | undefined = !isHome ? m.team_code : undefined;

  const matchDate = m.match_date ? new Date(m.match_date) : null;
  const timeStr = matchDate
    ? matchDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "TBD";
  const dateStr = matchDate ? formatMatchDate(m.match_date) : "";

  // 오른쪽 패널 색상 — 팀 primary color 기반
  const rightBg = meta.color;

  function TeamBadge({ teamCode, teamName, logoUrl }: { teamCode?: TeamCode; teamName: string; logoUrl?: string }) {
    const logo = teamCode ? TEAM_LOGOS[teamCode] : null;
    const bg = logo?.bg ?? _nameToColor(teamName);
    const abbr = logo?.abbr ?? _getInitials(teamName);
    const fg = logo?.fg ?? "#ffffff";
    return (
      <div className="flex flex-col items-center gap-1.5" style={{ width: 72 }}>
        <div className="w-[52px] h-[52px] rounded-full overflow-hidden flex items-center justify-center font-black flex-shrink-0"
          style={{ background: logoUrl ? "transparent" : bg, color: fg, fontSize: 14 }}>
          {logoUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logoUrl} alt={teamName} className="w-full h-full object-cover" />
            : abbr}
        </div>
        <p className="text-[8.5px] font-black text-[#1d1d1f] text-center leading-tight uppercase"
          style={{ width: 72, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {teamName}
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl overflow-hidden flex shadow-sm ${isLive ? "ring-2 ring-red-400" : ""}`}
      style={{ height: 88 }}>
      {/* 왼쪽: 흰색 — 홈팀 VS 원정팀 */}
      <div className="flex-1 bg-white flex items-center px-4 gap-0 min-w-0">
        <TeamBadge teamCode={homeTeamCode} teamName={m.home_team} logoUrl={homeLogoUrl} />

        {/* 중앙: VS or 스코어 */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          {hasScore ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[30px] font-black leading-none text-[#1d1d1f]">{m.home_score}</span>
                <span className="text-[15px] font-black text-[#d1d5db] mb-0.5">:</span>
                <span className="text-[30px] font-black leading-none text-[#1d1d1f]">{m.away_score}</span>
              </div>
              {isLive && <span className="text-[9px] font-black text-red-500 animate-pulse mt-0.5">● 진행중</span>}
              {isFinished && <span className="text-[9px] text-gray-400 mt-0.5">최종</span>}
            </>
          ) : (
            <span className="text-[34px] font-black italic leading-none"
              style={{ color: "transparent", WebkitTextStroke: "1.5px #c8c8c8", letterSpacing: "-1px" }}>
              VS
            </span>
          )}
        </div>

        <TeamBadge teamCode={awayTeamCode} teamName={m.away_team} logoUrl={awayLogoUrl} />
      </div>

      {/* 오른쪽: 팀 컬러 다크 패널 — 날짜/시간 or 결과 */}
      <div className="flex flex-col items-center justify-center text-white flex-shrink-0"
        style={{
          background: rightBg,
          clipPath: "polygon(18px 0, 100% 0, 100% 100%, 0 100%)",
          minWidth: 108,
          paddingLeft: 26,
          paddingRight: 14,
          filter: "brightness(0.85)",
        }}>
        {isLive ? (
          <span className="text-[13px] font-black animate-pulse">● LIVE</span>
        ) : isFinished ? (
          <>
            {result && (
              <span className={`text-[24px] font-black leading-none ${
                result === "WIN" ? "text-emerald-300" : result === "LOSE" ? "text-red-300" : "text-gray-300"
              }`}>{result === "WIN" ? "승" : result === "LOSE" ? "패" : "무"}</span>
            )}
            <span className="text-[9px] opacity-60 mt-1">최종</span>
          </>
        ) : (
          <>
            {dateStr && (
              <span className="text-[9px] font-semibold opacity-75 mb-0.5 whitespace-nowrap">
                {dateStr.replace(timeStr, "").trim() || dateStr}
              </span>
            )}
            <span className="text-[19px] font-black leading-tight whitespace-nowrap tracking-tight">{timeStr}</span>
            {m.broadcast && (
              <span className="text-[8.5px] opacity-60 mt-1 text-center" style={{ maxWidth: 88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.broadcast}
              </span>
            )}
            {m.ticket_url && (
              <a href={m.ticket_url} target="_blank" rel="noopener noreferrer"
                className="mt-1.5 text-[8px] font-black bg-white/20 px-2 py-0.5 rounded-full whitespace-nowrap active:opacity-70">
                예매
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── 스포츠 위젯 ─────────────────────────────────────────────
function SportsSection() {
  const [matches, setMatches] = useState<SportsMatch[] | null>(null);
  const [assets, setAssets] = useState<SportsAssets>(DEFAULT_SPORTS_ASSETS);
  const [filter, setFilter] = useState<string>("전체");

  useEffect(() => {
    fetchUpcomingSportsMatches(30).then(setMatches).catch(() => setMatches([]));
    fetchSportsAssets().then(setAssets).catch(() => {});
  }, []);

  if (!matches?.length) return null;

  const sports = ["전체", ...Array.from(new Set(matches.map(m => m.sport)))];
  const filtered = filter === "전체" ? matches : matches.filter(m => m.sport === filter);
  const standings: Standing[] | null = filter !== "전체" ? (LEAGUE_STANDINGS[filter] ?? null) : null;

  const resultMatches = filtered
    .filter(m => m.status === "finished" || m.status === "live")
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
    .slice(0, 5);
  const upcomingMatches = filtered
    .filter(m => m.status === "upcoming")
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
    .slice(0, 5);

  function formatMatchDate(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / 86400000);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const weekday = ["일","월","화","수","목","금","토"][d.getDay()];
    const hhmm = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0) return `오늘 ${hhmm}`;
    if (diffDays === 1) return `내일 ${hhmm}`;
    return `${month}/${day}(${weekday}) ${hhmm}`;
  }

  return (
    <>
      <SectionLabel label="인천 스포츠" />
      {/* 종목 필터 탭 */}
      <div className="overflow-x-auto px-4 pb-2" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-2" style={{ width: "max-content" }}>
          {sports.map(s => {
            const ls = LEAGUE_STYLES[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className="px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all"
                style={filter === s && ls
                  ? { background: ls.gradient, color: "#fff", border: "none" }
                  : filter === s
                  ? { background: "#1d1d1f", color: "#fff", border: "none" }
                  : { background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb" }
                }>
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* 경기 결과 */}
      {resultMatches.length > 0 && (
        <div className="px-4 mb-1">
          <p className="text-[12px] font-bold text-gray-400 mb-2">경기 결과</p>
          <div className="space-y-2">
            {resultMatches.map(m => (
              <MatchCard key={m.id} m={m} assets={assets} formatMatchDate={formatMatchDate} />
            ))}
          </div>
        </div>
      )}

      {/* 경기 예정 */}
      {upcomingMatches.length > 0 && (
        <div className={`px-4 ${resultMatches.length > 0 ? "mt-4" : ""} mb-1`}>
          <p className="text-[12px] font-bold text-gray-400 mb-2">경기 예정</p>
          <div className="space-y-2">
            {upcomingMatches.map(m => (
              <MatchCard key={m.id} m={m} assets={assets} formatMatchDate={formatMatchDate} />
            ))}
          </div>
        </div>
      )}

      {/* 결과도 예정도 없을 때 */}
      {resultMatches.length === 0 && upcomingMatches.length === 0 && (
        <div className="px-4 space-y-2 mb-1">
          {filtered.slice(0, 10).map(m => (
            <MatchCard key={m.id} m={m} assets={assets} formatMatchDate={formatMatchDate} />
          ))}
        </div>
      )}

      {/* 리그 순위표 */}
      {standings && (
        <div className="mx-4 mt-4 mb-3 rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
          <div className="px-4 py-2.5 flex items-center gap-2"
            style={{ background: LEAGUE_STYLES[filter]?.gradient ?? "#1d1d1f" }}>
            <span className="text-[13px] font-black text-white">{filter} 순위</span>
          </div>
          {standings.map(s => {
            const highlight = !!s.teamCode;
            return (
              <div key={s.rank}
                className={`flex items-center px-4 py-2.5 border-b border-gray-50 last:border-0 ${
                  highlight ? "bg-blue-50/60" : ""
                }`}>
                <span className={`text-[12px] font-black w-5 flex-shrink-0 ${
                  s.rank === 1 ? "text-amber-500" : s.rank <= 3 ? "text-amber-400" : "text-gray-400"
                }`}>{s.rank}</span>
                <span className={`flex-1 text-[13px] ml-2 truncate ${
                  highlight ? "font-black text-blue-700" : "font-semibold text-[#1d1d1f]"
                }`}>
                  {highlight ? "★ " : ""}{s.teamName}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-gray-500">
                    {s.wins}승{s.draws !== undefined ? ` ${s.draws}무` : ""} {s.losses}패
                  </span>
                  {s.points !== undefined && (
                    <span className={`text-[12px] font-black min-w-[28px] text-right ${
                      highlight ? "text-blue-600" : "text-gray-700"
                    }`}>{s.points}점</span>
                  )}
                  {s.winRate !== undefined && (
                    <span className={`text-[11px] font-bold min-w-[40px] text-right ${
                      highlight ? "text-blue-600" : "text-gray-600"
                    }`}>{(s.winRate * 100).toFixed(1)}%</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── 실거래가 위젯 ────────────────────────────────────────────
function RealEstateWidget() {
  const router = useRouter();

  // 소식 > 시세 탭과 localStorage 동기화
  const [myAptId, setMyAptId] = useState<string | null>(null);
  const [myAptSzIdx, setMyAptSzIdx] = useState(0);
  useEffect(() => {
    setMyAptId(localStorage.getItem("myAptId"));
    setMyAptSzIdx(parseInt(localStorage.getItem("myAptSzIdx") ?? "0", 10));
  }, []);

  const myApt = myAptId ? apartments.find(a => a.id === myAptId) ?? null : null;
  const mySzIdx = Math.min(myAptSzIdx, (myApt?.sizes.length ?? 1) - 1);
  const mySz    = myApt?.sizes[mySzIdx] ?? myApt?.sizes[0];
  const myH     = mySz?.priceHistory ?? [];
  const myCurr  = myH[myH.length - 1]?.price ?? 0;
  const myPrev  = myH[myH.length - 2]?.price ?? myCurr;
  const myDiff  = myCurr - myPrev;
  const myPct   = myPrev ? ((Math.abs(myDiff) / myPrev) * 100).toFixed(1) : "0.0";

  // 검단신도시 전체 평균
  const avgTrend = (() => {
    const months = apartments[0]?.sizes[0]?.priceHistory.map(p => p.date) ?? [];
    return months.map(month => {
      let total = 0, count = 0;
      apartments.forEach(apt => apt.sizes.forEach(sz => {
        const entry = sz.priceHistory.find(p => p.date === month);
        if (entry) { total += entry.price; count++; }
      }));
      return { date: month, price: count ? Math.round(total / count) : 0 };
    });
  })();
  const avgPrice = avgTrend[avgTrend.length - 1]?.price ?? 0;
  const avgPrev  = avgTrend[avgTrend.length - 2]?.price ?? avgPrice;
  const avgDiff  = avgPrice - avgPrev;
  const avgPct   = avgPrev ? (Math.abs(avgDiff) / avgPrev * 100).toFixed(1) : "0.0";

  const go = () => router.push("/community/?tab=시세");

  return (
    <section className="mx-4 mb-1 space-y-2">
      {/* 내 집 시세 */}
      <button onClick={go}
        className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3.5 text-left active:bg-gray-50">
        {myApt && mySz ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Star size={10} className="text-amber-400 fill-amber-400 shrink-0" />
                <span className="text-[10px] text-gray-400">내 집 시세</span>
              </div>
              <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{myApt.name}</p>
              <p className="text-[11px] text-gray-400">{myApt.dong} · {mySz.pyeong}평</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[20px] font-black text-[#1d1d1f] leading-tight">{formatPrice(myCurr)}</p>
              {myDiff !== 0 && (
                <p className={`text-[11px] font-semibold ${myDiff > 0 ? "text-red-500" : "text-blue-500"}`}>
                  {myDiff > 0 ? "▲" : "▼"} {formatPrice(Math.abs(myDiff))} ({myPct}%)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1d1d1f]">내 집 등록</p>
              <p className="text-[11px] text-gray-400">소식 → 시세 탭에서 내 집을 등록하세요</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 shrink-0" />
          </div>
        )}
      </button>

      {/* 검단 신도시 평균 실거래가 */}
      <button onClick={go}
        className="w-full rounded-2xl overflow-hidden active:opacity-90 text-left"
        style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}>
        <div className="px-4 py-3.5">
          <p className="text-[11px] text-white/60 mb-0.5">검단 신도시 평균 실거래가</p>
          <div className="flex items-end justify-between gap-2">
            <p className="text-[26px] font-black text-white leading-tight">
              {avgPrice > 0 ? formatPrice(avgPrice) : "—"}
            </p>
            {avgDiff !== 0 && (
              <p className={`text-[12px] font-semibold pb-1 ${avgDiff > 0 ? "text-green-200" : "text-blue-200"}`}>
                {avgDiff > 0 ? "▲" : "▼"} {avgPct}%
              </p>
            )}
          </div>
          <p className="text-[10px] text-white/40 mt-1">최근 실거래 기준</p>
        </div>
      </button>
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
  if (date.getDay() !== 0)  return false;
  const y = date.getFullYear(), m = date.getMonth();
  const sundays = [1, 2, 3, 4, 5].map(n => {
    try { return nthWeekdayOfMonth(y, m, 0, n); } catch { return null; }
  }).filter(Boolean) as Date[];
  const idx = sundays.findIndex(s => s.toDateString() === date.toDateString()) + 1;
  if (pattern === "2nd4th") return idx === 2 || idx === 4;
  if (pattern === "1st3rd") return idx === 1 || idx === 3;
  return false;
}

/** 특정 날짜 기준 마트 영업 여부 */
function getMartStatus(mart: Mart, date: Date): {
  isOpen: boolean;
  hours: string | null;
  reason?: string;
} {
  const day = date.getDay();
  if (isMandatoryClosed(date, mart.closing_pattern)) {
    return { isOpen: false, hours: null, reason: "의무휴업일" };
  }
  if (day === 0) {
    return mart.sunday_hours
      ? { isOpen: true, hours: mart.sunday_hours }
      : { isOpen: false, hours: null, reason: "일요일 휴무" };
  }
  if (day === 6) return { isOpen: true, hours: mart.saturday_hours };
  return { isOpen: true, hours: mart.weekday_hours };
}

function martTypeBadge(type: string) {
  if (type === "대형마트") return "bg-[#EDE9FE] text-[#6D28D9]";
  if (type === "중형마트") return "bg-[#DBEAFE] text-[#1D4ED8]";
  if (type === "동네마트") return "bg-[#D1FAE5] text-[#065F46]";
  return "bg-[#E0F2FE] text-[#0369A1]";
}

// ─── 마트 위젯 ────────────────────────────────────────────────
function MartSection() {
  const [marts, setMarts] = useState<Mart[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);

  useEffect(() => {
    fetchMarts().then(data => { setMarts(data); setLoaded(true); });
  }, []);

  const now      = new Date();
  const today    = now.getDay();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const showTomorrow = today === 6;

  const closedToday    = marts.filter(m => !getMartStatus(m, now).isOpen);
  const closedTomorrow = showTomorrow ? marts.filter(m => !getMartStatus(m, tomorrow).isOpen) : [];

  if (loaded && marts.length === 0) return null;

  return (
    <>
      <SectionLabel label="주변 마트" />
      <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">

        {/* 영업 상태 배너 */}
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

        {/* 내일 경고 (토→일 의무휴업 예고) */}
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
          {marts.map(mart => {
            const todayStatus = getMartStatus(mart, now);
            const tmrStatus   = showTomorrow ? getMartStatus(mart, tomorrow) : null;
            const mapUrl = mart.lat && mart.lng
              ? `https://map.kakao.com/link/map/${encodeURIComponent(mart.name)},${mart.lat},${mart.lng}`
              : `https://map.kakao.com/link/search/${encodeURIComponent(mart.address || mart.name)}`;

            return (
              <div key={mart.id} className="px-4 py-3.5 flex items-center gap-3">
                {/* 로고 */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                  todayStatus.isOpen ? "bg-[#F0FDF4]" : "bg-[#f5f5f7]"
                }`}>
                  {mart.logo_url
                    ? <img src={mart.logo_url} alt={mart.brand} className="w-full h-full object-contain p-1" />
                    : <ShoppingBag size={22} className={todayStatus.isOpen ? "text-[#059669]" : "text-[#6e6e73]"} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1d1d1f]">{mart.name}</span>
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${martTypeBadge(mart.type)}`}>
                      {mart.type}
                    </span>
                  </div>

                  {/* 오늘 상태 */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[12px] font-semibold ${todayStatus.isOpen ? "text-[#059669]" : "text-[#F04452]"}`}>
                      {todayStatus.isOpen ? `영업 중 · ${todayStatus.hours}` : `오늘 휴무${todayStatus.reason ? ` (${todayStatus.reason})` : ""}`}
                    </span>
                  </div>

                  {/* 주말 영업시간 (평일이 아닐 때도 표시) */}
                  {(mart.saturday_hours || mart.sunday_hours) && today < 6 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {mart.saturday_hours && <span className="text-[11px] text-[#86868b]">토 {mart.saturday_hours}</span>}
                      {mart.sunday_hours   && <span className="text-[11px] text-[#86868b]">일 {mart.sunday_hours}</span>}
                    </div>
                  )}

                  {/* 내일 의무휴업 경고 */}
                  {tmrStatus && !tmrStatus.isOpen && (
                    <span className="text-[11px] text-[#F04452]">⚠ 내일 의무휴업</span>
                  )}

                  {mart.notice && (
                    <p className="text-[11px] text-[#86868b] mt-0.5">{mart.notice}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {mart.distance && <span className="text-[12px] text-[#6e6e73]">{mart.distance}</span>}
                  <div className="flex gap-1.5">
                    {mart.phone && (
                      <a href={`tel:${mart.phone}`}
                        className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center">
                        <Phone size={14} className="text-[#0071e3]" />
                      </a>
                    )}
                    <button
                      onClick={() => setMapTarget({ name: mart.name, address: mart.address ?? "", lat: mart.lat ?? undefined, lng: mart.lng ?? undefined })}
                      className="w-8 h-8 bg-[#FFF3CD] rounded-xl flex items-center justify-center">
                      <MapPin size={14} className="text-[#C57C00]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </section>
      {mapTarget && <MapBottomSheet {...mapTarget} onClose={() => setMapTarget(null)} />}
    </>
  );
}

// ─── 약국 영업 상태 계산 ──────────────────────────────────────
function withinHoursStr(hoursStr: string, cur: number): boolean {
  if (/24시간/.test(hoursStr)) return true;
  for (const m of [...hoursStr.matchAll(/(\d{1,2}):(\d{2})\s*[~\-]\s*(\d{1,2}):(\d{2})/g)]) {
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

// ─── 지도 앱 선택 바텀시트 ───────────────────────────────────
interface MapTarget { name: string; address: string; lat?: number; lng?: number; }

function MapBottomSheet({ name, address, lat, lng, onClose }: MapTarget & { onClose: () => void }) {
  const q = encodeURIComponent(address || name);
  const n = encodeURIComponent(name);

  const kakaoUrl = lat && lng
    ? `https://map.kakao.com/link/map/${n},${lat},${lng}`
    : `https://map.kakao.com/link/search/${q}`;
  const naverUrl = lat && lng
    ? `https://map.naver.com/v5/search/${q}`
    : `https://map.naver.com/v5/search/${q}`;
  const tmapUrl  = `https://tmap.life/search?query=${q}`;

  const embedUrl = lat && lng
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed&hl=ko`
    : `https://maps.google.com/maps?q=${q}&output=embed&hl=ko`;

  const apps = [
    { label: "카카오맵", url: kakaoUrl, icon: "/icons/kakaomap.svg" },
    { label: "네이버",   url: naverUrl, icon: "/icons/navermap.svg" },
    { label: "티맵",     url: tmapUrl,  icon: "/icons/tmap.svg"     },
  ];

  return (
    <div className="fixed inset-0 z-[300]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center" onClick={e => e.stopPropagation()}>
        <div className="w-full max-w-[430px] bg-white rounded-t-3xl overflow-hidden">
          {/* 핸들 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-[#d2d2d7] rounded-full" />
          </div>

          {/* 헤더: 장소명 + 앱 아이콘 버튼들 */}
          <div className="flex items-center gap-3 px-5 pb-3">
            <div className="flex-1 min-w-0">
              <p className="text-[16px] font-bold text-[#1d1d1f] truncate">{name}</p>
              <p className="text-[12px] text-[#6e6e73] mt-0.5 truncate">{address}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {apps.map(app => (
                <a key={app.label} href={app.url} target="_blank" rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={app.icon} alt={app.label} className="w-10 h-10 rounded-[12px] shadow-sm" />
                  <span className="text-[10px] text-[#8e8e93] font-medium">{app.label}</span>
                </a>
              ))}
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f2f2f7] flex items-center justify-center ml-1 active:opacity-60 self-start mt-0.5">
                <X size={16} className="text-[#6e6e73]" />
              </button>
            </div>
          </div>

          {/* 지도 미리보기 */}
          <div className="px-4 pb-10">
            <div className="w-full h-[230px] rounded-2xl overflow-hidden bg-[#f2f2f7]">
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={name}
              />
            </div>
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
  logo_url?: string | null;
  lat?: number | null;
  lng?: number | null;
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
    lat: 37.5950, lng: 126.6585,
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
    lat: 37.6018, lng: 126.6644,
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
    lat: 37.4870, lng: 126.7240,
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
    lat: 37.4543, lng: 126.7023,
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
    lat: 37.4566, lng: 126.6334,
  },
];

// 거리(m)를 사람이 읽기 좋은 문자열로 포맷
function formatDistanceKm(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

type GeoStatus = "idle" | "loading" | "ready" | "fallback" | "denied";

function PharmacySection() {
  const [mainType, setMainType] = useState<EmergencyType>("약국");
  const [filter, setFilter] = useState<PharmacyFilter>("전체");
  const [showAll, setShowAll] = useState(false);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>(mockPharmacies);
  const [erData, setErData] = useState<EmergencyRoom[]>(emergencyRooms);
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);

  // ─── 내 위치 (검단 중심 fallback) ─────────────────────────
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number }>(GEUMDAN_CENTER);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");

  const requestLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setUserLoc(GEUMDAN_CENTER);
      setGeoStatus("fallback");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ready");
      },
      () => {
        setUserLoc(GEUMDAN_CENTER);
        setGeoStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60_000 }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    fetchAllPharmacies().then(data => { if (data.length > 0) setPharmacies(data); });
    fetchEmergencyRooms("all").then(data => { if (data.length > 0) setErData(data); });
  }, []);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const hour = now.getHours();
  const isNight = hour >= 21 || hour < 6;

  // ─── 거리 + 영업중 정렬 (약국) ─────────────────────────
  const sortedPharmacies = React.useMemo(() => {
    const enriched = pharmacies.map(p => {
      const hasGeo = typeof p.lat === "number" && typeof p.lng === "number";
      const distM = hasGeo
        ? haversineM(userLoc.lat, userLoc.lng, p.lat as number, p.lng as number)
        : Number.POSITIVE_INFINITY;
      const { isOpen } = getPharmacyStatus(p, now);
      return { p, distM, isOpen };
    });
    enriched.sort((a, b) => {
      if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
      return a.distM - b.distM;
    });
    return enriched;
  }, [pharmacies, userLoc, now]);

  const filtered = sortedPharmacies.filter(({ p }) => {
    if (filter === "주말") return p.tags.includes("주말");
    if (filter === "심야") return p.tags.includes("심야");
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 3);

  const filterBtns: PharmacyFilter[] = ["전체", "주말", "심야"];

  // ─── 거리 + 영업중 정렬 (응급실) ───────────────────────
  const sortedEr = React.useMemo(() => {
    const filteredEr = erData.filter(e => mainType === "소아응급실" ? e.isPediatric : true);
    const enriched = filteredEr.map(er => {
      const hasGeo = typeof er.lat === "number" && typeof er.lng === "number";
      const distM = hasGeo
        ? haversineM(userLoc.lat, userLoc.lng, er.lat as number, er.lng as number)
        : Number.POSITIVE_INFINITY;
      return { er, distM };
    });
    enriched.sort((a, b) => a.distM - b.distM);
    return enriched;
  }, [erData, userLoc, mainType]);

  const erList = sortedEr;

  const locLabel =
    geoStatus === "loading" ? "내 위치 확인 중…"
    : geoStatus === "ready" ? "내 위치 기준 정렬"
    : "검단 중심 기준 정렬 (위치 미허용)";

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
            {/* 내 위치 기준 정렬 헤더 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {geoStatus === "loading"
                  ? <Loader2 size={12} className="text-[#0071e3] animate-spin shrink-0" />
                  : <LocateFixed size={12} className={geoStatus === "ready" ? "text-[#0071e3]" : "text-[#86868b]"} />
                }
                <span className={`text-[11px] font-semibold truncate ${geoStatus === "ready" ? "text-[#0071e3]" : "text-[#86868b]"}`}>
                  {locLabel}
                </span>
              </div>
              <button
                onClick={requestLocation}
                disabled={geoStatus === "loading"}
                className="flex items-center gap-1 h-6 px-2 rounded-full bg-[#f5f5f7] text-[11px] font-semibold text-[#424245] active:opacity-60 disabled:opacity-40">
                <RefreshCw size={10} className={geoStatus === "loading" ? "animate-spin" : ""} />
                새로고침
              </button>
            </div>

            {/* 약국 서브필터 */}
            <div className="flex gap-2 px-4 pt-2 pb-2">
              {filterBtns.map(f => (
                <button key={f} onClick={() => { setFilter(f); setShowAll(false); }}
                  className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${filter === f ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
                  {f === "심야" ? "🌙 심야" : f === "주말" ? "📅 주말" : "전체"}
                </button>
              ))}
            </div>
            {/* 약국 목록 */}
            <div className="divide-y divide-[#f5f5f7]">
              {displayed.map(({ p, distM, isOpen }) => {
                const { todayHours, todayLabel } = getPharmacyStatus(p, now);
                const distLabel = Number.isFinite(distM) ? formatDistanceKm(distM) : "거리 미정";
                return (
                  <div key={p.id} className="px-4 py-3.5 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${p.logo_url ? "bg-white border border-[#e5e5ea]" : isOpen ? "bg-[#D1FAE5]" : "bg-[#f5f5f7]"}`}>
                      {p.logo_url
                        ? <img src={p.logo_url} alt={p.name} className="w-full h-full object-cover" />
                        : <PillBottle size={18} className={isOpen ? "text-[#065F46]" : "text-[#86868b]"} />
                      }
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
                        <span className={`text-[12px] shrink-0 font-semibold ${Number.isFinite(distM) ? "text-[#0071e3]" : "text-[#86868b]"}`}>
                          {distLabel}
                        </span>
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
                        <a href={`tel:${p.phone}`} className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#d0e4fb]">
                          <Phone size={14} className="text-[#0071e3]" />
                        </a>
                        <button
                          onClick={() => setMapTarget({ name: p.name, address: p.address })}
                          className="w-8 h-8 bg-[#e8f1fd] rounded-xl flex items-center justify-center active:bg-[#d0e4fb]">
                          <MapPin size={14} className="text-[#0071e3]" />
                        </button>
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
          <>
            {/* 내 위치 기준 정렬 헤더 */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {geoStatus === "loading"
                  ? <Loader2 size={12} className="text-[#F04452] animate-spin shrink-0" />
                  : <LocateFixed size={12} className={geoStatus === "ready" ? "text-[#F04452]" : "text-[#86868b]"} />
                }
                <span className={`text-[11px] font-semibold truncate ${geoStatus === "ready" ? "text-[#F04452]" : "text-[#86868b]"}`}>
                  {locLabel}
                </span>
              </div>
              <button
                onClick={requestLocation}
                disabled={geoStatus === "loading"}
                className="flex items-center gap-1 h-6 px-2 rounded-full bg-[#f5f5f7] text-[11px] font-semibold text-[#424245] active:opacity-60 disabled:opacity-40">
                <RefreshCw size={10} className={geoStatus === "loading" ? "animate-spin" : ""} />
                새로고침
              </button>
            </div>
          <div className="divide-y divide-[#f5f5f7]">
            {erList.map(({ er, distM }) => {
              const distLabel = Number.isFinite(distM) ? formatDistanceKm(distM) : er.distance;
              return (
              <div key={er.id} className="px-4 py-3.5 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 overflow-hidden ${er.logo_url ? "bg-white border border-[#e5e5ea]" : "bg-[#FEE2E2]"}`}>
                  {er.logo_url
                    ? <img src={er.logo_url} alt={er.name} className="w-full h-full object-cover" />
                    : mainType === "소아응급실"
                      ? <span className="text-[18px]">👶</span>
                      : <AlertTriangle size={18} className="text-[#F04452]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {/* 이름 + 거리 */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[14px] font-bold text-[#1d1d1f] leading-snug">{er.name}</span>
                    <span className={`text-[12px] shrink-0 font-semibold ${Number.isFinite(distM) ? "text-[#F04452]" : "text-[#86868b]"}`}>{distLabel}</span>
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
                    <a href={`tel:${er.phone}`} className="w-8 h-8 bg-[#FEE2E2] rounded-xl flex items-center justify-center active:opacity-70">
                      <Phone size={14} className="text-[#F04452]" />
                    </a>
                    <button
                      onClick={() => setMapTarget({ name: er.name, address: er.address })}
                      className="w-8 h-8 bg-[#FEE2E2] rounded-xl flex items-center justify-center active:opacity-70">
                      <MapPin size={14} className="text-[#F04452]" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          </>
        )}
      </div>
      {mapTarget && (
        <MapBottomSheet
          {...mapTarget}
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
    <div className="flex items-center justify-between px-4 pt-6 pb-3">
      <div className="flex items-center gap-2">
        <span className="text-[19px] font-extrabold text-[#1d1d1f]">{label}</span>
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
    <div className="flex items-center gap-2.5 px-3 py-2 border-t border-[#f5f5f7] animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}>
      <div className={`rounded-lg px-2 py-1 shrink-0 min-w-[46px] text-center ${arriving ? "bg-[#F04452]" : "bg-[#0071e3]"}`}>
        <span className="text-white text-[14px] font-black leading-none tracking-tight">{a.routeNo}</span>
        {a.isExpress && <p className="text-yellow-200 text-[8px] font-bold">급행</p>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{a.destination}</p>
        {a.remainingStops > 0 && (
          <p className="text-[10px] text-[#86868b]">{a.remainingStops}정거장 전</p>
        )}
      </div>
      <div className={`shrink-0 rounded-xl px-2.5 py-1.5 min-w-[52px] text-center ${
        arriving ? "bg-[#FEE2E2]" : close ? "bg-[#FFF7ED]" : "bg-[#EFF6FF]"
      }`}>
        {arriving ? (
          <span className="text-[#F04452] text-[11px] font-black animate-led-blink">곧도착</span>
        ) : (
          <>
            <span className={`text-[18px] font-black leading-none block ${close ? "text-[#F97316]" : "text-[#0071e3]"}`}>{a.arrivalMin}</span>
            <span className={`text-[9px] ${close ? "text-[#F97316]/70" : "text-[#0071e3]/60"}`}>분 후</span>
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
  const transportHref = (hasSubway && !hasBus) ? "/transport/?tab=지하철" : "/transport/?tab=버스";

  if (!hasBus && !hasSubway) {
    return (
      <>
        <SectionLabel label="교통" href="/transport/" linkLabel="전체보기" />
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
      </>
    );
  }

  return (
    <>
    <SectionLabel label="교통" href={transportHref} linkLabel="전체보기" />
    <section className="mx-4 mb-1 space-y-2.5">

      {/* ── 버스 정류장 카드 ── */}
      {hasBus && favStopIds.map(stopId => {
        const stopArrivals = busArrivals[stopId] ?? [];
        const hasFavRoutes = stopArrivals.some(a => favRoutes.has(routeFavKey(stopId, a)));
        const displayed = hasFavRoutes
          ? stopArrivals.filter(a => favRoutes.has(routeFavKey(stopId, a))).slice(0, 2)
          : stopArrivals.slice(0, 2);
        const stopName = STOP_NAME[stopId] ?? "정류장";
        const isLoading = busLoading.has(stopId);

        return (
          <div key={stopId} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {/* 정류장 헤더 */}
            <div className="px-3 py-2 flex items-center gap-2 bg-[#0071e3]">
              <Bus size={13} className="text-white shrink-0" />
              <span className="text-white font-extrabold text-[13px] flex-1 truncate">{stopName}</span>
              <button onClick={() => refreshBusStop(stopId)} disabled={isLoading}
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30 disabled:opacity-40">
                <RefreshCw size={12} className={`text-white ${isLoading ? "animate-spin" : ""}`} />
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
        const isLoading = subwayLoading.has(st.id);
        const upArrivals   = displayArrivals.filter(a => a.direction === "상행").slice(0, 2);
        const downArrivals = displayArrivals.filter(a => a.direction === "하행").slice(0, 2);
        const lineShort = st.line.replace(/호선|철도/g, "").slice(0, 2);

        return (
          <div key={st.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            {/* 역 헤더 */}
            <div className="px-3 py-2.5 flex items-center gap-2" style={{ background: st.lineColor }}>
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black leading-none" style={{ color: st.lineColor }}>{lineShort}</span>
              </div>
              <span className="text-white font-extrabold text-[14px] flex-1 truncate">{st.displayName}</span>
              <button onClick={() => refreshSubwayStation(st)} disabled={isLoading}
                className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center active:bg-white/30 disabled:opacity-40">
                <RefreshCw size={12} className={`text-white ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            {/* 도착 정보 헤더 */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#f5f5f7]">
              <span className="text-[12px] font-bold text-[#1d1d1f]">도착 정보</span>
              {isEst && <span className="text-[10px] text-[#86868b]">⏱ 시간표 기준</span>}
            </div>
            {/* 2열 도착 */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 p-3">
                {[0,1].map(i => <div key={i} className="h-14 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
              </div>
            ) : upArrivals.length === 0 && downArrivals.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-[#86868b]">운행 종료 또는 정보 없음</p>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-[#f5f5f7]">
                {[
                  { label: st.timetable.upDirection, arrivals: upArrivals },
                  { label: st.timetable.downDirection, arrivals: downArrivals },
                ].map(({ label, arrivals }, col) => (
                  <div key={col} className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5 mb-2">
                      <span className="text-[11px] font-bold text-[#1d1d1f] truncate flex-1">{label} 방면</span>
                      <ChevronRight size={11} className="text-[#86868b] shrink-0" />
                    </div>
                    {arrivals.length > 0 ? arrivals.map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-0.5">
                        <span className="text-[11px] text-[#424245] truncate flex-1 mr-1">{a.terminalStation}</span>
                        <span className={`text-[15px] font-black shrink-0 ${a.arrivalMin <= 2 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
                          {a.arrivalMin <= 2 ? "곧" : `${a.arrivalMin}분`}
                        </span>
                      </div>
                    )) : (
                      <span className="text-[11px] text-[#86868b]">정보 없음</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

    </section>
    </>
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

      const savedIds = new Set(local.map((w: WidgetConfig) => w.id));
      const newWidgets = DEFAULT_WIDGETS.filter(w => !savedIds.has(w.id));
      setWidgets(newWidgets.length > 0 ? [...local, ...newWidgets] : local);
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
      <div className="px-5 mt-10 mb-10">
        <div className="grid grid-cols-4 gap-x-4 gap-y-3">
          {quickMenus.map(({ icon: Icon, label, href, color }) => (
            <Link key={label} href={href}
              className="flex flex-col items-center gap-[7px] active:scale-95 transition-transform">
              <div className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center"
                style={{
                  background: "#f5f5f7",
                  boxShadow: "4px 4px 8px #cfd0d3, -4px -4px 8px #ffffff",
                }}>
                <Icon size={22} strokeWidth={2} color={color} />
              </div>
              <span className="text-[11px] font-semibold text-[#3c3c43] leading-none">{label}</span>
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
    transport: () => <HomeTransportWidget />,
    community: () => (
      <>
        <SectionLabel label="커뮤니티" href="/community/" linkLabel="전체보기" />
        <CommunityWidget />
      </>
    ),
    news: () => (
      <>
        <SectionLabel label="검단 뉴스" href="/news/" linkLabel="전체보기" />
        <NewsWidget />
      </>
    ),
    youtube: () => <YouTubeSection />,
    instagram: () => <InstagramSection />,
    realestate: () => (
      <>
        <SectionLabel label="실거래가" href="/community/?tab=시세" linkLabel="전체보기" />
        <RealEstateWidget />
      </>
    ),
    places: () => <PlacesSection />,
    sports: () => <SportsSection />,
    tides: () => <TideSection />,
  };

  const activeWidgets = widgets.length > 0
    ? widgets.filter(w => w.enabled)
    : DEFAULT_WIDGETS;

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
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
