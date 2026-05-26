"use client";
import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight, ThumbsUp, MessageSquare, Share2,
  MoreHorizontal, Send, Flag, Bookmark, Trash2, Pencil, Play, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { posts } from "@/lib/mockData";
import { formatRelativeTime } from "@/lib/utils";
import {
  fetchDBPost, deletePost, togglePostLike, isMockPostId,
} from "@/lib/db/posts";
import {
  fetchComments, createComment, deleteComment, toggleCommentLike,
  type DBComment,
} from "@/lib/db/comments";
import { syncCommentCount } from "@/lib/db/posts";
import type { Post } from "@/lib/types";
import ThreadAvatar from "@/components/ui/ThreadAvatar";
import { getUserProfile, getLocalUserId } from "@/lib/db/userdata";

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
  생활정보: "bg-[#F0FDF4] text-[#166534]",
  "육아/교육": "bg-[#FFF7ED] text-[#9A3412]",
  "취미/운동": "bg-[#EFF6FF] text-[#1D4ED8]",
  반려동물: "bg-[#FDF4FF] text-[#7E22CE]",
  교통정보: "bg-[#F0F9FF] text-[#0369A1]",
  이웃모임: "bg-[#FFF1F2] text-[#BE123C]",
  "공구/나눔": "bg-[#FFFBEB] text-[#92400E]",
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

// 영상: 첫 프레임을 썸네일로 노출 (#t=0.1 미디어 프래그먼트), 탭하면 재생
function PostVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative w-full bg-black rounded-xl overflow-hidden">
      <video
        ref={ref}
        src={`${src}#t=0.1`}
        preload="metadata"
        playsInline
        controls={playing}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="w-full max-h-[70vh] object-contain"
      />
      {!playing && (
        <button
          type="button"
          aria-label="영상 재생"
          onClick={() => ref.current?.play()}
          className="absolute inset-0 flex items-center justify-center bg-black/15 active:bg-black/25"
        >
          <span className="w-14 h-14 rounded-full bg-black/55 flex items-center justify-center">
            <Play size={26} className="text-white fill-white ml-0.5" />
          </span>
        </button>
      )}
    </div>
  );
}

