"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users,
  Star, Ticket, X, MapPin, Calendar,
  TrendingDown, Phone, Clock, PillBottle, Store, AlertTriangle, RefreshCw, Settings2, ExternalLink,
  LocateFixed, Loader2,
  Navigation, Zap, Accessibility,
} from "lucide-react";
import Header from "@/components/layout/Header";
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
import { fetchWeather, getCachedWeather, type WeatherData } from "@/lib/api/weather";
import { fetchArrivalsByStationId, fetchArrivalsByNodeId, GEUMDAN_BUS_STATIONS, haversineM, type BusArrival } from "@/lib/api/bus";
import { getAllSubwayStations, fetchSubwayArrivals, estimateNextArrivals, dayTimetable, type SubwayStationWithDist, type SubwayArrival } from "@/lib/api/subway";
import { loadFavStops, loadFavRoutes, routeFavKey, type FavStopMeta, type FavRouteMeta } from "@/lib/transport/favorites";
import { fetchWidgetConfig, type WidgetConfig, DEFAULT_WIDGETS } from "@/lib/db/widget-config";
import { fetchActiveCoupons } from "@/lib/db/stores";
import type { Coupon } from "@/lib/types";
import { fetchActiveBanners, type Banner } from "@/lib/db/banners";
import BannerCarousel from "@/components/ui/BannerCarousel";
import { fetchActivePopups, type Popup } from "@/lib/db/popups";
import PopupBottomSheet from "@/components/ui/PopupBottomSheet";
import GasWidget from "@/components/home/GasWidget";
import { fetchYouTubeVideosFromDB } from "@/lib/db/youtube";
import InstagramFeedSection from "@/components/widgets/InstagramFeedSection";
import { fetchPublishedPlaces, CATEGORY_META, type Place } from "@/lib/db/places";
import { addFavoritePlace, removeFavoritePlace, isFavoritePlace } from "@/lib/db/placeFavorites";
import SportsWidget from "@/components/home/SportsWidget";
import { getTideReport, type TideReport, type ConditionRating } from "@/lib/api/tides";
import { fetchYouTubeVideos, type YouTubeVideo } from "@/lib/api/news";


