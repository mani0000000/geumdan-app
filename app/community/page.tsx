"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, ThumbsUp, MessageSquare, Eye, Flame, Pin,
  RefreshCw, TrendingUp, TrendingDown, MapPin,
  ChevronRight, ChevronUp, ChevronDown, Play, Search, X, SlidersHorizontal,
  Heart, MessageCircle, Repeat2, Send,
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import ThreadAvatar from "@/components/ui/ThreadAvatar";
import { PostMenu } from "@/components/ui/PostMenu";
import { ReportModal } from "@/components/ui/ReportModal";
import { posts, newsItems, apartments } from "@/lib/mockData";
import { formatRelativeTime, formatPrice } from "@/lib/utils";
import { fetchDBPosts, isMockPostId } from "@/lib/db/posts";
import {
  fetchHiddenPostIds, hidePost, reportPost, type ReportReason,
} from "@/lib/db/reports";
import { getMyNickname } from "@/lib/identity";
import { fetchGeumdanNews, type NewsArticle, type YouTubeVideo } from "@/lib/api/news";
import { fetchYouTubeVideosFromDB } from "@/lib/db/youtube";
import { fetchNewsFromDB } from "@/lib/db/news";
import type { CommunityCategory, NewsType, Post } from "@/lib/types";
import type { Apartment } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────
type SoikTab = "커뮤니티" | "뉴스" | "시세";

// ─── Community ───────────────────────────────────────────────
const categories: CommunityCategory[] = ["전체","맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];
const catColor: Record<CommunityCategory, string> = {
  전체: "bg-blue-600 text-white",
  맘카페: "bg-pink-50 text-pink-600",
  맛집: "bg-orange-50 text-orange-700",
  부동산: "bg-green-50 text-green-800",
  중고거래: "bg-yellow-50 text-yellow-700",
  "분실/목격": "bg-red-50 text-red-800",
  동네질문: "bg-blue-50 text-blue-800",
  소모임: "bg-purple-50 text-purple-800",
};

type CommSortKey = "latest" | "likes" | "comments" | "views";
const SORT_OPTS: { key: CommSortKey; label: string }[] = [
  { key: "latest",   label: "최신순" },
  { key: "likes",    label: "반응순" },
  { key: "comments", label: "댓글순" },
  { key: "views",    label: "조회수순" },
];

function hotScore(p: { viewCount: number; likeCount: number; commentCount: number }) {
  return p.viewCount + p.likeCount * 5 + p.commentCount * 3;
}

// ─── 뉴스 조회 추적 (localStorage) ──────────────────────────
function getNewsViews(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("newsViews") ?? "{}") as Record<string, number>; }
  catch { return {}; }
}
function trackNewsView(id: string) {
  if (typeof window === "undefined") return;
  try {
    const v = getNewsViews();
    v[id] = (v[id] ?? 0) + 1;
    localStorage.setItem("newsViews", JSON.stringify(v));
  } catch { /* ignore */ }
}

