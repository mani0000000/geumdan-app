"use client";
import { useState, useEffect } from "react";
import { ExternalLink, RefreshCw, X, Play, ArrowUpRight } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { newsItems } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import { fetchYouTubeVideos, type NewsArticle, type YouTubeVideo } from "@/lib/api/news";
import { fetchNewsArticles } from "@/lib/db/news";
import { fetchInstagramPosts } from "@/lib/db/instagram";
import { fetchYouTubeVideosFromDB } from "@/lib/db/youtube";
import type { NewsType } from "@/lib/types";

const tabs: NewsType[] = ["뉴스", "유튜브", "인스타"];
const tabIcon: Record<NewsType, string> = { 뉴스: "📰", 유튜브: "▶️", 인스타: "📷" };

interface CardItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  publishedAt: string;
  url: string;
  type: NewsType;
  thumbnail?: string;
}

// ── 출처별 accent 색상 매핑 ────────────────────────────────────
const SOURCE_COLORS: Record<string, string> = {
  "헤럴드경제": "#E11D48",
  "조선일보": "#1E3A8A",
  "중앙일보": "#7C2D12",
  "동아일보": "#0F766E",
  "매일경제": "#B45309",
  "한국경제": "#0E7490",
  "연합뉴스": "#1D4ED8",
  "뉴시스": "#7C3AED",
  "뉴스1": "#0891B2",
  "MBC": "#DC2626",
  "KBS": "#1E40AF",
  "SBS": "#EA580C",
  "JTBC": "#BE123C",
  "YTN": "#1F2937",
  "유튜브": "#FF0000",
};

