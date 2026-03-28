"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ThumbsUp, MessageSquare, Share2,
  MoreHorizontal, Send, Flag, Bookmark
} from "lucide-react";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";

const mockComments = [
  { id: "c1", author: "이웃주민", dong: "당하동", content: "정보 공유 감사해요! 저도 궁금했는데 도움이 됐어요 😊", createdAt: "2026-03-28T10:45:00", likes: 5 },
  { id: "c2", author: "검단맘", dong: "불로동", content: "우리 아이 다니는 곳이랑 비슷하네요. 국공립이 제일 좋은 것 같아요.", createdAt: "2026-03-28T11:20:00", likes: 3 },
  { id: "c3", author: "신혼부부", dong: "마전동", content: "저도 내년에 알아봐야 하는데... 혹시 대기 얼마나 걸리나요?", createdAt: "2026-03-28T12:05:00", likes: 1 },
  { id: "c4", author: "육아맘김씨", dong: "당하동", content: "댓글 주셔서 감사해요! 국공립은 보통 1~2년 대기예요 ㅠㅠ 미리미리 신청해두세요!", createdAt: "2026-03-28T12:30:00", likes: 8 },
];

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id") ?? "p1";
  const post = posts.find(p => p.id === postId) ?? posts[0];

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState(mockComments);
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount(c => liked ? c - 1 : c + 1);
  };

  const submitComment = () => {
    if (!commentText.trim()) return;
    setComments(prev => [...prev, {
      id: `c${Date.now()}`,
      author: "검단주민",
      dong: "당하동",
      content: commentText,
      createdAt: new Date().toISOString(),
      likes: 0,
    }]);
    setCommentText("");
  };

  const toggleCommentLike = (id: string) => {
    setCommentLikes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const catColor: Record<string, string> = {
    맘카페: "bg-[#FFE8EF] text-[#D63384]",
    맛집: "bg-[#FFF3E0] text-[#E65100]",
    부동산: "bg-[#E8F5E9] text-[#2E7D32]",
    중고거래: "bg-[#FFFDE7] text-[#F57F17]",
    "분실/목격": "bg-[#FFEBEE] text-[#C62828]",
    동네질문: "bg-[#EBF3FE] text-[#1565C0]",
    소모임: "bg-[#F3E5F5] text-[#6A1B9A]",
    전체: "bg-[#EBF3FE] text-[#3182F6]",
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#F2F4F6] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setBookmarked(!bookmarked)} className="active:opacity-60">
            <Bookmark size={22} className={bookmarked ? "text-[#3182F6] fill-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button className="active:opacity-60">
            <Share2 size={20} className="text-[#8B95A1]" />
          </button>
          <button className="active:opacity-60">
            <MoreHorizontal size={22} className="text-[#8B95A1]" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Post */}
        <article className="px-5 py-5 border-b border-[#F2F4F6]">
          {/* Category + Author */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${catColor[post.category] ?? "bg-[#EBF3FE] text-[#3182F6]"}`}>
              {post.category}
            </span>
            {post.isPinned && <span className="text-[12px] text-[#3182F6] font-medium">📌 공지</span>}
          </div>
          <h1 className="text-[21px] font-bold text-[#191F28] leading-snug mb-4">{post.title}</h1>

          {/* Author info */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-full bg-[#EBF3FE] flex items-center justify-center text-base">👤</div>
            <div>
              <p className="text-[15px] font-semibold text-[#191F28]">{post.author}</p>
              <p className="text-[13px] text-[#8B95A1]">{post.authorDong} · {formatRelativeTime(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p>
            </div>
          </div>

          {/* Content */}
          <p className="text-[16px] text-[#191F28] leading-relaxed whitespace-pre-line">{post.content}</p>

          {/* Reaction bar */}
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-[#F2F4F6]">
            <button onClick={toggleLike}
              className={`flex items-center gap-1.5 h-9 px-4 rounded-full transition-colors active:opacity-70 ${liked ? "bg-[#EBF3FE] text-[#3182F6]" : "bg-[#F2F4F6] text-[#8B95A1]"}`}>
              <ThumbsUp size={15} className={liked ? "fill-[#3182F6]" : ""} />
              <span className="text-[14px] font-semibold">{likeCount}</span>
            </button>
            <div className="flex items-center gap-1.5 text-[#8B95A1]">
              <MessageSquare size={15} />
              <span className="text-[14px]">{comments.length}</span>
            </div>
            <button className="ml-auto flex items-center gap-1 text-[#8B95A1] active:opacity-60">
              <Flag size={14} />
              <span className="text-[13px]">신고</span>
            </button>
          </div>
        </article>

        {/* Comments */}
        <div className="px-5 py-4">
          <p className="text-[15px] font-bold text-[#191F28] mb-4">댓글 {comments.length}개</p>
          <div className="space-y-5">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F2F4F6] flex items-center justify-center text-sm shrink-0">👤</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-[#191F28]">{c.author}</span>
                    <span className="text-[12px] text-[#B0B8C1]">{c.dong}</span>
                    <span className="text-[12px] text-[#B0B8C1] ml-auto">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-[15px] text-[#191F28] leading-relaxed">{c.content}</p>
                  <button onClick={() => toggleCommentLike(c.id)}
                    className="flex items-center gap-1 mt-2 active:opacity-60">
                    <ThumbsUp size={12} className={commentLikes.has(c.id) ? "text-[#3182F6] fill-[#3182F6]" : "text-[#B0B8C1]"} />
                    <span className={`text-[13px] ${commentLikes.has(c.id) ? "text-[#3182F6]" : "text-[#B0B8C1]"}`}>
                      {c.likes + (commentLikes.has(c.id) ? 1 : 0)}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-24" />
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 bg-white border-t border-[#F2F4F6] px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#EBF3FE] flex items-center justify-center text-sm shrink-0">👤</div>
        <div className="flex-1 flex items-center bg-[#F2F4F6] rounded-2xl px-3 py-2 gap-2">
          <input
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submitComment()}
            placeholder="따뜻한 댓글을 남겨보세요"
            className="flex-1 bg-transparent text-[15px] text-[#191F28] placeholder:text-[#B0B8C1] outline-none"
          />
          <button onClick={submitComment} disabled={!commentText.trim()}
            className="shrink-0 active:opacity-60 disabled:opacity-30">
            <Send size={18} className="text-[#3182F6]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
