"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Play, RefreshCw } from "lucide-react";
import { fetchInstagramFeeds, type InstagramPost } from "@/lib/api/instagram";

const PAGE_SIZE = 6;

function getEmbedSrc(post: InstagramPost): string | null {
  const m = post.permalink.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  const sc = m[2];
  return post.isReel
    ? `https://www.instagram.com/reel/${sc}/embed/`
    : `https://www.instagram.com/p/${sc}/embed/`;
}

// ── 개별 카드 ─────────────────────────────────────────────────
function PostCard({ post, hero = false }: { post: InstagramPost; hero?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const embed = getEmbedSrc(post);

  if (playing && embed) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-black ${hero ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        <iframe src={embed} className="w-full h-full" allowFullScreen scrolling="no" loading="lazy" />
        <button onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center z-10 text-white">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl overflow-hidden bg-[#1a1a2e] cursor-pointer ${hero ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      onClick={() => embed && setPlaying(true)}
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl} alt={post.caption ?? ""} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      {post.isReel && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
          <Play size={9} className="fill-white text-white" />
          <span className="text-[10px] text-white font-bold">Reels</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
        {post.username && <p className="text-[12px] font-bold text-white drop-shadow">@{post.username}</p>}
        {post.caption && (
          <p className={`text-white/85 mt-0.5 leading-snug drop-shadow ${hero ? "text-[11px] line-clamp-2" : "text-[10px] line-clamp-1"}`}>
            {post.caption}
          </p>
        )}
      </div>
      {embed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ${hero ? "w-14 h-14" : "w-10 h-10"}`}>
            <Play size={hero ? 22 : 16} className="fill-white text-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

function Skeleton({ hero = false }: { hero?: boolean }) {
  return <div className={`rounded-2xl bg-[#F2F4F6] animate-pulse ${hero ? "aspect-[16/10]" : "aspect-[4/3]"}`} />;
}

// ── 자동 수집 트리거 (Fastify 백엔드 또는 관리자 배치 호출) ───
async function triggerAutoCollect(): Promise<boolean> {
  const base = process.env.NEXT_PUBLIC_INSTAGRAM_API_URL;
  if (!base) return false;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/instagram-collect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: ["검단신도시", "검단", "검단맛집"] }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function InstagramFeedSection() {
  const [pages, setPages] = useState<(InstagramPost[] | null)[]>([null]);
  const [cur, setCur] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadPage = useCallback(async (idx: number) => {
    const posts = await fetchInstagramFeeds({ limit: PAGE_SIZE, page: idx + 1, sort: "latest" });
    setPages(prev => {
      const next = [...prev];
      next[idx] = posts;
      return next;
    });
    if (posts.length < PAGE_SIZE) setHasMore(false);
    return posts;
  }, []);

  useEffect(() => {
    setLoading(true);
    loadPage(0).finally(() => setLoading(false));
  }, [loadPage]);

  const go = useCallback(async (dir: 1 | -1) => {
    const next = cur + dir;
    if (next < 0) return;
    setTransitioning(true);
    if (dir === 1 && !pages[next]) await loadPage(next);
    setCur(next);
    setTransitioning(false);
  }, [cur, pages, loadPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await triggerAutoCollect();
    setPages([null]);
    setCur(0);
    setHasMore(true);
    await loadPage(0);
    setRefreshing(false);
  }, [loadPage]);

  const current = pages[cur];
  const hero = current?.[0] ?? null;
  const grid = current?.slice(1) ?? [];
  const loadedCount = pages.filter(Boolean).length;

  return (
    <div className="px-4 pt-3 pb-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] flex items-center justify-center"
            style={{ background: "linear-gradient(45deg,#F09433 0%,#E6683C 25%,#DC2743 50%,#CC2366 75%,#BC1888 100%)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <span className="text-[15px] font-extrabold text-[#1d1d1f]">검단 인스타그램</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleRefresh} disabled={refreshing || loading}
            className="w-7 h-7 rounded-full border border-[#E5E8EB] flex items-center justify-center disabled:opacity-30 active:bg-[#F2F4F6]">
            <RefreshCw size={12} className={`text-[#4E5968] ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <span className="text-[11px] text-[#8B95A1]">{cur + 1} / {Math.max(loadedCount + (hasMore ? 1 : 0), cur + 1)}</span>
          <button onClick={() => go(-1)} disabled={cur === 0 || transitioning}
            className="w-7 h-7 rounded-full border border-[#E5E8EB] flex items-center justify-center disabled:opacity-30 active:bg-[#F2F4F6]">
            <ChevronLeft size={13} className="text-[#4E5968]" />
          </button>
          <button onClick={() => go(1)} disabled={(!hasMore && cur >= loadedCount - 1) || transitioning}
            className="w-7 h-7 rounded-full border border-[#E5E8EB] flex items-center justify-center disabled:opacity-30 active:bg-[#F2F4F6]">
            <ChevronRight size={13} className="text-[#4E5968]" />
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      {loading || transitioning ? (
        <div className="space-y-2">
          <Skeleton hero />
          <div className="grid grid-cols-2 gap-2"><Skeleton /><Skeleton /><Skeleton /><Skeleton /></div>
        </div>
      ) : !current || current.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[#B0B8C1]">게시물이 없어요</div>
      ) : (
        <div className="space-y-2">
          {hero && <PostCard post={hero} hero />}
          {grid.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {grid.map(p => <PostCard key={p.id} post={p} />)}
            </div>
          )}
        </div>
      )}

      {/* 페이지 도트 */}
      {loadedCount > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {pages.map((pg, i) => pg ? (
            <button key={i} onClick={() => setCur(i)}
              className={`rounded-full transition-all duration-200 ${i === cur ? "w-4 h-1.5 bg-[#0071e3]" : "w-1.5 h-1.5 bg-[#D2D2D7]"}`} />
          ) : null)}
          {hasMore && <span className="w-1.5 h-1.5 rounded-full bg-[#D2D2D7]" />}
        </div>
      )}
    </div>
  );
}