function ImageLightbox({
  images,
  startIndex,
  onClose,
}: {
  images: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [zoom, setZoom] = useState(1);
  const lastDist = useRef<number | null>(null);
  const clamp = (z: number) => Math.min(5, Math.max(1, z));

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDist.current = Math.sqrt(dx * dx + dy * dy);
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setZoom(z => clamp(z * (dist / lastDist.current!)));
      lastDist.current = dist;
    }
  }
  function onTouchEnd() { lastDist.current = null; }

  function prev() { setIdx(i => i - 1); setZoom(1); }
  function next() { setIdx(i => i + 1); setZoom(1); }

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black flex items-center justify-center select-none"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* 닫기 */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center active:opacity-70">
        <X size={20} className="text-white" />
      </button>

      {/* 이미지 카운터 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/60 rounded-full text-white text-[13px]">
          {idx + 1} / {images.length}
        </div>
      )}

      {/* 이미지 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[idx]}
        alt=""
        draggable={false}
        style={{
          transform: `scale(${zoom})`,
          transition: lastDist.current ? "none" : "transform 0.15s",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
        onClick={e => e.stopPropagation()}
      />

      {/* 이전/다음 */}
      {idx > 0 && (
        <button onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center active:opacity-70">
          <ChevronLeft size={22} className="text-white" />
        </button>
      )}
      {idx < images.length - 1 && (
        <button onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center active:opacity-70">
          <ChevronRight size={22} className="text-white" />
        </button>
      )}

      {/* 확대/축소 버튼 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-4 bg-black/60 rounded-full px-5 py-2.5">
        <button onClick={() => setZoom(z => clamp(z - 0.5))} className="text-white active:opacity-70">
          <ZoomOut size={20} />
        </button>
        <span className="text-white text-[13px] w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => clamp(z + 0.5))} className="text-white active:opacity-70">
          <ZoomIn size={20} />
        </button>
      </div>
    </div>
  );
}

function PostMedia({
  images,
  videos,
  onImageClick,
}: {
  images: string[];
  videos: string[];
  onImageClick: (index: number) => void;
}) {
  if (images.length === 0 && videos.length === 0) return null;
  return (
    <div className="mt-5 space-y-2">
      {images.length > 0 && (
        <div
          className={`grid gap-1.5 ${
            images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="relative bg-[#f5f5f7] rounded-xl overflow-hidden cursor-zoom-in active:opacity-80"
              style={{ aspectRatio: images.length === 1 ? "auto" : "1/1" }}
              onClick={() => onImageClick(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className={
                  images.length === 1
                    ? "w-full max-h-[70vh] object-contain"
                    : "w-full h-full object-cover"
                }
              />
            </div>
          ))}
        </div>
      )}
      {videos.map((src, i) => (
        <PostVideo key={i} src={src} />
      ))}
    </div>
  );
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
  const [commentLikes, setCommentLikes] = useState<Set<string>>(new Set());
  const [submittingComment, setSubmittingComment] = useState(false);

  // 수정/삭제
  const [isMyPost, setIsMyPost] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const [myCommentIds, setMyCommentIds] = useState<Set<string>>(new Set());
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [commentAuthor, setCommentAuthor] = useState("검단주민");
  const [commentAuthorDong, setCommentAuthorDong] = useState("검단");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

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

  // 로그인 사용자 프로필 로드
  useEffect(() => {
    const uid = getLocalUserId();
    setIsLoggedIn(!!uid);
    if (uid) {
      getUserProfile().then(p => {
        setCommentAuthor(p.nickname);
        setCommentAuthorDong(p.dong);
      });
    }
  }, []);

  // 공유하기
  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title ?? "검단 커뮤니티 글";
    const showToast = (msg: string) => {
      setShareToast(msg);
      setTimeout(() => setShareToast(null), 2000);
    };
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* 취소 */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        showToast("링크가 복사됐어요 🔗");
      } catch {
        showToast("링크 복사에 실패했어요");
      }
    }
  };

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
    if (!isLoggedIn) { router.push("/login/"); return; }
    setSubmittingComment(true);
    if (isMock) {
      // mock 포스트는 클라이언트 상태에만 추가
      setComments(prev => [...prev, {
        id: `c${Date.now()}`, postId,
        author: commentAuthor,
        authorDong: commentAuthorDong,
        content: commentText.trim(),
        likeCount: 0, isAnonymous: false,
        createdAt: new Date().toISOString(),
      }]);
    } else {
      const saved = await createComment({
        postId, author: commentAuthor, authorDong: commentAuthorDong,
        content: commentText.trim(), isAnonymous: false,
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
          <button onClick={() => router.push('/community')}><ChevronLeft size={24} className="text-[#1d1d1f]" /></button>
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
        <button onClick={() => router.push('/community')} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setBookmarked(!bookmarked)} className="active:opacity-60">
            <Bookmark size={22} className={bookmarked ? "text-[#0071e3] fill-[#0071e3]" : "text-[#6e6e73]"} />
          </button>
          <button onClick={handleShare} className="active:opacity-60">
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
                    onClick={() => { setShowMenu(false); router.push(`/community/edit/${postId}`); }}
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

          <h1 className="text-[21px] font-bold text-[#1d1d1f] leading-snug mb-4">{post.title}</h1>
          <div className="flex items-center gap-3 mb-5">
            <ThreadAvatar name={post.author} src={post.authorAvatarUrl} size={36} />
            <div>
              <p className="text-[15px] font-semibold text-[#1d1d1f]">{post.author}</p>
              <p className="text-[13px] text-[#6e6e73]">{post.authorDong} · {formatRelativeTime(post.createdAt)} · 조회 {post.viewCount.toLocaleString()}</p>
            </div>
          </div>
          <p className="text-[16px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">{post.content}</p>
          <PostMedia
            images={post.images ?? []}
            videos={post.videos ?? []}
            onImageClick={(i) => setLightbox({ images: post.images ?? [], index: i })}
          />

          {/* Reaction bar */}
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
      <div className="sticky bottom-0 bg-white border-t border-[#f5f5f7] px-4 py-3">
        {isLoggedIn === false ? (
          <button
            onClick={() => router.push("/login/")}
            className="w-full h-11 rounded-2xl bg-[#f5f5f7] text-[14px] text-[#86868b] font-medium active:bg-[#e5e5ea] transition-colors"
          >
            댓글을 작성하려면 로그인해주세요
          </button>
        ) : (
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
          </div>
        )}
      </div>

      {/* 공유 토스트 */}
      {shareToast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-16 z-50 px-4 py-2.5 bg-black/80 text-white text-[13px] rounded-xl pointer-events-none whitespace-nowrap">
          {shareToast}
        </div>
      )}

      {/* 이미지 라이트박스 */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

export default function DetailPage() {
  return <Suspense><DetailContent /></Suspense>;
}
