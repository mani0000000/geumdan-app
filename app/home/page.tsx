"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Flame, TrendingUp, Droplets, Wind,
  ChevronDown, ChevronUp, Tag, Bus, Home as HomeIcon,
  Newspaper, MessageCircle, ShoppingBag, Users, Star,
  MapPin, Ticket,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts, newsItems, nearbyStops, apartments, coupons, newStoreOpenings } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchWeather, type WeatherData } from "@/lib/api/weather";

const quickMenus = [
  { icon: Bus,           label: "버스",   href: "/transport/",   color: "#3182F6", bg: "#EBF3FE" },
  { icon: HomeIcon,      label: "부동산", href: "/real-estate/", color: "#00C471", bg: "#D1FAE5" },
  { icon: Newspaper,     label: "뉴스",   href: "/news/",        color: "#F04452", bg: "#FEE2E2" },
  { icon: MessageCircle, label: "커뮤니티",href: "/community/",  color: "#6366F1", bg: "#EDE9FE" },
  { icon: ShoppingBag,   label: "중고거래",href: "/community/",  color: "#F97316", bg: "#FFF3E0" },
  { icon: Users,         label: "소모임", href: "/community/",   color: "#0EA5E9", bg: "#E0F2FE" },
  { icon: Ticket,        label: "쿠폰",   href: "/mypage/",      color: "#F59E0B", bg: "#FEF3C7" },
  { icon: Star,          label: "즐겨찾기",href: "/mypage/",     color: "#8B5CF6", bg: "#EDE9FE" },
];

// ─── 날씨 위젯 ───────────────────────────────────────────────
function WeatherWidget({ weather, loading }: { weather: WeatherData | null; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="mx-4 mt-3 mb-2 bg-[#3182F6] rounded-2xl p-4 animate-pulse flex items-center gap-4">
        <div className="h-9 w-9 bg-white/20 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <div className="h-5 w-24 bg-white/20 rounded-lg" />
          <div className="h-3 w-32 bg-white/20 rounded-lg" />
        </div>
      </div>
    );
  }
  if (!weather) return null;

  const gradient =
    weather.weatherCode <= 1 ? "from-[#3182F6] to-[#0EA5E9]"
    : weather.weatherCode <= 3 ? "from-[#4E5968] to-[#8B95A1]"
    : weather.weatherCode >= 61 ? "from-[#1B64DA] to-[#3182F6]"
    : "from-[#3182F6] to-[#6366F1]";

  return (
    <div className={`mx-4 mt-3 mb-2 bg-gradient-to-br ${gradient} rounded-2xl overflow-hidden`}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-80">
        <div className="flex items-center gap-3">
          <span className="text-[30px] leading-none">{weather.emoji}</span>
          <div className="text-left">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-white leading-none">{weather.temp}°</span>
              <span className="text-[13px] text-white/80">{weather.label}</span>
            </div>
            <span className="text-[12px] text-white/60">검단신도시</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-white/70">최고 {weather.high}° · 최저 {weather.low}°</span>
          {expanded ? <ChevronUp size={15} className="text-white/70" /> : <ChevronDown size={15} className="text-white/70" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/20">
          <div className="flex items-center gap-4 py-2.5 mb-2">
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
  );
}