// ─── 퀵 메뉴 ─────────────────────────────────────────────────
const quickMenus = [
  { icon: Bus,           label: "버스",    href: "/transport/?tab=버스",                          color: "#3B5BDB" },
  { icon: HomeIcon,      label: "부동산",  href: "/community/?tab=시세",                          color: "#2F9E44" },
  { icon: Newspaper,     label: "뉴스",    href: "/community/?tab=뉴스",                          color: "#E03131" },
  { icon: MessageCircle, label: "커뮤니티",href: "/community/?tab=커뮤니티",                      color: "#7048E8" },
  { icon: Ticket,        label: "쿠폰",    href: "/coupons/",                                     color: "#E67700" },
  { icon: Store,         label: "상가",    href: "/stores/",                                      color: "#0C8599" },
  { icon: ShoppingBag,   label: "중고거래",href: "/community/?tab=커뮤니티&category=중고거래",    color: "#C2255C" },
  { icon: Star,          label: "즐겨찾기",href: "/mypage/",                                      color: "#D9480F" },
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
  const hotPosts = posts.filter(p => p.isHot).slice(0, 3);
  if (hotPosts.length === 0) return null;
  return (
    <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
        {hotPosts.map((post, idx) => (
          <button key={post.id}
            onClick={() => router.push(`/community/detail/?id=${post.id}`)}
            className="w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-gray-50 transition-colors">
            <span className={`shrink-0 w-7 h-7 rounded-full text-[13px] font-bold flex items-center justify-center ${
              idx === 0 ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[11px] font-semibold text-gray-500">{post.category}</span>
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500">
                  <Flame size={9} />HOT
                </span>
              </div>
              <p className="text-[14px] font-medium text-gray-900 leading-snug truncate">{post.title}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[12px] text-gray-400">{post.authorDong}</span>
                <span className="text-[12px] text-gray-300">·</span>
                <span className="text-[12px] text-gray-400">{formatRelativeTime(post.createdAt)}</span>
                <span className="text-[12px] text-gray-400 ml-auto">❤️ {post.likeCount}</span>
              </div>
            </div>
          </button>
        ))}
        <Link href="/community/"
          className="flex items-center justify-center gap-1 py-3 text-[13px] text-blue-600 font-semibold active:bg-gray-50">
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
        <Link href="/community/?tab=뉴스"
          className="flex items-center justify-center gap-1 py-3 text-[13px] text-[#0071e3] font-semibold">
          뉴스 전체 보기 <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  );
}

// ─── 유튜브 카드 (인라인 플레이어 포함) ──────────────────────
function YouTubeCard({ v }: { v: YouTubeVideo }) {
  const [playing, setPlaying] = useState(false);
  const embedSrc = `https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0`;

  if (playing) {
    return (
      <div className="shrink-0 w-[300px] bg-black rounded-2xl overflow-hidden shadow-sm">
        <div className="relative w-full aspect-video">
          <iframe
            src={embedSrc}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center z-10 text-white active:opacity-80">
            <X size={13} />
          </button>
        </div>
        <div className="px-3 py-2.5 bg-white">
          <p className="text-[13px] font-semibold text-[#1d1d1f] line-clamp-1 leading-snug">{v.title}</p>
          <p className="text-[11px] text-[#86868b] mt-0.5">{v.channelName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-[300px] bg-white rounded-2xl overflow-hidden shadow-sm">
      <button onClick={() => setPlaying(true)} className="w-full active:opacity-80">
        <div className="relative w-full aspect-video bg-[#f5f5f7]">
          <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-[#FF0000]/90 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-0 h-0 border-y-[7px] border-y-transparent border-l-[13px] border-l-white ml-1" />
            </div>
          </div>
        </div>
      </button>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-semibold text-[#1d1d1f] line-clamp-2 leading-snug">{v.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-[#86868b]">{v.channelName}</p>
          <a href={v.url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[11px] text-[#0071e3] active:opacity-70">외부 열기</a>
        </div>
      </div>
    </div>
  );
}

// ─── 유튜브 위젯 ─────────────────────────────────────────────
function YouTubeSection() {
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      // 실시간 + DB 병렬 로드 후 videoId 기준 중복 제거
      const [live, db] = await Promise.all([
        fetchYouTubeVideos("검단신도시"),
        fetchYouTubeVideosFromDB(12),
      ]);
      if (!alive) return;
      const seen = new Set<string>();
      const merged: YouTubeVideo[] = [];
      for (const v of [...live.videos, ...db.videos]) {
        if (v.videoId && !seen.has(v.videoId)) {
          seen.add(v.videoId);
          merged.push(v);
        }
      }
      setVideos(merged.slice(0, 8));
    })();
    return () => { alive = false; };
  }, []);
  if (!videos?.length) return null;
  return (
    <>
      <SectionLabel label="유튜브 소식" href="/news/" linkLabel="전체보기" />
      <section className="mb-1">
        <div className="overflow-x-auto px-4" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {videos.map(v => <YouTubeCard key={v.videoId} v={v} />)}
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
  const mapUrl = `https://map.kakao.com/link/search/${q}`;

  const [favorited, setFavorited] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    isFavoritePlace(place.id).then(setFavorited);
  }, [place.id]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const handleToggleFav = async () => {
    const next = !favorited;
    setFavorited(next); // optimistic update
    try {
      if (next) {
        await addFavoritePlace({
          place_id: place.id,
          place_name: place.name,
          place_category: place.category,
          place_area: place.area,
          place_image_url: place.thumbnail_url,
          place_address: place.address,
        });
        showToast("즐겨찾기에 추가됐어요 ⭐");
      } else {
        await removeFavoritePlace(place.id);
        showToast("즐겨찾기에서 제거됐어요");
      }
    } catch {
      setFavorited(!next); // revert
      showToast("처리 중 오류가 발생했어요");
    }
  };

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
              <button onClick={handleToggleFav}
                aria-label={favorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                className="absolute top-3 right-12 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center active:opacity-70">
                <Star size={16} className={favorited ? "text-[#FBBF24]" : "text-white"}
                  fill={favorited ? "#FBBF24" : "none"} />
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
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 px-4 py-2.5 bg-black/80 text-white text-[13px] rounded-xl pointer-events-none">
          {toast}
        </div>
      )}
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
                <span className="text-[30px] font-black text-[#1d1d1f] leading-none">{multtae.number}물</span>
                <span className="text-[19px] font-bold text-[#1d1d1f]">{multtae.name}</span>
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: sizeColor }}>
                  {sizeLabel}
                </span>
              </div>
              <p className="text-[13px] text-gray-500 mt-1">
                음력 {multtae.lunarMonth}월 {multtae.lunarDay}일 · 인천 조차 {multtae.rangeM}m
              </p>
            </div>
            {nextLowTide && (
              <div className="bg-blue-50 rounded-xl px-3 py-2 text-center min-w-[78px]">
                <p className="text-[11px] text-blue-500 font-semibold">다음 저조</p>
                <p className="text-[21px] font-black text-[#0071e3] leading-tight">{nextLowTide.timeStr}</p>
              </div>
            )}
          </div>

          {/* 조석 곡선 차트 */}
          {(() => {
            const W = 320; const H = 78; const PAD_X = 14; const PAD_Y = 8;
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
              <div className="border-t border-gray-50 px-1 pt-2 pb-1">
                <svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" style={{ height: 110 }}>
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
                        <circle cx={p.x} cy={p.y} r={3.8} fill={isLow ? "#BFDBFE" : "#0071e3"} stroke="white" strokeWidth="1.5" />
                        <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize="10" fontWeight="700"
                          fill={isLow ? "#6B7280" : "#0071e3"}>{t.heightM}m</text>
                        <text x={p.x} y={H + 12} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1d1d1f">{t.timeStr}</text>
                        <text x={p.x} y={H + 23} textAnchor="middle" fontSize="9.5" fill="#6B7280">{isLow ? "저조" : "고조"}</text>
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
              className={`flex-1 py-2.5 rounded-lg text-[15px] font-bold transition-all ${
                tab === key ? "bg-white text-[#1d1d1f] shadow-sm" : "text-gray-500"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── 활동 조건 카드 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 pt-4 pb-3" style={{ background: rm.bg }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[17px] font-extrabold" style={{ color: rm.text }}>
                  {tab === "haerujil" ? "해루질" : "낚시"} {rm.label}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
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
            <p className="text-[14px] leading-relaxed" style={{ color: rm.text }}>
              {activity.reason}
            </p>
          </div>
          <div className="px-4 py-3 border-t border-gray-50">
            <p className="text-[14px] text-gray-700 font-medium">💡 {activity.tip}</p>
          </div>
        </div>

        {/* ── 추천 스팟 ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-[14px] font-bold text-gray-700">
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
                    <p className="text-[15px] font-semibold text-[#1d1d1f]">{s.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[12px] text-gray-500">{s.type} · {s.dist}</span>
                      {!sameAsIncheon && nextSpotLow && (
                        <>
                          <span className="text-[12px] text-gray-300">·</span>
                          <span className="text-[12px] text-gray-600">
                            저조 <span className="font-semibold text-[#0071e3]">{nextSpotLow.timeStr}</span>
                          </span>
                          <span className="text-[12px] text-gray-300">·</span>
                          <span className="text-[12px] text-gray-600">조차 <span className="font-semibold">{spotRange}m</span></span>
                        </>
                      )}
                      {sameAsIncheon && (
                        <>
                          <span className="text-[12px] text-gray-300">·</span>
                          <span className="text-[12px] text-gray-500">인천과 동일</span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setMapTarget({ name: s.name, address: s.name, lat: s.lat, lng: s.lng })}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-50 text-[12px] font-bold text-yellow-700"
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
            <p className="text-[13px] text-amber-800 leading-relaxed">🌊 {seasonalNote}</p>
          </div>
        )}
      </section>
      {mapTarget && <MapBottomSheet {...mapTarget} onClose={() => setMapTarget(null)} />}
    </>
  );
}

// ─── 실거래가 위젯 ────────────────────────────────────────────
type PyeongFilter = "전체" | "20평대" | "30평대" | "40평대+";

function pyeongBucket(pyeong: number): PyeongFilter {
  if (pyeong < 30) return "20평대";
  if (pyeong < 40) return "30평대";
  return "40평대+";
}

function RealEstateWidget() {
  const router = useRouter();

  // 소식 > 시세 탭과 localStorage 동기화
  const [myAptId, setMyAptId] = useState<string | null>(null);
  const [myAptSzIdx, setMyAptSzIdx] = useState(0);
  const [pyeongFilter, setPyeongFilter] = useState<PyeongFilter>("전체");
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

  // 검단신도시 평균 (평수 필터 반영)
  const avgTrend = (() => {
    const months = apartments[0]?.sizes[0]?.priceHistory.map(p => p.date) ?? [];
    return months.map(month => {
      let total = 0, count = 0;
      apartments.forEach(apt => apt.sizes.forEach(sz => {
        if (pyeongFilter !== "전체" && pyeongBucket(sz.pyeong) !== pyeongFilter) return;
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

  const PYEONG_FILTERS: PyeongFilter[] = ["전체", "20평대", "30평대", "40평대+"];

  return (
    <section className="mx-4 mb-1 space-y-2">
      {/* 내 집 시세 — 따뜻한 그라데이션 배경 */}
      <button onClick={go}
        className="w-full rounded-2xl overflow-hidden active:opacity-95 text-left shadow-sm"
        style={{ background: "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)" }}>
        <div className="px-4 py-3.5">
        {myApt && mySz ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-[12px] font-bold text-amber-700">내 집 시세</span>
              </div>
              <p className="text-[16px] font-extrabold text-[#1d1d1f] truncate">{myApt.name}</p>
              <p className="text-[12px] text-gray-600 mt-0.5">{myApt.dong} · {mySz.pyeong}평</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[24px] font-black text-[#1d1d1f] leading-tight">{formatPrice(myCurr)}</p>
              {myDiff !== 0 && (
                <p className={`text-[12px] font-bold ${myDiff > 0 ? "text-red-600" : "text-blue-600"}`}>
                  {myDiff > 0 ? "▲" : "▼"} {formatPrice(Math.abs(myDiff))} ({myPct}%)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Star size={14} className="text-amber-500 fill-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-bold text-[#1d1d1f]">내 집 등록</p>
              <p className="text-[12px] text-gray-600">소식 → 시세 탭에서 내 집을 등록하세요</p>
            </div>
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
          </div>
        )}
        </div>
      </button>

      {/* 검단 신도시 평균 실거래가 */}
      <div className="w-full rounded-2xl overflow-hidden text-left shadow-sm"
        style={{ background: "linear-gradient(135deg, #059669, #0D9488)" }}>
        <button onClick={go} className="block w-full text-left active:opacity-90">
          <div className="px-4 pt-3.5">
            <p className="text-[12px] font-semibold text-white mb-0.5">
              검단신도시 {pyeongFilter !== "전체" ? `${pyeongFilter} ` : ""}평균 실거래가
            </p>
            <div className="flex items-end justify-between gap-2">
              <p className="text-[28px] font-black text-white leading-tight">
                {avgPrice > 0 ? formatPrice(avgPrice) : "—"}
              </p>
              {avgDiff !== 0 && (
                <p className={`text-[13px] font-bold pb-1 text-white`}>
                  {avgDiff > 0 ? "▲" : "▼"} {avgPct}%
                </p>
              )}
            </div>
            <p className="text-[11px] text-white mt-1">최근 실거래 기준</p>
          </div>
        </button>
        {/* 평수별 필터 탭 */}
        <div className="flex gap-1.5 px-3 pt-2 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {PYEONG_FILTERS.map(p => (
            <button key={p} onClick={() => setPyeongFilter(p)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all ${
                pyeongFilter === p
                  ? "bg-white text-[#0D9488]"
                  : "bg-white/15 text-white border border-white/30"
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>
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

/** 영업시간 문자열 안에 현재 분(0~1439)이 포함되는지 */
function isWithinHours(hoursStr: string | null, curMinutes: number): boolean {
  if (!hoursStr) return false;
  if (/24시간|상시|연중무휴/.test(hoursStr)) return true;
  for (const m of hoursStr.matchAll(/(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/g)) {
    const s = +m[1] * 60 + +m[2];
    const e = +m[3] * 60 + +m[4];
    if (e <= s) {
      // 자정 넘김 (예: 22:00~02:00)
      if (curMinutes >= s || curMinutes < e) return true;
    } else if (curMinutes >= s && curMinutes < e) {
      return true;
    }
  }
  return false;
}

/** 특정 날짜 기준 마트 영업 여부 */
function getMartStatus(mart: Mart, date: Date): {
  isOpen: boolean;
  hours: string | null;
  reason?: string;
  /** 영업일이지만 시간상 영업종료된 상태 */
  closedNow?: boolean;
} {
  const day = date.getDay();
  if (isMandatoryClosed(date, mart.closing_pattern)) {
    return { isOpen: false, hours: null, reason: "의무휴업일" };
  }
  const hours =
    day === 0 ? mart.sunday_hours
    : day === 6 ? mart.saturday_hours
    : mart.weekday_hours;
  if (!hours) {
    if (day === 0) return { isOpen: false, hours: null, reason: "일요일 휴무" };
    return { isOpen: false, hours: null, reason: "영업시간 미등록" };
  }
  // 오늘 날짜와 동일하면 시:분 비교, 미래 날짜면 영업일 자체로 판단
  const sameDay = date.toDateString() === new Date().toDateString();
  if (!sameDay) return { isOpen: true, hours };
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return isWithinHours(hours, cur)
    ? { isOpen: true, hours }
    : { isOpen: false, hours, reason: "영업종료" };
}

function martTypeBadge(type: string) {
  if (type === "대형마트") return "bg-[#EDE9FE] text-[#6D28D9]";
  if (type === "중형마트") return "bg-[#DBEAFE] text-[#1D4ED8]";
  if (type === "동네마트") return "bg-[#D1FAE5] text-[#065F46]";
  return "bg-[#E0F2FE] text-[#0369A1]";
}

// ─── 마트 위젯 ────────────────────────────────────────────────
const MART_INITIAL_COUNT = 5;

// 검단신도시 중앙 좌표 (위치 권한 거부 시 폴백)
const GEUMDAN_CENTER = { lat: 37.6075, lng: 126.6485 };

function MartSection() {
  const [marts, setMarts] = useState<Mart[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [locState, setLocState] = useState<"loading" | "ok" | "denied" | "idle">("idle");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number }>(GEUMDAN_CENTER);

  useEffect(() => {
    fetchMarts().then(data => { setMarts(data); setLoaded(true); });
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocState("denied");
      return;
    }
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocState("ok");
      },
      () => setLocState("denied"),
      { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const now      = new Date();
  const today    = now.getDay();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const showTomorrow = today === 6;

  // 거리 계산 + 정렬: 영업중→영업종료/휴무 그룹 내에서 거리 오름차순
  const withDist = marts.map(m => {
    const dist = m.lat != null && m.lng != null
      ? haversineM(userPos.lat, userPos.lng, m.lat, m.lng)
      : Number.POSITIVE_INFINITY;
    const status = getMartStatus(m, now);
    return { mart: m, dist, status };
  });
  const sorted = withDist.sort((a, b) => {
    const aOpen = a.status.isOpen ? 0 : 1;
    const bOpen = b.status.isOpen ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return a.dist - b.dist;
  });

  const closedTodayCount    = withDist.filter(x => !x.status.isOpen && x.status.reason === "의무휴업일").length;
  const closedTomorrow      = showTomorrow ? marts.filter(m => isMandatoryClosed(tomorrow, m.closing_pattern)) : [];

  if (loaded && marts.length === 0) return null;

  const locLabel = locState === "loading"
    ? "내 위치 확인 중…"
    : locState === "ok"
      ? "내 위치 기준 가까운 순"
      : locState === "denied"
        ? "위치 권한 거부 — 검단신도시 중앙 기준"
        : "검단신도시 중앙 기준";

  return (
    <>
      <SectionLabel label="주변 마트" />
      <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">

        {/* 위치 기준 표시줄 */}
        <div className="px-4 py-2 flex items-center justify-between gap-2 border-b border-[#f5f5f7]">
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className={locState === "ok" ? "text-[#0071e3]" : "text-[#86868b]"} />
            <span className={`text-[11px] font-semibold ${locState === "ok" ? "text-[#0071e3]" : "text-[#6e6e73]"}`}>
              {locLabel}
            </span>
          </div>
          <button
            onClick={requestLocation}
            className="flex items-center gap-1 px-2 py-1 rounded-lg active:bg-[#f5f5f7]"
            aria-label="위치 새로고침"
          >
            <RefreshCw size={11} className={`text-[#0071e3] ${locState === "loading" ? "animate-spin" : ""}`} />
            <span className="text-[11px] text-[#0071e3] font-semibold">위치 갱신</span>
          </button>
        </div>

        {/* 의무휴업 배너 */}
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          closedTodayCount > 0 ? "bg-[#FEF3C7]" : "bg-[#F0FDF4]"
        }`}>
          <ShoppingBag size={13} className={closedTodayCount > 0 ? "text-[#D97706]" : "text-[#059669]"} />
          <span className={`text-[13px] font-semibold ${closedTodayCount > 0 ? "text-[#D97706]" : "text-[#059669]"}`}>
            {closedTodayCount > 0
              ? `오늘 ${closedTodayCount}곳 의무휴업 — 미리 확인하세요`
              : "오늘 주변 마트 모두 정상 영업일"
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
          {(showAll ? sorted : sorted.slice(0, MART_INITIAL_COUNT)).map(({ mart, dist, status }) => {
            const tmrStatus   = showTomorrow ? getMartStatus(mart, tomorrow) : null;
            const distLabel   = Number.isFinite(dist) ? formatDistanceKm(dist) : null;

            // 배지 색상/문구
            let badgeClass = "bg-[#DCFCE7] text-[#059669]";
            let badgeText  = "영업중";
            if (!status.isOpen) {
              if (status.reason === "의무휴업일") {
                badgeClass = "bg-[#FFEDD5] text-[#C2410C]";
                badgeText  = "오늘 휴무";
              } else if (status.reason === "일요일 휴무") {
                badgeClass = "bg-[#FFEDD5] text-[#C2410C]";
                badgeText  = "일요일 휴무";
              } else {
                badgeClass = "bg-[#E5E7EB] text-[#6B7280]";
                badgeText  = "영업종료";
              }
            }

            return (
              <div key={mart.id} className="px-4 py-3.5 flex items-center gap-3">
                {/* 로고 */}
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${
                  status.isOpen ? "bg-[#F0FDF4]" : "bg-[#f5f5f7]"
                }`}>
                  {mart.logo_url
                    ? <img src={mart.logo_url} alt={mart.brand} className="w-full h-full object-contain p-1" />
                    : <ShoppingBag size={22} className={status.isOpen ? "text-[#059669]" : "text-[#6e6e73]"} />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-bold text-[#1d1d1f] truncate">{mart.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${martTypeBadge(mart.type)}`}>
                      {mart.type}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                      {badgeText}
                    </span>
                  </div>

                  {/* 오늘 시간 정보 */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[12px] font-semibold ${status.isOpen ? "text-[#059669]" : "text-[#86868b]"}`}>
                      {status.hours
                        ? `${status.isOpen ? "영업 중" : "영업 마감"} · ${status.hours}`
                        : status.reason ?? "휴무"}
                    </span>
                  </div>

                  {/* 주말 영업시간 (평일에만 미리 보여주기) */}
                  {(mart.saturday_hours || mart.sunday_hours) && today >= 1 && today <= 5 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {mart.saturday_hours && <span className="text-[11px] text-[#86868b]">토 {mart.saturday_hours}</span>}
                      {mart.sunday_hours   && <span className="text-[11px] text-[#86868b]">일 {mart.sunday_hours}</span>}
                    </div>
                  )}

                  {/* 내일 의무휴업 경고 */}
                  {tmrStatus && !tmrStatus.isOpen && tmrStatus.reason === "의무휴업일" && (
                    <span className="text-[11px] text-[#F04452]">⚠ 내일 의무휴업</span>
                  )}

                  {mart.notice && (
                    <p className="text-[11px] text-[#86868b] mt-0.5 truncate">{mart.notice}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {distLabel && <span className="text-[12px] text-[#6e6e73] font-semibold">{distLabel}</span>}
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

        {/* 더보기 / 접기 버튼 */}
        {marts.length > MART_INITIAL_COUNT && (
          <button
            onClick={() => setShowAll(v => !v)}
            className="w-full py-2.5 flex items-center justify-center gap-1 text-[13px] font-semibold text-[#0071e3] border-t border-[#f5f5f7] active:bg-[#f5f5f7]"
          >
            {showAll
              ? <>접기 <ChevronUp size={14} /></>
              : <>마트 {marts.length - MART_INITIAL_COUNT}곳 더보기 <ChevronDown size={14} /></>
            }
          </button>
        )}
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
    // 심야 시간대: 요일 적용 여부 확인 (평일 전용인데 주말이면 패스)
    const weekdayOnly = /평일/.test(p.nightHours);
    const weekendOnly = /주말|토요일|일요일|토·일/.test(p.nightHours);
    const nightApplicable = weekdayOnly ? !isWeekend : weekendOnly ? isWeekend : true;
    if (nightApplicable) {
      return { isOpen: withinHoursStr(p.nightHours, cur), todayHours: p.nightHours, todayLabel: "심야" };
    }
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
  // 상호명으로 검색 — 주소로 검색하면 무관한 장소가 나올 수 있음
  const q = encodeURIComponent(name);

  const kakaoUrl = `https://map.kakao.com/link/search/${q}`;
  const naverUrl = `https://map.naver.com/v5/search/${q}`;
  const tmapUrl  = `https://tmap.life/search?query=${q}`;

  const embedUrl = lat && lng
    ? `https://maps.google.com/maps?q=${lat},${lng}&output=embed&hl=ko`
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

  const filtered = sortedPharmacies.filter(({ p, distM }) => {
    // 거리를 알 수 없는 항목 제외 (GPS 미허용 시 Infinity)
    if (!Number.isFinite(distM)) return false;
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
    if (!s) return null;
    const saved = JSON.parse(s) as WidgetConfig[];
    // 마이그레이션: tides가 구버전 위치(sort_order > 10)에 있으면 DEFAULT_WIDGETS 순서 적용
    const tidesEntry = saved.find(w => w.id === "tides");
    if (tidesEntry && tidesEntry.sort_order > 10) {
      const enabledMap = new Map(saved.map(w => [w.id, w.enabled]));
      return DEFAULT_WIDGETS.map(def => ({
        ...def,
        enabled: enabledMap.get(def.id) ?? def.enabled,
      }));
    }
    return saved;
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
    <div className="fixed inset-0 z-[9500]">
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

// ─── 홈 교통 위젯 (transport 페이지와 동일한 카드 디자인) ──────
const STOP_NAME_FALLBACK: Record<string, string> = Object.fromEntries([
  ...GEUMDAN_BUS_STATIONS.map(s => [s.id, s.name]),
  ...GEUMDAN_BUS_STATIONS.map(s => [s.stationId, s.name]),
]);
const ALL_SUBWAY_STATIONS = getAllSubwayStations();

// transport 페이지의 ArrivalBadge와 동일한 디자인
function ArrivalBadge({ min, live }: { min: number; live: boolean }) {
  if (!live || min === -1) {
    return (
      <div className="bg-[#d2d2d7] rounded-xl px-3 py-1.5 text-center min-w-[54px]">
        <span className="text-[#6e6e73] text-[14px] font-bold">--</span>
      </div>
    );
  }
  const bg = min <= 3 ? "bg-[#F04452]" : min <= 7 ? "bg-[#FF9500]" : "bg-[#0071e3]";
  return (
    <div className={`${bg} rounded-xl px-3 py-1.5 text-center min-w-[54px]`}>
      {min <= 0
        ? <span className="text-white text-[12px] font-bold">곧도착</span>
        : <>
            <span className="text-white text-[21px] font-black leading-none">{min}</span>
            <span className="text-white/80 text-[11px] block leading-none mt-0.5">분 후</span>
          </>
      }
    </div>
  );
}

function HomeTransportWidget() {
  const router = useRouter();

  const [favStops, setFavStops] = useState<FavStopMeta[]>(() => loadFavStops());
  const [favRoutes, setFavRoutes] = useState<FavRouteMeta[]>(() => loadFavRoutes());

  function removeFavStop(stopId: string) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("favStops") ?? "[]");
      const next = list.filter(id => id !== stopId);
      localStorage.setItem("favStops", JSON.stringify(next));
    } catch { /* ignore */ }
    setFavStops(prev => prev.filter(s => s.id !== stopId));
  }

  function removeFavRoute(routeKey: string) {
    try {
      const list: string[] = JSON.parse(localStorage.getItem("favRoutes") ?? "[]");
      const next = list.filter(k => k !== routeKey);
      localStorage.setItem("favRoutes", JSON.stringify(next));
    } catch { /* ignore */ }
    setFavRoutes(prev => prev.filter(r => r.key !== routeKey));
  }
  const [busArrivals, setBusArrivals] = useState<Record<string, BusArrival[]>>({});
  const [busLoading, setBusLoading] = useState<Set<string>>(new Set());
  // API에서 실시간으로 조회한 정류장명 (favStops 이름이 없을 때 덮어씀)
  const [busStopNames, setBusStopNames] = useState<Record<string, string>>({});

  const [favSubways] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("favSubways") ?? "[]")); } catch { return new Set(); }
  });
  const [subwayArrivals, setSubwayArrivals] = useState<Record<string, SubwayArrival[]>>({});
  const [subwayLoading, setSubwayLoading] = useState<Set<string>>(new Set());

  // 노선 즐겨찾기의 부모 정류장도 함께 도착정보를 조회한다
  const favStopIds = favStops.map(s => s.id);
  const favRouteStopIds = favRoutes.map(r => r.stopId);
  const allBusStopIds = Array.from(new Set([...favStopIds, ...favRouteStopIds]));
  const favRouteKeySet = new Set(favRoutes.map(r => r.key));

  // 표시할 정류장 목록: 즐겨찾기 정류장 + 즐겨찾기 노선의 부모 정류장 (중복 제거)
  const busStopsToShow: { id: string; name: string }[] = (() => {
    const byId = new Map<string, { id: string; name: string }>();
    favStops.forEach(s => byId.set(s.id, { id: s.id, name: s.name }));
    favRoutes.forEach(r => {
      if (!byId.has(r.stopId)) byId.set(r.stopId, { id: r.stopId, name: r.stopName });
    });
    return Array.from(byId.values());
  })();

  const favSubwayStations: SubwayStationWithDist[] = ALL_SUBWAY_STATIONS.filter(s => favSubways.has(s.id));

  const refreshBusStop = useCallback(async (stopId: string) => {
    setBusLoading(prev => new Set([...prev, stopId]));
    try {
      // stationId lookup: 구버전 "gd-X" 형식 저장 호환
      const station = GEUMDAN_BUS_STATIONS.find(s => s.id === stopId);
      const apiId = station?.stationId ?? stopId;
      // NodeId(TAGO) 먼저: 권역 밖 정류장도 전국 단위로 조회 가능
      let data = await fetchArrivalsByNodeId(apiId);
      if (data.length === 0) data = await fetchArrivalsByStationId(apiId);
      setBusArrivals(prev => ({ ...prev, [stopId]: data }));

      // 이름 자동 저장: stationName이 있으면 favStops_meta에 백필
      const apiStationName = data[0]?.stationName;
      if (apiStationName && apiStationName !== "정류장") {
        try {
          const meta: Record<string, { name?: string; lat?: number; lng?: number }> =
            JSON.parse(localStorage.getItem("favStops_meta") ?? "{}");
          if (!meta[stopId]?.name || meta[stopId]?.name === "정류장") {
            meta[stopId] = { ...(meta[stopId] ?? {}), name: apiStationName };
            localStorage.setItem("favStops_meta", JSON.stringify(meta));
            // busStopsToShow는 useState 초기값이므로 이름을 강제 업데이트
            setBusStopNames(prev => ({ ...prev, [stopId]: apiStationName }));
          }
        } catch { /* ignore */ }
      }
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

  useEffect(() => {
    allBusStopIds.forEach(id => refreshBusStop(id));
    favSubwayStations.forEach(st => refreshSubwayStation(st));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBus    = busStopsToShow.length > 0;
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
    <section className="mx-4 mb-1 space-y-3">

      {/* ── 버스 정류장 카드 (transport 페이지 메인 리스트와 동일 디자인) ── */}
      {hasBus && busStopsToShow.map(stop => {
        const stopArrivals = busArrivals[stop.id] ?? [];
        const hasFavRoutes = stopArrivals.some(a => favRouteKeySet.has(routeFavKey(stop.id, a)));
        const displayed = hasFavRoutes
          ? stopArrivals.filter(a => favRouteKeySet.has(routeFavKey(stop.id, a))).slice(0, 3)
          : stopArrivals.slice(0, 3);
        const stopName = (stop.name && stop.name !== "정류장")
          ? stop.name
          : (busStopNames[stop.id] || STOP_NAME_FALLBACK[stop.id] || "알 수 없는 정류장");
        const isLoading = busLoading.has(stop.id);

        return (
          <div key={stop.id} className="bg-white rounded-2xl overflow-hidden">
            {/* 정류장 헤더 */}
            <div className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e8f1fd] flex items-center justify-center shrink-0">
                  <Bus size={18} className="text-[#0071e3]" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-bold text-[#1d1d1f]">{stopName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Navigation size={10} className="text-[#0071e3]" />
                    <span className="text-[12px] font-semibold text-[#0071e3]">즐겨찾기</span>
                    {!isLoading && stopArrivals.length > 0 && (
                      <span className="text-[12px] text-[#86868b]">· 노선 {stopArrivals.length}개</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => refreshBusStop(stop.id)} disabled={isLoading}
                  className="p-1.5 active:opacity-60">
                  <RefreshCw size={14} className={`text-[#86868b] ${isLoading ? "animate-spin" : ""}`} />
                </button>
                <button onClick={() => removeFavStop(stop.id)}
                  className="p-1.5 active:opacity-60" title="즐겨찾기 해제">
                  <Star size={15} className="text-[#FFBB00] fill-[#FFBB00]" />
                </button>
              </div>
            </div>

            {/* 도착 정보 */}
            <div className="px-4 pb-4 space-y-2">
              {isLoading ? (
                [1, 2].map(i => (
                  <div key={i} className="flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3 animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-8 bg-[#d2d2d7] rounded-lg" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-28 bg-[#d2d2d7] rounded" />
                        <div className="h-3 w-16 bg-[#d2d2d7] rounded" />
                      </div>
                    </div>
                    <div className="w-14 h-12 bg-[#d2d2d7] rounded-xl" />
                  </div>
                ))
              ) : displayed.length === 0 ? (
                <div className="bg-[#f5f5f7] rounded-xl px-3 py-3 text-center">
                  <p className="text-[12px] text-[#86868b]">운행 정보 없음</p>
                </div>
              ) : displayed.map((a, i) => {
                const rKey = routeFavKey(stop.id, a);
                const isFavRoute = favRouteKeySet.has(rKey);
                return (
                <div key={i} className="flex items-center gap-1">
                  <button
                    onClick={() => router.push("/transport/?tab=버스")}
                    className="flex-1 flex items-center justify-between bg-[#f5f5f7] rounded-xl px-3 py-3 active:bg-[#eaeaea] text-left min-w-0">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className={`${a.isScheduled ? "bg-[#86868b]" : "bg-[#0071e3]"} rounded-lg px-2.5 py-1 min-w-[44px] text-center shrink-0`}>
                        <span className="text-white text-[14px] font-black">{a.routeNo}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{a.destination} 방면</p>
                          {a.isExpress && (
                            <span className="flex items-center gap-0.5 text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] px-1 py-0.5 rounded shrink-0">
                              <Zap size={9} />급행
                            </span>
                          )}
                          {a.isLowFloor && <Accessibility size={12} className="text-[#0071e3] shrink-0" />}
                        </div>
                        <p className="text-[12px] text-[#6e6e73]">
                          {a.isScheduled ? "경유 노선" : a.remainingStops > 0 ? `${a.remainingStops}정류장 전` : "곧 도착"}
                        </p>
                      </div>
                    </div>
                    <ArrivalBadge min={a.arrivalMin} live={!a.isScheduled} />
                  </button>
                  {isFavRoute && (
                    <button onClick={() => removeFavRoute(rKey)}
                      className="p-1.5 shrink-0 active:opacity-60" title="노선 즐겨찾기 해제">
                      <Star size={14} className="text-[#FFBB00] fill-[#FFBB00]" />
                    </button>
                  )}
                </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* ── 지하철 역 카드 (transport 페이지 주변지하철역과 동일 디자인) ── */}
      {hasSubway && favSubwayStations.map(st => {
        const live = subwayArrivals[st.id];
        const displayArrivals = live && live.length > 0 ? live : estimateNextArrivals(st.timetable);
        const isEstimated = !live || live.length === 0;
        const upArrivals   = displayArrivals.filter(a => a.direction === "상행").slice(0, 2);
        const downArrivals = displayArrivals.filter(a => a.direction === "하행").slice(0, 2);
        const isLoading = subwayLoading.has(st.id);
        const lineShort = st.line.replace(/호선|철도/g, "").slice(0, 2);

        return (
          <div key={st.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* 역 헤더 — 라인 컬러 배경 */}
            <div className="flex items-center gap-2 px-3 py-2.5" style={{ background: st.lineColor }}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                  <span className="text-[12px] font-black leading-none" style={{ color: st.lineColor }}>{lineShort}</span>
                </div>
                <span className="text-white font-extrabold text-[15px] truncate">{st.displayName}</span>
                <span className="flex items-center gap-0.5 text-white/70 text-[11px] font-medium shrink-0">
                  ⭐ 즐겨찾기
                </span>
              </div>
              <button onClick={() => refreshSubwayStation(st)} disabled={isLoading}
                className="p-1 active:opacity-60 shrink-0">
                <RefreshCw size={14} className={`text-white/70 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* 도착 정보 헤더 */}
            <div className="px-3 py-2 flex items-center justify-between border-b border-[#f5f5f7]">
              <span className="text-[12px] font-bold text-[#1d1d1f]">도착 정보</span>
              <div className="flex items-center gap-2">
                {isEstimated && <span className="text-[10px] text-[#86868b]">⏱ 시간표 기준</span>}
                {st.timetable.intervalMin > 0 && (
                  <span className="text-[10px] text-[#86868b]">배차 {st.timetable.intervalDisplay ?? `${st.timetable.intervalMin}분`}</span>
                )}
              </div>
            </div>

            {/* 2열 도착 */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-2 p-3">
                {[0, 1].map(i => <div key={i} className="h-16 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
              </div>
            ) : displayArrivals.length === 0 ? (
              <p className="px-3 py-3 text-[13px] text-[#6e6e73] text-center">운행 종료</p>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-[#f5f5f7]">
                {[
                  { label: st.timetable.upDirection, arrivals: upArrivals },
                  { label: st.timetable.downDirection, arrivals: downArrivals },
                ].map(({ label, arrivals: dirArrivals }, col) => (
                  <div key={col} className="px-3 py-2.5">
                    <div className="flex items-center gap-0.5 mb-2 pb-1.5 border-b border-[#f5f5f7]">
                      <span className="text-[12px] font-bold text-[#1d1d1f] flex-1 truncate">{label} 방면</span>
                    </div>
                    {dirArrivals.length > 0 ? dirArrivals.map((a, i) => (
                      <div key={i} className="flex items-center justify-between py-1">
                        <div className="flex-1 min-w-0 mr-1">
                          <span className="text-[12px] text-[#424245] block truncate">{a.terminalStation}</span>
                          {!isEstimated && a.currentStation && (
                            <span className="text-[9px] text-[#86868b]">{a.currentStation} 출발</span>
                          )}
                          {a.isExpress && (
                            <span className="text-[9px] text-[#E65100] font-bold block">{a.trainTypeName ?? "급행"}</span>
                          )}
                        </div>
                        <span className={`text-[16px] font-black shrink-0 ${a.arrivalMin <= 2 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
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

            {/* 첫차/막차 */}
            {st.timetable.upFirst !== "-" && (
              <div className="flex gap-2 px-3 pb-3 pt-1 border-t border-[#f5f5f7]">
                <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2">
                  <p className="text-[10px] text-[#86868b] mb-0.5">{st.timetable.upDirection} 첫/막차</p>
                  <p className="text-[12px] font-bold text-[#1d1d1f]">{st.timetable.upFirst} / {st.timetable.upLast}</p>
                </div>
                <div className="flex-1 bg-[#f5f5f7] rounded-xl px-3 py-2">
                  <p className="text-[10px] text-[#86868b] mb-0.5">{st.timetable.downDirection} 첫/막차</p>
                  <p className="text-[12px] font-bold text-[#1d1d1f]">{st.timetable.downFirst} / {st.timetable.downLast}</p>
                </div>
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
  // localStorage 캐시가 있으면 즉시 표시, 없으면 로딩 상태
  const [weather, setWeather] = useState<WeatherData | null>(() => getCachedWeather());
  const [weatherLoading, setWeatherLoading] = useState(() => getCachedWeather() === null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [userNickname, setUserNickname] = useState("검단주민");
  const [homeBanners, setHomeBanners] = useState<Banner[]>([]);
  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    fetchWeather().then(w => { if (w) setWeather(w); setWeatherLoading(false); });
    getUserProfile().then(p => setUserNickname(p.nickname));
    fetchActiveBanners("home").then(setHomeBanners);
    fetchActivePopups().then(setPopups);
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
        <SectionLabel label="검단 뉴스" href="/community/?tab=뉴스" linkLabel="전체보기" />
        <NewsWidget />
      </>
    ),
    youtube: () => <YouTubeSection />,
    instagram: () => <InstagramFeedSection />,
    realestate: () => (
      <>
        <SectionLabel label="실거래가" href="/community/?tab=시세" linkLabel="전체보기" />
        <RealEstateWidget />
      </>
    ),
    places: () => <PlacesSection />,
    sports: () => <SportsWidget />,
    tides: () => <TideSection />,
    gas: () => <GasWidget />,
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

      <PopupBottomSheet popups={popups} />
    </div>
  );
}