function PostCard({
  post, router, onHide, onReport,
}: {
  post: Post;
  router: ReturnType<typeof useRouter>;
  onHide: (id: string) => void;
  onReport: (id: string) => void;
}) {
  const goDetail = () => router.push(`/community/detail/?id=${post.id}`);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const images = post.images ?? [];
  return (
    <div className="relative px-4 pt-4 pb-3 active:bg-[#fafafb] transition-colors cursor-pointer"
      onClick={goDetail}>
      <div className="flex gap-3">
        <ThreadAvatar name={post.author} src={post.authorAvatarUrl} size={40} />
        <div className="flex-1 min-w-0">
          {/* Header: name · dong · time, with menu on the right */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[14px] font-bold text-gray-900 truncate">{post.author}</span>
              <span className="text-[13px] text-gray-400">· {post.authorDong}</span>
              <span className="text-[13px] text-gray-400">· {formatRelativeTime(post.createdAt)}</span>
            </div>
            <div onClick={stop} className="shrink-0 -mt-1 -mr-1">
              <PostMenu
                onHide={() => onHide(post.id)}
                onReport={() => onReport(post.id)}
              />
            </div>
          </div>

          {/* Category + flags */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {post.isPinned && <Pin size={11} className="text-blue-600" />}
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catColor[post.category]}`}>
              {post.category}
            </span>
            {post.isHot && (
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-red-500">
                <Flame size={10} /> HOT
              </span>
            )}
          </div>

          {/* Title + body */}
          <p className="text-[15px] font-semibold text-gray-900 mt-2 leading-snug">{post.title}</p>
          <p className="text-[14px] text-gray-700 mt-1 leading-relaxed line-clamp-3 whitespace-pre-line">
            {post.content}
          </p>

          {/* Images */}
          {images.length > 0 && (
            <div
              className={`mt-3 grid gap-1 rounded-xl overflow-hidden border border-[#e5e5ea] ${
                images.length === 1 ? "grid-cols-1" : images.length === 2 ? "grid-cols-2" : "grid-cols-3"
              }`}
            >
              {images.slice(0, 3).map((src, i) => (
                <div
                  key={i}
                  className="relative bg-gray-100"
                  style={{ aspectRatio: images.length === 1 ? "16/10" : "1/1" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {i === 2 && images.length > 3 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white text-[16px] font-bold">+{images.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Video */}
          {post.videoUrl && (
            <div className="mt-3 rounded-xl overflow-hidden bg-black border border-[#e5e5ea]"
              onClick={stop}>
              <video
                src={post.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[420px] object-contain bg-black"
              />
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-1 mt-3 -ml-2">
            <button onClick={stop}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-gray-500 active:bg-gray-50">
              <Heart size={17} />
              <span className="text-[13px]">{post.likeCount}</span>
            </button>
            <button onClick={goDetail}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-gray-500 active:bg-gray-50">
              <MessageCircle size={17} />
              <span className="text-[13px]">{post.commentCount}</span>
            </button>
            <button onClick={stop}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-gray-500 active:bg-gray-50">
              <Repeat2 size={17} />
            </button>
            <button onClick={stop}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-gray-500 active:bg-gray-50">
              <Send size={16} />
            </button>
            <span className="ml-auto flex items-center gap-1 text-[12px] text-gray-400">
              <Eye size={12} /> {post.viewCount.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshKey = searchParams.get("refresh");
  const [active, setActive] = useState<CommunityCategory>(() => {
    if (typeof window === "undefined") return "전체";
    const c = new URLSearchParams(window.location.search).get("category");
    if (c && (categories as string[]).includes(c)) return c as CommunityCategory;
    return "전체";
  });
  const [dbPosts, setDbPosts] = useState<typeof posts>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [sort, setSort] = useState<CommSortKey>("latest");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  // 글쓰기 후 ?refresh=... 가 붙어 돌아오면 목록을 다시 가져온다.
  useEffect(() => {
    fetchDBPosts(undefined, 50).then(data => {
      setDbPosts(data);
      setLoadingPosts(false);
    });
  }, [refreshKey]);

  useEffect(() => {
    fetchHiddenPostIds(getMyNickname()).then(setHiddenIds);
  }, []);

  const handleHide = async (id: string) => {
    if (isMockPostId(id)) {
      setHiddenIds(prev => new Set(prev).add(id));
      return;
    }
    const ok = await hidePost(id, getMyNickname());
    if (ok) setHiddenIds(prev => new Set(prev).add(id));
  };

  const handleReportSubmit = async (reason: ReportReason, detail: string) => {
    if (!reportTarget) return;
    if (!isMockPostId(reportTarget)) {
      await reportPost({
        postId: reportTarget,
        reporterNickname: getMyNickname(),
        reason,
        detail,
      });
    }
  };

  const allPosts: Post[] = [
    ...dbPosts,
    ...posts.filter(p => !dbPosts.some(d => d.id === p.id)),
  ].filter(p => !hiddenIds.has(p.id));

  // Top 3 hot posts across all categories (by composite score)
  const hotPosts = [...allPosts]
    .sort((a, b) => hotScore(b) - hotScore(a))
    .slice(0, 3);

  const hotIds = new Set(hotPosts.map(p => p.id));

  // Category filter then sort — exclude hot posts from main list when on 전체
  const categoryFiltered = active === "전체"
    ? allPosts.filter(p => !hotIds.has(p.id))
    : allPosts.filter(p => p.category === active);

  const sorted = [...categoryFiltered].sort((a, b) => {
    if (sort === "likes")    return b.likeCount    - a.likeCount;
    if (sort === "comments") return b.commentCount - a.commentCount;
    if (sort === "views")    return b.viewCount    - a.viewCount;
    return 0; // latest: DB posts already ordered by created_at desc
  });

  return (
    <div className="pb-4">
      {/* Category filter */}
      <div className="bg-white sticky top-[108px] z-20 border-b border-gray-100">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[14px] font-medium transition-colors ${active === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 인기 TOP3 — 전체 탭에서만 노출 */}
      {active === "전체" && !loadingPosts && hotPosts.length === 3 && (
        <div className="mx-4 mt-3 rounded-2xl bg-blue-50 p-3">
          <div className="flex items-center gap-1.5 px-1 pt-0.5 pb-2.5">
            <Flame size={15} className="text-red-500" />
            <span className="text-[13px] font-bold text-gray-900 tracking-tight">인기글 TOP 3</span>
            <span className="text-[10px] font-semibold text-red-500 bg-white px-1.5 py-0.5 rounded-full">실시간</span>
          </div>

          <div className="space-y-2">
            {hotPosts.map((post, idx) => {
              const rankBg = idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-gray-400" : "bg-orange-400";
              return (
                <button
                  key={post.id}
                  onClick={() => router.push(`/community/detail/?id=${post.id}`)}
                  className="w-full text-left bg-white rounded-xl shadow-sm p-3.5 active:bg-gray-50 flex items-center gap-3"
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold text-white ${rankBg}`}>
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${catColor[post.category]}`}>
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{post.author}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2">{post.title}</p>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                        <ThumbsUp size={11} />{post.likeCount}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">
                        <MessageSquare size={11} />{post.commentCount}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-gray-400" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 정렬 필터 */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="text-[13px] font-medium text-gray-400 shrink-0">
          {active === "전체" ? `전체 ${sorted.length}개` : `${active} ${sorted.length}개`}
        </span>
        <div className="ml-auto flex gap-1.5">
          {SORT_OPTS.map(opt => (
            <button key={opt.key} onClick={() => setSort(opt.key)}
              className={`h-7 px-2.5 rounded-full text-[12px] font-semibold transition-colors ${
                sort === opt.key
                  ? "bg-[#1d1d1f] text-white"
                  : "bg-gray-100 text-gray-700"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts — Threads-style flat thread feed */}
      <div className="bg-white mt-2 divide-y divide-gray-100">
        {loadingPosts ? (
          [1,2,3].map(i => (
            <div key={i} className="px-4 py-4 flex gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-full bg-gray-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-gray-100 rounded" />
                <div className="h-4 w-3/4 bg-gray-100 rounded" />
                <div className="h-3 w-1/2 bg-gray-100 rounded" />
              </div>
            </div>
          ))
        ) : sorted.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <span className="text-3xl">📭</span>
            <p className="text-[14px] text-gray-500">아직 글이 없어요</p>
          </div>
        ) : (
          sorted.map(post => (
            <PostCard
              key={post.id}
              post={post}
              router={router}
              onHide={handleHide}
              onReport={(id) => setReportTarget(id)}
            />
          ))
        )}
      </div>

      <ReportModal
        open={!!reportTarget}
        target="post"
        onClose={() => setReportTarget(null)}
        onSubmit={handleReportSubmit}
      />
    </div>
  );
}

