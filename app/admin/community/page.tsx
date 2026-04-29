"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Search, Trash2, Pin, Flame, ChevronDown, ChevronUp,
  MessageSquare, Eye, Heart, Filter, X,
} from "lucide-react";
import {
  adminFetchPosts, adminFetchComments, adminUpdatePost,
  adminDeletePost, adminDeleteComment, adminFetchStats,
  type AdminPost, type AdminComment,
} from "@/lib/db/admin-community";

const CATEGORIES = ["전체", "맘카페", "부동산", "맛집", "중고거래", "분실/목격", "동네질문", "소모임"];

const CAT_COLOR: Record<string, string> = {
  맘카페: "#EC4899", 부동산: "#3B82F6", 맛집: "#F97316",
  중고거래: "#10B981", "분실/목격": "#EF4444", 동네질문: "#8B5CF6", 소모임: "#F59E0B",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ─── 핀/핫 토글 버튼 ─────────────────────────────────────────
function PinToggle({ post, onToggled }: { post: AdminPost; onToggled: () => void }) {
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    try { await adminUpdatePost(post.id, { is_pinned: !post.is_pinned }); onToggled(); }
    finally { setLoading(false); }
  }
  return (
    <button onClick={toggle} disabled={loading}
      title={post.is_pinned ? "핀 해제" : "핀 고정"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        post.is_pinned
          ? "bg-[#3182F6] text-white"
          : "text-[#B0B8C1] hover:bg-[#EFF6FF] hover:text-[#3182F6]"
      }`}>
      <Pin size={13} />
    </button>
  );
}

function HotToggle({ post, onToggled }: { post: AdminPost; onToggled: () => void }) {
  const [loading, setLoading] = useState(false);
  async function toggle() {
    setLoading(true);
    try { await adminUpdatePost(post.id, { is_hot: !post.is_hot }); onToggled(); }
    finally { setLoading(false); }
  }
  return (
    <button onClick={toggle} disabled={loading}
      title={post.is_hot ? "HOT 해제" : "HOT 설정"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        post.is_hot
          ? "bg-[#F97316] text-white"
          : "text-[#B0B8C1] hover:bg-[#FFF7ED] hover:text-[#F97316]"
      }`}>
      <Flame size={13} />
    </button>
  );
}

