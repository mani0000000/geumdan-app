"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Heart, MessageCircle, Play } from "lucide-react";
import { fetchInstagramFeeds, type InstagramPost } from "@/lib/api/instagram";

const MAX_ITEMS = 10;

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

export default function InstagramWidget() {
  const [posts, setPosts] = useState<InstagramPost[] | null>(null);

  useEffect(() => {
    fetchInstagramFeeds({ limit: MAX_ITEMS, sort: "latest" }).then(setPosts);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[19px] font-extrabold text-[#1d1d1f]">📸 검단 인스타그램</span>
        </div>
        <Link
          href="/community/?tab=뉴스"
          className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5"
        >
          더보기 <ChevronRight size={13} />
        </Link>
      </div>

      <section className="mb-1">
        <div
          className="overflow-x-auto px-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {posts === null
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
              : posts.length === 0
              ? <EmptyState />
              : posts.slice(0, MAX_ITEMS).map(p => <InstaCard key={p.id} post={p} />)}
          </div>
        </div>
      </section>
    </>
  );
}

function InstaCard({ post }: { post: InstagramPost }) {
  return (
    <a
      href={post.permalink || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="snap-start shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden shadow-sm active:opacity-80"
    >
      <div className="relative w-full aspect-square bg-[#f5f5f7]">
        {post.thumbnailUrl ? (
          <img
            src={post.thumbnailUrl}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
            onError={e => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[28px]">📷</div>
        )}
        {post.isReel && (
          <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center">
            <Play size={13} fill="white" className="text-white ml-0.5" />
          </div>
        )}
      </div>
      <div className="px-2.5 py-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4E5968]">
          <Heart size={11} className="text-[#DD2A7B]" />
          {formatCount(post.likeCount)}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#4E5968]">
          <MessageCircle size={11} className="text-[#0071e3]" />
          {formatCount(post.commentCount)}
        </span>
      </div>
    </a>
  );
}

function SkeletonCard() {
  return (
    <div className="shrink-0 w-[160px] bg-white rounded-2xl overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="px-2.5 py-2 flex items-center justify-between">
        <div className="h-3 w-10 bg-gray-100 rounded" />
        <div className="h-3 w-10 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="w-[280px] py-8 px-4 bg-white rounded-2xl flex flex-col items-center gap-2">
      <span className="text-2xl">📷</span>
      <p className="text-[12px] text-gray-500 text-center">
        아직 표시할 인스타그램 게시물이 없어요
      </p>
    </div>
  );
}
