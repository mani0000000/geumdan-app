"use client";
import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Share2, Send,
  MoreHorizontal, Flag, Bookmark, Trash2, Pencil, X, Check,
  Heart, MessageCircle, Repeat2,
} from "lucide-react";
import ThreadAvatar from "@/components/ui/ThreadAvatar";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import { PostMenu } from "@/components/ui/PostMenu";
import { ReportModal } from "@/components/ui/ReportModal";
import {
  fetchDBPost, deletePost, updatePost, togglePostLike, isMockPostId, fetchPostOwner,
} from "@/lib/db/posts";
import {
  fetchComments, createComment, deleteComment, toggleCommentLike, updateComment,
  type DBComment,
} from "@/lib/db/comments";
import { syncCommentCount } from "@/lib/db/posts";
import { getOrCreateUserId, getUserProfile, touchLastActive } from "@/lib/db/userdata";
import { createNotification } from "@/lib/db/notifications";
import {
  fetchHiddenPostIds, hidePost, unhidePost, reportPost, reportComment,
  type ReportReason,
} from "@/lib/db/reports";
import { getMyNickname } from "@/lib/identity";
import type { Post } from "@/lib/types";

// mock 댓글 (mock 포스트 전용 초기 데이터)
const MOCK_COMMENTS: DBComment[] = [
  { id: "c1", postId: "", author: "이웃주민",   authorDong: "당하동", authorAvatarUrl: null, authorUserId: null, content: "정보 공유 감사해요! 저도 궁금했는데 도움이 됐어요 😊",                              likeCount: 5, isAnonymous: false, createdAt: "2026-03-28T10:45:00" },
  { id: "c2", postId: "", author: "검단맘",     authorDong: "원당동", authorAvatarUrl: null, authorUserId: null, content: "우리 아이 다니는 곳이랑 비슷하네요. 국공립이 제일 좋은 것 같아요.",               likeCount: 3, isAnonymous: false, createdAt: "2026-03-28T11:20:00" },
  { id: "c3", postId: "", author: "신혼부부",   authorDong: "대곡동", authorAvatarUrl: null, authorUserId: null, content: "저도 내년에 알아봐야 하는데... 혹시 대기 얼마나 걸리나요?",                       likeCount: 1, isAnonymous: false, createdAt: "2026-03-28T12:05:00" },
  { id: "c4", postId: "", author: "육아맘김씨", authorDong: "당하동", authorAvatarUrl: null, authorUserId: null, content: "댓글 주셔서 감사해요! 국공립은 보통 1~2년 대기예요 ㅠㅠ 미리미리 신청해두세요!", likeCount: 8, isAnonymous: false, createdAt: "2026-03-28T12:30:00" },
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

type ReportTarget =
  | { kind: "post"; id: string }
  | { kind: "comment"; id: string }
  | null;

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
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const [meAvatar, setMeAvatar] = useState<string | null>(null);
  const [meNickname, setMeNickname] = useState("검단주민");
  const [meDong, setMeDong] = useState("검단");

  useEffect(() => {
    getUserProfile().then(p => {
      setMeAvatar(p.avatar_url);
      setMeNickname(p.nickname);
      setMeDong(p.dong);
    });
  }, []);

  // 신고/숨기기
  const [reportTarget, setReportTarget] = useState<ReportTarget>(null);
  const [hidden, setHidden] = useState(false);
  const [hideToast, setHideToast] = useState("");

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
          router.replace("/community/");
          return;
        }
      }
      setPost(found);
      setLikeCount(found.likeCount);
      setIsMyPost(!isMock && getMyPostIds().includes(postId));
      setPostLoading(false);

      // 숨김 여부 확인
      if (!isMock) {
        const ids = await fetchHiddenPostIds(getMyNickname());
        setHidden(ids.has(postId));
      }
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
    const wasLiked = liked;
    const delta = wasLiked ? -1 : 1;
    setLiked(!wasLiked);
    setLikeCount(c => c + delta);
    if (isMock) return;
    await togglePostLike(postId, delta);
    if (!wasLiked) {
      // 좋아요 추가 시 글 작성자에게 알림
      try {
        const owner = await fetchPostOwner(postId);
        const myUid = await getOrCreateUserId();
        if (owner?.userId && owner.userId !== myUid) {
          await createNotification({
            userId: owner.userId,
            type: "post_like",
            title: "내 글에 좋아요가 눌렸어요",
            body: owner.title ?? "",
            relatedId: postId,
            relatedType: "post",
          });
        }
      } catch { /* silent */ }
    }
  };

  // 댓글 작성
  const submitComment = async () => {
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    if (isMock) {
      // mock 포스트는 클라이언트 상태에만 추가
      const profile = await getUserProfile();
      setComments(prev => [...prev, {
        id: `c${Date.now()}`, postId,
        author: profile.nickname,
        authorDong: profile.dong,
        authorAvatarUrl: profile.avatar_url ?? null,
        authorUserId: profile.id,
        content: commentText.trim(),
        likeCount: 0, isAnonymous: false,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      const myUid = await getOrCreateUserId();
      const saved = await createComment({
        postId,
        author: meNickname,
        authorDong: meDong,
        authorAvatarUrl: meAvatar,
        userId: myUid,
        content: commentText.trim(),
        isAnonymous: false,
      });
      if (saved) {
        setComments(prev => [...prev, saved]);
        saveMyCommentId(saved.id);
        setMyCommentIds(prev => new Set([...prev, saved.id]));
        await syncCommentCount(postId, 1);
        setPost(prev => prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev);
        // 글 작성자에게 댓글 알림
        try {
          const owner = await fetchPostOwner(postId);
          if (owner?.userId && owner.userId !== myUid) {
            await createNotification({
              userId: owner.userId,
              type: "post_comment",
              title: "내 글에 새 댓글이 달렸어요",
              body: saved.content.slice(0, 80),
              relatedId: postId,
              relatedType: "post",
            });
          }
        } catch { /* silent */ }
      }
      void touchLastActive();
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
    const isLiked = commentLikes.has(id);
    setCommentLikes(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setComments(prev => prev.map(c =>
      c.id === id ? { ...c, likeCount: c.likeCount + (isLiked ? -1 : 1) } : c
    ));
    if (!isMock) await toggleCommentLike(id, isLiked ? -1 : 1);
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

  // 숨기기 / 숨김 해제
  const handleHidePost = async () => {
    if (isMock) {
      setHidden(true);
      setHideToast("이 글을 숨겼어요");
      setTimeout(() => router.replace("/community/"), 600);
      return;
    }
    const ok = await hidePost(postId, getMyNickname());
    if (ok) {
      setHidden(true);
      setHideToast("이 글을 숨겼어요");
      setTimeout(() => router.replace("/community/"), 600);
    }
  };
  const handleUnhidePost = async () => {
    if (isMock) { setHidden(false); return; }
    const ok = await unhidePost(postId, getMyNickname());
    if (ok) setHidden(false);
  };

  // 신고 제출
  const handleSubmitReport = async (reason: ReportReason, detail: string) => {
    if (!reportTarget) return;
    const reporterNickname = getMyNickname();
    if (reportTarget.kind === "post") {
      if (!isMock) {
        await reportPost({ postId: reportTarget.id, reporterNickname, reason, detail });
      }
    } else {
      if (!isMock) {
        await reportComment({ commentId: reportTarget.id, reporterNickname, reason, detail });
      }
    }
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
            <PostMenu
              isHidden={hidden}
              onHide={handleHidePost}
              onUnhide={handleUnhidePost}
              onReport={() => setReportTarget({ kind: "post", id: postId })}
              size={22}
            />
          )}
        </div>
      </div>

      {/* Scrollable content — Threads-style */}
      <div className="flex-1 overflow-y-auto" onClick={() => setShowMenu(false)}>
        {/* OP post (thread root) */}
        <article className="px-4 pt-4 pb-2">
          <div className="flex gap-3">
            {/* Avatar column with thread-line extending below */}
            <div className="flex flex-col items-center w-10 shrink-0">
              <ThreadAvatar name={post.author} src={post.authorAvatarUrl} size={40} />
              {!editMode && (comments.length > 0 || commentsLoading) && (
                <div className="w-0.5 flex-1 bg-[#e5e5ea] mt-2" />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-[15px] font-bold text-[#1d1d1f]">{post.author}</span>
                <span className="text-[13px] text-[#86868b]">· {post.authorDong}</span>
                <span className="text-[13px] text-[#86868b]">· {formatRelativeTime(post.createdAt)}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${catColor[post.category] ?? "bg-[#e8f1fd] text-[#0071e3]"}`}>
                  {post.category}
                </span>
                {post.isPinned && <span className="text-[11px] text-[#0071e3] font-medium">📌 공지</span>}
              </div>

              {editMode ? (
                <div className="space-y-3 mt-3">
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} maxLength={50}
                    className="w-full text-[18px] font-bold text-[#1d1d1f] outline-none border-b border-[#0071e3] pb-1" />
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
                    rows={6}
                    className="w-full text-[15px] text-[#1d1d1f] outline-none border border-[#d2d2d7] rounded-xl p-3 resize-none leading-relaxed" />
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
                  <p className="text-[17px] font-semibold text-[#1d1d1f] mt-2 leading-snug">{post.title}</p>
                  <p className="text-[15px] text-[#1d1d1f] leading-relaxed whitespace-pre-line mt-1.5">{post.content}</p>
                  {post.images && post.images.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {post.images.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="w-full rounded-xl border border-[#e5e5ea] object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-[12px] text-[#86868b] mt-3">조회 {post.viewCount.toLocaleString()}</p>

                  {/* Action row */}
                  <div className="flex items-center gap-1 mt-2 -ml-2">
                    <button onClick={toggleLike}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full active:bg-[#f5f5f7] ${liked ? "text-[#F04452]" : "text-[#6e6e73]"}`}>
                      <Heart size={18} className={liked ? "fill-[#F04452]" : ""} />
                      <span className="text-[13px]">{likeCount}</span>
                    </button>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 text-[#6e6e73]">
                      <MessageCircle size={18} />
                      <span className="text-[13px]">{comments.length}</span>
                    </div>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[#6e6e73] active:bg-[#f5f5f7]">
                      <Repeat2 size={18} />
                    </button>
                    <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-[#6e6e73] active:bg-[#f5f5f7]">
                      <Send size={17} />
                    </button>
                    {!isMyPost && (
                      <button
                        onClick={() => setReportTarget({ kind: "post", id: postId })}
                        className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-full text-[#86868b] active:bg-[#f5f5f7]">
                        <Flag size={13} />
                        <span className="text-[12px]">신고</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </article>

        {/* Comments — same thread style, no indentation, connected by vertical line */}
        {commentsLoading ? (
          <div className="px-4 pb-4 flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 w-40 bg-[#f5f5f7] rounded" />
              <div className="h-3 w-3/4 bg-[#f5f5f7] rounded" />
            </div>
          </div>
        ) : comments.length === 0 ? (
          <div className="px-5 pb-8 pt-2 text-center">
            <p className="text-[13px] text-[#86868b]">아직 댓글이 없어요. 첫 댓글을 남겨보세요!</p>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {comments.map((c, idx) => {
              const isLast = idx === comments.length - 1;
              const isLiked = commentLikes.has(c.id);
              const isMine = myCommentIds.has(c.id);
              const isEditing = editCommentId === c.id;
              return (
                <div key={c.id} className="flex gap-3">
                  {/* Avatar column with line continuing to next comment */}
                  <div className="flex flex-col items-center w-10 shrink-0">
                    <ThreadAvatar name={c.author} src={c.authorAvatarUrl} size={36} />
                    {!isLast && <div className="w-0.5 flex-1 bg-[#e5e5ea] mt-2" />}
                  </div>

                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-[14px] font-bold text-[#1d1d1f]">{c.author}</span>
                      <span className="text-[12px] text-[#86868b]">· {c.authorDong}</span>
                      <span className="text-[12px] text-[#86868b]">· {formatRelativeTime(c.createdAt)}</span>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 mt-1.5">
                        <textarea value={editCommentText} onChange={e => setEditCommentText(e.target.value)} rows={3}
                          className="w-full text-[15px] text-[#1d1d1f] outline-none border border-[#d2d2d7] rounded-xl p-2 resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => setEditCommentId(null)}
                            className="h-8 px-3 rounded-lg border border-[#d2d2d7] text-[13px] text-[#6e6e73] active:opacity-60">취소</button>
                          <button
                            onClick={async () => {
                              if (!editCommentText.trim()) return;
                              const ok = isMock ? true : await updateComment(c.id, editCommentText.trim());
                              if (ok) {
                                setComments(prev => prev.map(x => x.id === c.id ? { ...x, content: editCommentText.trim() } : x));
                                setEditCommentId(null);
                              }
                            }}
                            className="h-8 px-3 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold active:opacity-80">저장</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[15px] text-[#1d1d1f] leading-relaxed mt-1 whitespace-pre-line">{c.content}</p>
                    )}

                    <div className="flex items-center gap-1 mt-1.5 -ml-2">
                      <button onClick={() => handleCommentLike(c.id)}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-full active:bg-[#f5f5f7] ${isLiked ? "text-[#F04452]" : "text-[#86868b]"}`}>
                        <Heart size={14} className={isLiked ? "fill-[#F04452]" : ""} />
                        <span className="text-[12px]">{c.likeCount}</span>
                      </button>
                      {isMine && !isEditing && (
                        <>
                          <button onClick={() => { setEditCommentId(c.id); setEditCommentText(c.content); }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[#86868b] active:bg-[#f5f5f7]">
                            <Pencil size={12} />
                            <span className="text-[12px]">수정</span>
                          </button>
                          <button onClick={() => handleDeleteComment(c.id)} disabled={deletingCommentId === c.id}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[#86868b] active:bg-[#f5f5f7] disabled:opacity-40">
                            <Trash2 size={12} />
                            <span className="text-[12px]">{deletingCommentId === c.id ? "삭제 중" : "삭제"}</span>
                          </button>
                        </>
                      )}
                      {!isMine && (
                        <button onClick={() => setReportTarget({ kind: "comment", id: c.id })}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-full text-[#86868b] active:bg-[#f5f5f7]">
                          <Flag size={12} />
                          <span className="text-[12px]">신고</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="h-24" />
      </div>

      {/* Comment input */}
      <div className="sticky bottom-0 bg-white border-t border-[#f5f5f7] px-4 py-3">
        <div className="flex items-center gap-3">
          <ThreadAvatar name={meNickname} src={meAvatar} size={32} />
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
        </div>
      </div>

      {hideToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#1d1d1f] text-white text-[13px] px-4 py-2 rounded-full z-50">
          {hideToast}
        </div>
      )}

      <ReportModal
        open={!!reportTarget}
        target={reportTarget?.kind ?? "post"}
        onClose={() => setReportTarget(null)}
        onSubmit={handleSubmitReport}
      />
    </div>
  );
}

export default function DetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
