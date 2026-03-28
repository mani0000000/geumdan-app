"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Plus, ThumbsUp, MessageSquare, Eye, Flame, Pin } from "lucide-react";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import type { CommunityCategory } from "@/lib/types";

const categories: CommunityCategory[] = ["전체","맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

const catColor: Record<CommunityCategory, string> = {
  전체: "bg-[#3182F6] text-white",
  맘카페: "bg-[#FFE8EF] text-[#D63384]",
  맛집: "bg-[#FFF3E0] text-[#E65100]",
  부동산: "bg-[#E8F5E9] text-[#2E7D32]",
  중고거래: "bg-[#FFFDE7] text-[#F57F17]",
  "분실/목격": "bg-[#FFEBEE] text-[#C62828]",
  동네질문: "bg-[#EBF3FE] text-[#1565C0]",
  소모임: "bg-[#F3E5F5] text-[#6A1B9A]",
};

function CommunityContent() {
  const router = useRouter();
  const [active, setActive] = useState<CommunityCategory>("전체");
  const filtered = active === "전체" ? posts : posts.filter(p => p.category === active);

  return (
    <div className="min-h-dvh bg-[#F2F4F6] pb-20">
      <Header title="소통" />

      {/* Category Tabs */}
      <div className="bg-white sticky top-[56px] z-30 border-b border-[#F2F4F6]">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActive(cat)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors active:opacity-70 ${active === cat ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 pt-3 space-y-2">
        {filtered.map(post => (
          <button key={post.id} onClick={() => router.push(`/geumdan-app/community/detail/?id=${post.id}`)}
            className="w-full bg-white rounded-2xl px-4 py-4 text-left active:bg-[#F2F4F6] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              {post.isPinned && <Pin size={12} className="text-[#3182F6]" />}
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catColor[post.category]}`}>
                {post.category}
              </span>
              {post.isHot && (
                <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#F04452]">
                  <Flame size={10} /> HOT
                </span>
              )}
            </div>
            <p className="text-[15px] font-medium text-[#191F28] leading-snug">{post.title}</p>
            <p className="text-[13px] text-[#8B95A1] mt-1 line-clamp-1">{post.content}</p>
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#F2F4F6]">
              <span className="text-[12px] text-[#8B95A1]">{post.author} · {post.authorDong}</span>
              <span className="text-[12px] text-[#B0B8C1]">{formatRelativeTime(post.createdAt)}</span>
              <div className="flex items-center gap-3 ml-auto">
                <div className="flex items-center gap-1">
                  <ThumbsUp size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.likeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.commentCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={12} className="text-[#B0B8C1]" />
                  <span className="text-[12px] text-[#B0B8C1]">{post.viewCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* FAB */}
      <button onClick={() => router.push("/geumdan-app/community/write/")}
        className="fixed bottom-[74px] right-4 w-14 h-14 bg-[#3182F6] rounded-full shadow-lg flex items-center justify-center active:bg-[#1B64DA] transition-colors z-40">
        <Plus size={24} className="text-white" />
      </button>

      <BottomNav />
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense><CommunityContent /></Suspense>;
}
