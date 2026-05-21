"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Play, Loader2 } from "lucide-react";
import { fetchInstagramFeeds, type InstagramPost } from "@/lib/api/instagram";

const PAGE_SIZE = 12;

type Filter =
  | { kind: "all" }
  | { kind: "reel" }
  | { kind: "tag"; tag: string };

const FILTERS: { id: string; label: string; filter: Filter }[] = [
  { id: "all",         label: "전체",         filter: { kind: "all" } },
  { id: "tag:검단신도시", label: "#검단신도시", filter: { kind: "tag", tag: "검단신도시" } },
  { id: "tag:인천",     label: "#인천",       filter: { kind: "tag", tag: "인천" } },
  { id: "tag:검단",     label: "#검단",       filter: { kind: "tag", tag: "검단" } },
  { id: "reel",        label: "릴스만",       filter: { kind: "reel" } },
];

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const m = d.getMonth() + 1;
    const day = d.getDate();
    return `${m}/${day}`;
  } catch {
    return "";
  }
}

function caption50(text?: string): string {
  if (!text) return "";
  const stripped = text.replace(/\s+/g, " ").trim();
  return stripped.length > 50 ? stripped.slice(0, 50) + "…" : stripped;
}

function paramsFor(filter: Filter, page: number) {
  const base = { limit: PAGE_SIZE, page, sort: "latest" as const };
  if (filter.kind === "reel") return { ...base, reel: true };
  if (filter.kind === "tag")  return { ...base, tag: filter.tag };
  return base;
}

export default function InstagramFeedSection() {
  const [activeId, setActiveId] = useState<string>(FILTERS[0].id);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const activeFilter = (FILTERS.find(f => f.id === activeId) ?? FILTERS[0]).filter;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchInstagramFeeds(paramsFor(activeFilter, 1)).then(list => {
      if (cancelled) return;
      setPosts(list);
      setLoading(false);
      setHasMore(list.length >= PAGE_SIZE);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const next = page + 1;
    const more = await fetchInstagramFeeds(paramsFor(activeFilter, next));
    setPosts(prev => {
      const seen = new Set(prev.map(p => p.id));
      const dedup = more.filter(p => !seen.has(p.id));
      return [...prev, ...dedup];
    });
    setPage(next);
    setHasMore(more.length >= PAGE_SIZE);
    setLoadingMore(false);
  };

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
      <div
        className="flex gap-2 px-4 overflow-x-auto pb-3"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map(f => {
          const active = f.id === activeId;
          return (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className={`shrink-0 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors active:opacity-70 ${
                active
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div className="px-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2">
            <span className="text-3xl">📷</span>
            <p className="text-[13px] text-gray-500">아직 게시물이 없어요</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {posts.map(p => (
                <FeedCard key={p.id} post={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="h-10 px-5 rounded-full bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 active:opacity-70 disabled:opacity-60 flex items-center gap-2"
                >
                  {loadingMore && <Loader2 size={14} className="animate-spin" />}
                  {loadingMore ? "불러오는 중…" : "더 불러오기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
            onError={e => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[28px]">📷</div>
        )}
        {post.isReel && (
          <span className="absolute top-2 left-2 flex items-center gap-1 bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Play size={10} fill="white" className="text-white" />
            REEL
          </span>
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
