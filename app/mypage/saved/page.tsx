"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Bookmark, ChevronRight, Trash2 } from "lucide-react";
import { getSavedPosts, unsavePost, type SavedPost } from "@/lib/db/savedposts";

export default function SavedPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getSavedPosts().then((data) => {
      setPosts(data);
      setLoading(false);
    });
  }, []);

  async function handleRemove(postId: string) {
    setRemoving(postId);
    await unsavePost(postId);
    setPosts((prev) => prev.filter((p) => p.post_id !== postId));
    setRemoving(null);
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f7] pb-12">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-[#f5f5f7]">
        <div className="flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-[#f5f5f7]"
          >
            <ChevronLeft size={22} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[17px] font-bold text-[#1d1d1f] flex-1">저장한 글</h1>
          <span className="text-[14px] text-[#6e6e73]">{posts.length}개</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center mt-20">
          <p className="text-[15px] text-[#6e6e73]">불러오는 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-24 gap-3">
          <Bookmark size={44} className="text-[#d2d2d7]" />
          <p className="text-[15px] text-[#6e6e73]">저장한 글이 없습니다.</p>
          <p className="text-[13px] text-[#86868b]">게시글 상세에서 북마크 버튼을 눌러 저장해 보세요.</p>
          <button
            onClick={() => router.push("/community/")}
            className="mt-2 h-10 px-6 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium"
          >
            커뮤니티 보기
          </button>
        </div>
      ) : (
        <div className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden divide-y divide-[#f5f5f7]">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center px-4 py-3.5 gap-3">
              <button
                onClick={() => router.push(`/community/detail/?id=${post.post_id}`)}
                className="flex-1 flex items-start gap-3 text-left active:opacity-70 min-w-0"
              >
                <span className="text-[12px] font-bold bg-[#e8f1fd] text-[#0071e3] px-2 py-0.5 rounded-full shrink-0 mt-0.5">
                  {post.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f] truncate">{post.title}</p>
                  <p className="text-[12px] text-[#86868b] mt-0.5">
                    {post.created_at.slice(0, 10)}에 저장
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => router.push(`/community/detail/?id=${post.post_id}`)}
                  className="w-8 h-8 flex items-center justify-center active:opacity-60"
                >
                  <ChevronRight size={16} className="text-[#d2d2d7]" />
                </button>
                <button
                  onClick={() => handleRemove(post.post_id)}
                  disabled={removing === post.post_id}
                  className="w-8 h-8 flex items-center justify-center active:opacity-60"
                >
                  <Trash2 size={15} className={removing === post.post_id ? "text-[#d2d2d7]" : "text-[#F04452]"} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