// ─── 퀵 메뉴 ─────────────────────────────────────────────────
function QuickMenuRow() {
  return (
    <section className="bg-white px-4 py-4 mb-2">
      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {quickMenus.map(({ icon: Icon, label, href, color, bg }) => (
          <Link key={label} href={href}
            className="flex flex-col items-center gap-1.5 active:opacity-60 shrink-0 w-[72px]">
            <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: bg }}>
              <Icon size={22} color={color} strokeWidth={2} />
            </div>
            <span className="text-[11px] text-[#4E5968] font-medium text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── 쿠폰 섹션 (카드형) ───────────────────────────────────────
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
        el.scrollBy({ left: 200, behavior: "smooth" });
      }
    }, 3500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mb-2">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <div className="flex items-center gap-1.5">
          <Tag size={15} className="text-[#F59E0B]" />
          <span className="text-[15px] font-bold text-[#191F28]">이번 주 쿠폰</span>
        </div>
        <Link href="/mypage/" className="text-[13px] text-[#3182F6] font-medium">전체보기</Link>
      </div>

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {coupons.map(c => {
          const done = downloaded.has(c.id);
          return (
            <div key={c.id}
              className="shrink-0 w-[190px] bg-white rounded-2xl p-3.5 shadow-sm"
              style={{ borderLeft: `4px solid ${c.color}` }}>
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
                  style={{ background: c.color }}>{c.floor}</span>
                <span className="text-[10px] text-[#8B95A1]">~ {c.expiry.slice(5)}</span>
              </div>
              <p className="text-[12px] text-[#8B95A1] truncate">{c.storeName}</p>
              <p className="text-[14px] font-black text-[#191F28] leading-snug mt-0.5 truncate">{c.title}</p>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-[16px] font-black" style={{ color: c.color }}>{c.discount}</span>
                <button
                  onClick={() => setDownloaded(d => { const n = new Set(d); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })}
                  className={`h-8 px-3.5 rounded-xl text-[12px] font-bold transition-all active:opacity-70 ${
                    done ? "bg-[#F2F4F6] text-[#8B95A1]" : "text-white"
                  }`}
                  style={done ? {} : { background: c.color }}>
                  {done ? "완료 ✓" : "받기"}
                </button>
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
    <section className="mx-4 mb-2">
      <div className="bg-white rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
          <span className="text-[15px] font-bold text-[#191F28]">이번 주 신규 오픈 🆕</span>
          <Link href="/stores/" className="text-[13px] text-[#3182F6] font-medium">지도 보기</Link>
        </div>
        <div className="flex gap-2.5 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {newStoreOpenings.map(s => (
            <button key={s.id}
              onClick={() => router.push(`/stores/detail/?id=${s.storeId}`)}
              className="shrink-0 flex flex-col items-center gap-1.5 bg-[#F2F4F6] rounded-2xl px-4 py-3 min-w-[92px] active:bg-[#E5E8EB]">
              <div className="relative">
                <span className="text-3xl">{s.emoji}</span>
                {s.isNew && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-black bg-[#F04452] text-white px-1 rounded-full">N</span>
                )}
              </div>
              <p className="text-[11px] font-bold text-[#191F28] text-center leading-snug">{s.storeName.split(" ")[0]}</p>
              <span className="text-[10px] text-[#8B95A1] bg-white px-1.5 py-0.5 rounded-full">{s.floor}</span>
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
    <section className="mx-4 mb-2">
      <div className="bg-white rounded-2xl overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex border-b border-[#F2F4F6]">
          {(["커뮤니티", "뉴스", "시세"] as SosikTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-3 text-[13px] font-semibold border-b-2 transition-colors ${
                tab === t ? "text-[#3182F6] border-[#3182F6]" : "text-[#8B95A1] border-transparent"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* 커뮤니티 */}
        {tab === "커뮤니티" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
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
            <div className="px-4 pb-3 pt-1">
              <Link href="/community/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[13px] font-medium text-[#4E5968]">
                커뮤니티 전체 보기 →
              </Link>
            </div>
          </div>
        )}

        {/* 뉴스 */}
        {tab === "뉴스" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
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
            <div className="px-4 pb-3 pt-1">
              <Link href="/news/"
                className="block w-full text-center py-2.5 bg-[#F2F4F6] rounded-xl text-[13px] font-medium text-[#4E5968]">
                뉴스 전체 보기 →
              </Link>
            </div>
          </div>
        )}

        {/* 시세 */}
        {tab === "시세" && (
          <div>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
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
                  <div className="text-left">
                    <p className="text-[13px] font-medium text-[#191F28]">{apt.name}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-0.5">{apt.dong} · {apt.recentDeal?.pyeong}평</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold text-[#00C471]">{formatPrice(apt.recentDeal?.price ?? 0)}</p>
                    <p className="text-[10px] text-[#8B95A1]">실거래</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 pb-3 pt-1">
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

      {/* 날씨 — 최상단 */}
      <WeatherWidget weather={weather} loading={weatherLoading} />

      {/* 퀵 메뉴 — 1줄 원형 */}
      <QuickMenuRow />

      {/* 쿠폰 */}
      <CouponSection />

      {/* 신규 오픈 */}
      <NewOpeningsSection />

      {/* 버스 빠른 확인 */}
      {stop && bus && (
        <section className="mx-4 mb-2">
          <button onClick={() => router.push("/transport/")}
            className="w-full bg-white rounded-2xl px-4 py-4 flex items-center justify-between active:bg-[#F2F4F6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center">
                <Bus size={20} className="text-[#3182F6]" />
              </div>
              <div className="text-left">
                <p className="text-[12px] text-[#8B95A1]">{stop.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[14px] font-bold text-[#191F28]">{bus.routeNo}번</span>
                  <span className="text-[13px] text-[#4E5968]">{bus.destination} 방면</span>
                  {bus.isExpress && <span className="text-[10px] font-bold bg-[#FFF3E0] text-[#E65100] px-1.5 py-0.5 rounded">급행</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-xl px-3 py-1.5 text-center min-w-[50px] ${bus.arrivalMin <= 3 ? "bg-[#F04452]" : bus.arrivalMin <= 7 ? "bg-[#FF9500]" : "bg-[#3182F6]"}`}>
                <span className="text-white text-[18px] font-black leading-none">{bus.arrivalMin}</span>
                <span className="text-white/80 text-[10px] block leading-none">분 후</span>
              </div>
              <ChevronRight size={16} className="text-[#B0B8C1]" />
            </div>
          </button>
        </section>
      )}

      {/* 소식 탭 (커뮤니티 | 뉴스 | 시세) */}
      <div className="px-4 mb-2 pt-1 flex items-center gap-1.5">
        <MapPin size={14} className="text-[#3182F6]" />
        <span className="text-[15px] font-bold text-[#191F28]">검단 소식</span>
      </div>
      <SosikSection />

      <BottomNav />
    </div>
  );
}
