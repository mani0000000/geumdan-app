"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, RefreshCw, MapPin, Phone, Map,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { Skeleton } from "@/components/ui/Skeleton";
import { posts, newsItems, nearbyStops, apartments, coupons, newStoreOpenings, pharmacies } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";

const quickMenus = [
  { emoji: "🚌", label: "버스", href: "/transport/" },
  { emoji: "🗺️", label: "상가지도", href: "/stores/" },
  { emoji: "🏠", label: "부동산", href: "/real-estate/" },
  { emoji: "📰", label: "뉴스", href: "/news/" },
  { emoji: "💬", label: "커뮤니티", href: "/community/" },
  { emoji: "🛒", label: "중고거래", href: "/community/" },
  { emoji: "🎯", label: "소모임", href: "/community/" },
  { emoji: "⭐", label: "즐겨찾기", href: "/mypage/" },
];

// ─── 쿠폰 카드 ────────────────────────────────────────────────
function CouponBanner() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [downloaded, setDownloaded] = useState<Set<string>>(
    new Set(coupons.filter(c => c.downloaded).map(c => c.id))
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = setInterval(() => {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 200, behavior: "smooth" });
      }
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mb-2">
      <div className="bg-[#191F28] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Tag size={13} className="text-[#FFBB00]" />
          <span className="text-[13px] font-bold text-[#FFBB00]">이번 주 쿠폰</span>
        </div>
        <Link href="/mypage/" className="text-[11px] text-white/50 active:opacity-60">전체보기 →</Link>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 px-4 py-3 overflow-x-auto bg-[#191F28]"
        style={{ scrollbarWidth: "none" }}
      >
        {coupons.map(c => {
          const done = downloaded.has(c.id);
          return (
            <div
              key={c.id}
              className="shrink-0 w-[170px] rounded-2xl overflow-hidden"
              style={{ background: c.color + "22", border: `1.5px solid ${c.color}44` }}
            >
              {/* 컬러 상단 바 */}
              <div className="h-1.5 w-full" style={{ background: c.color }} />
              <div className="p-3">
                {/* 할인율 */}
                <p className="text-[22px] font-black leading-none" style={{ color: c.color }}>
                  {c.discount}
                  <span className="text-[11px] font-semibold ml-0.5">
                    {c.discountType === "rate" ? " 할인" : " 할인"}
                  </span>
                </p>
                {/* 매장명 */}
                <p className="text-[12px] font-bold text-[#191F28] mt-1.5 truncate">{c.storeName}</p>
                {/* 제목 */}
                <p className="text-[11px] text-[#4E5968] mt-0.5 leading-snug line-clamp-2">{c.title}</p>
                {/* 하단 */}
                <div className="flex items-center justify-between mt-2.5">
                  <div>
                    <p className="text-[9px] text-[#8B95A1]">{c.floor} · ~{c.expiry.slice(5)}</p>
                  </div>
                  <button
                    onClick={() => setDownloaded(d => {
                      const n = new Set(d);
                      n.has(c.id) ? n.delete(c.id) : n.add(c.id);
                      return n;
                    })}
                    className={`h-7 px-3 rounded-xl text-[11px] font-bold transition-all active:opacity-70 ${
                      done ? "bg-[#F2F4F6] text-[#8B95A1]" : "text-white"
                    }`}
                    style={done ? {} : { background: c.color }}
                  >
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

// ─── 날씨 위젯 ───────────────────────────────────────────────
function WeatherWidget({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <section className="mx-4 mb-2">
        <div className="bg-[#3182F6] rounded-2xl p-3 animate-pulse flex items-center justify-between">
          <div className="h-7 w-24 bg-white/20 rounded-lg" />
          <div className="h-5 w-16 bg-white/20 rounded-lg" />
        </div>
      </section>
    );
  }
  if (!weather) return null;

  const gradient = weather.weatherCode <= 1
    ? "from-[#3182F6] to-[#0EA5E9]"
    : weather.weatherCode <= 3
    ? "from-[#4E5968] to-[#8B95A1]"
    : weather.weatherCode >= 61 && weather.weatherCode <= 82
    ? "from-[#1B64DA] to-[#3182F6]"
    : "from-[#3182F6] to-[#6366F1]";

  return (
    <section className="mx-4 mb-2">
      <div className={`bg-gradient-to-br ${gradient} rounded-2xl overflow-hidden`}>
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3 active:opacity-80">
          <div className="flex items-center gap-3">
            <span className="text-[28px] leading-none">{weather.emoji}</span>
            <div className="text-left">
              <span className="text-[24px] font-black text-white leading-none">{weather.temp}°</span>
              <span className="text-[13px] text-white/80 ml-1.5">{weather.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/70">최고 {weather.high}° · 최저 {weather.low}°</span>
            {expanded
              ? <ChevronUp size={16} className="text-white/70" />
              : <ChevronDown size={16} className="text-white/70" />}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-4 mb-3 pt-1 border-t border-white/20">
              <div className="flex items-center gap-1">
                <Droplets size={12} className="text-white/70" />
                <span className="text-[12px] text-white/80">습도 {weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind size={12} className="text-white/70" />
                <span className="text-[12px] text-white/80">바람 {weather.windSpeed}m/s</span>
              </div>
              <span className="text-[12px] text-white/60 ml-auto">체감 {weather.feelsLike}°</span>
            </div>
            {weather.hourly.length > 0 && (
              <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {weather.hourly.map(h => (
                  <div key={h.hour} className="flex flex-col items-center gap-1 shrink-0 min-w-[36px]">
                    <span className="text-[11px] text-white/60">{h.hour}</span>
                    <span className="text-[16px]">{h.emoji}</span>
                    <span className="text-[12px] text-white font-semibold">{h.temp}°</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 신규 오픈 ──────────────────────────────────────────────
function NewOpeningsSection() {
  const router = useRouter();
  const newOnes = newStoreOpenings.filter(s => s.isNew);
  if (newOnes.length === 0) return null;
  return (
    <section className="mx-4 mb-2">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <span className="text-[15px] font-bold text-[#191F28]">이번 주 신규 오픈 🆕</span>
          <Link href="/stores/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">지도 보기</Link>
        </div>
        <div className="flex gap-3 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {newStoreOpenings.map(s => (
            <button key={s.id}
              onClick={() => router.push(`/stores/`)}
              className="shrink-0 flex flex-col items-start gap-1.5 bg-[#F2F4F6] rounded-2xl p-3 min-w-[140px] active:bg-[#E5E8EB] transition-colors text-left">
              <div className="relative self-center">
                <span className="text-3xl">{s.emoji}</span>
                {s.isNew && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-black bg-[#F04452] text-white px-1 rounded-full">NEW</span>
                )}
              </div>
              <p className="text-[13px] font-bold text-[#191F28] leading-snug w-full text-center">{s.storeName}</p>
              <div className="flex gap-1 flex-wrap">
                <span className="text-[10px] text-[#8B95A1] bg-white px-1.5 py-0.5 rounded-full">{s.floor}</span>
                <span className="text-[10px] text-[#8B95A1] bg-white px-1.5 py-0.5 rounded-full">{s.openDate.slice(5)} 오픈</span>
              </div>
              {s.event && (
                <p className="text-[10px] font-bold text-[#F04452] leading-snug">{s.event}</p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 주말·심야 약국 ─────────────────────────────────────────
function PharmacySection() {
  const nightPharmacies = pharmacies.filter(p =>
    p.tags.includes("심야") || p.tags.includes("주말")
  ).slice(0, 3);

  if (nightPharmacies.length === 0) return null;

  return (
    <section className="mx-4 mb-2">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px]">💊</span>
            <span className="text-[15px] font-bold text-[#191F28]">주말·심야 약국</span>
          </div>
        </div>
        <div className="divide-y divide-[#F2F4F6]">
          {nightPharmacies.map(ph => (
            <div key={ph.id} className="px-4 py-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[16px]">🏥</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-[14px] font-bold text-[#191F28]">{ph.name}</p>
                  {ph.isOpenNow && (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">지금 영업중</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {ph.tags.map(t => (
                    <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{t}</span>
                  ))}
                </div>
                {ph.nightHours && (
                  <p className="text-[11px] text-[#4E5968] mt-0.5">{ph.nightHours}</p>
                )}
                {ph.weekendHours && (
                  <p className="text-[11px] text-[#4E5968]">{ph.weekendHours}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`tel:${ph.phone}`}
                    className="flex items-center gap-1 bg-[#EBF3FE] px-2.5 py-1.5 rounded-xl active:opacity-70"
                    onClick={e => e.stopPropagation()}
                  >
                    <Phone size={12} className="text-[#3182F6]" />
                    <span className="text-[12px] font-bold text-[#3182F6]">{ph.phone}</span>
                  </a>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(ph.name + " " + ph.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#F2F4F6] px-2.5 py-1.5 rounded-xl active:opacity-70"
                    onClick={e => e.stopPropagation()}
                  >
                    <Map size={12} className="text-[#4E5968]" />
                    <span className="text-[12px] font-medium text-[#4E5968]">지도</span>
                  </a>
                </div>
              </div>
              {ph.distance && (
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-bold text-[#3182F6]">{ph.distance}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [busArrival, setBusArrival] = useState<number | null>(null);
  const [busRefreshing, setBusRefreshing] = useState(false);

  useEffect(() => {
    fetchWeather().then(w => { setWeather(w); setWeatherLoading(false); });
  }, []);

  const stop = nearbyStops[0];
  const bus = stop?.routes[0];

  useEffect(() => {
    if (bus) setBusArrival(bus.arrivalMin);
  }, [bus]);

  const refreshBus = useCallback(async () => {
    setBusRefreshing(true);
    // simulate refresh: decrement or randomize arrival
    await new Promise(r => setTimeout(r, 800));
    setBusArrival(prev => {
      if (prev === null) return bus?.arrivalMin ?? 3;
      const next = prev <= 1 ? (bus?.arrivalMin ?? 3) : prev - 1;
      return next;
    });
    setBusRefreshing(false);
  }, [bus]);

  const topNews = newsItems[0];
  const hotPosts = posts.filter(p => p.isHot).slice(0, 3);
  const arrival = busArrival ?? bus?.arrivalMin ?? 3;

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header showLocation />

      {/* 빠른 메뉴 */}
      <section className="bg-white px-5 pt-5 pb-4 mb-2">
        <div className="grid grid-cols-4 gap-y-4">
          {quickMenus.map(({ emoji, label, href }) => (
            <Link key={label} href={href} className="flex flex-col items-center gap-2 active:opacity-60">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F4F6] flex items-center justify-center text-2xl">{emoji}</div>
              <span className="text-[12px] text-[#4E5968] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 쿠폰 */}
      <CouponBanner />

      {/* 날씨 */}
      <WeatherWidget weather={weather} loading={weatherLoading} />

      {/* 신규 오픈 */}
      <NewOpeningsSection />

      {/* 버스 빠른 확인 */}
      {stop && bus && (
        <section className="mx-4 mb-2">
          <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-xl shrink-0">🚏</div>
            <div className="flex-1 text-left min-w-0" onClick={() => router.push("/transport/")} style={{ cursor: "pointer" }}>
              <p className="text-[12px] text-[#8B95A1]">{stop.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[14px] font-bold text-[#191F28]">{bus.routeNo}번</span>
                <span className="text-[13px] text-[#4E5968] truncate">{bus.destination} 방면</span>
                {bus.isExpress && <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1.5 py-0.5 rounded shrink-0">급행</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`rounded-xl px-3 py-1.5 text-center min-w-[50px] ${arrival <= 3 ? "bg-[#F04452]" : arrival <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]"}`}
                onClick={() => router.push("/transport/")}
                style={{ cursor: "pointer" }}
              >
                <span className="text-white text-[18px] font-black leading-none">{arrival}</span>
                <span className="text-white/80 text-[10px] block leading-none">분 후</span>
              </div>
              <button
                onClick={refreshBus}
                className="w-9 h-9 bg-[#F2F4F6] rounded-xl flex items-center justify-center active:bg-[#E5E8EB] transition-colors"
              >
                <RefreshCw size={15} className={`text-[#4E5968] ${busRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 주말·심야 약국 */}
      <PharmacySection />

      {/* HOT 게시글 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <Flame size={16} className="text-[#F04452]" />
              <span className="text-[15px] font-bold text-[#191F28]">HOT 게시글</span>
            </div>
            <Link href="/community/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">전체보기</Link>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {hotPosts.map(post => (
              <button key={post.id}
                onClick={() => router.push(`/community/detail/?id=${post.id}`)}
                className="w-full px-4 py-3.5 flex items-start gap-3 active:bg-[#F2F4F6] transition-colors text-left">
                <span className="text-[11px] font-bold bg-[#EBF3FE] text-[#3182F6] px-2 py-0.5 rounded-full shrink-0 mt-0.5">{post.category}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#191F28] truncate">{post.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] text-[#8B95A1]">{post.authorDong}</span>
                    <span className="text-[12px] text-[#B0B8C1]">·</span>
                    <span className="text-[12px] text-[#8B95A1]">{formatRelativeTime(post.createdAt)}</span>
                    <span className="text-[12px] text-[#B0B8C1] ml-auto">❤️ {post.likeCount}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 최신 뉴스 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <span className="text-[15px] font-bold text-[#191F28]">검단 뉴스</span>
            <Link href="/news/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">전체보기</Link>
          </div>
          <button
            onClick={() => topNews.url !== "#" ? window.open(topNews.url, "_blank") : router.push("/news/")}
            className="w-full px-4 pb-4 flex items-start gap-3 active:opacity-70 text-left">
            <div className="w-16 h-16 rounded-xl bg-[#EBF3FE] flex items-center justify-center text-2xl shrink-0">📰</div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#191F28] leading-snug line-clamp-2">{topNews.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-[#3182F6] font-medium">{topNews.source}</span>
                <span className="text-[11px] text-[#B0B8C1]">{formatRelativeTime(topNews.publishedAt)}</span>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 부동산 시세 */}
      <section className="mx-4 mb-2">
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={16} className="text-[#00C471]" />
              <span className="text-[15px] font-bold text-[#191F28]">부동산 시세</span>
            </div>
            <Link href="/real-estate/" className="text-[13px] text-[#3182F6] font-medium active:opacity-60">전체보기</Link>
          </div>
          <div className="divide-y divide-[#F2F4F6]">
            {apartments.slice(0, 3).map(apt => (
              <button key={apt.id}
                onClick={() => router.push(`/real-estate/`)}
                className="w-full px-4 py-3 flex items-center justify-between active:bg-[#F2F4F6] transition-colors">
                <div className="text-left">
                  <p className="text-[14px] font-medium text-[#191F28]">{apt.name}</p>
                  <p className="text-[12px] text-[#8B95A1] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                  <p className="text-[11px] text-[#8B95A1]">실거래</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 상가 지도 배너 */}
      <section className="mx-4 mb-4">
        <button onClick={() => router.push("/stores/")}
          className="w-full bg-[#3182F6] rounded-2xl p-4 flex items-center gap-4 active:bg-[#1B64DA] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl shrink-0">🗺️</div>
          <div className="flex-1 text-left">
            <p className="text-white font-bold text-[15px]">상가 지도 열기</p>
            <p className="text-white/70 text-[12px] mt-0.5">층별 매장 · 화장실 비번 · 주차 안내</p>
          </div>
          <ChevronRight size={20} className="text-white/70 shrink-0" />
        </button>
      </section>

      <BottomNav />
    </div>
  );
}