// ─── News ─────────────────────────────────────────────────────
// 매체별 accent — 카드 보더, 배지, hero gradient, 이니셜 원에 공통 적용.
// 클래스명은 Tailwind JIT 가 스캔할 수 있도록 모두 리터럴로 작성한다.
type NewsAccent = {
  bg: string;        // solid badge / initial
  soft: string;      // pastel badge background
  text: string;      // accented text
  border: string;    // 좌측 4px 보더 (border-{color}-500)
  gradient: string;  // hero card gradient (from-..-500 to-..-700)
};

const SOURCE_ACCENT_MAP: Array<{ match: RegExp; accent: NewsAccent }> = [
  { match: /헤럴드/,        accent: { bg: "bg-rose-500",     soft: "bg-rose-50",     text: "text-rose-700",     border: "border-rose-500",     gradient: "from-rose-500 to-rose-700" } },
  { match: /인천일보/,      accent: { bg: "bg-cyan-600",     soft: "bg-cyan-50",     text: "text-cyan-700",     border: "border-cyan-500",     gradient: "from-cyan-500 to-cyan-700" } },
  { match: /연합/,          accent: { bg: "bg-emerald-600",  soft: "bg-emerald-50",  text: "text-emerald-700",  border: "border-emerald-500",  gradient: "from-emerald-500 to-emerald-700" } },
  { match: /KBS/,           accent: { bg: "bg-blue-600",     soft: "bg-blue-50",     text: "text-blue-700",     border: "border-blue-500",     gradient: "from-blue-500 to-blue-700" } },
  { match: /MBC/,           accent: { bg: "bg-amber-500",    soft: "bg-amber-50",    text: "text-amber-700",    border: "border-amber-500",    gradient: "from-amber-500 to-amber-700" } },
  { match: /SBS/,           accent: { bg: "bg-orange-500",   soft: "bg-orange-50",   text: "text-orange-700",   border: "border-orange-500",   gradient: "from-orange-500 to-orange-700" } },
  { match: /JTBC/,          accent: { bg: "bg-violet-600",   soft: "bg-violet-50",   text: "text-violet-700",   border: "border-violet-500",   gradient: "from-violet-500 to-violet-700" } },
  { match: /YTN/,           accent: { bg: "bg-sky-600",      soft: "bg-sky-50",      text: "text-sky-700",      border: "border-sky-500",      gradient: "from-sky-500 to-sky-700" } },
  { match: /매일경제|매경/, accent: { bg: "bg-red-600",      soft: "bg-red-50",      text: "text-red-700",      border: "border-red-500",      gradient: "from-red-500 to-red-700" } },
  { match: /한국경제|한경/, accent: { bg: "bg-indigo-600",   soft: "bg-indigo-50",   text: "text-indigo-700",   border: "border-indigo-500",   gradient: "from-indigo-500 to-indigo-700" } },
  { match: /조선/,          accent: { bg: "bg-slate-700",    soft: "bg-slate-100",   text: "text-slate-700",    border: "border-slate-500",    gradient: "from-slate-600 to-slate-800" } },
  { match: /중앙/,          accent: { bg: "bg-stone-700",    soft: "bg-stone-100",   text: "text-stone-700",    border: "border-stone-500",    gradient: "from-stone-600 to-stone-800" } },
  { match: /동아/,          accent: { bg: "bg-zinc-700",     soft: "bg-zinc-100",    text: "text-zinc-700",     border: "border-zinc-500",     gradient: "from-zinc-600 to-zinc-800" } },
  { match: /경기일보|경기/, accent: { bg: "bg-teal-600",     soft: "bg-teal-50",     text: "text-teal-700",     border: "border-teal-500",     gradient: "from-teal-500 to-teal-700" } },
  { match: /부동산/,        accent: { bg: "bg-fuchsia-600",  soft: "bg-fuchsia-50",  text: "text-fuchsia-700",  border: "border-fuchsia-500",  gradient: "from-fuchsia-500 to-fuchsia-700" } },
];

