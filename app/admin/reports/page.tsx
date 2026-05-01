"use client";
import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw, Trash2, EyeOff, Eye, AlertTriangle, MessageSquare, Flag,
  ChevronDown, ChevronUp,
} from "lucide-react";
import {
  adminFetchReportedPosts, adminFetchReportedComments,
  adminDeleteReportsForPost, adminDeleteReportsForComment,
  adminSetPostHidden,
  type ReportedPostSummary, type ReportedCommentSummary,
} from "@/lib/db/admin-reports";
import { adminDeletePost, adminDeleteComment } from "@/lib/db/admin-community";
import { REPORT_REASON_LABELS, type ReportReason } from "@/lib/db/reports";

type Tab = "posts" | "comments";

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

function ReasonBadge({ reason }: { reason: ReportReason }) {
  const colors: Record<ReportReason, string> = {
    illegal: "bg-[#FEE2E2] text-[#DC2626]",
    obscene: "bg-[#FCE7F3] text-[#BE185D]",
    privacy: "bg-[#FEF3C7] text-[#92400E]",
    harassment: "bg-[#FEE2E2] text-[#B91C1C]",
    hate: "bg-[#F3E8FF] text-[#7E22CE]",
    spam: "bg-[#E0F2FE] text-[#0369A1]",
    other: "bg-[#F3F4F6] text-[#4B5563]",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors[reason]}`}>
      {REPORT_REASON_LABELS[reason]}
    </span>
  );
}

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>("posts");
  const [postSummaries, setPostSummaries] = useState<ReportedPostSummary[]>([]);
  const [commentSummaries, setCommentSummaries] = useState<ReportedCommentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [posts, comments] = await Promise.all([
        adminFetchReportedPosts(),
        adminFetchReportedComments(),
      ]);
      setPostSummaries(posts);
      setCommentSummaries(comments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleHidePost(s: ReportedPostSummary) {
    if (!confirm(`"${s.post.title}" 게시글을 숨김 처리할까요?\n공개 피드에서 즉시 사라집니다.`)) return;
    await adminSetPostHidden(s.post.id, true);
    setPostSummaries(prev => prev.map(p =>
      p.post.id === s.post.id ? { ...p, post: { ...p.post, is_hidden: true } } : p
    ));
  }

  async function handleUnhidePost(s: ReportedPostSummary) {
    await adminSetPostHidden(s.post.id, false);
    setPostSummaries(prev => prev.map(p =>
      p.post.id === s.post.id ? { ...p, post: { ...p.post, is_hidden: false } } : p
    ));
  }

  async function handleDeletePost(s: ReportedPostSummary) {
    if (!confirm(`"${s.post.title}" 게시글을 영구 삭제할까요?\n댓글과 신고 기록도 함께 삭제됩니다.`)) return;
    await adminDeletePost(s.post.id);
    await adminDeleteReportsForPost(s.post.id);
    setPostSummaries(prev => prev.filter(p => p.post.id !== s.post.id));
  }

  async function handleDismissPost(s: ReportedPostSummary) {
    if (!confirm("이 게시글의 모든 신고를 무시(삭제)할까요?")) return;
    await adminDeleteReportsForPost(s.post.id);
    setPostSummaries(prev => prev.filter(p => p.post.id !== s.post.id));
  }

  async function handleDeleteComment(s: ReportedCommentSummary) {
    if (!confirm("이 댓글을 영구 삭제할까요?")) return;
    await adminDeleteComment(s.comment.id);
    await adminDeleteReportsForComment(s.comment.id);
    setCommentSummaries(prev => prev.filter(c => c.comment.id !== s.comment.id));
  }

  async function handleDismissComment(s: ReportedCommentSummary) {
    if (!confirm("이 댓글의 모든 신고를 무시(삭제)할까요?")) return;
    await adminDeleteReportsForComment(s.comment.id);
    setCommentSummaries(prev => prev.filter(c => c.comment.id !== s.comment.id));
  }

  const totalPosts = postSummaries.length;
  const totalComments = commentSummaries.length;
  const totalReports = postSummaries.reduce((acc, s) => acc + s.reportCount, 0)
    + commentSummaries.reduce((acc, s) => acc + s.reportCount, 0);

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[18px] md:text-[20px] font-extrabold text-[#191F28] flex items-center gap-2">
            <Flag size={18} className="text-[#F04452]" /> 신고 관리
          </h1>
          <p className="text-[12px] text-[#8B95A1] mt-0.5">
            게시글 {totalPosts}건 · 댓글 {totalComments}건 · 누적 신고 {totalReports}회
          </p>
        </div>
        <button onClick={load}
          className="p-2 rounded-xl border border-[#E5E8EB] hover:bg-[#F2F4F6]">
          <RefreshCw size={15} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-[#F2F4F6] p-1 rounded-xl w-full max-w-sm">
        <button onClick={() => setTab("posts")}
          className={`flex-1 h-9 rounded-lg text-[13px] font-bold transition-all ${
            tab === "posts" ? "bg-white text-[#191F28] shadow-sm" : "text-[#8B95A1]"
          }`}>
          게시글 ({totalPosts})
        </button>
        <button onClick={() => setTab("comments")}
          className={`flex-1 h-9 rounded-lg text-[13px] font-bold transition-all ${
            tab === "comments" ? "bg-white text-[#191F28] shadow-sm" : "text-[#8B95A1]"
          }`}>
          댓글 ({totalComments})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] py-12 text-center text-[#B0B8C1] text-[13px]">
          신고 목록 로딩 중...
        </div>
      ) : tab === "posts" ? (
        postSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] py-12 flex flex-col items-center gap-2">
            <AlertTriangle size={28} className="text-[#B0B8C1]" />
            <p className="text-[13px] text-[#8B95A1]">신고된 게시글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {postSummaries.map(s => {
              const expanded = expandedId === `p:${s.post.id}`;
              return (
                <div key={s.post.id} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">
                            🚩 신고 {s.reportCount}건
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F2F4F6] text-[#4E5968]">
                            {s.post.category}
                          </span>
                          {s.post.is_hidden && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1F2937] text-white">
                              숨김 처리됨
                            </span>
                          )}
                          <ReasonBadge reason={s.latestReason} />
                          <span className="text-[11px] text-[#B0B8C1]">{timeAgo(s.latestReportedAt)}</span>
                        </div>
                        <p className="text-[14px] font-bold text-[#191F28] break-words">{s.post.title}</p>
                        <p className="text-[12px] text-[#4E5968] mt-1 line-clamp-2 break-words">{s.post.content}</p>
                        <p className="text-[11px] text-[#8B95A1] mt-1">
                          작성자: {s.post.is_anonymous ? "익명" : s.post.author} · {s.post.author_dong}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {s.post.is_hidden ? (
                        <button onClick={() => handleUnhidePost(s)}
                          className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#F2F4F6] text-[12px] font-semibold text-[#4E5968] hover:bg-[#E5E8EB]">
                          <Eye size={13} /> 숨김 해제
                        </button>
                      ) : (
                        <button onClick={() => handleHidePost(s)}
                          className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#FEF3C7] text-[12px] font-semibold text-[#92400E] hover:opacity-80">
                          <EyeOff size={13} /> 숨김 처리
                        </button>
                      )}
                      <button onClick={() => handleDeletePost(s)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#FEE2E2] text-[12px] font-semibold text-[#DC2626] hover:opacity-80">
                        <Trash2 size={13} /> 삭제
                      </button>
                      <button onClick={() => handleDismissPost(s)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[#E5E8EB] text-[12px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6]">
                        신고 무시
                      </button>
                      <button onClick={() => setExpandedId(expanded ? null : `p:${s.post.id}`)}
                        className="ml-auto flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold text-[#3182F6] hover:bg-[#EFF6FF]">
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {expanded ? "닫기" : `신고 ${s.reportCount}건 보기`}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[#F2F4F6] bg-[#FAFBFC] divide-y divide-[#F2F4F6]">
                      {s.reports.map(r => (
                        <div key={r.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <ReasonBadge reason={r.reason} />
                            <span className="text-[12px] font-semibold text-[#4E5968]">{r.reporter_nickname}</span>
                            <span className="text-[11px] text-[#B0B8C1]">{timeAgo(r.created_at)}</span>
                          </div>
                          {r.detail && (
                            <p className="text-[12px] text-[#191F28] whitespace-pre-wrap break-words">{r.detail}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        commentSummaries.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E8EB] py-12 flex flex-col items-center gap-2">
            <AlertTriangle size={28} className="text-[#B0B8C1]" />
            <p className="text-[13px] text-[#8B95A1]">신고된 댓글이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commentSummaries.map(s => {
              const expanded = expandedId === `c:${s.comment.id}`;
              return (
                <div key={s.comment.id} className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626]">
                        🚩 신고 {s.reportCount}건
                      </span>
                      <ReasonBadge reason={s.latestReason} />
                      <span className="text-[11px] text-[#B0B8C1]">{timeAgo(s.latestReportedAt)}</span>
                    </div>
                    {s.comment.post_title && (
                      <p className="text-[11px] text-[#8B95A1] mb-1 flex items-center gap-1">
                        <MessageSquare size={11} /> 원글: {s.comment.post_title}
                      </p>
                    )}
                    <p className="text-[13px] text-[#191F28] whitespace-pre-wrap break-words">{s.comment.content}</p>
                    <p className="text-[11px] text-[#8B95A1] mt-1">
                      작성자: {s.comment.is_anonymous ? "익명" : s.comment.author} · {s.comment.author_dong}
                    </p>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <button onClick={() => handleDeleteComment(s)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg bg-[#FEE2E2] text-[12px] font-semibold text-[#DC2626] hover:opacity-80">
                        <Trash2 size={13} /> 댓글 삭제
                      </button>
                      <button onClick={() => handleDismissComment(s)}
                        className="flex items-center gap-1 h-8 px-3 rounded-lg border border-[#E5E8EB] text-[12px] font-semibold text-[#4E5968] hover:bg-[#F2F4F6]">
                        신고 무시
                      </button>
                      <button onClick={() => setExpandedId(expanded ? null : `c:${s.comment.id}`)}
                        className="ml-auto flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold text-[#3182F6] hover:bg-[#EFF6FF]">
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {expanded ? "닫기" : `신고 ${s.reportCount}건 보기`}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-[#F2F4F6] bg-[#FAFBFC] divide-y divide-[#F2F4F6]">
                      {s.reports.map(r => (
                        <div key={r.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <ReasonBadge reason={r.reason} />
                            <span className="text-[12px] font-semibold text-[#4E5968]">{r.reporter_nickname}</span>
                            <span className="text-[11px] text-[#B0B8C1]">{timeAgo(r.created_at)}</span>
                          </div>
                          {r.detail && (
                            <p className="text-[12px] text-[#191F28] whitespace-pre-wrap break-words">{r.detail}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
