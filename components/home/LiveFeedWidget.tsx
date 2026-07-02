"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pin, PenLine, X, ChevronRight, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createPost, fetchDBPosts } from "@/lib/db/posts";
import { getLocalUserId, getUserProfile } from "@/lib/db/userdata";
import { formatRelativeTime } from "@/lib/utils";
import type { Post, CommunityCategory } from "@/lib/types";

const CATEGORIES: CommunityCategory[] = [
  "동네질문", "생활정보", "맛집", "소모임", "육아/교육", "반려동물", "공구/나눔",
];

const CAT_COLOR: Record<string, string> = {
  동네질문: "#8B5CF6", 생활정보: "#3B82F6", 맛집: "#F97316",
  소모임: "#F59E0B", "육아/교육": "#10B981", 반려동물: "#EC4899",
  "공구/나눔": "#6366F1", 맘카페: "#EC4899", 부동산: "#3B82F6",
  중고거래: "#10B981", "분실/목격": "#EF4444",
};

const MAX_CHARS = 150;
const POLL_MS = 15_000;

// ─── pin/unpin (admin only — uses supabase direct) ─────────────
async function togglePin(postId: string, current: boolean): Promise<void> {
  await supabase
    .from("community_posts")
    .update({ is_pinned: !current, updated_at: new Date().toISOString() })
    .eq("id", postId);
}

export default function LiveFeedWidget() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // write sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<CommunityCategory>("동네질문");
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const data = await fetchDBPosts(undefined, 20);
    // pinned first, then newest
    const sorted = [
      ...data.filter(p => p.isPinned),
      ...data.filter(p => !p.isPinned),
    ].slice(0, 15);
    setPosts(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    pollerRef.current = setInterval(load, POLL_MS);
    if (typeof sessionStorage !== "undefined") {
      setIsAdmin(sessionStorage.getItem("admin_auth") === "1");
    }
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [load]);

  // focus textarea when sheet opens
  useEffect(() => {
    if (sheetOpen) setTimeout(() => textareaRef.current?.focus(), 120);
  }, [sheetOpen]);

  async function handleSubmit() {
    const content = text.trim();
    if (!content) return;
    const uid = getLocalUserId();
    if (!uid) { router.push("/login/"); return; }
    setSubmitting(true);
    setSubmitErr("");
    try {
      const profile = await getUserProfile();
      const title = content.length > 50 ? content.slice(0, 50) + "…" : content;
      await createPost({
        category,
        title,
        content,
        author: profile.nickname,
        authorDong: profile.dong,
        isAnonymous: false,
        userId: uid,
      });
      setText("");
      setSheetOpen(false);
      await load();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "글 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePin(post: Post) {
    await togglePin(post.id, Boolean(post.isPinned));
    await load();
  }

  if (!loading && posts.length === 0) return null;

  return (
    <>
      <section className="mx-4 mb-1">
        {/* header */}
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[15px] font-bold text-gray-900">실시간 피드</span>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 rounded-full active:opacity-70 transition-opacity">
            <PenLine size={13} className="text-white" />
            <span className="text-[12px] font-semibold text-white">글쓰기</span>
          </button>
        </div>

        {/* list */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
          {loading && (
            <div className="py-8 flex justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && posts.slice(0, 5).map(post => (
            <button
              key={post.id}
              onClick={() => router.push(`/community/detail/?id=${post.id}`)}
              className="w-full px-4 py-3.5 flex items-start gap-3 text-left active:bg-gray-50 transition-colors">
              {/* pin badge */}
              {post.isPinned && (
                <Pin size={14} className="shrink-0 mt-0.5 text-blue-500" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: CAT_COLOR[post.category] ?? "#6B7280" }}>
                    {post.category}
                  </span>
                  {post.isPinned && (
                    <span className="text-[10px] font-bold text-blue-500">고정</span>
                  )}
                </div>
                <p className="text-[14px] font-medium text-gray-900 leading-snug line-clamp-2">
                  {post.content || post.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] text-gray-400">{post.authorDong}</span>
                  <span className="text-[11px] text-gray-300">·</span>
                  <span className="text-[11px] text-gray-400">{formatRelativeTime(post.createdAt)}</span>
                  {post.commentCount > 0 && (
                    <>
                      <span className="text-[11px] text-gray-300 ml-auto">💬 {post.commentCount}</span>
                    </>
                  )}
                </div>
              </div>
              {/* admin pin toggle */}
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); handlePin(post); }}
                  className={`shrink-0 p-1 rounded-lg transition-colors ${
                    post.isPinned ? "bg-blue-100 text-blue-600" : "text-gray-300 hover:text-blue-400"
                  }`}>
                  <Pin size={14} />
                </button>
              )}
            </button>
          ))}

          <button
            onClick={() => router.push("/community/")}
            className="w-full flex items-center justify-center gap-1 py-3 text-[13px] text-blue-600 font-semibold active:bg-gray-50">
            전체 보기 <ChevronRight size={13} />
          </button>
        </div>
      </section>

      {/* write bottom sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSheetOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl px-4 pt-4 pb-safe-bottom z-10"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}>
            {/* drag handle */}
            <div className="mx-auto w-10 h-1 bg-gray-200 rounded-full mb-4" />

            <div className="flex items-center justify-between mb-3">
              <span className="text-[16px] font-bold text-gray-900">짧은 글 남기기</span>
              <button onClick={() => setSheetOpen(false)} className="p-1 text-gray-400 active:opacity-60">
                <X size={20} />
              </button>
            </div>

            {/* category chips */}
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    category === cat
                      ? "text-white"
                      : "bg-gray-100 text-gray-500"
                  }`}
                  style={category === cat ? { backgroundColor: CAT_COLOR[cat] ?? "#3B82F6" } : {}}>
                  {cat}
                </button>
              ))}
            </div>

            {/* textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="이웃들에게 짧은 글을 남겨보세요 ✍️"
                rows={4}
                className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
              />
              <span className="absolute bottom-3 right-4 text-[11px] text-gray-400">
                {text.length}/{MAX_CHARS}
              </span>
            </div>

            {submitErr && (
              <p className="text-[12px] text-red-500 mt-2">{submitErr}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!text.trim() || submitting}
              className="mt-3 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white font-semibold text-[15px] active:opacity-80 disabled:opacity-40 transition-opacity">
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {submitting ? "등록 중…" : "올리기"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