// 미지정 매체용 안정 fallback — 매체명 해시로 같은 매체는 항상 같은 색을 받는다.
const FALLBACK_ACCENTS: NewsAccent[] = [
  { bg: "bg-blue-600",    soft: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-400",    gradient: "from-blue-500 to-blue-700" },
  { bg: "bg-emerald-600", soft: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-400", gradient: "from-emerald-500 to-emerald-700" },
  { bg: "bg-violet-600",  soft: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-400",  gradient: "from-violet-500 to-violet-700" },
  { bg: "bg-amber-600",   soft: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-400",   gradient: "from-amber-500 to-amber-700" },
  { bg: "bg-rose-600",    soft: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-400",    gradient: "from-rose-500 to-rose-700" },
  { bg: "bg-cyan-600",    soft: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-400",    gradient: "from-cyan-500 to-cyan-700" },
  { bg: "bg-fuchsia-600", soft: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-400", gradient: "from-fuchsia-500 to-fuchsia-700" },
  { bg: "bg-teal-600",    soft: "bg-teal-50",    text: "text-teal-700",    border: "border-teal-400",    gradient: "from-teal-500 to-teal-700" },
];

function getSourceAccent(source: string): NewsAccent {
  for (const { match, accent } of SOURCE_ACCENT_MAP) {
    if (match.test(source)) return accent;
  }
  let h = 0;
  for (let i = 0; i < source.length; i++) h = (h * 31 + source.charCodeAt(i)) >>> 0;
  return FALLBACK_ACCENTS[h % FALLBACK_ACCENTS.length];
}

function sourceInitial(s: string): string {
  const t = (s ?? "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

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

  // 일주일 내 기사 중 클릭 수(localStorage) 기준 TOP 3
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const views = !loading ? getNewsViews() : {};
  const hotNews = !loading
    ? [...newsSource]
        .filter(a => new Date(a.publishedAt).getTime() > oneWeekAgo)
        .sort((a, b) => {
          const vDiff = (views[b.id] ?? 0) - (views[a.id] ?? 0);
          return vDiff !== 0 ? vDiff : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        })
        .slice(0, 3)
    : [];

  return (
    <div className="pb-6">

      {/* ── 유튜브 ── */}
      <div className="pt-4">
        <div className="flex items-center gap-2 px-4 mb-3">
          <div className="w-6 h-6 bg-[#FF0000] rounded-lg flex items-center justify-center shrink-0">
            <Play size={11} fill="white" className="text-white ml-0.5" />
          </div>
          <span className="text-[15px] font-bold text-gray-900">유튜브</span>
          <span className="text-[12px] text-gray-500">검단 관련 영상</span>
          {!ytLoading && ytMs > 0 && (
            <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {ytSource} {ytMs < 1000 ? `${ytMs}ms` : `${(ytMs/1000).toFixed(1)}s`}
            </span>
          )}
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {ytLoading ? (
            [0,1,2].map(i => (
              <div key={i} className="shrink-0 w-[220px] rounded-2xl overflow-hidden animate-pulse">
                <div className="w-full bg-gray-200" style={{ aspectRatio: "16/9" }} />
                <div className="bg-white px-3 py-2.5 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
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
                  <p className="text-[13px] font-semibold text-gray-900 leading-snug line-clamp-2">{video.title}</p>
                  <p className="text-[11px] text-gray-500 mt-1.5">{video.channelName}</p>
                </div>
              </a>
            ))
          ) : null}
          <div className="shrink-0 w-2" />
        </div>
      </div>

      {/* ── 핫뉴스 TOP 3 ── */}
      {!loading && hotNews.length > 0 && (
        <div className="px-4 pt-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Flame size={15} className="text-red-500" />
            <span className="text-[15px] font-extrabold text-gray-900">이번 주 핫뉴스</span>
            <span className="text-[12px] text-gray-400">많이 본 기사</span>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7] shadow-sm">
            {hotNews.map((item, idx) => {
              const rankColors = ["#F04452", "#F97316", "#F59E0B"];
              return (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackNewsView(item.id)}
                  className="flex items-center gap-3 px-4 py-3.5 active:bg-[#f9f9f9] transition-colors">
                  <span className="text-[18px] font-black w-6 text-center shrink-0"
                    style={{ color: rankColors[idx] }}>
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 line-clamp-2 leading-snug">{item.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[11px] font-medium text-blue-600">{item.source}</span>
                      <span className="text-[11px] text-gray-400">·</span>
                      <span className="text-[11px] text-gray-400">{formatRelativeTime(item.publishedAt)}</span>
                    </div>
                  </div>
                  {item.thumbnail && (
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-[#e5e5ea]">
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 뉴스 ── */}
      <div className="pt-5 pb-5 bg-gray-50">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold text-gray-900">뉴스</span>
            {realNews.length > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[12px] text-gray-500">{realNews.length}건</span>
              </div>
            )}
          </div>
          <button onClick={refresh} className="flex items-center gap-1 active:opacity-60">
            <RefreshCw size={13} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
            {lastUpdated && <span className="text-[11px] text-gray-400 ml-0.5">{lastUpdated}</span>}
          </button>
        </div>

        {loading ? (
          /* 스켈레톤 */
          <div className="px-4 space-y-3">
            <div className="rounded-xl overflow-hidden bg-white shadow-sm animate-pulse">
              <div className="w-full bg-gray-200" style={{ aspectRatio: "16/9" }} />
              <div className="p-3 space-y-2">
                <div className="h-3 w-1/3 bg-gray-100 rounded" />
                <div className="h-4 w-full bg-gray-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map(i => (
                <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm animate-pulse">
                  <div className="w-full bg-gray-200" style={{ aspectRatio: "4/3" }} />
                  <div className="p-3 space-y-1.5">
                    <div className="h-3 w-1/2 bg-gray-100 rounded" />
                    <div className="h-3 w-full bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : newsSource.length === 0 ? null : (
          <>
            {/* 1. 헤드라인 카드 (뉴스[0]) — 16:9 이미지 + 그라디언트 오버레이 */}
            {(() => {
              const first = newsSource[0];
              return (
                <a key={first.id} href={first.url} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackNewsView(first.id)}
                  className="block mx-4 mb-3 rounded-xl overflow-hidden shadow-md active:opacity-90 relative bg-gradient-to-br from-gray-700 to-gray-900">
                  <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                    {/* fallback: 출처명 큼직하게 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[32px] font-black text-white/15 tracking-tight">{first.source}</span>
                    </div>
                    {first.thumbnail && (
                      <img src={first.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    )}
                    {/* 그라디언트 오버레이 */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {/* 텍스트 */}
                    <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">NEW</span>
                        <span className="text-[12px] text-white/90 font-medium">{first.source}</span>
                        <span className="text-white/40 text-[10px]">·</span>
                        <span className="text-[12px] text-white/80">{formatRelativeTime(first.publishedAt)}</span>
                      </div>
                      <p className="text-[18px] font-bold text-white leading-snug line-clamp-2">{first.title}</p>
                    </div>
                  </div>
                </a>
              );
            })()}

            {/* 2. 2열 카드 그리드 (뉴스[1]~[4]) */}
            {newsSource.length > 1 && (
              <div className="grid grid-cols-2 gap-3 px-4 mb-4">
                {newsSource.slice(1, 5).map(item => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackNewsView(item.id)}
                    className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:opacity-80 flex flex-col">
                    <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center" style={{ aspectRatio: "4/3" }}>
                      <span className="text-gray-400 text-[12px] font-bold px-2 text-center line-clamp-1">{item.source}</span>
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[11px] text-gray-500 truncate">{item.source}</span>
                        <span className="text-gray-300 text-[9px] shrink-0">·</span>
                        <span className="text-[11px] text-gray-400 shrink-0">{formatRelativeTime(item.publishedAt)}</span>
                      </div>
                      <p className="text-[13.5px] font-semibold text-gray-900 leading-snug line-clamp-2">{item.title}</p>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* 3. 구분선 + "더 많은 뉴스" 라벨 */}
            {newsSource.length > 5 && (
              <div className="flex items-center gap-3 px-4 mb-2 mt-1">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-[11px] font-bold text-gray-400 tracking-[0.1em]">더 많은 뉴스</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
            )}

            {/* 4. 일반 리스트 (뉴스[5]~끝) */}
            {newsSource.length > 5 && (
              <div className="bg-white mx-4 rounded-xl overflow-hidden border border-gray-100">
                {newsSource.slice(5, newsLimit).map((item, idx, arr) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => trackNewsView(item.id)}
                    className={`flex items-center gap-3 px-4 py-3.5 active:bg-gray-50 ${idx < arr.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[12px] text-gray-500 truncate max-w-[80px]">{item.source}</span>
                        <span className="text-gray-300 text-[10px] shrink-0">·</span>
                        <span className="text-[12px] text-gray-500 shrink-0">{formatRelativeTime(item.publishedAt)}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-2">{item.title}</p>
                    </div>
                    {item.thumbnail && (
                      <div className="shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-100">
                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                      </div>
                    )}
                  </a>
                ))}

                {/* 더보기 버튼 */}
                {newsSource.length > newsLimit && newsLimit < 30 && (
                  <button
                    onClick={() => setNewsLimit(prev => Math.min(prev + 10, 30))}
                    className="w-full py-3.5 text-[13px] font-medium text-gray-500 border-t border-gray-100 active:bg-gray-50 flex items-center justify-center gap-1">
                    <ChevronDown size={14} className="text-gray-400" />
                    더보기 ({Math.min(newsSource.length - newsLimit, 10)}건)
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 인스타그램 ── */}
      <div className="pt-5">
        <div className="flex items-center justify-between px-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              <span className="text-white text-[11px] font-bold">IG</span>
            </div>
            <span className="text-[15px] font-bold text-gray-900">인스타그램</span>
            <span className="text-[12px] text-gray-500">검단 피드</span>
          </div>
          <a href="https://www.instagram.com/explore/tags/검단신도시/"
            target="_blank" rel="noopener noreferrer"
            className="text-[12px] text-blue-600 font-medium active:opacity-70">
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
                <p className="text-[11px] font-bold text-pink-600">{item.source}</p>
                <p className="text-[12px] text-gray-900 leading-snug line-clamp-2 mt-0.5">{item.title}</p>
                <p className="text-[11px] text-gray-400 mt-1">{formatRelativeTime(item.publishedAt)}</p>
              </div>
            </a>
          ))}
          {/* 인스타 API 연동 안내 */}
          <a href="https://www.instagram.com/explore/tags/검단신도시/"
            target="_blank" rel="noopener noreferrer"
            className="shrink-0 w-[120px] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 py-6 active:opacity-70">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}>
              <span className="text-white text-[14px]">📷</span>
            </div>
            <p className="text-[11px] text-gray-500 text-center px-2">인스타<br/>더보기</p>
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
  if (diff === 0) return <span className="text-[12px] text-gray-500">보합</span>;
  const pct = ((Math.abs(diff) / prev) * 100).toFixed(1);
  return diff > 0
    ? <span className="flex items-center gap-0.5 text-[12px] font-semibold text-red-500"><TrendingUp size={10} />+{pct}%</span>
    : <span className="flex items-center gap-0.5 text-[12px] font-semibold text-blue-600"><TrendingDown size={10} />-{pct}%</span>;
}

// ── SVG 라인 차트 ──────────────────────────────────────────────
function LineChart({
  data, color = "#2563eb", height = 72, showLabels = false, showDots = true,
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
        <text key={i} x={p.x} y={height - 4} textAnchor="middle" fontSize="8" fill="#6b7280">
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
        <div className="bg-white border border-gray-200 rounded-t-2xl border-b-0 overflow-hidden">
          {/* 헤더 행 — 항상 노출 */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]">🏠</span>
              <span className="text-[13px] font-bold text-gray-900">내 집 시세</span>
            </div>
            <button onClick={() => setShowPicker(true)}
              className="text-[12px] text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full active:opacity-70">
              {myApt ? "변경" : "+ 등록"}
            </button>
          </div>

          {myApt ? (
            /* 탭 가능한 요약 + 펼침 */
            <button className="w-full px-4 pb-3 text-left active:bg-gray-50"
              onClick={() => setMyChartOpen(v => !v)}>
              {/* 요약 지표 */}
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[15px] font-bold text-gray-900 truncate">{myApt.name}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{myApt.dong} · {mySz?.pyeong}평</p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-[18px] font-black text-gray-900">{formatPrice(myCurr)}</p>
                    <div className="flex items-center justify-end gap-0.5 mt-0.5">
                      {myDiff === 0 ? <span className="text-[12px] text-gray-500">보합</span>
                        : myDiff > 0
                          ? <><TrendingUp size={11} className="text-red-500" /><span className="text-[12px] font-semibold text-red-500">+{myPct}%</span></>
                          : <><TrendingDown size={11} className="text-blue-600" /><span className="text-[12px] font-semibold text-blue-600">-{myPct}%</span></>}
                    </div>
                  </div>
                  {myChartOpen ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
                </div>
              </div>

              {/* 접힌 상태: 미니 지표 요약 */}
              {!myChartOpen && (
                <div className="flex gap-2 mt-2.5">
                  {myH.slice(-3).map((p, i) => (
                    <div key={i} className="flex-1 bg-gray-100 rounded-xl px-2.5 py-1.5 text-center">
                      <p className="text-[10px] text-gray-500">{p.date.slice(2).replace("-",".")}</p>
                      <p className="text-[12px] font-bold text-gray-900">{(p.price/10000).toFixed(1)}억</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 펼쳐진 상태: 라인 차트 */}
              {myChartOpen && (
                <div className="mt-2">
                  <LineChart data={myH} color="#2563eb" height={80} showLabels showDots />
                </div>
              )}
            </button>
          ) : (
            <button onClick={() => setShowPicker(true)} className="w-full px-4 pb-3">
              <div className="border-2 border-dashed border-gray-200 rounded-xl py-3 flex items-center justify-center active:bg-gray-50">
                <span className="text-[13px] text-gray-500">내 아파트를 등록하면 시세를 바로 확인해요</span>
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
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(["매매", "전월세"] as const).map(t => (
            <button key={t} onClick={() => setSiseSubTab(t)}
              className={`flex-1 h-9 rounded-lg text-[14px] font-semibold transition-all ${siseSubTab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── 검색 + 필터 바 ── */}
      <div className="px-4 mb-3 space-y-2">
        {/* 검색 */}
        <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 h-10 border border-gray-200">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="단지명, 동으로 검색"
            className="flex-1 text-[14px] bg-transparent focus:outline-none text-gray-900 placeholder:text-gray-400" />
          {search && <button onClick={() => setSearch("")}><X size={14} className="text-gray-400" /></button>}
        </div>

        {/* 평수 필터 + 정렬 */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button onClick={() => setPyeongFilter(null)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${!pyeongFilter ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-700 border-gray-200"}`}>
              전체
            </button>
            {allPyeong.map(p => (
              <button key={p} onClick={() => setPyeongFilter(pyeongFilter === p ? null : p)}
                className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border transition-colors ${pyeongFilter === p ? "bg-blue-600 text-white border-transparent" : "bg-white text-gray-700 border-gray-200"}`}>
                {p}평
              </button>
            ))}
          </div>
          {/* 정렬 버튼 */}
          <button onClick={() => setShowSort(true)}
            className="shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold border bg-white text-gray-700 border-gray-200 flex items-center gap-1 active:bg-gray-50">
            <SlidersHorizontal size={12} className="text-gray-500" />
            {SORT_LABELS[sortBy].split("순")[0]}
          </button>
        </div>
      </div>

      {/* ── 결과 수 ── */}
      <p className="px-4 text-[12px] text-gray-500 mb-2">
        {filtered.length}개 단지{search ? ` · "${search}" 검색 결과` : ""}
      </p>

      {/* ── 아파트 리스트 ── */}
      <div className="px-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 flex flex-col items-center gap-2">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-[14px] text-gray-500">검색 결과가 없어요</p>
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
              className={`bg-white rounded-2xl overflow-hidden shadow-sm transition-all ${isOpen ? "ring-2 ring-blue-600" : ""}`}>
              <button className="w-full px-4 py-4 text-left" onClick={() => setSelected(isOpen ? null : apt.id)}>
                {/* 헤더 */}
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[15px] font-bold text-gray-900 leading-snug">{apt.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <MapPin size={11} className="text-gray-500 shrink-0" />
                      <span className="text-[12px] text-gray-500">{apt.dong}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[12px] text-gray-500">{apt.built}년</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-[12px] text-gray-500">{apt.households.toLocaleString()}세대</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {siseSubTab === "매매" ? (
                      <>
                        <p className="text-[17px] font-black text-emerald-600">{formatPrice(sz.avgPrice)}</p>
                        <p className="text-[11px] text-gray-500">{sz.pyeong}평 매매</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[17px] font-black text-blue-600">{formatPrice(jeonse)}</p>
                        <p className="text-[11px] text-gray-500">{sz.pyeong}평 전세</p>
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
                        className={`rounded-xl px-3 py-2 text-center transition-colors ${isActive ? "bg-blue-600" : "bg-gray-100"}`}>
                        <p className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-gray-700"}`}>{s.pyeong}평</p>
                        <p className={`text-[11px] font-bold ${isActive ? "text-blue-100" : siseSubTab === "매매" ? "text-emerald-600" : "text-blue-600"}`}>
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
                        <p className="text-[10px] text-blue-600 font-medium">전세 (추정)</p>
                        <p className="text-[13px] font-black text-blue-600">{formatPrice(jeonse)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-blue-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-blue-600 font-medium">전세 시세</p>
                        <p className="text-[13px] font-black text-blue-600">{formatPrice(jeonse)}</p>
                      </div>
                      <div className="bg-purple-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-purple-500 font-medium">월세 (추정)</p>
                        <p className="text-[12px] font-black text-purple-700">{wolse.deposit.toLocaleString()} / {wolse.monthly}만</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-gray-500">전월 대비</span>
                    <PriceTag curr={curr} prev={prev} />
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-gray-500">
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    <span>추이 그래프</span>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <p className="text-[11px] font-bold text-gray-500 mb-2">
                    {sz.pyeong}평 {siseSubTab === "매매" ? "매매" : "전세"} 시세 추이
                  </p>
                  <div className="bg-white rounded-xl p-2 mb-3">
                    <LineChart
                      data={siseSubTab === "매매" ? h : jeonseHistory}
                      color={siseSubTab === "매매" ? "#059669" : "#2563eb"}
                      height={88} showLabels showDots
                    />
                  </div>
                  <p className="text-[11px] font-bold text-gray-500 mb-1.5">
                    월별 {siseSubTab === "매매" ? "거래" : "전세 시세"}
                  </p>
                  <div className="space-y-1">
                    {(siseSubTab === "매매" ? h : jeonseHistory).slice(-6).reverse().map((p, i, arr) => {
                      const prevP = arr[i + 1]?.price;
                      const chg = prevP ? p.price - prevP : 0;
                      return (
                        <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-[12px] text-gray-500">{p.date.replace("-", "년 ")}월</span>
                          <div className="flex items-center gap-2">
                            {chg !== 0 && (
                              <span className={`text-[10px] font-semibold ${chg > 0 ? "text-red-500" : "text-blue-600"}`}>
                                {chg > 0 ? "▲" : "▼"}{Math.abs(chg).toLocaleString()}
                              </span>
                            )}
                            <span className="text-[13px] font-bold text-gray-900">{formatPrice(p.price)}</span>
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
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <p className="text-[16px] font-bold text-gray-900 px-5 pt-2 pb-3">정렬 기준</p>
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
              <button key={key} onClick={() => { setSortBy(key); setShowSort(false); }}
                className={`w-full px-5 py-4 flex items-center justify-between border-t border-gray-100 active:bg-gray-50 ${sortBy === key ? "bg-blue-50" : ""}`}>
                <span className={`text-[15px] font-semibold ${sortBy === key ? "text-blue-600" : "text-gray-900"}`}>{label}</span>
                {sortBy === key && <span className="text-blue-600 text-[13px] font-bold">✓</span>}
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
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-4 pt-2 pb-3 border-b border-gray-100">
              <h3 className="text-[17px] font-bold text-gray-900">내 집 선택</h3>
              {myApt && <button onClick={clearApt} className="text-[13px] text-red-500 font-medium active:opacity-70">등록 해제</button>}
            </div>
            <div className="overflow-y-auto flex-1 overscroll-contain rounded-b-3xl">
              {apartments.map(apt => {
                const isSelected = myAptId === apt.id;
                const isExpanded = pickerAptId === apt.id;
                const displaySzIdx = isSelected ? mySzIdx : est30sIdx(apt.sizes);
                const displaySz = apt.sizes[displaySzIdx] ?? apt.sizes[0];
                const curr = displaySz.priceHistory[displaySz.priceHistory.length - 1]?.price ?? 0;
                return (
                  <div key={apt.id} className="border-b border-gray-100">
                    <button
                      onClick={() => {
                        if (apt.sizes.length === 1) { pickApt(apt.id, 0); return; }
                        setPickerAptId(isExpanded ? null : apt.id);
                      }}
                      className={`w-full px-4 py-3.5 flex items-center justify-between text-left transition-colors ${isSelected ? "bg-blue-50" : isExpanded ? "bg-gray-50" : "active:bg-gray-50"}`}>
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-semibold text-gray-900 truncate">{apt.name}</p>
                          {isSelected && <span className="shrink-0 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{mySz?.pyeong}평</span>}
                        </div>
                        <p className="text-[12px] text-gray-500 mt-0.5">{apt.dong} · {apt.built}년 · {apt.households.toLocaleString()}세대</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <p className="text-[15px] font-black text-emerald-600">{formatPrice(curr)}</p>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-3.5 pt-1 bg-gray-50 flex gap-2 flex-wrap">
                        {apt.sizes.map((sz, i) => {
                          const szCurr = sz.priceHistory[sz.priceHistory.length - 1]?.price ?? 0;
                          const isActiveSz = isSelected && mySzIdx === i;
                          return (
                            <button key={i} onClick={() => pickApt(apt.id, i)}
                              className={`flex flex-col items-center px-3.5 py-2 rounded-2xl border-2 transition-colors active:opacity-75 ${isActiveSz ? "border-blue-600 bg-blue-50" : "border-gray-200 bg-white"}`}>
                              <span className={`text-[13px] font-bold ${isActiveSz ? "text-blue-600" : "text-gray-900"}`}>{sz.pyeong}평</span>
                              <span className={`text-[11px] font-medium mt-0.5 ${isActiveSz ? "text-blue-600" : "text-gray-500"}`}>{sz.sqm}㎡</span>
                              <span className={`text-[12px] font-black mt-0.5 ${isActiveSz ? "text-blue-600" : "text-emerald-600"}`}>{formatPrice(szCurr)}</span>
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
    <div className="min-h-dvh bg-gray-50 pb-28">
      <Header title="소식" />

      {/* Main tabs — pill style */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-gray-100 px-4 py-2">
        <div className="flex gap-2">
          {mainTabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 h-9 flex items-center justify-center text-[14px] font-semibold rounded-xl transition-colors active:opacity-70 ${tab === t ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-500"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "커뮤니티" && <CommunityTab />}
      {tab === "뉴스" && <NewsTab />}
      {tab === "시세" && <SiseTab />}

      {/* FAB - only on 커뮤니티 tab */}
      {tab === "커뮤니티" && (
        <button onClick={() => router.push("/community/write/")}
          className="fixed bottom-[120px] right-5 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center active:bg-blue-700 z-40">
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
