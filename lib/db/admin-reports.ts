import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import type { AdminPost, AdminComment } from "@/lib/db/admin-community";
import type { ReportReason } from "@/lib/db/reports";

export interface AdminReport {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_nickname: string;
  reason: ReportReason;
  detail: string | null;
  created_at: string;
}

export interface ReportedPostSummary {
  post: AdminPost;
  reportCount: number;
  latestReason: ReportReason;
  latestDetail: string | null;
  latestReportedAt: string;
  reasons: Record<ReportReason, number>;
  reports: AdminReport[];
}

export interface ReportedCommentSummary {
  comment: AdminComment & { post_title?: string };
  reportCount: number;
  latestReason: ReportReason;
  latestDetail: string | null;
  latestReportedAt: string;
  reports: AdminReport[];
}

export async function adminFetchReports(): Promise<AdminReport[]> {
  return adminApiGet<AdminReport>("post_reports", { order: "created_at.desc", limit: 500 });
}

export async function adminDeleteReport(id: string): Promise<void> {
  await adminApiPost("post_reports", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminDeleteReportsForPost(postId: string): Promise<void> {
  await adminApiPost("post_reports", "DELETE", null, { eq: `post_id=eq.${postId}` });
}

export async function adminDeleteReportsForComment(commentId: string): Promise<void> {
  await adminApiPost("post_reports", "DELETE", null, { eq: `comment_id=eq.${commentId}` });
}

export async function adminSetPostHidden(postId: string, hidden: boolean): Promise<void> {
  await adminApiPost("community_posts", "PATCH",
    { is_hidden: hidden, updated_at: new Date().toISOString() },
    { eq: `id=eq.${postId}` });
}

function emptyReasonMap(): Record<ReportReason, number> {
  return { spam: 0, obscene: 0, privacy: 0, harassment: 0, illegal: 0, hate: 0, other: 0 };
}

export async function adminFetchReportedPosts(): Promise<ReportedPostSummary[]> {
  const reports = await adminFetchReports();
  const postReports = reports.filter(r => r.post_id);
  if (postReports.length === 0) return [];

  const postIds = Array.from(new Set(postReports.map(r => r.post_id!)));
  const posts = await adminApiGet<AdminPost>("community_posts", {
    eq: `id=in.(${postIds.join(",")})`,
    limit: 500,
  });
  const postMap = new Map(posts.map(p => [p.id, p]));

  const grouped = new Map<string, AdminReport[]>();
  for (const r of postReports) {
    const arr = grouped.get(r.post_id!) ?? [];
    arr.push(r);
    grouped.set(r.post_id!, arr);
  }

  const summaries: ReportedPostSummary[] = [];
  for (const [pid, arr] of grouped) {
    const post = postMap.get(pid);
    if (!post) continue;
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    const reasons = emptyReasonMap();
    for (const r of arr) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1;
    summaries.push({
      post,
      reportCount: arr.length,
      latestReason: arr[0].reason,
      latestDetail: arr[0].detail,
      latestReportedAt: arr[0].created_at,
      reasons,
      reports: arr,
    });
  }
  summaries.sort((a, b) => b.latestReportedAt.localeCompare(a.latestReportedAt));
  return summaries;
}

export async function adminFetchReportedComments(): Promise<ReportedCommentSummary[]> {
  const reports = await adminFetchReports();
  const commentReports = reports.filter(r => r.comment_id);
  if (commentReports.length === 0) return [];

  const commentIds = Array.from(new Set(commentReports.map(r => r.comment_id!)));
  const comments = await adminApiGet<AdminComment>("community_comments", {
    eq: `id=in.(${commentIds.join(",")})`,
    limit: 500,
  });
  const commentMap = new Map(comments.map(c => [c.id, c]));

  const postIds = Array.from(new Set(comments.map(c => c.post_id)));
  const posts = postIds.length === 0
    ? []
    : await adminApiGet<AdminPost>("community_posts", {
        select: "id,title",
        eq: `id=in.(${postIds.join(",")})`,
        limit: 500,
      });
  const postTitleMap = new Map(posts.map(p => [p.id, p.title]));

  const grouped = new Map<string, AdminReport[]>();
  for (const r of commentReports) {
    const arr = grouped.get(r.comment_id!) ?? [];
    arr.push(r);
    grouped.set(r.comment_id!, arr);
  }

  const summaries: ReportedCommentSummary[] = [];
  for (const [cid, arr] of grouped) {
    const comment = commentMap.get(cid);
    if (!comment) continue;
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    summaries.push({
      comment: { ...comment, post_title: postTitleMap.get(comment.post_id) },
      reportCount: arr.length,
      latestReason: arr[0].reason,
      latestDetail: arr[0].detail,
      latestReportedAt: arr[0].created_at,
      reports: arr,
    });
  }
  summaries.sort((a, b) => b.latestReportedAt.localeCompare(a.latestReportedAt));
  return summaries;
}
