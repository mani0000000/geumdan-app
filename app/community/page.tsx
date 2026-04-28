"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, ThumbsUp, MessageSquare, Eye, Flame, Pin,
  ExternalLink, RefreshCw, TrendingUp, TrendingDown, MapPin,
  ChevronRight, ChevronUp, ChevronDown, Play, Search, X, SlidersHorizontal,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts, newsItems, apartments } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchDBPosts } from "@/lib/db/posts";
import { fetchGeumdanNews, type NewsArticle, type YouTubeVideo } from "@/lib/api/news";
import { fetchYouTubeVideosFromDB } from "@/lib/db/youtube";
import { fetchNewsFromDB } from "@/lib/db/news";
import type { CommunityCategory, NewsType } from "@/lib/types";
import type { Apartment } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────
type SoikTab = "커뮤니티" | "뉴스" | "시세";

// ─── Community ───────────────────────────────────────────────
const categories: CommunityCategory[] = ["전체","맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];
const catColor: Record<CommunityCategory, string> = {
  전체: "bg-[#0071e3] text-white",
  맘카페: "bg-[#FFE8EF] text-[#D63384]",
  맛집: "bg-[#FFF3E0] text-[#E65100]",
  부동산: "bg-[#E8F5E9] text-[#2E7D32]",
  중고거래: "bg-[#FFFDE7] text-[#F57F17]",
  "분실/목격": "bg-[#FFEBEE] text-[#C62828]",
  동네질문: "bg-[#e8f1fd] text-[#1565C0]",
  소모임: "bg-[#F3E5F5] text-[#6A1B9A]",
};

function CommunityTab() {
  const router = useRouter();
  const [active, setActive] = useState<CommunityCategory>("전체");
  const [dbPosts, setDbPosts] = useState<typeof posts>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  useEffect(() => {
    fetchDBPosts(undefined, 50).then(data => {
      setDbPosts(data);
      setLoadingPosts(false);
    });
  }, []);

  // DB 포스트 최신순 + 목업 포스트 (고정/HOT 우선)
  const allPosts = [
    ...dbPosts,
    ...posts.filter(p => !dbPosts.some(d => d.id === p.id)),
  ];
  const filtered = active === "전체"
    ? allPosts
    : allPosts.filter(p => p.category === active);

  return (
    <div className="pb-4">
      {/* Category filter */}
      <div className="bg-white sticky top-[104px] z-20 border-b border-[#f5f5f7]">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[14px] font-medium transition-colors ${active === cat ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 pt-3 space-y-2">
        {loadingPosts ? (
          [1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl px-4 py-4 space-y-2 animate-pulse">
              <div className="h-3 w-16 bg-[#f5f5f7] rounded-full" />
              <div className="h-4 w-3/4 bg-[#f5f5f7] rounded" />
              <div className="h-3 w-1/2 bg-[#f5f5f7] rounded" />
            </div>
          ))
        ) : (
          filtered.map(post => (
            <button key={post.id} onClick={() => router.push(`/community/detail/?id=${post.id}`)}
              className="w-full bg-white rounded-2xl px-4 py-4 text-left active:bg-[#f5f5f7] transition-colors">
              <div className="flex items-center gap-2 mb-2">
                {post.isPinned && <Pin size={12} className="text-[#0071e3]" />}
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${catColor[post.category]}`}>
                  {post.category}
                </span>
                {post.isHot && (
                  <span className="flex items-center gap-0.5 text-[12px] font-bold text-[#F04452]">
                    <Flame size={10} /> HOT
                  </span>
                )}
              </div>
              <p className="text-[16px] font-medium text-[#1d1d1f] leading-snug">{post.title}</p>
              <p className="text-[14px] text-[#6e6e73] mt-1 line-clamp-1">{post.content}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#f5f5f7]">
                <span className="text-[13px] text-[#6e6e73]">{post.author} · {post.authorDong}</span>
                <span className="text-[13px] text-[#86868b]">{formatRelativeTime(post.createdAt)}</span>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center gap-1">
                    <ThumbsUp size={12} className="text-[#86868b]" />
                    <span className="text-[13px] text-[#86868b]">{post.likeCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={12} className="text-[#86868b]" />
                    <span className="text-[13px] text-[#86868b]">{post.commentCount}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye size={12} className="text-[#86868b]" />
                    <span className="text-[13px] text-[#86868b]">{post.viewCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── News ─────────────────────────────────────────────────────
function NewsTab() {
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [newsSource2, setNewsSource2] = useState("");
  const [newsMs, setNewsMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [ytSource, setYtSource] = useState("");
  const [ytMs, setYtMs] = useState(0);
  const [ytLoading, setYtLoading] = useState(true);
  const [newsLimit, setNewsLimit] = useState(10);

  const refresh = async () => {
    setLoading(true);
    // 1. Supabase DB 우선 (실제 기사 URL 보장)
    const dbResult = await fetchNewsFromDB(30);
    if (dbResult.articles.length > 0) {
      setRealNews(dbResult.articles);
      setNewsSource2(dbResult.source);
      setNewsMs(dbResult.ms);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
      return;
    }
    // 2. Supabase 없으면 캐시/라이브 API fallback
    const result = await fetchGeumdanNews();
    if (result.articles.length > 0) {
      const sorted = [...result.articles].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      setRealNews(sorted);
      setNewsSource2(result.source);
      setNewsMs(result.ms);
      setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    setYtLoading(true);
    fetchYouTubeVideosFromDB(200).then(result => {
      setYtVideos(result.videos);
      setYtSource(result.source);
      setYtMs(result.ms);
      setYtLoading(false);
    });
  }, []);

  const instaItems = newsItems.filter(n => n.type === "인스타");
  const newsSource = realNews.length > 0 ? realNews : newsItems.filter(n => n.type === "뉴스");

  return (
    <div className="pb-6">

      {/* ── 유튜브 ── */}
      <div className="pt-4">
        <div className="flex items-center gap-2 px-4 mb-3">
          <div className="w-6 h-6 bg-[#FF0000] rounded-lg flex items-center justify-center shrink-0">
            <Play size={11} fill="white" className="text-white ml-0.5" />
          </div>
          <span className="text-[15px] font-bold text-[#1d1d1f]">유튜브</span>
          <span className="text-[12px] text-[#6e6e73]">검단 관련 영상</span>
          {!ytLoading && ytMs > 0 && (
            <span className="ml-auto text-[10px] text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded-full">
              {ytSource} {ytMs < 1000 ? `${ytMs}ms` : `${(ytMs/1000).toFixed(1)}s`}
            </span>
          )}
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {ytLoading ? (
            [0,1,2].map(i => (
              <div key={i} className="shrink-0 w-[220px] rounded-2xl overflow-hidden animate-pulse">
                <div className="w-full bg-[#d2d2d7]" style={{ aspectRatio: "16/9" }} />
                <div className="bg-white px-3 py-2.5 space-y-1.5">
                  <div className="h-3 bg-[#d2d2d7] rounded w-full" />
                  <div className="h-3 bg-[#d2d2d7] rounded w-2/3" />
                </div>
              </div>
            ))
          ) : ytVideos.length > 0 ? (
            ytVideos.map(video => (
              <a key={video.id} href={video.url} target="_blank" rel="noopener noreferrer"
                className="shrink-0 w-[220px] bg-white rounded-2xl overflow-hidden shadow-sm active:opacity-80">
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
                    }} />
                  <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md">
                      <Play size={16} fill="#FF0000" className="text-[#FF0000] ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-1.5 right-2 bg-[#FF0000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    YouTube
                  </span>
                </div>
                <div className="px-3 pt-2.5 pb-3">
                  <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug line-clamp-2">{video.title}</p>
                  <p className="text-[11px] text-[#6e6e73] mt-1.5">{video.channelName}</p>
                </div>
              </a>
            ))
          ) : null}
          <div className="shrink-0 w-2" />
        </div>
      </div>

      {/* ── 뉴스 ── */}
      <div className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-[#1d1d1f]">📰 뉴스</span>
            {realNews.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C471] animate-pulse" />
                <span className="text-[12px] text-[#424245]">실시간 {realNews.length}건</span>
              </div>
            )}
            {!loading && newsMs > 0 && (
              <span className="text-[10px] text-[#86868b] bg-[#f5f5f7] px-1.5 py-0.5 rounded-full">
                {newsSource2} {newsMs < 1000 ? `${newsMs}ms` : `${(newsMs/1000).toFixed(1)}s`}
              </span>
            )}
          </div>
          <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
            <RefreshCw size={13} className={`text-[#6e6e73] ${loading ? "animate-spin" : ""}`} />
            {lastUpdated && <span className="text-[11px] text-[#86868b] ml-0.5">{lastUpdated}</span>}
          </button>
        </div>
        <div className="px-4 space-y-2">
          {loading ? (
            [0, 1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl px-4 py-3.5 animate-pulse space-y-2">
                <div className="h-3.5 bg-[#d2d2d7] rounded w-full" />
                <div className="h-3.5 bg-[#d2d2d7] rounded w-4/5" />
                <div className="h-3 bg-[#d2d2d7] rounded w-1/3" />
              </div>
            ))
          ) : (
            newsSource.slice(0, newsLimit).map((item) => (
              <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                className="bg-white rounded-2xl px-4 py-3.5 flex flex-col gap-1.5 active:opacity-80 shadow-sm">
                <p className="text-[13px] font-semibold text-[#1d1d1f] leading-snug line-clamp-2">{item.title}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#0071e3]">{item.source}</span>
                  <span className="text-[11px] text-[#86868b]">·</span>
                  <span className="text-[11px] text-[#86868b]">{formatRelativeTime(item.publishedAt)}</span>
                  <ExternalLink size={10} className="text-[#86868b] ml-auto shrink-0" />
                </div>
              </a>
            ))
          )}
          {!loading && newsSource.length > newsLimit && newsLimit < 30 && (
            <button
              onClick={() => setNewsLimit(prev => Math.min(prev + 10, 30))}
              className="w-full py-3 rounded-2xl bg-white text-[13px] font-medium text-[#424245] shadow-sm active:opacity-70 flex items-center justify-center gap-1">
              <ChevronDown size={15} className="text-[#6e6e73]" />
              더보기 ({Math.min(newsSource.length - newsLimit, 10)}건)
            </button>
          )}
        </div>
      </div>

      {/* ── 인스타그램 ── */}
      <div className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              <span className="text-white text-[11px] font-bold">IG</span>
            </div>
            <span className="text-[15px] font-bold text-[#1d1d1f]">인스타그램</span>
            <span className="text-[12px] text-[#6e6e73]">검단 피드</span>
          </div>
          <a href="https://www.instagram.com/explore/tags/검단신도시/"
            target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-[#0071e3] font-medium active:opacity-70">
            더보기
          </a>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {instaItems.map(item => (
            <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
              className="shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm active:opacity-80">
              <div className="w-full" style={{ aspectRatio: "1/1" }}>
                <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="px-2.5 pt-2 pb-2.5">
                <p className="text-[11px] font-bold text-[#C13584]">{item.source}</p>
                <p className="text-[12px] text-[#1d1d1f] leading-snug line-clamp-2 mt-0.5">{item.title}</p>
                <p className="text-[11px] text-[#86868b] mt-1">{formatRelativeTime(item.publishedAt)}</p>
              </div>
            </a>
          ))}
          {/* 인스타 API 연동 안내 */}
          <a href="https://www.instagram.com/explore/tags/검단신도시/"
            target="_blank" rel="noopener noreferrer"
            className="shrink-0 w-[120px] rounded-2xl border-2 border-dashed border-[#d2d2d7] flex flex-col items-center justify-center gap-2 py-6 active:opacity-70">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              <span className="text-white text-[14px]">📷</span>
            </div>
            <p className="text-[11px] text-[#6e6e73] text-center px-2">인스타<br/>더보기</p>
          </a>
          <div className="shrink-0 w-2" />
        </div>
      </div>

    </div>
  );
}

// ─── 시세 ─────────────────────────────────────────────────────
function PriceTag({ curr, prev }: { curr: number; prev: number }) {
  const diff = curr - prev;
  if (diff === 0) return <span className="text-[12px] text-[#6e6e73]">보합</span>;
  const pct = ((Math.abs(diff) / prev) * 100).toFixed(1);
  return diff > 0
    ? <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#F04452]"><TrendingUp size={10} />+{pct}%</span>
    : <span className="flex items-center gap-0.5 text-[12px] font-semibold text-[#0071e3]"><TrendingDown size={10} />-{pct}%</span>;
}

// ── SVG 라인 차트 ──────────────────────────────────────────────
function LineChart({
  data, color = "#0071e3", height = 72, showLabels = false, showDots = true,
}: {
  data: { date: string; price: number }[];
  color?: string;
  height?: number;
  showLabels?: boolean;
  showDots?: boolean;
}) {
  if (data.length < 2) return null;
  const W = 300; const plotH = showLabels ? height - 22 : height;
  const prices = data.map(d => d.price);
  const minP = Math.min(...prices); const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const pad = 6;

  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = pad + (1 - (d.price - minP) / range) * (plotH - pad * 2);
    return { x, y, ...d };
  });

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillD = `${pathD} L${pts[pts.length-1].x.toFixed(1)},${plotH} L${pts[0].x.toFixed(1)},${plotH} Z`;
  const fillId = `grad-${color.replace("#","")}`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${fillId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length-1 ? 4 : 2.5}
          fill={i === pts.length-1 ? color : "white"} stroke={color} strokeWidth="1.5" />
      ))}
      {/* 최신 가격 라벨 */}
      <text x={last.x} y={last.y - 8} textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>
        {(last.price / 10000).toFixed(1)}억
      </text>
      {showLabels && pts.filter((_, i) => i % 2 === 0 || i === pts.length-1).map((p, i) => (
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="8" fill="#6e6e73">
          {p.date.slice(2).replace("-",".")}
        </text>
      ))}
    </svg>
  );
}

