"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus, ThumbsUp, MessageSquare, Eye, Flame,
  Pin, Search, ChevronRight
} from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import type { CommunityCategory } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories: CommunityCategory[] = [
  "전체", "맘카페", "맛집", "부동산", "중고거래", "분실/목격", "동네질문", "소모임"
];

const categoryColors: Record<CommunityCategory, string> = {
  전체: "bg-gray-100 text-gray-700",
  맘카페: "bg-pink-100 text-pink-700",
  맛집: "bg-orange-100 text-orange-700",
  부동산: "bg-green-100 text-green-700",
  중고거래: "bg-yellow-100 text-yellow-700",
  "분실/목격": "bg-red-100 text-red-700",
  동네질문: "bg-blue-100 text-blue-700",
  소모임: "bg-purple-100 text-purple-700",
};

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initCategory = (searchParams.get("category") as CommunityCategory) ?? "전체";
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>(initCategory);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = posts.filter((p) => {
    if (activeCategory !== "전체" && p.category !== activeCategory) return false;
    if (searchQuery && !p.title.includes(searchQuery) && !p.content.includes(searchQuery)) return false;
    return true;
  });

  const pinned = filtered.filter((p) => p.isPinned);
  const normal = filtered.filter((p) => !p.isPinned);

  return (
    <div className="min-h-dvh bg-gray-100 pb-[70px]">
      <Header title="소통" showNotification />

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-[56px] z-30">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium press-effect transition-colors",
                activeCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="게시글 검색"
              className="flex-1 bg-transparent text-[13px] focus:outline-none text-gray-700 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Post List */}
      <div className="px-4 pt-3 space-y-2">
        {/* Pinned */}
        {pinned.map((post) => (
          <PostCard key={post.id} post={post} onClick={() => router.push("/community")} />
        ))}

        {/* Normal */}
        {normal.map((post) => (
          <PostCard key={post.id} post={post} onClick={() => router.push("/community")} />
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-gray-500 text-sm">게시글이 없습니다</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/community")}
        className="fixed bottom-[78px] right-4 w-14 h-14 gradient-primary rounded-full shadow-lg flex items-center justify-center press-effect z-40"
        style={{ boxShadow: "0 4px 16px rgba(37,99,235,0.4)" }}
      >
        <Plus size={24} className="text-white" />
      </button>

      <BottomNav />
    </div>
  );
}

function PostCard({ post, onClick }: { post: typeof posts[0]; onClick: () => void }) {
  return (
    <div
      className="bg-white rounded-xl px-4 py-3.5 card-shadow press-effect"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {post.isPinned && (
              <div className="flex items-center gap-0.5">
                <Pin size={11} className="text-blue-500" />
              </div>
            )}
            <span className={cn(
              "text-[11px] font-medium px-2 py-0.5 rounded-full",
              categoryColors[post.category]
            )}>
              {post.category}
            </span>
            {post.isHot && (
              <span className="flex items-center gap-0.5 bg-orange-50 text-orange-500 text-[11px] font-medium px-1.5 py-0.5 rounded-full">
                <Flame size={10} />
                HOT
              </span>
            )}
          </div>
          <p className="text-[14px] font-semibold text-gray-900 leading-snug">
            {post.title}
          </p>
          <p className="text-[13px] text-gray-500 mt-1 line-clamp-1">
            {post.content}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-gray-400 font-medium">{post.author}</span>
            <span className="text-[11px] text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{post.authorDong}</span>
            <span className="text-[11px] text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-gray-50">
        <button className="flex items-center gap-1 press-effect">
          <ThumbsUp size={13} className="text-gray-400" />
          <span className="text-[12px] text-gray-400">{post.likeCount}</span>
        </button>
        <button className="flex items-center gap-1 press-effect">
          <MessageSquare size={13} className="text-gray-400" />
          <span className="text-[12px] text-gray-400">{post.commentCount}</span>
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <Eye size={13} className="text-gray-300" />
          <span className="text-[12px] text-gray-300">{post.viewCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  return (
    <Suspense>
      <CommunityContent />
    </Suspense>
  );
}
