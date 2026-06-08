"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Heart } from "lucide-react";
import { fetchMyComments, fetchMyCommentsByIds, type MyCommentWithPost } from "@/lib/db/comments";
import { getOrCreateUserId } from "@/lib/db/userdata";

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

export default function MyCommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState<MyCommentWithPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const uid = await getOrCreateUserId();
        let list = await fetchMyComments(uid);
        if (list.length === 0) {
          const localIds: string[] = JSON.parse(localStorage.getItem("myCommentIds") ?? "[]");
          if (localIds.length > 0) list = await fetchMyCommentsByIds(localIds);
        }
        setComments(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">내 댓글</h1>
          <span className="ml-auto text-[13px] font-semibold text-[#86868b]">{comments.length}개</span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="bg-white rounded-2xl py-12 px-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">
              <MessageCircle size={28} className="text-[#86868b]" />
            </div>
            <p className="text-[15px] font-bold text-[#1d1d1f]">작성한 댓글이 없어요</p>
            <p className="text-[13px] text-[#86868b] mt-1">커뮤니티 글에 의견을 남겨 보세요</p>
            <Link
              href="/community/"
              className="mt-5 h-10 px-5 rounded-full bg-[#2563EB] text-white text-[14px] font-bold flex items-center active:opacity-80 transition-opacity"
            >
              커뮤니티 가기
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {comments.map(c => (
              <li key={c.id}>
                <Link
                  href={`/community/detail/?id=${c.postId}`}
                  className="block bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:bg-[#f5f5f7] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {c.postCategory && (
                      <span className="text-[11px] font-bold text-[#2563EB] bg-[#e8f1fd] px-2 py-[2px] rounded-full">
                        {c.postCategory}
                      </span>
                    )}
                    <span className="text-[12px] text-[#86868b]">{relTime(c.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[14px] font-semibold text-[#6e6e73] line-clamp-1">
                    원글: {c.postTitle}
                  </p>
                  <p className="mt-2 text-[14px] text-[#1d1d1f] leading-relaxed line-clamp-3">
                    {c.content}
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[12px] text-[#86868b]">
                    <Heart size={13} />
                    <span>{c.likeCount}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
