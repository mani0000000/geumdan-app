"use client";
import { useEffect, useState } from "react";
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
import type { Pharmacy, NearbyMart, MartClosingPattern } from "@/lib/mockData";
import { fetchNightPharmacies, fetchEmergencyRooms } from "@/lib/db/pharmacies";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";

// ─── 퀵 메뉴 ─────────────────────────────────────────────────
const quickMenus = [
  { icon: Bus,           label: "버스",    href: "/transport/",   color: "#3182F6", bg: "#EBF3FE" },
  { icon: HomeIcon,      label: "부동산",  href: "/real-estate/", color: "#00C471", bg: "#D1FAE5" },
  { icon: Newspaper,     label: "뉴스",    href: "/news/",        color: "#F04452", bg: "#FEE2E2" },
  { icon: MessageCircle, label: "커뮤니티",href: "/community/",   color: "#6366F1", bg: "#EDE9FE" },
  { icon: ShoppingBag,   label: "중고거래",href: "/community/",   color: "#F97316", bg: "#FFF3E0" },
  { icon: Users,         label: "소모임",  href: "/community/",   color: "#0EA5E9", bg: "#E0F2FE" },
  { icon: Ticket,        label: "쿠폰",    href: "/coupons/",     color: "#F59E0B", bg: "#FEF3C7" },
  { icon: Star,          label: "즐겨찾기",href: "/mypage/",      color: "#8B5CF6", bg: "#EDE9FE" },
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
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#E5E8EB] rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#F2F4F6]">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[#3182F6]" />
            <span className="text-[17px] font-bold text-[#191F28]">주간 날씨</span>
          </div>
          <button onClick={onClose} className="active:opacity-60">
            <X size={20} className="text-[#8B95A1]" />
          </button>
        </div>
        <div className="px-4 py-3 pb-10 space-y-1">
          {weekly.map((day, i) => (
            <div key={i}
              className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-colors ${
                day.isToday ? "bg-[#EBF3FE]" : "hover:bg-[#F2F4F6]"
              }`}>
              <div className="w-14 shrink-0">
                <p className={`text-[14px] font-bold ${day.isToday ? "text-[#3182F6]" : "text-[#4E5968]"}`}>
                  {day.isToday ? "오늘" : day.dayLabel}
                </p>
                <p className="text-[12px] text-[#B0B8C1]">{day.date}</p>
              </div>
              <span className="text-[25px] w-8 shrink-0">{day.emoji}</span>
              <div className="flex-1">
                {day.precipitation > 0 && (
                  <p className="text-[12px] text-[#3182F6]">💧 {day.precipitation}mm</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[15px] font-bold text-[#F04452]">{day.high}°</span>
                <span className="text-[13px] text-[#B0B8C1]">/</span>
                <span className="text-[15px] font-semibold text-[#3182F6]">{day.low}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

// ─── 날씨 위젯 ────────────────────────────────────────────────
function WeatherWidget({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showWeekly, setShowWeekly] = useState(false);

  if (loading) {
    return (
      <div className="mx-4 mt-3 mb-1 bg-[#3182F6] rounded-2xl p-4 animate-pulse">
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
    weather.weatherCode <= 1 ? "from-[#3182F6] to-[#0EA5E9]"
    : weather.weatherCode <= 3 ? "from-[#4E5968] to-[#6B7684]"
    : weather.weatherCode >= 61 ? "from-[#1B64DA] to-[#3182F6]"
    : "from-[#3182F6] to-[#6366F1]";

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
            <div className="flex items-center gap-2 mt-0.5">
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
          <span className="text-[15px] font-bold text-[#191F28]">이번 주 쿠폰</span>
        </div>
        <Link href="/coupons/" className="text-[13px] text-[#3182F6] font-medium flex items-center gap-0.5">
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
                      <p className="text-[14px] font-extrabold text-[#191F28] truncate">{c.storeName}</p>
                      <p className="text-[11px] text-[#8B95A1] truncate mt-0.5">{c.buildingName}</p>
                    </div>
                  </div>
                </div>

                {/* ── 절취선 노치 ── */}
                <div className="relative flex items-center" style={{ height: "14px" }}>
                  {/* 배경 선 */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                    style={{ borderTop: `2px dashed ${c.color}55` }} />
                  {/* 좌측 반원 */}
                  <div className="absolute -left-[7px] w-[14px] h-[14px] rounded-full bg-[#F2F4F6] border-r-0"
                    style={{ border: `1.5px solid ${c.color}22`, borderLeft: "none" }} />
                  {/* 우측 반원 */}
                  <div className="absolute -right-[7px] w-[14px] h-[14px] rounded-full bg-[#F2F4F6] border-l-0"
                    style={{ border: `1.5px solid ${c.color}22`, borderRight: "none" }} />
                </div>

                {/* ── 하단 흰 영역 ── */}
                <div className="px-4 pt-2 pb-3.5">
                  {/* 할인 금액 크게 */}
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-[28px] font-black leading-none" style={{ color: c.color }}>
                      {c.discount}
                    </span>
                    <span className="text-[12px] font-bold text-[#8B95A1]">할인</span>
                  </div>
                  {/* 쿠폰 제목 */}
                  <p className="text-[12px] text-[#4E5968] leading-snug line-clamp-2 mb-2.5">{c.title}</p>
                  {/* 하단: 만료일 + 받기 버튼 */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold ${urgent ? "text-[#F04452]" : "text-[#B0B8C1]"}`}>
                      {urgent ? `⏰ D-${dDay}` : `~${c.expiry.slice(5)}`}
                    </span>
                    <button
                      onClick={() => setDownloaded(d => { const n = new Set(d); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                      className={`h-7 px-3.5 rounded-lg text-[12px] font-extrabold active:opacity-70 transition-all ${
                        done ? "bg-[#F2F4F6] text-[#B0B8C1]" : "text-white shadow-sm"
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
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3"><div className="w-10 h-1 bg-[#E5E8EB] rounded-full" /></div>
        {/* 헤더 */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#FFF0F0] flex items-center justify-center text-xl">{store.emoji}</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-[#191F28]">{store.storeName}</span>
                {store.isNew && <span className="text-[10px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>}
              </div>
              <p className="text-[12px] text-[#8B95A1] mt-0.5">검단 센트럴 타워 {store.floor} · {store.category}</p>
            </div>
          </div>
          <button onClick={onClose} className="active:opacity-60 mt-0.5">
            <X size={20} className="text-[#8B95A1]" />
          </button>
        </div>
        {/* D-day 배너 */}
        {dDay !== null && (
          <div className={`mx-5 mb-3 rounded-xl px-4 py-2.5 flex items-center justify-between ${dDay <= 3 ? "bg-[#FFF0F0]" : "bg-[#EBF3FE]"}`}>
            <span className="text-[13px] font-semibold text-[#4E5968]">혜택 마감까지</span>
            <span className={`text-[15px] font-black ${dDay <= 3 ? "text-[#F04452]" : "text-[#3182F6]"}`}>
              {dDay > 0 ? `D-${dDay}` : dDay === 0 ? "오늘 마감!" : "종료"}
            </span>
          </div>
        )}
        {/* 혜택 항목 */}
        <div className="px-5 pb-2">
          <p className="text-[13px] font-bold text-[#8B95A1] mb-2.5">오픈 혜택 안내</p>
          <div className="space-y-2">
            {b.details.map((d, i) => (
              <div key={i} className="flex items-start gap-2.5 bg-[#F8F9FB] rounded-xl px-3.5 py-3">
                <div className="w-5 h-5 rounded-full bg-[#3182F6] flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-black text-white">{i + 1}</span>
                </div>
                <p className="text-[14px] text-[#191F28] leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>
        {/* 유효기간 */}
        {b.validUntil && (
          <p className="text-[12px] text-[#B0B8C1] text-center pt-2 pb-2">
            혜택 기간: ~{b.validUntil.slice(5).replace("-", "/")}
          </p>
        )}
        <div className="px-5 pb-10 pt-1">
          <button onClick={onClose}
            className="w-full h-12 bg-[#3182F6] rounded-xl text-white text-[15px] font-bold active:bg-[#1B64DA]">
            확인
          </button>
        </div>
      </div>
      <div className="absolute inset-0 bg-black/40 -z-10" />
    </div>
  );
}

function NewOpeningsSection() {
  const [sheetStore, setSheetStore] = useState<typeof newStoreOpenings[0] | null>(null);

  return (
    <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-[#191F28]">이번 주 신규 오픈</span>
            <span className="text-[12px] font-bold bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
          </div>
          <Link href="/stores/" className="text-[13px] text-[#3182F6] font-medium flex items-center gap-0.5">
            지도 보기 <ChevronRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {newStoreOpenings.map(s => (
            <button key={s.id}
              onClick={() => setSheetStore(s)}
              className="w-full flex items-start gap-3 px-4 py-3 active:bg-[#F2F4F6] text-left">
              <StoreLogo name={s.storeName} category={s.category} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-bold text-[#191F28] truncate">{s.storeName}</p>
                  {s.isNew && (
                    <span className="shrink-0 text-[10px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[12px] text-[#8B95A1]">검단 센트럴 타워</span>
                  <span className="text-[12px] text-[#B0B8C1]">·</span>
                  <span className="text-[12px] font-semibold text-[#3182F6]">{s.floor}</span>
                  <span className="text-[12px] text-[#B0B8C1]">·</span>
                  <span className="text-[12px] text-[#8B95A1]">{s.category}</span>
                </div>
                {s.openBenefit && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-bold bg-[#FFF0F0] text-[#F04452] px-1.5 py-0.5 rounded-full shrink-0">혜택</span>
                    <span className="text-[12px] text-[#F04452] font-medium truncate">{s.openBenefit.summary}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0 pt-0.5">
                <p className="text-[12px] text-[#B0B8C1]">{s.openDate.slice(5)} 오픈</p>
              </div>
            </button>
          ))}
        </div>
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
  const hotPosts = posts.filter(p => p.isHot).slice(0, 4);
  const topNews = newsItems.slice(0, 4);

  return (
    <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex border-b border-[#F2F4F6]">
          {(["커뮤니티", "뉴스", "시세"] as SosikTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[14px] font-semibold border-b-2 transition-colors ${
                tab === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#B0B8C1] border-transparent"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "커뮤니티" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-[#F04452]" />
                <span className="text-[14px] font-bold text-[#191F28]">HOT 게시글</span>
              </div>
              <Link href="/community/" className="text-[13px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {hotPosts.map(post => (
                <button key={post.id}
                  onClick={() => router.push(`/community/detail/?id=${post.id}`)}
                  className="w-full px-4 py-3 flex items-start gap-2.5 active:bg-[#F2F4F6] text-left">
                  <span className="text-[12px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    {post.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#191F28] truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[12px] text-[#8B95A1]">{post.authorDong}</span>
                      <span className="text-[12px] text-[#B0B8C1]">·</span>
                      <span className="text-[12px] text-[#8B95A1]">{formatRelativeTime(post.createdAt)}</span>
                      <span className="text-[12px] text-[#B0B8C1] ml-auto">❤️ {post.likeCount}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/community/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[14px] font-medium text-[#4E5968]">
                커뮤니티 전체 보기 →
              </Link>
            </div>
          </div>
        )}

        {tab === "뉴스" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span className="text-[14px] font-bold text-[#191F28]">검단 최신 뉴스</span>
              <Link href="/news/" className="text-[13px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {topNews.map(item => (
                <button key={item.id}
                  onClick={() => router.push("/news/")}
                  className="w-full px-4 py-3 flex items-start gap-3 active:bg-[#F2F4F6] text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl shrink-0">📰</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-[#3182F6] font-medium">{item.source}</span>
                      <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/news/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[14px] font-medium text-[#4E5968]">
                뉴스 전체 보기 →
              </Link>
            </div>
          </div>
        )}

        {tab === "시세" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#00C471]" />
                <span className="text-[14px] font-bold text-[#191F28]">부동산 시세</span>
              </div>
              <Link href="/real-estate/" className="text-[13px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {apartments.slice(0, 4).map(apt => (
                <button key={apt.id}
                  onClick={() => router.push("/real-estate/")}
                  className="w-full px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6]">
                  <div className="text-left min-w-0 flex-1 pr-2">
                    <p className="text-[14px] font-medium text-[#191F28] truncate">{apt.name}</p>
                    <p className="text-[12px] text-[#8B95A1] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[15px] font-bold text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                    <p className="text-[11px] text-[#8B95A1]">실거래</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/real-estate/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[14px] font-medium text-[#4E5968]">
                부동산 시세 전체 보기 →
              </Link>
            </div>
          </div>
        )}
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
      <p className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide px-4 mb-1.5 mt-3">주변 마트</p>
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
        <div className="divide-y divide-[#F2F4F6]">
          {nearbyMarts.map(mart => {
            const todayStatus = getMartStatus(mart, now);
            const tmrStatus   = showTomorrow ? getMartStatus(mart, tomorrow) : null;

            return (
              <div key={mart.id} className="px-4 py-3.5 flex items-center gap-3">
                {/* 로고 */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  todayStatus.isOpen ? "bg-[#F0FDF4]" : "bg-[#F2F4F6]"
                }`}>
                  <ShoppingBag size={17} className={todayStatus.isOpen ? "text-[#059669]" : "text-[#8B95A1]"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#191F28]">{mart.name}</span>
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
                    <p className="text-[11px] text-[#B0B8C1] mt-0.5">{mart.notice}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[12px] text-[#8B95A1]">{mart.distance}</span>
                  <a href={`tel:${mart.phone}`}
                    className="w-8 h-8 bg-[#EBF3FE] rounded-xl flex items-center justify-center active:bg-[#DBEAFE]">
                    <Phone size={14} className="text-[#3182F6]" />
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
    fetchNightPharmacies().then(data => { if (data.length > 0) setPharmacies(data); });
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
          <div className={`px-4 py-2.5 flex items-center gap-2 ${isNight ? "bg-[#1B2B4B]" : "bg-[#EBF3FE]"}`}>
            <Clock size={13} className={isNight ? "text-blue-300" : "text-[#3182F6]"} />
            <span className={`text-[12px] font-semibold ${isNight ? "text-blue-200" : "text-[#3182F6]"}`}>
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
        <div className="flex border-b border-[#F2F4F6]">
          {(["약국", "응급실", "소아응급실"] as EmergencyType[]).map(t => (
            <button key={t} onClick={() => { setMainType(t); setShowAll(false); }}
              className={`flex-1 h-10 text-[13px] font-bold border-b-2 transition-colors ${mainType === t
                ? t === "약국" ? "text-[#3182F6] border-[#3182F6]"
                  : t === "응급실" ? "text-[#F04452] border-[#F04452]"
                  : "text-[#F97316] border-[#F97316]"
                : "text-[#B0B8C1] border-transparent"}`}>
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
                  className={`h-7 px-3 rounded-full text-[12px] font-semibold transition-colors ${filter === f ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
                  {f === "심야" ? "🌙 심야" : f === "주말" ? "📅 주말" : "전체"}
                </button>
              ))}
            </div>
            {/* 약국 목록 */}
            <div className="divide-y divide-[#F2F4F6]">
              {displayed.map(p => (
                <div key={p.id} className="px-4 py-3.5 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${p.isOpenNow ? "bg-[#D1FAE5]" : "bg-[#F2F4F6]"}`}>
                    <PillBottle size={18} className={p.isOpenNow ? "text-[#065F46]" : "text-[#8B95A1]"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-[#191F28]">{p.name}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${p.isOpenNow ? "bg-[#D1FAE5] text-[#065F46]" : "bg-[#F2F4F6] text-[#8B95A1]"}`}>
                        {p.isOpenNow ? "영업 중" : "영업 종료"}
                      </span>
                      {p.tags.includes("24시") && (
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">24시</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mt-0.5">{p.address}</p>
                    <div className="flex flex-col gap-0.5 mt-1.5">
                      {p.weekendHours && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#3182F6] w-6 shrink-0">주말</span>
                          <span className="text-[12px] text-[#4E5968]">{p.weekendHours}</span>
                        </div>
                      )}
                      {p.nightHours && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold text-[#6366F1] w-6 shrink-0">심야</span>
                          <span className="text-[12px] text-[#4E5968]">{p.nightHours}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {p.distance && <span className="text-[12px] text-[#8B95A1]">{p.distance}</span>}
                    <a href={`tel:${p.phone}`} className="w-8 h-8 bg-[#EBF3FE] rounded-xl flex items-center justify-center active:bg-[#DBEAFE]">
                      <Phone size={14} className="text-[#3182F6]" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length > 3 && (
              <button onClick={() => setShowAll(v => !v)}
                className="w-full py-3 flex items-center justify-center gap-1.5 border-t border-[#F2F4F6] active:bg-[#F2F4F6]">
                <span className="text-[13px] font-semibold text-[#4E5968]">{showAll ? "접기" : `${filtered.length - 3}개 더 보기`}</span>
                {showAll ? <ChevronUp size={14} className="text-[#8B95A1]" /> : <ChevronDown size={14} className="text-[#8B95A1]" />}
              </button>
            )}
          </>
        ) : (
          /* 응급실 / 소아응급실 목록 */
          <div className="divide-y divide-[#F2F4F6]">
            {erList.map(er => (
              <div key={er.id} className="px-4 py-3.5 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#FEE2E2]">
                  {mainType === "소아응급실"
                    ? <span className="text-[18px]">👶</span>
                    : <AlertTriangle size={18} className="text-[#F04452]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-bold text-[#191F28]">{er.name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#F04452]">{er.level}</span>
                    {er.isPediatric && mainType === "응급실" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#F97316]">소아과</span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#8B95A1] mt-0.5">{er.address}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock size={11} className="text-[#8B95A1]" />
                    <span className="text-[12px] text-[#4E5968]">{er.hours}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[12px] text-[#8B95A1]">{er.distance}</span>
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
    <p className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide px-4 mb-1.5 mt-3">
      {label}
    </p>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    fetchWeather().then(w => { setWeather(w); setWeatherLoading(false); });
  }, []);

  const stop = nearbyStops[0];
  const bus = stop?.routes[0];

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header showLocation />

      {/* ── 날씨 ── */}
      <WeatherWidget weather={weather} loading={weatherLoading} />

      {/* ── 퀵 메뉴 ── */}
      <div className="bg-white mx-4 mt-2 rounded-2xl px-2 py-3.5 mb-1">
        <div className="flex gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {quickMenus.map(({ icon: Icon, label, href, color, bg }) => (
            <Link key={label} href={href}
              className="flex flex-col items-center gap-1.5 active:opacity-60 shrink-0 w-[72px]">
              <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center"
                style={{ background: bg }}>
                <Icon size={20} color={color} strokeWidth={2.2} />
              </div>
              <span className="text-[11px] text-[#4E5968] font-semibold text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── 쿠폰 ── */}
      <SectionLabel label="이번 주 혜택" />
      <CouponSection />

      {/* ── 신규 오픈 ── */}
      <SectionLabel label="신규 오픈" />
      <NewOpeningsSection />

      {/* ── 주변 마트 (주말만 표시) ── */}
      <MartSection />

      {/* ── 약국 ── */}
      <SectionLabel label="주말·심야 약국" />
      <PharmacySection />

      {/* ── 교통 ── */}
      <SectionLabel label="교통" />
      {stop && bus && (
        <section className="mx-4 mb-1">
          <button onClick={() => router.push("/transport/")}
            className="w-full bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between active:bg-[#F2F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center">
                <Bus size={20} className="text-[#3182F6]" />
              </div>
              <div className="text-left">
                <p className="text-[12px] text-[#8B95A1]">{stop.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[16px] font-black text-[#191F28]">{bus.routeNo}번</span>
                  <span className="text-[13px] text-[#4E5968]">{bus.destination} 방면</span>
                  {bus.isExpress && (
                    <span className="text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] px-1.5 py-0.5 rounded">급행</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-xl px-3 py-2 text-center min-w-[50px] ${
                bus.arrivalMin <= 3 ? "bg-[#F04452]" : bus.arrivalMin <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]"
              }`}>
                <span className="text-white text-[21px] font-black leading-none">{bus.arrivalMin}</span>
                <span className="text-white/80 text-[11px] block leading-none">분 후</span>
              </div>
              <ChevronRight size={16} className="text-[#B0B8C1]" />
            </div>
          </button>
        </section>
      )}

      {/* ── 소식 ── */}
      <div className="flex items-center justify-between px-4 mt-3 mb-1.5">
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-[#3182F6]" />
          <span className="text-[13px] font-bold text-[#8B95A1] uppercase tracking-wide">검단 소식</span>
        </div>
      </div>
      <SosikSection />

      <div className="h-4" />
      <BottomNav />
    </div>
  );
}
