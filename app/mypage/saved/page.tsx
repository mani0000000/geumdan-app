"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bookmark, BookmarkX, Eye, Heart, MessageCircle } from "lucide-react";
import { getFavoritePosts, removeFavoritePost, type FavoritePost } from "@/lib/db/userdata";
import { fetchDBPost } from "@/lib/db/posts";
import type { Post } from "@/lib/types";

interface SavedRow extends FavoritePost {
  detail?: Post | null;
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return iso.slice(0, 10);
}

export default function SavedPostsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const favs = await getFavoritePosts();
      setRows(favs);
      // 상세는 백그라운드 로드 — 본문/통계는 보여주되 못 가져오면 메타만 노출
      const detailed = await Promise.all(
        favs.map(async f => ({ ...f, detail: await fetchDBPost(f.post_id) }))
      );
      setRows(detailed);
      setLoading(false);
    })();
  }, []);

  async function handleRemove(postId: string) {
    if (!confirm("저장 목록에서 제거할까요?")) return;
    await removeFavoritePost(postId);
    setRows(prev => prev.filter(r => r.post_id !== postId));
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">저장한 글</h1>
          <span className="ml-auto text-[13px] font-semibold text-[#86868b]">{rows.length}개</span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-10">
        {loading && rows.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 px-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">
              <Bookmark size={28} className="text-[#86868b]" />
            </div>
            <p className="text-[15px] font-bold text-[#1d1d1f]">저장한 글이 없어요</p>
            <p className="text-[13px] text-[#86868b] mt-1">관심 있는 글을 북마크하면 여기서 모아볼 수 있어요</p>
            <Link
              href="/community/"
              className="mt-5 h-10 px-5 rounded-full bg-[#2563EB] text-white text-[14px] font-bold flex items-center active:opacity-80 transition-opacity"
            >
              커뮤니티 둘러보기
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map(r => {
              const post = r.detail;
              return (
                <li key={r.id} className="relative">
                  <Link
                    href={`/community/detail/?id=${r.post_id}`}
                    className="block bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:bg-[#f5f5f7] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {(post?.category ?? r.category) && (
                        <span className="text-[11px] font-bold text-[#2563EB] bg-[#e8f1fd] px-2 py-[2px] rounded-full">
                          {post?.category ?? r.category}
                        </span>
                      )}
                      {post?.createdAt && (
                        <span className="text-[12px] text-[#86868b]">{relTime(post.createdAt)}</span>
                      )}
                    </div>
                    <p className="mt-2 text-[15px] font-semibold text-[#1d1d1f] line-clamp-1 pr-9">
                      {post?.title ?? r.title ?? "제목 없음"}
                    </p>
                    {post?.content && (
                      <p className="mt-1 text-[13px] text-[#6e6e73] line-clamp-2 leading-relaxed">
                        {post.content}
                      </p>
                    )}
                    {post && (
                      <div className="mt-3 flex items-center gap-4 text-[12px] text-[#86868b]">
                        <span className="flex items-center gap-1"><Eye size={14} />{post.viewCount}</span>
                        <span className="flex items-center gap-1"><Heart size={14} />{post.likeCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle size={14} />{post.commentCount}</span>
                      </div>
                    )}
                  </Link>
                  <button
                    onClick={() => handleRemove(r.post_id)}
                    aria-label="저장 해제"
                    className="absolute top-3 right-3 p-1.5 rounded-full active:bg-[#f5f5f7] text-[#86868b]"
                  >
                    <BookmarkX size={18} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