type SortKey = "recent" | "priceHigh" | "priceLow" | "households";
const SORT_LABELS: Record<SortKey, string> = {
  recent: "최근 거래순", priceHigh: "높은 가격순", priceLow: "낮은 가격순", households: "세대수순",
};

/** 30평대(30~39평) 우선, 없으면 마지막 인덱스 */
function est30sIdx(sizes: Apartment["sizes"]): number {
  const idx = sizes.findIndex(s => s.pyeong >= 30 && s.pyeong < 40);
  return idx >= 0 ? idx : sizes.length - 1;
}
/** 전세 추정 = 매매가 × 60% */
function estJeonse(avgPrice: number) { return Math.round(avgPrice * 0.60); }
/** 월세 추정: 보증금 5,000만 + 월(연 6.5%) */
function estWolse(avgPrice: number) {
  const jeonse = estJeonse(avgPrice);
  const deposit = 5000;
  const monthly = Math.max(30, Math.round((jeonse - deposit) * 0.065 / 12));
  return { deposit, monthly };
}

function SiseTab() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSzIdx, setSelectedSzIdx] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [pyeongFilter, setPyeongFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [showSort, setShowSort] = useState(false);
  const [myChartOpen, setMyChartOpen] = useState(false);
  const [avgChartOpen, setAvgChartOpen] = useState(false);
  const [avgPyeongTier, setAvgPyeongTier] = useState<"전체" | "20평대" | "30평대" | "40평대">("30평대");
  const [siseSubTab, setSiseSubTab] = useState<"매매" | "전월세">("매매");

  // 내 집 시세
  const [myAptId, setMyAptId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("myAptId") : null
  );
  const [myAptSzIdx, setMyAptSzIdx] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("myAptSzIdx");
      return v !== null ? parseInt(v, 10) : 0;
    }
    return 0;
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerAptId, setPickerAptId] = useState<string | null>(null);
  const myApt = myAptId ? apartments.find(a => a.id === myAptId) ?? null : null;
  const mySzIdx = Math.min(myAptSzIdx, (myApt?.sizes.length ?? 1) - 1);
  const mySz = myApt?.sizes[mySzIdx] ?? myApt?.sizes[0];

  function pickApt(id: string, szIdx: number) {
    setMyAptId(id);
    setMyAptSzIdx(szIdx);
    if (typeof window !== "undefined") {
      localStorage.setItem("myAptId", id);
      localStorage.setItem("myAptSzIdx", String(szIdx));
    }
    setShowPicker(false);
    setPickerAptId(null);
  }
  function clearApt() {
    setMyAptId(null);
    setMyAptSzIdx(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem("myAptId");
      localStorage.removeItem("myAptSzIdx");
    }
  }

  // 내 집 가격 변동
  const myH = mySz?.priceHistory ?? [];
  const myCurr = myH[myH.length - 1]?.price ?? 0;
  const myPrev = myH[myH.length - 2]?.price ?? myCurr;
  const myDiff = myCurr - myPrev;
  const myPct = myPrev ? ((Math.abs(myDiff) / myPrev) * 100).toFixed(1) : "0.0";

  // 검단 신도시 월별 평균 추세 — 평수 티어 필터 적용
  const avgTrend = (() => {
    const tierOk = (pyeong: number) => {
      if (avgPyeongTier === "20평대") return pyeong >= 20 && pyeong < 30;
      if (avgPyeongTier === "30평대") return pyeong >= 30 && pyeong < 40;
      if (avgPyeongTier === "40평대") return pyeong >= 40;
      return true; // 전체
    };
    const months = apartments[0].sizes[0].priceHistory.map(p => p.date);
    return months.map(month => {
      let total = 0; let count = 0;
      apartments.forEach(apt => apt.sizes.forEach(sz => {
        if (!tierOk(sz.pyeong)) return;
        const entry = sz.priceHistory.find(p => p.date === month);
        if (entry) { total += entry.price; count++; }
      }));
      return { date: month, price: count ? Math.round(total / count) : 0 };
    });
  })();
  const avgPrice = avgTrend[avgTrend.length - 1]?.price ?? 0;
  const avgPrev = avgTrend[avgTrend.length - 2]?.price ?? avgPrice;
  const avgDiff = avgPrice - avgPrev;
  const avgPct = avgPrev ? (Math.abs(avgDiff) / avgPrev * 100).toFixed(1) : "0.0";

  // 전체 평수 목록
  const allPyeong = Array.from(new Set(apartments.flatMap(a => a.sizes.map(s => s.pyeong)))).sort((a, b) => a - b);

  // 필터 + 정렬
  const filtered = apartments
    .filter(apt => {
      if (search && !apt.name.includes(search) && !apt.dong.includes(search)) return false;
      if (pyeongFilter && !apt.sizes.some(s => s.pyeong === pyeongFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "recent") return new Date(b.recentDeal?.date ?? "").getTime() - new Date(a.recentDeal?.date ?? "").getTime();
      if (sortBy === "priceHigh") return (b.recentDeal?.price ?? 0) - (a.recentDeal?.price ?? 0);
      if (sortBy === "priceLow") return (a.recentDeal?.price ?? 0) - (b.recentDeal?.price ?? 0);
      return b.households - a.households;
    });

  return (
    <div className="pb-4">
      {/* ── 최상단: 내 집 시세 + 평균 실거래가 ── */}
      <div className="mx-4 mt-3 mb-3 rounded-2xl overflow-hidden shadow-sm">
        {/* 내 집 시세 — 탭하면 차트 펼침 */}
        <div className="bg-white border border-[#d2d2d7] rounded-t-2xl border-b-0 overflow-hidden">
          {/* 헤더 행 — 항상 노출 */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">🏠</span>
              <span className="text-[13px] font-bold text-[#1d1d1f]">내 집 시세</span>
            </div>
            <button onClick={() => setShowPicker(true)}
              className="text-[12px] text-[#0071e3] font-semibold bg-[#e8f1fd] px-2.5 py-1 rounded-full active:opacity-70">
              {myApt ? "변경" : "+ 등록"}
            </button>
          </div>

          {myApt ? (
            /* 탭 가능한 요약 + 펼침 */
            <button className="w-full px-4 pb-3 text-left active:bg-[#F8FAFB]"
              onClick={() => setMyChartOpen(v => !v)}>
              {/* 요약 지표 */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[15px] font-bold text-[#1d1d1f] truncate">{myApt.name}</p>
                  <p className="text-[12px] text-[#6e6e73] mt-0.5">{myApt.dong} · {mySz?.pyeong}평</p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-[18px] font-black text-[#1d1d1f]">{formatPrice(myCurr)}</p>
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      {myDiff === 0 ? <span className="text-[12px] text-[#6e6e73]">보합</span>
                        : myDiff > 0
                          ? <><TrendingUp size={11} className="text-[#F04452]" /><span className="text-[12px] font-semibold text-[#F04452]">+{myPct}%</span></>
                          : <><TrendingDown size={11} className="text-[#0071e3]" /><span className="text-[12px] font-semibold text-[#0071e3]">-{myPct}%</span></>}
                    </div>
                  </div>
                  {myChartOpen ? <ChevronUp size={15} className="text-[#86868b] shrink-0" /> : <ChevronDown size={15} className="text-[#86868b] shrink-0" />}
                </div>
              </div>

              {/* 접힌 상태: 미니 지표 요약 */}
              {!myChartOpen && (
                <div className="flex gap-2 mt-2.5">
                  {myH.slice(-3).map((p, i) => (
                    <div key={i} className="flex-1 bg-[#f5f5f7] rounded-xl px-2.5 py-1.5 text-center">
                      <p className="text-[10px] text-[#6e6e73]">{p.date.slice(2).replace("-",".")}</p>
                      <p className="text-[12px] font-bold text-[#1d1d1f]">{(p.price/10000).toFixed(1)}억</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 펼쳐진 상태: 라인 차트 */}
              {myChartOpen && (
                <div className="mt-2">
                  <LineChart data={myH} color="#0071e3" height={80} showLabels showDots />
                </div>
              )}
            </button>
          ) : (
            <button onClick={() => setShowPicker(true)} className="w-full px-4 pb-3">
              <div className="border-2 border-dashed border-[#d2d2d7] rounded-xl py-3 flex items-center justify-center active:bg-[#f5f5f7]">
                <span className="text-[13px] text-[#6e6e73]">내 아파트를 등록하면 시세를 바로 확인해요</span>
              </div>
            </button>
          )}
        </div>

        {/* 평균 실거래가 배너 */}
        <div className="w-full bg-gradient-to-br from-emerald-600 to-teal-600 rounded-b-2xl px-4 pt-3 pb-3">
          {/* 헤더 — 탭하면 차트 펼침 */}
          <button className="w-full flex items-center justify-between active:opacity-70" onClick={() => setAvgChartOpen(v => !v)}>
            <p className="text-emerald-100 text-[12px] font-medium">검단 신도시 평균 실거래가</p>
            {avgChartOpen ? <ChevronUp size={14} className="text-emerald-300" /> : <ChevronDown size={14} className="text-emerald-300" />}
          </button>

          {/* 가격 + 등락 */}
          <div className="flex items-end justify-between mt-1">
            <p className="text-white text-[24px] font-black">{formatPrice(avgPrice)}</p>
            <div className="flex items-center gap-1 pb-0.5">
              {avgDiff === 0
                ? <span className="text-emerald-200 text-[12px]">보합</span>
                : avgDiff > 0
                  ? <><TrendingUp size={13} className="text-red-300" /><span className="text-red-300 text-[12px]">+{avgPct}%</span></>
                  : <><TrendingDown size={13} className="text-blue-300" /><span className="text-blue-300 text-[12px]">-{avgPct}%</span></>}
            </div>
          </div>

          {/* 평수 티어 필터 */}
          <div className="flex gap-1.5 mt-2.5">
            {(["전체", "20평대", "30평대", "40평대"] as const).map(tier => (
              <button key={tier} onClick={() => setAvgPyeongTier(tier)}
                className={`h-7 px-3 rounded-full text-[11px] font-semibold transition-colors ${
                  avgPyeongTier === tier ? "bg-white text-emerald-700" : "bg-emerald-700/40 text-emerald-200 active:bg-emerald-700/60"
                }`}>
                {tier}
              </button>
            ))}
          </div>

          {/* 접힌 상태: 3개월 요약 */}
          {!avgChartOpen && (
            <div className="flex gap-2 mt-2">
              {avgTrend.slice(-3).map((p, i) => (
                <div key={i} className="flex-1 bg-emerald-700/50 rounded-xl px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-emerald-200">{p.date.slice(2).replace("-",".")}</p>
                  <p className="text-[12px] font-bold text-white">{(p.price/10000).toFixed(1)}억</p>
                </div>
              ))}
            </div>
          )}

          {/* 펼쳐진 상태: 라인 차트 + 월별 리스트 */}
          {avgChartOpen && (
            <div>
              <div className="mt-2 bg-emerald-700/30 rounded-xl p-2">
                <LineChart data={avgTrend} color="#6EE7B7" height={90} showLabels showDots />
              </div>
              <div className="mt-2 space-y-0">
                {avgTrend.slice(-5).reverse().map((p, i, arr) => {
                  const prevP = arr[i + 1]?.price;
                  const chg = prevP ? p.price - prevP : 0;
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-emerald-500/30 last:border-0">
                      <span className="text-[11px] text-emerald-200">{p.date.replace("-","년 ")}월</span>
                      <div className="flex items-center gap-2">
                        {chg !== 0 && <span className={`text-[10px] font-bold ${chg > 0 ? "text-red-300" : "text-blue-300"}`}>{chg > 0 ? "▲" : "▼"}{Math.abs(chg).toLocaleString()}</span>}
                        <span className="text-[12px] font-bold text-white">{formatPrice(p.price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 매매 / 전월세 서브탭 ── */}
      <div className="px-4 mb-3">
        <div className="flex bg-[#f5f5f7] rounded-xl p-1 gap-1">
          {(["매매", "전월세"] as const).map(t => (
            <button key={t} onClick={() => setSiseSubTab(t)}
              className={`flex-1 h-9 rounded-lg text-[14px] font-semibold transition-all ${siseSubTab === t ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#6e6e73]"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 검색 + 필터 바 ── */}
      <div className="px-4 mb-3 space-y-2">
        {/* 검색 */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 h-10 border border-[#d2d2d7]">
          <Search size={15} className="text-[#86868b] shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="단지명, 동으로 검색"
            className="flex-1 text-[14px] bg-transparent focus:outline-none text-[#1d1d1f] placeholder:text-[#86868b]" />
          {search && <button onClick={() => setSearch("")}><X size={14} className="text-[#86868b]" /></button>}
        </div>

        {/* 평수 필터 + 정렬 */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setPyeongFilter(null)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${!pyeongFilter ? "bg-[#1d1d1f] text-white border-transparent" : "bg-white text-[#424245] border-[#d2d2d7]"}`}>
              전체
            </button>
            {allPyeong.map(p => (
              <button key={p} onClick={() => setPyeongFilter(pyeongFilter === p ? null : p)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${pyeongFilter === p ? "bg-[#0071e3] text-white border-transparent" : "bg-white text-[#424245] border-[#d2d2d7]"}`}>
                {p}평
              </button>
            ))}
          </div>
          {/* 정렬 버튼 */}
          <button onClick={() => setShowSort(true)}
            className="shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border bg-white text-[#424245] border-[#d2d2d7] flex items-center gap-1 active:bg-[#f5f5f7]">
            <SlidersHorizontal size={12} className="text-[#6e6e73]" />
            {SORT_LABELS[sortBy].split("순")[0]}
          </button>
        </div>
      </div>

      {/* ── 결과 수 ── */}
      <p className="px-4 text-[12px] text-[#6e6e73] mb-2">
        {filtered.length}개 단지{search ? ` · "${search}" 검색 결과` : ""}
      </p>

      {/* ── 아파트 리스트 ── */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 flex flex-col items-center gap-2">
            <span className="text-3xl">🔍</span>
            <p className="text-[14px] text-[#6e6e73]">검색 결과가 없어요</p>
          </div>
        ) : filtered.map(apt => {
          // 30평대 기본 선택
          const szIdx = selectedSzIdx[apt.id] ?? est30sIdx(apt.sizes);
          const sz = apt.sizes[szIdx] ?? apt.sizes[0];
          const h = sz.priceHistory;
          const curr = h[h.length - 1].price;
          const prev = h[h.length - 2]?.price ?? curr;
          const isOpen = selected === apt.id;
          const jeonse = estJeonse(sz.avgPrice);
          const wolse = estWolse(sz.avgPrice);
          const jeonseHistory = h.map(p => ({ ...p, price: estJeonse(p.price) }));

          return (
            <div key={apt.id}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${isOpen ? "ring-2 ring-[#0071e3]" : ""}`}>
              <button className="w-full px-4 py-4 text-left" onClick={() => setSelected(isOpen ? null : apt.id)}>
                {/* 헤더 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug">{apt.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <MapPin size={11} className="text-[#6e6e73] shrink-0" />
                      <span className="text-[12px] text-[#6e6e73]">{apt.dong}</span>
                      <span className="text-[#d2d2d7]">·</span>
                      <span className="text-[12px] text-[#6e6e73]">{apt.built}년</span>
                      <span className="text-[#d2d2d7]">·</span>
                      <span className="text-[12px] text-[#6e6e73]">{apt.households.toLocaleString()}세대</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {siseSubTab === "매매" ? (
                      <>
                        <p className="text-[17px] font-black text-emerald-600">{formatPrice(sz.avgPrice)}</p>
                        <p className="text-[11px] text-[#6e6e73]">{sz.pyeong}평 매매</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[17px] font-black text-[#0071e3]">{formatPrice(jeonse)}</p>
                        <p className="text-[11px] text-[#6e6e73]">{sz.pyeong}평 전세</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 평수 선택 칩 */}
                <div className="flex gap-1.5 mt-3" onClick={e => e.stopPropagation()}>
                  {apt.sizes.map((s, i) => {
                    const isActive = szIdx === i;
                    const displayPrice = siseSubTab === "매매" ? s.avgPrice : estJeonse(s.avgPrice);
                    return (
                      <button key={i}
                        onClick={e => { e.stopPropagation(); setSelectedSzIdx(p => ({ ...p, [apt.id]: i })); }}
                        className={`rounded-xl px-3 py-2 text-center transition-colors ${isActive ? "bg-[#0071e3]" : "bg-[#f5f5f7]"}`}>
                        <p className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-[#424245]"}`}>{s.pyeong}평</p>
                        <p className={`text-[11px] font-bold ${isActive ? "text-blue-100" : siseSubTab === "매매" ? "text-emerald-600" : "text-[#0071e3]"}`}>
                          {formatPrice(displayPrice)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* 매매/전세 2열 요약 */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {siseSubTab === "매매" ? (
                    <>
                      <div className="bg-emerald-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-emerald-600 font-medium">매매 시세</p>
                        <p className="text-[13px] font-black text-emerald-700">{formatPrice(sz.avgPrice)}</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-[#0071e3] font-medium">전세 (추정)</p>
                        <p className="text-[13px] font-black text-[#0071e3]">{formatPrice(jeonse)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-[#0071e3] font-medium">전세 시세</p>
                        <p className="text-[13px] font-black text-[#0071e3]">{formatPrice(jeonse)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-purple-500 font-medium">월세 (추정)</p>
                        <p className="text-[12px] font-black text-purple-700">{wolse.deposit.toLocaleString()} / {wolse.monthly}만</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#f5f5f7]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-[#6e6e73]">전월 대비</span>
                    <PriceTag curr={curr} prev={prev} />
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-[#6e6e73]">
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>추이 그래프</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-[#f5f5f7] px-4 py-3 bg-[#F8FAFB]">
                  <p className="text-[11px] font-bold text-[#6e6e73] mb-2">
                    {sz.pyeong}평 {siseSubTab === "매매" ? "매매" : "전세"} 시세 추이
                  </p>
                  <div className="bg-white rounded-xl p-2 mb-3">
                    <LineChart
                      data={siseSubTab === "매매" ? h : jeonseHistory}
                      color={siseSubTab === "매매" ? "#10B981" : "#0071e3"}
                      height={88} showLabels showDots
                    />
                  </div>
                  <p className="text-[11px] font-bold text-[#6e6e73] mb-1.5">
                    월별 {siseSubTab === "매매" ? "거래" : "전세 시세"}
                  </p>
                  <div className="space-y-1">
                    {(siseSubTab === "매매" ? h : jeonseHistory).slice(-6).reverse().map((p, i, arr) => {
                      const prevP = arr[i + 1]?.price;
                      const chg = prevP ? p.price - prevP : 0;
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-[#f5f5f7] last:border-0">
                          <span className="text-[12px] text-[#6e6e73]">{p.date.replace("-", "년 ")}월</span>
                          <div className="flex items-center gap-2">
                            {chg !== 0 && (
                              <span className={`text-[10px] font-semibold ${chg > 0 ? "text-[#F04452]" : "text-[#0071e3]"}`}>
                                {chg > 0 ? "▲" : "▼"}{Math.abs(chg).toLocaleString()}
                              </span>
                            )}
                            <span className="text-[13px] font-bold text-[#1d1d1f]">{formatPrice(p.price)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* ── 정렬 선택 바텀 시트 ── */}
      {showSort && (
        <div className="fixed inset-0 z-[300] flex items-end" onClick={() => setShowSort(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-w-[430px] mx-auto bg-white rounded-t-3xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-[#d2d2d7] rounded-full" /></div>
            <p className="text-[16px] font-bold text-[#1d1d1f] px-5 pt-2 pb-3">정렬 기준</p>
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => { setSortBy(key); setShowSort(false); }}
                className={`w-full px-5 py-4 flex items-center justify-between border-t border-[#f5f5f7] active:bg-[#f5f5f7] ${sortBy === key ? "bg-[#e8f1fd]" : ""}`}>
                <span className={`text-[15px] font-semibold ${sortBy === key ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>{label}</span>
                {sortBy === key && <span className="text-[#0071e3] text-[13px] font-bold">✓</span>}
              </button>
            ))}
            <div className="h-5" />
          </div>
        </div>
      )}

      {/* ── 아파트 선택 모달 ── */}
      {showPicker && (
        <div className="fixed inset-0 z-[300] flex items-end" onClick={() => { setShowPicker(false); setPickerAptId(null); }}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 w-full max-w-[430px] mx-auto bg-white rounded-t-3xl max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-[#d2d2d7] rounded-full" /></div>
            <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-[#f5f5f7]">
              <h3 className="text-[17px] font-bold text-[#1d1d1f]">내 집 선택</h3>
              {myApt && <button onClick={clearApt} className="text-[13px] text-[#F04452] font-medium active:opacity-70">등록 해제</button>}
            </div>
            <div className="overflow-y-auto flex-1 overscroll-contain rounded-b-3xl">
              {apartments.map(apt => {
                const isSelected = myAptId === apt.id;
                const isExpanded = pickerAptId === apt.id;
                const displaySzIdx = isSelected ? mySzIdx : est30sIdx(apt.sizes);
                const displaySz = apt.sizes[displaySzIdx] ?? apt.sizes[0];
                const curr = displaySz.priceHistory[displaySz.priceHistory.length - 1]?.price ?? 0;
                return (
                  <div key={apt.id} className="border-b border-[#f5f5f7]">
                    <button
                      onClick={() => {
                        if (apt.sizes.length === 1) { pickApt(apt.id, 0); return; }
                        setPickerAptId(isExpanded ? null : apt.id);
                      }}
                      className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${isSelected ? "bg-[#e8f1fd]" : isExpanded ? "bg-[#F8FAFB]" : "active:bg-[#f5f5f7]"}`}>
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{apt.name}</p>
                          {isSelected && <span className="shrink-0 text-[10px] font-bold bg-[#0071e3] text-white px-1.5 py-0.5 rounded-full">{mySz?.pyeong}평</span>}
                        </div>
                        <p className="text-[12px] text-[#6e6e73] mt-0.5">{apt.dong} · {apt.built}년 · {apt.households.toLocaleString()}세대</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-[15px] font-black text-emerald-600">{formatPrice(curr)}</p>
                        <ChevronDown size={14} className={`text-[#86868b] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 bg-[#F8FAFB] flex gap-2 flex-wrap">
                        {apt.sizes.map((sz, i) => {
                          const szCurr = sz.priceHistory[sz.priceHistory.length - 1]?.price ?? 0;
                          const isActiveSz = isSelected && mySzIdx === i;
                          return (
                            <button key={i} onClick={() => pickApt(apt.id, i)}
                              className={`flex flex-col items-center px-3.5 py-2 rounded-2xl border-2 transition-colors active:opacity-75 ${isActiveSz ? "border-[#0071e3] bg-[#e8f1fd]" : "border-[#d2d2d7] bg-white"}`}>
                              <span className={`text-[13px] font-bold ${isActiveSz ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>{sz.pyeong}평</span>
                              <span className={`text-[11px] font-medium mt-0.5 ${isActiveSz ? "text-[#0071e3]" : "text-[#6e6e73]"}`}>{sz.sqm}㎡</span>
                              <span className={`text-[12px] font-black mt-0.5 ${isActiveSz ? "text-[#0071e3]" : "text-emerald-600"}`}>{formatPrice(szCurr)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────
const mainTabs: SoikTab[] = ["커뮤니티", "뉴스", "시세"];

function SoikContent() {
  const router = useRouter();
  const [tab, setTab] = useState<SoikTab>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("tab");
      if (p === "뉴스" || p === "시세") return p as SoikTab;
    }
    return "커뮤니티";
  });

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="소식" />

      {/* Main tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#f5f5f7] flex">
        {mainTabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 h-11 text-[16px] font-semibold border-b-2 transition-colors ${tab === t ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "커뮤니티" && <CommunityTab />}
      {tab === "뉴스" && <NewsTab />}
      {tab === "시세" && <SiseTab />}

      {/* FAB - only on 커뮤니티 tab */}
      {tab === "커뮤니티" && (
        <button onClick={() => router.push("/community/write/")}
          className="fixed bottom-[74px] right-4 w-14 h-14 bg-[#0071e3] rounded-full shadow-lg flex items-center justify-center active:bg-[#0058b0] z-40">
          <Plus size={24} className="text-white" />
        </button>
      )}

      <BottomNav />
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense><SoikContent /></Suspense>;
}
