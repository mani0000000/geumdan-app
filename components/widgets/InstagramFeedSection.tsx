"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Play, Loader2, X, ExternalLink } from "lucide-react";
import { fetchInstagramFeeds, type InstagramPost } from "@/lib/api/instagram";

const PAGE_SIZE = 12;

type FilterKind = "all" | "reel" | `tag:${string}`;

const FILTERS: { id: FilterKind; label: string }[] = [
  { id: "all",           label: "전체" },
  { id: "tag:검단신도시",  label: "#검단신도시" },
  { id: "tag:인천",       label: "#인천" },
  { id: "tag:검단",       label: "#검단" },
  { id: "reel",          label: "릴스만" },
];

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch { return ""; }
}

function caption50(text?: string) {
  if (!text) return "";
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > 50 ? s.slice(0, 50) + "…" : s;
}

/** permalink 에서 Instagram shortcode 추출 */
function getShortcode(url: string): string | null {
  const m = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  return m?.[2] ?? null;
}

function paramsFor(id: FilterKind, page: number) {
  const base = { limit: PAGE_SIZE, page, sort: "latest" as const };
  if (id === "reel")          return { ...base, reel: true };
  if (id.startsWith("tag:"))  return { ...base, tag: id.slice(4) };
  return base;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InstagramFeedSection() {
  const [activeId, setActiveId] = useState<FilterKind>("all");
  const [posts,    setPosts]    = useState<InstagramPost[]>([]);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore,  setHasMore]  = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPosts([]);
    setPage(1);
    setHasMore(true);
    fetchInstagramFeeds(paramsFor(activeId, 1)).then(list => {
      if (cancelled) return;
      setPosts(list);
      setLoading(false);
      setHasMore(list.length >= PAGE_SIZE);
    });
    return () => { cancelled = true; };
  }, [activeId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const more = await fetchInstagramFeeds(paramsFor(activeId, next));
    setPosts(prev => {
      const seen = new Set(prev.map(p => p.id));
      return [...prev, ...more.filter(p => !seen.has(p.id))];
    });
    setPage(next);
    setHasMore(more.length >= PAGE_SIZE);
    setLoadingMore(false);
  };

  // 필터별 분리
  const reels   = posts.filter(p => p.isReel);
  const regular = posts.filter(p => !p.isReel);
  const showReelSection  = activeId !== "reel" && reels.length > 0;
  const showFeedSection  = activeId !== "reel" && regular.length > 0;
  const reelOnlyMode     = activeId === "reel";

  return (
    <div className="pt-5 pb-2">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 mb-3">
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
        >
          <span className="text-white text-[11px] font-bold">IG</span>
        </div>
        <span className="text-[15px] font-bold text-gray-900">인스타그램</span>
        <span className="text-[12px] text-gray-500">검단 피드</span>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map(f => {
          const active = f.id === activeId;
          return (
            <button key={f.id} onClick={() => setActiveId(f.id)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors active:opacity-70 ${
                active ? "bg-gray-900 text-white" : "bg-white text-gray-600 border border-gray-200"
              }`}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-4">
          {/* Reel skeletons */}
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 w-36 h-64 rounded-2xl bg-gray-200 animate-pulse" />
            ))}
          </div>
          {/* Feed skeletons */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-2">
          <span className="text-3xl">📷</span>
          <p className="text-[13px] text-gray-500">아직 게시물이 없어요</p>
        </div>
      )}

      {/* ── 릴스 전용 모드 ── */}
      {!loading && reelOnlyMode && reels.length > 0 && (
        <div className="px-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {reels.map(p => <ReelCard key={p.id} post={p} wide />)}
          </div>
        </div>
      )}

      {/* ── 전체 / 해시태그 모드 ── */}
      {!loading && !reelOnlyMode && (
        <div>
          {/* 릴스 섹션 */}
          {showReelSection && (
            <div className="mb-5">
              <div className="flex items-center gap-2 px-4 mb-2">
                <span className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                  <Play size={13} className="fill-[#E1306C] text-[#E1306C]" />
                  릴스
                </span>
                <span className="text-[11px] text-gray-400">{reels.length}개</span>
              </div>
              <div
                className="flex gap-3 px-4 overflow-x-auto pb-3"
                style={{ scrollbarWidth: "none" }}
              >
                {reels.map(p => <ReelCard key={p.id} post={p} />)}
              </div>
            </div>
          )}

          {/* 일반 게시물 섹션 */}
          {showFeedSection && (
            <div className="px-4">
              {showReelSection && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px] font-bold text-gray-900">게시물</span>
                  <span className="text-[11px] text-gray-400">{regular.length}개</span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {regular.map(p => <FeedCard key={p.id} post={p} />)}
              </div>
            </div>
          )}

          {/* 릴스만 있을 때 */}
          {!showFeedSection && showReelSection && null}

          {/* 더 불러오기 */}
          {hasMore && posts.length > 0 && (
            <div className="mt-4 flex justify-center px-4">
              <button onClick={loadMore} disabled={loadingMore}
                className="h-10 px-5 rounded-full bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 active:opacity-70 disabled:opacity-60 flex items-center gap-2">
                {loadingMore && <Loader2 size={14} className="animate-spin" />}
                {loadingMore ? "불러오는 중…" : "더 불러오기"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 릴스 더 불러오기 (릴스 전용) */}
      {!loading && reelOnlyMode && hasMore && (
        <div className="mt-4 flex justify-center px-4">
          <button onClick={loadMore} disabled={loadingMore}
            className="h-10 px-5 rounded-full bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 active:opacity-70 disabled:opacity-60 flex items-center gap-2">
            {loadingMore && <Loader2 size={14} className="animate-spin" />}
            {loadingMore ? "불러오는 중…" : "더 불러오기"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── 릴스 카드 ──────────────────────────────────────────────────────────────

function ReelCard({ post, wide }: { post: InstagramPost; wide?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const shortcode = getShortcode(post.permalink);
  const w = wide ? "w-full" : "w-36 shrink-0";
  const h = wide ? "aspect-[9/16]" : "h-64";

  if (playing && shortcode) {
    return (
      <div className={`${w} ${h} rounded-2xl overflow-hidden relative bg-black`}>
        <iframe
          src={`https://www.instagram.com/reel/${shortcode}/embed/`}
          className="w-full h-full border-0"
          allowFullScreen
          scrolling="no"
          loading="lazy"
        />
        <button
          onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center z-10"
        >
          <X size={14} className="text-white" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className={`${w} ${h} rounded-2xl overflow-hidden relative flex flex-col shrink-0`}
      style={{ background: "linear-gradient(160deg,#833AB4,#FD1D1D,#F77737)" }}
    >
      {post.thumbnailUrl && (
        <img
          src={post.thumbnailUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

      {/* 재생 버튼 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
          <Play size={20} className="text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* REEL 배지 */}
      <span className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
        <Play size={9} fill="white" />
        REEL
      </span>

      {/* 외부 링크 */}
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
      >
        <ExternalLink size={11} className="text-white" />
      </a>

      {/* 하단 정보 */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {post.username && (
          <p className="text-white text-[11px] font-semibold truncate">@{post.username}</p>
        )}
        {post.caption && (
          <p className="text-white/80 text-[10px] mt-0.5 line-clamp-2 leading-snug">
            {post.caption.replace(/#\S+/g, "").trim().slice(0, 40)}
          </p>
        )}
        {(post.likeCount > 0 || post.commentCount > 0) && (
          <div className="flex items-center gap-2 mt-1.5">
            {post.likeCount > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-white/70">
                <Heart size={9} className="text-pink-300" />
                {formatCount(post.likeCount)}
              </span>
            )}
            {post.viewCount && post.viewCount > 0 && (
              <span className="text-[10px] text-white/70">
                👁 {formatCount(post.viewCount)}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ── 일반 피드 카드 ──────────────────────────────────────────────────────────

function FeedCard({ post }: { post: InstagramPost }) {
  return (
    <a
      href={post.permalink || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 active:opacity-80 flex flex-col"
    >
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[28px]">📷</div>
        )}
      </div>
      <div className="p-2.5 flex-1 flex flex-col gap-1">
        {post.caption && (
          <p className="text-[12px] text-gray-900 leading-snug line-clamp-2">
            {caption50(post.caption)}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-600">
              <Heart size={11} className="text-[#DD2A7B]" />
              {formatCount(post.likeCount)}
            </span>
            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-gray-600">
              <MessageCircle size={11} className="text-[#0071e3]" />
              {formatCount(post.commentCount)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">{formatDate(post.postedAt)}</span>
        </div>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-3 w-3/4 bg-gray-100 rounded" />
        <div className="h-3 w-1/2 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