// ─── 댓글 패널 ───────────────────────────────────────────────
function CommentsPanel({ post, onCommentDeleted }: {
  post: AdminPost;
  onCommentDeleted: () => void;
}) {
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetchComments(post.id)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [post.id]);

  async function deleteComment(c: AdminComment) {
    if (!confirm(`"${c.content.slice(0, 20)}..." 댓글을 삭제할까요?`)) return;
    await adminDeleteComment(c.id, post.id);
    setComments(prev => prev.filter(x => x.id !== c.id));
    onCommentDeleted();
  }

  if (loading) return <div className="px-4 py-3 text-[12px] text-[#B0B8C1]">댓글 로딩 중...</div>;
  if (comments.length === 0) return <div className="px-4 py-3 text-[12px] text-[#B0B8C1]">댓글 없음</div>;

  return (
    <div className="border-t border-[#F2F4F6] bg-[#FAFBFC]">
      <div className="px-4 py-2 text-[11px] font-bold text-[#8B95A1] uppercase tracking-wide">
        댓글 {comments.length}개
      </div>
      <div className="divide-y divide-[#F2F4F6]">
        {comments.map(c => (
          <div key={c.id} className="flex items-start gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[12px] font-semibold text-[#4E5968]">
                  {c.is_anonymous ? "익명" : c.author}
                </span>
                <span className="text-[11px] text-[#B0B8C1]">{c.author_dong}</span>
                <span className="text-[11px] text-[#B0B8C1]">·</span>
                <span className="text-[11px] text-[#B0B8C1]">{timeAgo(c.created_at)}</span>
                {c.like_count > 0 && (
                  <span className="text-[11px] text-[#F04452]">❤ {c.like_count}</span>
                )}
              </div>
              <p className="text-[13px] text-[#191F28] break-words">{c.content}</p>
            </div>
            <button onClick={() => deleteComment(c)}
              className="shrink-0 p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 게시글 상세 내용 패널 ────────────────────────────────────
function PostDetailPanel({ post }: { post: AdminPost }) {
  return (
    <div className="px-4 py-3 border-t border-[#F2F4F6] bg-[#F8F9FB]">
      <p className="text-[13px] text-[#4E5968] whitespace-pre-wrap break-words leading-relaxed">
        {post.content}
      </p>
      {post.images && post.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {post.images.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noopener noreferrer"
              className="block w-20 h-20 rounded-xl overflow-hidden border border-[#E5E8EB] hover:opacity-80 transition-opacity">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────
export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [stats, setStats] = useState({ totalPosts: 0, todayPosts: 0, totalComments: 0, pinnedCount: 0, hotCount: 0 });

  const loadStats = useCallback(async () => {
    try { setStats(await adminFetchStats()); } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchPosts({ category, search });
      setPosts(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [category, search]);

  useEffect(() => { load(); loadStats(); }, [load, loadStats]);

  async function handleDeletePost(post: AdminPost) {
    if (!confirm(`"${post.title}" 게시글을 삭제할까요?\n댓글 ${post.comment_count}개도 함께 삭제됩니다.`)) return;
    await adminDeletePost(post.id);
    setPosts(prev => prev.filter(p => p.id !== post.id));
    loadStats();
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => prev === id ? null : id);
  }

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] md:text-[20px] font-extrabold text-[#191F28]">커뮤니티 관리</h1>
          <p className="text-[12px] text-[#8B95A1] mt-0.5">{posts.length}개 게시글</p>
        </div>
        <button onClick={() => { load(); loadStats(); }}
          className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
        {[
          { label: "전체 글", value: stats.totalPosts, color: "#3182F6" },
          { label: "오늘 작성", value: stats.todayPosts, color: "#10B981" },
          { label: "전체 댓글", value: stats.totalComments, color: "#8B5CF6" },
          { label: "📌 고정", value: stats.pinnedCount, color: "#F59E0B" },
          { label: "🔥 HOT", value: stats.hotCount, color: "#F97316" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E8EB] px-3 py-3 text-center">
            <p className="text-[18px] md:text-[22px] font-extrabold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[#8B95A1] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B0B8C1]" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-[#E5E8EB] rounded-xl text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
            placeholder="제목·내용·작성자 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && load()}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B0B8C1]">
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilter(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-semibold transition-colors ${
            category !== "전체"
              ? "border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]"
              : "border-[#E5E8EB] text-[#4E5968] hover:bg-[#F2F4F6]"
          }`}>
          <Filter size={14} />
          <span className="hidden sm:inline">{category !== "전체" ? category : "카테고리"}</span>
        </button>
      </div>

      {/* 카테고리 필터 드롭다운 */}
      {showFilter && (
        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-white border border-[#E5E8EB] rounded-2xl">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => { setCategory(c); setShowFilter(false); }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all ${
                category === c
                  ? "bg-[#3182F6] text-white"
                  : "bg-[#F2F4F6] text-[#4E5968] hover:bg-[#E5E8EB]"
              }`}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 게시글 목록 */}
      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {/* 데스크탑 테이블 헤더 */}
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 bg-[#F8F9FB] border-b border-[#E5E8EB] px-4 py-2.5">
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase">제목</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-20">작성자</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-24">통계</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-16">시간</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-20">관리</span>
          <span className="text-[11px] font-bold text-[#8B95A1] uppercase text-center w-16">상세</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-[#B0B8C1] text-[13px]">게시글 없음</div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {posts.map(post => (
              <div key={post.id}>
                {/* 데스크탑 행 */}
                <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 items-center px-4 py-3 hover:bg-[#F8F9FB] transition-colors">
                  {/* 제목 */}
                  <div className="min-w-0 pr-4">
                    <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                      {post.is_pinned && <span className="text-[10px] font-bold bg-[#EFF6FF] text-[#3182F6] px-1.5 py-0.5 rounded-full">📌 고정</span>}
                      {post.is_hot && <span className="text-[10px] font-bold bg-[#FFF7ED] text-[#F97316] px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white shrink-0"
                        style={{ background: CAT_COLOR[post.category] ?? "#9CA3AF" }}>
                        {post.category}
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-[#191F28] truncate">{post.title}</p>
                  </div>
                  {/* 작성자 */}
                  <div className="w-20 text-center">
                    <p className="text-[12px] font-semibold text-[#4E5968] truncate">
                      {post.is_anonymous ? "익명" : post.author}
                    </p>
                    <p className="text-[11px] text-[#B0B8C1]">{post.author_dong}</p>
                  </div>
                  {/* 통계 */}
                  <div className="w-24 flex items-center justify-center gap-2 text-[11px] text-[#8B95A1]">
                    <span className="flex items-center gap-0.5"><Eye size={11} />{post.view_count}</span>
                    <span className="flex items-center gap-0.5"><Heart size={11} />{post.like_count}</span>
                    <span className="flex items-center gap-0.5"><MessageSquare size={11} />{post.comment_count}</span>
                  </div>
                  {/* 시간 */}
                  <div className="w-16 text-center text-[11px] text-[#B0B8C1]">{timeAgo(post.created_at)}</div>
                  {/* 관리 */}
                  <div className="w-20 flex items-center justify-center gap-1">
                    <PinToggle post={post} onToggled={load} />
                    <HotToggle post={post} onToggled={load} />
                    <button onClick={() => handleDeletePost(post)}
                      className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  {/* 상세 토글 */}
                  <div className="w-16 flex justify-center">
                    <button onClick={() => toggleExpand(post.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-[#8B95A1] hover:bg-[#F2F4F6] hover:text-[#3182F6]">
                      {expandedId === post.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* 모바일 카드 */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {post.is_pinned && <span className="text-[10px] font-bold bg-[#EFF6FF] text-[#3182F6] px-1.5 py-0.5 rounded-full">📌</span>}
                        {post.is_hot && <span className="text-[10px] font-bold bg-[#FFF7ED] text-[#F97316] px-1.5 py-0.5 rounded-full">🔥</span>}
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: CAT_COLOR[post.category] ?? "#9CA3AF" }}>
                          {post.category}
                        </span>
                        <span className="text-[11px] text-[#B0B8C1]">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-[#191F28] leading-snug">{post.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8B95A1]">
                        <span>{post.is_anonymous ? "익명" : post.author} · {post.author_dong}</span>
                        <span className="flex items-center gap-0.5"><Eye size={10} />{post.view_count}</span>
                        <span className="flex items-center gap-0.5"><Heart size={10} />{post.like_count}</span>
                        <span className="flex items-center gap-0.5"><MessageSquare size={10} />{post.comment_count}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <PinToggle post={post} onToggled={load} />
                    <HotToggle post={post} onToggled={load} />
                    <button onClick={() => toggleExpand(post.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[12px] font-semibold border transition-colors ${
                        expandedId === post.id
                          ? "border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]"
                          : "border-[#E5E8EB] text-[#4E5968]"
                      }`}>
                      {expandedId === post.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {expandedId === post.id ? "접기" : "상세"}
                    </button>
                    <button onClick={() => handleDeletePost(post)}
                      className="ml-auto p-2 rounded-xl border border-[#E5E8EB] text-[#F04452]">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* 펼침: 본문 + 댓글 */}
                {expandedId === post.id && (
                  <>
                    <PostDetailPanel post={post} />
                    <CommentsPanel post={post} onCommentDeleted={() => {
                      setPosts(prev => prev.map(p =>
                        p.id === post.id ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p
                      ));
                      loadStats();
                    }} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