const FALLBACK_PALETTE = [
  "#0071e3", "#00C471", "#7C3AED", "#F59E0B",
  "#F43F5E", "#06B6D4", "#6366F1", "#10B981",
  "#EC4899", "#8B5CF6", "#F97316",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function sourceColor(source: string): string {
  if (SOURCE_COLORS[source]) return SOURCE_COLORS[source];
  for (const key of Object.keys(SOURCE_COLORS)) {
    if (source.includes(key)) return SOURCE_COLORS[key];
  }
  return FALLBACK_PALETTE[hashStr(source) % FALLBACK_PALETTE.length];
}

function sourceInitial(source: string): string {
  const s = source.trim();
  if (!s) return "N";
  const first = s[0];
  if (/[가-힣]/.test(first)) return first;
  const letters = s.replace(/[^a-zA-Z]/g, "");
  return (letters.slice(0, 2) || first).toUpperCase();
}

// ── Hero 카드 (첫 번째 기사) ───────────────────────────────────
function HeroCard({ item }: { item: CardItem }) {
  const accent = sourceColor(item.source);
  const typeTag = item.type === "유튜브" ? "▶ 유튜브" : item.type === "인스타" ? "📷 인스타" : "📰 뉴스";

  if (item.thumbnail) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block rounded-3xl overflow-hidden active:opacity-90 transition-opacity"
        style={{ aspectRatio: "16/10" }}
      >
        <img
          src={item.thumbnail}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span
            className="text-[11px] font-bold text-white px-2.5 py-1 rounded-full"
            style={{ backgroundColor: accent }}
          >
            {item.source}
          </span>
          <span className="text-[10px] font-semibold text-white/85 bg-black/35 px-2 py-1 rounded-full backdrop-blur-sm">
            {typeTag}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-[20px] font-black text-white leading-snug line-clamp-3 tracking-tight">
            {item.title}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[12px] text-white/75 font-medium">
              {formatRelativeTime(item.publishedAt)}
            </span>
            <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <ArrowUpRight size={14} className="text-white" />
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-3xl overflow-hidden active:opacity-90 transition-opacity p-5"
      style={{
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
        minHeight: 200,
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full">
          {item.source}
        </span>
        <span className="text-[10px] font-semibold text-white/85 px-1.5">{typeTag}</span>
      </div>
      <p className="text-[20px] font-black text-white leading-snug mt-4 mb-2 line-clamp-4 tracking-tight">
        {item.title}
      </p>
      {item.summary && (
        <p className="text-[13px] text-white/85 line-clamp-2 leading-relaxed mt-1">
          {item.summary}
        </p>
      )}
      <div className="flex items-center justify-between mt-4">
        <span className="text-[12px] text-white/70 font-medium">
          {formatRelativeTime(item.publishedAt)}
        </span>
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
          <ArrowUpRight size={14} className="text-white" />
        </div>
      </div>
    </a>
  );
}

// ── 리스트 카드 (썸네일 있을 때) ───────────────────────────────
function NewsCardWithImage({ item }: { item: CardItem }) {
  const accent = sourceColor(item.source);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl overflow-hidden active:bg-[#f5f5f7] transition-colors"
    >
      <div className="flex gap-3 p-3">
        <div className="relative w-[104px] h-[104px] rounded-xl overflow-hidden shrink-0 bg-[#f5f5f7]">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[11px] font-bold tracking-tight"
              style={{ color: accent }}
            >
              {item.source}
            </span>
          </div>
          <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug line-clamp-3 mt-1 tracking-tight">
            {item.title}
          </p>
          <div className="flex items-center gap-2 mt-auto pt-1.5">
            <span className="text-[11px] text-[#86868b]">
              {formatRelativeTime(item.publishedAt)}
            </span>
            <ExternalLink size={10} className="text-[#c7c7cc] ml-auto" />
          </div>
        </div>
      </div>
    </a>
  );
}

// ── 리스트 카드 (썸네일 없을 때) ───────────────────────────────
function NewsCardTextOnly({ item }: { item: CardItem }) {
  const accent = sourceColor(item.source);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl active:bg-[#f5f5f7] transition-colors border border-[#e5e5e7]"
      style={{ borderLeftWidth: 4, borderLeftColor: accent }}
    >
      <div className="flex gap-3 p-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-[14px]"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {sourceInitial(item.source)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className="text-[12px] font-bold tracking-tight"
              style={{ color: accent }}
            >
              {item.source}
            </span>
            <span className="text-[11px] text-[#c7c7cc]">·</span>
            <span className="text-[11px] text-[#86868b]">
              {formatRelativeTime(item.publishedAt)}
            </span>
          </div>
          <p className="text-[15px] font-bold text-[#1d1d1f] leading-snug line-clamp-3 mt-1 tracking-tight">
            {item.title}
          </p>
          {item.summary && (
            <p className="text-[13px] text-[#6e6e73] line-clamp-2 mt-1 leading-relaxed">
              {item.summary}
            </p>
          )}
        </div>
        <ExternalLink size={12} className="text-[#c7c7cc] shrink-0 mt-1" />
      </div>
    </a>
  );
}

function NewsListItem({ item }: { item: CardItem }) {
  return item.thumbnail ? <NewsCardWithImage item={item} /> : <NewsCardTextOnly item={item} />;
}

function NewsSkeleton() {
  return (
    <div className="space-y-3 px-4">
      <div className="rounded-3xl bg-[#e5e5e7] animate-pulse" style={{ aspectRatio: "16/10" }} />
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-white rounded-2xl p-3 flex gap-3 animate-pulse">
          <div className="w-[104px] h-[104px] rounded-xl bg-[#e5e5e7] shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-[#e5e5e7] rounded w-1/3" />
            <div className="h-4 bg-[#e5e5e7] rounded w-full" />
            <div className="h-4 bg-[#e5e5e7] rounded w-4/5" />
            <div className="h-3 bg-[#e5e5e7] rounded w-1/4 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── YouTube 임베드 모달 ────────────────────────────────────
function YouTubeModal({ video, onClose }: { video: YouTubeVideo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col" onClick={onClose}>
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[#0F0F0F]"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="active:opacity-60">
          <X size={20} className="text-white" />
        </button>
        <p className="flex-1 text-[14px] font-semibold text-white line-clamp-1">{video.title}</p>
        <a href={video.url} target="_blank" rel="noopener noreferrer"
          className="active:opacity-60" onClick={e => e.stopPropagation()}>
          <ExternalLink size={18} className="text-white/70" />
        </a>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black"
        onClick={e => e.stopPropagation()}>
        <div className="w-full" style={{ position: "relative", paddingBottom: "56.25%" }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
            title={video.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      <div className="px-4 py-3 bg-[#0F0F0F]" onClick={e => e.stopPropagation()}>
        <p className="text-[13px] text-white/60">{video.channelName}</p>
      </div>
    </div>
  );
}

// ── YouTube 썸네일 그리드 ─────────────────────────────────
function YouTubeGrid({ videos, loading, onSelect }: {
  videos: YouTubeVideo[];
  loading: boolean;
  onSelect: (v: YouTubeVideo) => void;
}) {
  if (loading) {
    return (
      <div className="px-4 grid grid-cols-2 gap-3 mt-2">
        {[0,1,2,3].map(i => (
          <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
            <div className="w-full bg-[#d2d2d7]" style={{ aspectRatio: "16/9" }} />
            <div className="bg-white px-3 py-2.5 space-y-1.5">
              <div className="h-3 bg-[#d2d2d7] rounded w-full" />
              <div className="h-3 bg-[#d2d2d7] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
        <span className="text-5xl mb-4">📹</span>
        <p className="text-[17px] font-bold text-[#1d1d1f]">영상을 불러오는 중이에요</p>
        <p className="text-[14px] text-[#6e6e73] mt-2">잠시 후 다시 확인해보세요</p>
      </div>
    );
  }
  return (
    <div className="px-4 grid grid-cols-2 gap-3 mt-2">
      {videos.map(video => (
        <button
          key={video.id}
          onClick={() => onSelect(video)}
          className="rounded-2xl overflow-hidden bg-white text-left active:opacity-75 shadow-sm"
        >
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={e => {
                (e.target as HTMLImageElement).src =
                  `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`;
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Play size={16} className="text-white fill-white ml-0.5" />
              </div>
            </div>
            <span className="absolute bottom-2 right-2 bg-[#FF0000] text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              YouTube
            </span>
          </div>
          <div className="px-2.5 py-2">
            <p className="text-[13px] font-semibold text-[#1d1d1f] line-clamp-2 leading-snug">
              {video.title}
            </p>
            <p className="text-[11px] text-[#6e6e73] mt-1 truncate">{video.channelName}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

interface ApiNews {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description: string;
  thumbnail?: string;
}

export default function NewsPage() {
  const [active, setActive] = useState<NewsType>("뉴스");
  const [realNews, setRealNews] = useState<NewsArticle[]>([]);
  const [dbItems, setDbItems] = useState(newsItems);
  const [instaItems, setInstaItems] = useState<import("@/lib/types").NewsItem[]>([]);
  const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [ytLoading, setYtLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const loadNews = async () => {
    setLoading(true);
    try {
      const apiRes = await fetch("/api/news");
      const apiData = await apiRes.json();

      let newsArticles: NewsArticle[] = [];
      if (apiData.items && Array.isArray(apiData.items) && apiData.items.length > 0) {
        newsArticles = apiData.items.map((item: ApiNews, idx: number) => ({
          id: `api-${idx}`,
          title: item.title,
          summary: item.description,
          source: item.source,
          publishedAt: item.pubDate,
          url: item.link,
          thumbnail: item.thumbnail,
          type: "뉴스" as const,
        }));
        setRealNews(newsArticles);
        setLastUpdated(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (error) {
      console.error("Failed to fetch from /api/news:", error);
    }

    const [dbNews, insta] = await Promise.all([
      fetchNewsArticles(undefined, 50),
      fetchInstagramPosts(),
    ]);
    if (dbNews.length > 0) setDbItems(dbNews);
    setInstaItems(insta);
    setLoading(false);
  };

  const loadYouTube = async () => {
    if (ytVideos.length > 0) return;
    setYtLoading(true);
    // DB에 등록된 영상 먼저, 없으면 API 검색
    const dbResult = await fetchYouTubeVideosFromDB();
    if (dbResult.videos.length > 0) {
      setYtVideos(dbResult.videos);
      setYtLoading(false);
      return;
    }
    const result = await fetchYouTubeVideos("검단신도시");
    setYtVideos(result.videos);
    setYtLoading(false);
  };

  useEffect(() => { loadNews(); }, []);

  // 유튜브 탭 선택 시 자동 로드
  useEffect(() => {
    if (active === "유튜브") loadYouTube();
  }, [active]);

  const newsSource: CardItem[] = active === "뉴스"
    ? (realNews.length > 0
        ? realNews.map(n => ({ ...n, summary: n.summary, thumbnail: n.thumbnail }))
        : dbItems.filter(n => n.type === "뉴스").map(n => ({ ...n, summary: n.summary, thumbnail: n.thumbnail }))
      )
    : active === "인스타"
    ? instaItems.map(n => ({ ...n, thumbnail: n.thumbnail }))
    : dbItems.filter(n => n.type === active).map(n => ({ ...n, thumbnail: n.thumbnail }));

  const hero = newsSource[0];
  const rest = newsSource.slice(1);

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-28">
      <Header title="검단 뉴스" />

      {/* Tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#f5f5f7] flex">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActive(tab)}
            className={`flex-1 h-11 flex items-center justify-center gap-1.5 text-[15px] font-semibold border-b-2 transition-colors active:opacity-70 ${active === tab ? "text-[#0071e3] border-[#0071e3]" : "text-[#86868b] border-transparent"}`}>
            <span>{tabIcon[tab]}</span>{tab}
          </button>
        ))}
      </div>

      {/* Status row */}
      {active !== "유튜브" && (
        <div className="flex items-center justify-between px-4 py-3">
          {realNews.length > 0 && active === "뉴스"
            ? <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C471] animate-pulse" />
                <span className="text-[13px] text-[#424245] font-medium">실시간 검단 뉴스 {realNews.length}건</span>
              </div>
            : <span className="text-[13px] text-[#6e6e73] font-medium">검단 신도시 소식</span>
          }
          <button onClick={loadNews} className="flex items-center gap-1.5 active:opacity-60">
            <RefreshCw size={12} className={`text-[#6e6e73] ${loading ? "animate-spin" : ""}`} />
            {lastUpdated && <span className="text-[12px] text-[#86868b]">{lastUpdated}</span>}
          </button>
        </div>
      )}

      {/* 유튜브 탭 */}
      {active === "유튜브" && (
        <>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse" />
              <span className="text-[13px] text-[#424245] font-medium">검단신도시 유튜브 영상</span>
            </div>
            <button onClick={() => { setYtVideos([]); loadYouTube(); }} className="active:opacity-60">
              <RefreshCw size={12} className={`text-[#6e6e73] ${ytLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <YouTubeGrid videos={ytVideos} loading={ytLoading} onSelect={setSelectedVideo} />
        </>
      )}

      {/* 뉴스/인스타 탭: Hero + 리스트 */}
      {active !== "유튜브" && (
        <>
          {loading && newsSource.length === 0 ? (
            <NewsSkeleton />
          ) : (
            <>
              {hero && (
                <div className="px-4 mb-3">
                  <HeroCard item={hero} />
                </div>
              )}

              {rest.length > 0 && (
                <div className="px-4 space-y-2.5">
                  {rest.map(item => (
                    <NewsListItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </>
          )}

          {!loading && newsSource.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-20 text-center px-8">
              <span className="text-5xl mb-4">📭</span>
              <p className="text-[17px] font-bold text-[#1d1d1f]">뉴스가 없어요</p>
              <p className="text-[14px] text-[#6e6e73] mt-2">잠시 후 다시 확인해보세요</p>
            </div>
          )}
        </>
      )}

      <BottomNav />

      {/* 유튜브 임베드 모달 */}
      {selectedVideo && (
        <YouTubeModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      )}
    </div>
  );
}
