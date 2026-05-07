"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, FileText, Eye, Heart, MessageCircle } from "lucide-react";
import { fetchMyPosts } from "@/lib/db/posts";
import { getOrCreateUserId } from "@/lib/db/userdata";
import type { Post } from "@/lib/types";

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

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const uid = await getOrCreateUserId();
      const list = await fetchMyPosts(uid);
      setPosts(list);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-dvh bg-[#f5f5f7]">
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="flex items-center gap-2 h-[52px] px-4">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">내가 쓴 글</h1>
          <span className="ml-auto text-[13px] font-semibold text-[#86868b]">{posts.length}개</span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-10">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} className="text-[#86868b]" />}
            title="아직 작성한 글이 없어요"
            sub="첫 글을 남겨 검단 이웃과 이야기해 보세요"
            ctaLabel="글쓰기"
            ctaHref="/community/write/"
          />
        ) : (
          <ul className="space-y-2.5">
            {posts.map(p => (
              <li key={p.id}>
                <Link
                  href={`/community/detail/?id=${p.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] active:bg-[#f5f5f7] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#2563EB] bg-[#e8f1fd] px-2 py-[2px] rounded-full">
                      {p.category}
                    </span>
                    <span className="text-[12px] text-[#86868b]">{relTime(p.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-[15px] font-semibold text-[#1d1d1f] line-clamp-1">
                    {p.title}
                  </p>
                  <p className="mt-1 text-[13px] text-[#6e6e73] line-clamp-2 leading-relaxed">
                    {p.content}
                  </p>
                  <div className="mt-3 flex items-center gap-4 text-[12px] text-[#86868b]">
                    <span className="flex items-center gap-1"><Eye size={14} />{p.viewCount}</span>
                    <span className="flex items-center gap-1"><Heart size={14} />{p.likeCount}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={14} />{p.commentCount}</span>
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

function EmptyState({
  icon, title, sub, ctaLabel, ctaHref,
}: { icon: React.ReactNode; title: string; sub: string; ctaLabel: string; ctaHref: string }) {
  return (
    <div className="bg-white rounded-2xl py-12 px-6 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-[#f5f5f7] flex items-center justify-center mb-3">{icon}</div>
      <p className="text-[15px] font-bold text-[#1d1d1f]">{title}</p>
      <p className="text-[13px] text-[#86868b] mt-1">{sub}</p>
      <Link
        href={ctaHref}
        className="mt-5 h-10 px-5 rounded-full bg-[#2563EB] text-white text-[14px] font-bold flex items-center active:opacity-80 transition-opacity"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
