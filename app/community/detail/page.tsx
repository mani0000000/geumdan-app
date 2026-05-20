"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ThumbsUp, MessageSquare, Share2,
  MoreHorizontal, Send, Flag, Bookmark, Trash2, Pencil, X, Check,
} from "lucide-react";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import {
  fetchDBPost, deletePost, updatePost, togglePostLike, isMockPostId,
} from "@/lib/db/posts";
import {
  fetchComments, createComment, deleteComment, toggleCommentLike,
  type DBComment,
} from "@/lib/db/comments";
import { syncCommentCount } from "@/lib/db/posts";
import type { Post } from "@/lib/types";

// mock 댓글 (mock 포스트 전용 초기 데이터)
const MOCK_COMMENTS: DBComment[] = [
  { id: "c1", postId: "", author: "이웃주민",   authorDong: "당하동", content: "정보 공유 감사해요! 저도 궁금했는데 도움이 됐어요 😊",                              likeCount: 5, isAnonymous: false, createdAt: "2026-03-28T10:45:00" },
  { id: "c2", postId: "", author: "검단맘",     authorDong: "원당동", content: "우리 아이 다니는 곳이랑 비슷하네요. 국공립이 제일 좋은 것 같아요.",               likeCount: 3, isAnonymous: false, createdAt: "2026-03-28T11:20:00" },
  { id: "c3", postId: "", author: "신혼부부",   authorDong: "대곡동", content: "저도 내년에 알아봐야 하는데... 혹시 대기 얼마나 걸리나요?",                       likeCount: 1, isAnonymous: false, createdAt: "2026-03-28T12:05:00" },
  { id: "c4", postId: "", author: "육아맘김씨", authorDong: "당하동", content: "댓글 주셔서 감사해요! 국공립은 보통 1~2년 대기예요 ㅠㅠ 미리미리 신청해두세요!", likeCount: 8, isAnonymous: false, createdAt: "2026-03-28T12:30:00" },
];

const catColor: Record<string, string> = {
  맘카페: "bg-[#FFE8EF] text-[#D63384]",
  맛집: "bg-[#FFF3E0] text-[#E65100]",
  부동산: "bg-[#E8F5E9] text-[#2E7D32]",
  중고거래: "bg-[#FFFDE7] text-[#F57F17]",
  "분실/목격": "bg-[#FFEBEE] text-[#C62828]",
  동네질문: "bg-[#e8f1fd] text-[#1565C0]",
  소모임: "bg-[#F3E5F5] text-[#6A1B9A]",
  전체: "bg-[#e8f1fd] text-[#0071e3]",
};

// localStorage 기반 소유권 확인
function getMyPostIds(): string[] {
  try { return JSON.parse(localStorage.getItem("myPostIds") ?? "[]"); } catch { return []; }
}
function getMyCommentIds(): string[] {
  try { return JSON.parse(localStorage.getItem("myCommentIds") ?? "[]"); } catch { return []; }
}
function saveMyCommentId(id: string) {
  try {
    const stored = getMyCommentIds();
    localStorage.setItem("myCommentIds", JSON.stringify([...stored, id]));
  } catch { /* ignore */ }
}

function DetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id") ?? "p1";
  const isMock = isMockPostId(postId);

  const [post, setPost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [comments, setComments] = useState<DBComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState(false);

  // 수정/삭제
  const [isMyPost, setIsMyPost] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const [myCommentIds, setMyCommentIds] = useState<Set<string>>(new Set());
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // 포스트 로드
  useEffect(() => {
    async function load() {
      setPostLoading(true);
      let found: Post | null = null;
      if (isMock) {
        found = posts.find(p => p.id === postId) ?? posts[0];
      } else {
        found = await fetchDBPost(postId);
        if (!found) {
          // DB 포스트를 못 찾으면 목록으로
          router.replace("/community/");
          return;
        }
      }
      setPost(found);
      setLikeCount(found.likeCount);
      setIsMyPost(!isMock && getMyPostIds().includes(postId));
      setPostLoading(false);
    }
    load();
  }, [postId, isMock, router]);

  // 댓글 로드
  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    if (isMock) {
      setComments(MOCK_COMMENTS.map(c => ({ ...c, postId })));
    } else {
      const data = await fetchComments(postId);
      setComments(data);
    }
    setMyCommentIds(new Set(getMyCommentIds()));
    setCommentsLoading(false);
  }, [postId, isMock]);

  useEffect(() => { loadComments(); }, [loadComments]);

  // 좋아요
  const toggleLike = async () => {
    const delta = liked ? -1 : 1;
    setLiked(!liked);
    setLikeCount(c => c + delta);
    if (!isMock) await togglePostLike(postId, delta);
  };

  // 댓글 작성
  const submitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    if (isMock) {
      // mock 포스트는 클라이언트 상태에만 추가
      setComments(prev => [...prev, {
        id: `c${Date.now()}`, postId,
        author: anonymous ? "익명" : "검단주민",
        authorDong: "검단",
        content: commentText.trim(),
        likeCount: 0, isAnonymous: anonymous,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      const saved = await createComment({
        postId, author: "검단주민", authorDong: "검단",
        content: commentText.trim(), isAnonymous: anonymous,
      });
      if (saved) {
        setComments(prev => [...prev, saved]);
        saveMyCommentId(saved.id);
        setMyCommentIds(prev => new Set([...prev, saved.id]));
        await syncCommentCount(postId, 1);
        setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
      }
    }
    setCommentText("");
    setSubmittingComment(false);
  };

  // 댓글 삭제
  const handleDeleteComment = async (id: string) => {
    setDeletingCommentId(id);
    const ok = isMock ? true : await deleteComment(id);
    if (ok) {
      setComments(prev => prev.filter(c => c.id !== id));
      if (!isMock) {
        await syncCommentCount(postId, -1);
        setPost(prev => prev ? { ...prev, commentCount: Math.max(0, prev.commentCount - 1) } : prev);
      }
    }
    setDeletingCommentId(null);
  };

  // 댓글 좋아요
  const handleCommentLike = async (id: string) => {
    const liked = commentLikes.has(id);
    setCommentLikes(prev => {
      const next = new Set(prev); liked ? next.delete(id) : next.add(id); return next;
    });
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, likeCount: c.likeCount + (liked ? -1 : 1) } : c
    ));
    if (!isMock) await toggleCommentLike(id, liked ? -1 : 1);
  };

  // 글 수정 저장
  const saveEdit = async () => {
    if (!editTitle.trim() || !editContent.trim()) return;
    setSavingEdit(true);
    const updated = await updatePost(postId, { title: editTitle, content: editContent });
    if (updated) {
      setPost(updated);
      setEditMode(false);
    }
    setSavingEdit(false);
  };

  // 글 삭제
  const handleDeletePost = async () => {
    if (!confirm("이 글을 삭제하시겠습니까?")) return;
    setDeletingPost(true);
    const ok = await deletePost(postId);
    if (ok) router.replace("/community/");
    else setDeletingPost(false);
  };

  if (postLoading || !post) {
    return (
      <div className="min-h-dvh bg-white flex flex-col">
        <div className="flex items-center px-4 h-14 border-b border-[#f5f5f7]">
          <button onClick={() => router.back()}><ChevronLeft size={24} className="text-[#1d1d1f]" /></button>
        </div>
        <div className="px-5 py-5 space-y-3 animate-pulse">
          <div className="h-3 w-16 bg-[#f5f5f7] rounded-full" />
          <div className="h-6 w-3/4 bg-[#f5f5f7] rounded" />
          <div className="h-4 w-1/3 bg-[#f5f5f7] rounded" />
          {[1,2,3,4].map(i => <div key={i} className="h-4 bg-[#f5f5f7] rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#f5f5f7] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setBookmarked(!bookmarked)} className="active:opacity-60">
            <Bookmark size={22} className={bookmarked ? "text-[#0071e3] fill-[#0071e3]" : "text-[#6e6e73]"} />
          </button>
          <button className="active:opacity-60">
            <Share2 size={20} className="text-[#6e6e73]" />
          </button>
          {isMyPost && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="active:opacity-60">
                <MoreHorizontal size={22} className="text-[#6e6e73]" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border border-[#d2d2d7] rounded-xl shadow-lg z-20 min-w-[120px] overflow-hidden">
                  <button
                    onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditMode(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] active:bg-[#f5f5f7]">
                    <Pencil size={14} />수정
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); handleDeletePost(); }}
                    disabled={deletingPost}
                    className="w-full flex items-center gap-2 px-4 py-3 text-[14px] text-[#F04452] hover:bg-[#FFF0F0] active:bg-[#FFF0F0]">
                    <Trash2 size={14} />{deletingPost ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              )}
            </div>
          )}
          {!isMyPost && (
            <button className="active:opacity-60">
              <MoreHorizontal size={22} className="text-[#6e6e73]" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto" onClick={() => setShowMenu(false)}>
        <article className="px-5 py-5 border-b border-[#f5f5f7]">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${catColor[post.category] ?? "bg-[#e8f1fd] text-[#0071e3]"}`}>
              {post.category}
            </span>
            {post.isPinned && <span className="text-[12px] text-[#0071e3] font-medium">📌 공지</span>}
          </div>

          {/* 수정 모드 */}
          {editMode ? (
            <div className="space-y-3">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={50}
                className="w-full text-[20px] font-bold text-[#1d1d1f] outline-none border-b border-[#0071e3] pb-1" />
              <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                rows={6}
                className="w-full text-[16px] text-[#1d1d1f] outline-none border border-[#d2d2d7] rounded-xl p-3 resize-none leading-relaxed" />
              <div className="flex gap-2">
                <button onClick={() => setEditMode(false)}
                  className="flex-1 h-10 rounded-xl border border-[#d2d2d7] text-[14px] text-[#6e6e73] active:opacity-60">
                  <X size={14} className="inline mr-1" />취소
                </button>
                <button onClick={saveEdit} disabled={savingEdit}
                  className="flex-1 h-10 rounded-xl bg-[#0071e3] text-white text-[14px] font-bold disabled:opacity-50 active:opacity-80">
                  <Check size={14} className="inline mr-1" />{savingEdit ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-[21px] font-bold text-[#1d1d1f] leading-snug mb-4">{post.title}</h1>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-[#e8f1fd] flex items-center justify-center text-base">👤</div>
                <div>
                  <p className="text-[15px] font-semibold text-[#1d1d1f]">{post.author}</p>
                  <p className="text-[13px] text-[#6e6e73]">{post.authorDong} · {formatRelativeTime(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[16px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{post.content}</p>
            </>
          )}

          {/* Reaction bar */}
          {!editMode && (
            <div className="flex items-center gap-4 mt-6 pt-5 border-t border-[#f5f5f7]">
              <button onClick={toggleLike}
                className={`flex items-center gap-1.5 h-9 px-4 rounded-full transition-colors active:opacity-70 ${liked ? "bg-[#e8f1fd] text-[#0071e3]" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
                <ThumbsUp size={15} className={liked ? "fill-[#0071e3]" : ""} />
                <span className="text-[14px] font-semibold">{likeCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-[#6e6e73]">
                <MessageSquare size={15} />
                <span className="text-[14px]">{comments.length}</span>
              </div>
              <button className="ml-auto flex items-center gap-1 text-[#6e6e73] active:opacity-60">
                <Flag size={14} />
                <span className="text-[13px]">신고</span>
              </button>
            </div>
          )}
        </article>

        {/* Comments */}
        <div className="px-5 py-4">
          <p className="text-[15px] font-bold text-[#1d1d1f] mb-4">
            {commentsLoading ? "댓글 로딩 중..." : `댓글 ${comments.length}개`}
          </p>
          <div className="space-y-5">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-sm shrink-0">👤</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-semibold text-[#1d1d1f]">{c.author}</span>
                    <span className="text-[12px] text-[#86868b]">{c.authorDong}</span>
                    <span className="text-[12px] text-[#86868b] ml-auto">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  <p className="text-[15px] text-[#1d1d1f] leading-relaxed">{c.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <button onClick={() => handleCommentLike(c.id)} className="flex items-center gap-1 active:opacity-60">
                      <ThumbsUp size={12} className={commentLikes.has(c.id) ? "text-[#0071e3] fill-[#0071e3]" : "text-[#86868b]"} />
                      <span className={`text-[13px] ${commentLikes.has(c.id) ? "text-[#0071e3]" : "text-[#86868b]"}`}>
                        {c.likeCount}
                      </span>
                    </button>
                    {myCommentIds.has(c.id) && (
                      <button onClick={() => handleDeleteComment(c.id)} disabled={deletingCommentId === c.id}
                        className="flex items-center gap-0.5 text-[#86868b] active:opacity-60 disabled:opacity-40">
                        <Trash2 size={11} />
                        <span className="text-[12px]">{deletingCommentId === c.id ? "삭제 중" : "삭제"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-24" />
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 bg-white border-t border-[#f5f5f7] px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#e8f1fd] flex items-center justify-center text-sm shrink-0">👤</div>
          <div className="flex-1 flex items-center bg-[#f5f5f7] rounded-2xl px-3 py-2 gap-2">
            <input value={commentText} onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && submitComment()}
              placeholder="따뜻한 댓글을 남겨보세요"
              className="flex-1 bg-transparent text-[15px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none" />
            <button onClick={submitComment} disabled={!commentText.trim() || submittingComment}
              className="shrink-0 active:opacity-60 disabled:opacity-30">
              <Send size={18} className="text-[#0071e3]" />
            </button>
          </div>
          <button onClick={() => setAnonymous(!anonymous)}
            className={`shrink-0 text-[12px] font-medium px-2.5 py-1.5 rounded-full transition-colors ${anonymous ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#6e6e73]"}`}>
            익명
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
