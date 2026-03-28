"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users,
  Star, Ticket, X, MapPin, Calendar,
  TrendingDown,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import StoreLogo from "@/components/ui/StoreLogo";
import { posts, newsItems, nearbyStops, apartments, coupons, newStoreOpenings } from "@/lib/mockData";
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
            <span className="text-[16px] font-bold text-[#191F28]">주간 날씨</span>
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
                <p className={`text-[13px] font-bold ${day.isToday ? "text-[#3182F6]" : "text-[#4E5968]"}`}>
                  {day.isToday ? "오늘" : day.dayLabel}
                </p>
                <p className="text-[11px] text-[#B0B8C1]">{day.date}</p>
              </div>
              <span className="text-[24px] w-8 shrink-0">{day.emoji}</span>
              <div className="flex-1">
                {day.precipitation > 0 && (
                  <p className="text-[11px] text-[#3182F6]">💧 {day.precipitation}mm</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[14px] font-bold text-[#F04452]">{day.high}°</span>
                <span className="text-[12px] text-[#B0B8C1]">/</span>
                <span className="text-[14px] font-semibold text-[#3182F6]">{day.low}°</span>
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
          <span className="text-[32px] leading-none shrink-0">{weather.emoji}</span>
          <div className="flex-1 text-left">
            <div className="flex items-baseline gap-2">
              <span className="text-[28px] font-black text-white leading-none">{weather.temp}°</span>
              <span className="text-[13px] text-white/80">{weather.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[12px] text-white/60">최고 {weather.high}° · 최저 {weather.low}°</span>
              {tempDiff !== null && (
                <span className={`flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
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
            <span className="text-[11px] font-bold text-white">주간</span>
          </button>
          {expanded
            ? <ChevronUp size={15} className="text-white/60 shrink-0" />
            : <ChevronDown size={15} className="text-white/60 shrink-0" />}
        </button>

        {/* 확장 영역 */}
        {expanded && (
          <div className="px-4 pb-4 border-t border-white/20">
            <div className="flex items-center gap-4 py-2.5 mb-2">
              <div className="flex items-center gap-1.5">
                <Droplets size={12} className="text-white/70" />
                <span className="text-[12px] text-white/80">습도 {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind size={12} className="text-white/70" />
                <span className="text-[12px] text-white/80">바람 {weather.windSpeed}m/s</span>
              </div>
              <span className="text-[12px] text-white/60 ml-auto">체감 {weather.feelsLike}°</span>
            </div>
            {weather.hourly.length > 0 && (
              <div className="flex gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {weather.hourly.map(h => (
                  <div key={h.hour} className="flex flex-col items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-white/60">{h.hour}</span>
                    <span className="text-[18px]">{h.emoji}</span>
                    <span className="text-[12px] text-white font-bold">{h.temp}°</span>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 220, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mb-1">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
            <Tag size={12} className="text-[#F59E0B]" />
          </div>
          <span className="text-[14px] font-bold text-[#191F28]">이번 주 쿠폰</span>
        </div>
        <Link href="/coupons/" className="text-[12px] text-[#3182F6] font-medium flex items-center gap-0.5">
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      {/* 가로 스크롤 카드 */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto px-4 pb-1"
        style={{ scrollbarWidth: "none" }}>
        {coupons.map(c => {
          const done = downloaded.has(c.id);
          const dDay = Math.ceil((new Date(c.expiry).getTime() - Date.now()) / 86400000);
          return (
            <div key={c.id}
              className="shrink-0 w-[200px] bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* 컬러 상단 바 */}
              <div className="h-1" style={{ background: c.color }} />
              <div className="p-3">
                {/* 로고 + 매장명 */}
                <div className="flex items-center gap-2 mb-2">
                  <StoreLogo name={c.storeName} category={c.category} size={32} rounded="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-[#191F28] truncate">{c.storeName}</p>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: c.color }}>{c.floor}</span>
                      {dDay <= 3
                        ? <span className="text-[10px] font-bold text-[#F04452]">D-{dDay}</span>
                        : <span className="text-[10px] text-[#B0B8C1]">~{c.expiry.slice(5)}</span>}
                    </div>
                  </div>
                </div>
                {/* 쿠폰 제목 */}
                <p className="text-[12px] text-[#4E5968] leading-snug line-clamp-2 min-h-[32px]">{c.title}</p>
                {/* 할인 + 버튼 */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[16px] font-black" style={{ color: c.color }}>{c.discount}</span>
                  <button
                    onClick={() => setDownloaded(d => { const n = new Set(d); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                    className={`h-7 px-3 rounded-lg text-[11px] font-bold active:opacity-70 ${
                      done ? "bg-[#F2F4F6] text-[#8B95A1]" : "text-white"
                    }`}
                    style={done ? {} : { background: c.color }}>
                    {done ? "완료 ✓" : "받기"}
                  </button>
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
function NewOpeningsSection() {
  const router = useRouter();
  const newOnes = newStoreOpenings.filter(s => s.isNew);
  if (newOnes.length === 0) return null;

  return (
    <section className="mx-4 mb-1">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-bold text-[#191F28]">이번 주 신규 오픈</span>
            <span className="text-[11px] font-bold bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
          </div>
          <Link href="/stores/" className="text-[12px] text-[#3182F6] font-medium flex items-center gap-0.5">
            지도 보기 <ChevronRight size={13} />
          </Link>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {newStoreOpenings.map(s => (
            <button key={s.id}
              onClick={() => router.push(`/stores/detail/?id=${s.storeId}`)}
              className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#F2F4F6] text-left">
                  {/* 매장 로고 */}
              <StoreLogo name={s.storeName} category={s.category} size={40} />
              {/* 정보: 매장명 → 상가건물(층수) → 업종 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[14px] font-bold text-[#191F28] truncate">{s.storeName}</p>
                  {s.isNew && (
                    <span className="shrink-0 text-[9px] font-black bg-[#F04452] text-white px-1.5 py-0.5 rounded-full">NEW</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-[#8B95A1]">검단 센트럴 타워</span>
                  <span className="text-[11px] text-[#B0B8C1]">·</span>
                  <span className="text-[11px] font-semibold text-[#3182F6]">{s.floor}</span>
                  <span className="text-[11px] text-[#B0B8C1]">·</span>
                  <span className="text-[11px] text-[#8B95A1]">{s.category}</span>
                </div>
              </div>
              {/* 오픈일 */}
              <div className="text-right shrink-0">
                <p className="text-[11px] text-[#B0B8C1]">{s.openDate.slice(5)} 오픈</p>
              </div>
            </button>
          ))}
        </div>
      </div>
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
              className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
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
                <span className="text-[13px] font-bold text-[#191F28]">HOT 게시글</span>
              </div>
              <Link href="/community/" className="text-[12px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {hotPosts.map(post => (
                <button key={post.id}
                  onClick={() => router.push(`/community/detail/?id=${post.id}`)}
                  className="w-full px-4 py-3 flex items-start gap-2.5 active:bg-[#F2F4F6] text-left">
                  <span className="text-[11px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                    {post.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#191F28] truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#8B95A1]">{post.authorDong}</span>
                      <span className="text-[11px] text-[#B0B8C1]">·</span>
                      <span className="text-[11px] text-[#8B95A1]">{formatRelativeTime(post.createdAt)}</span>
                      <span className="text-[11px] text-[#B0B8C1] ml-auto">❤️ {post.likeCount}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/community/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[13px] font-medium text-[#4E5968]">
                커뮤니티 전체 보기 →
              </Link>
            </div>
          </div>
        )}

        {tab === "뉴스" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
              <span className="text-[13px] font-bold text-[#191F28]">검단 최신 뉴스</span>
              <Link href="/news/" className="text-[12px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {topNews.map(item => (
                <button key={item.id}
                  onClick={() => router.push("/news/")}
                  className="w-full px-4 py-3 flex items-start gap-3 active:bg-[#F2F4F6] text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl shrink-0">📰</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#191F28] leading-snug line-clamp-2">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-[#3182F6] font-medium">{item.source}</span>
                      <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(item.publishedAt)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/news/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[13px] font-medium text-[#4E5968]">
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
                <span className="text-[13px] font-bold text-[#191F28]">부동산 시세</span>
              </div>
              <Link href="/real-estate/" className="text-[12px] text-[#3182F6]">전체보기</Link>
            </div>
            <div className="divide-y divide-[#F2F4F6]">
              {apartments.slice(0, 4).map(apt => (
                <button key={apt.id}
                  onClick={() => router.push("/real-estate/")}
                  className="w-full px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6]">
                  <div className="text-left min-w-0 flex-1 pr-2">
                    <p className="text-[13px] font-medium text-[#191F28] truncate">{apt.name}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[14px] font-bold text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                    <p className="text-[10px] text-[#8B95A1]">실거래</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/real-estate/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[13px] font-medium text-[#4E5968]">
                부동산 시세 전체 보기 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 섹션 헤더 ────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[12px] font-bold text-[#8B95A1] uppercase tracking-wide px-4 mb-1.5 mt-3">
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
              <span className="text-[10px] text-[#4E5968] font-semibold text-center leading-tight">{label}</span>
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
                <p className="text-[11px] text-[#8B95A1]">{stop.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[15px] font-black text-[#191F28]">{bus.routeNo}번</span>
                  <span className="text-[12px] text-[#4E5968]">{bus.destination} 방면</span>
                  {bus.isExpress && (
                    <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1.5 py-0.5 rounded">급행</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-xl px-3 py-2 text-center min-w-[50px] ${
                bus.arrivalMin <= 3 ? "bg-[#F04452]" : bus.arrivalMin <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]"
              }`}>
                <span className="text-white text-[20px] font-black leading-none">{bus.arrivalMin}</span>
                <span className="text-white/80 text-[10px] block leading-none">분 후</span>
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
          <span className="text-[12px] font-bold text-[#8B95A1] uppercase tracking-wide">검단 소식</span>
        </div>
      </div>
      <SosikSection />

      <div className="h-4" />
      <BottomNav />
    </div>
  );
}
