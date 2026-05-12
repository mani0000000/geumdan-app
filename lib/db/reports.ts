/**
 * post_reports / post_hidden Supabase CRUD
 * Migration: supabase/migrations/20260502_community_reports.sql
 */

import { supabase } from "@/lib/supabase";

export type ReportReason =
  | "spam"
  | "obscene"
  | "privacy"
  | "harassment"
  | "illegal"
  | "hate"
  | "other";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "불법광고/스팸",
  obscene: "음란/선정성",
  privacy: "개인정보 노출",
  harassment: "명예훼손/욕설",
  illegal: "불법정보",
  hate: "혐오/차별 표현",
  other: "기타",
};

export const REPORT_REASONS: ReportReason[] = [
  "illegal",
  "obscene",
  "privacy",
  "harassment",
  "hate",
  "spam",
  "other",
];

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// ── 신고 ─────────────────────────────────────────────────────
export async function reportPost(input: {
  postId: string;
  reporterNickname: string;
  reason: ReportReason;
  detail?: string;
}): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase.from("post_reports").insert({
      post_id: input.postId,
      reporter_nickname: input.reporterNickname,
      reason: input.reason,
      detail: input.detail ?? null,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[reports] reportPost error:", e);
    return false;
  }
}

export async function reportComment(input: {
  commentId: string;
  reporterNickname: string;
  reason: ReportReason;
  detail?: string;
}): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase.from("post_reports").insert({
      comment_id: input.commentId,
      reporter_nickname: input.reporterNickname,
      reason: input.reason,
      detail: input.detail ?? null,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[reports] reportComment error:", e);
    return false;
  }
}

// ── 숨기기 ───────────────────────────────────────────────────
export async function hidePost(postId: string, hiddenBy: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase
      .from("post_hidden")
      .upsert(
        { post_id: postId, hidden_by: hiddenBy },
        { onConflict: "post_id,hidden_by" }
      );
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[reports] hidePost error:", e);
    return false;
  }
}

export async function unhidePost(postId: string, hiddenBy: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase
      .from("post_hidden")
      .delete()
      .eq("post_id", postId)
      .eq("hidden_by", hiddenBy);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("[reports] unhidePost error:", e);
    return false;
  }
}

export async function fetchHiddenPostIds(hiddenBy: string): Promise<Set<string>> {
  if (!isConfigured() || !hiddenBy) return new Set();
  try {
    const { data, error } = await supabase
      .from("post_hidden")
      .select("post_id")
      .eq("hidden_by", hiddenBy);
    if (error) throw error;
    return new Set((data ?? []).map(r => (r as { post_id: string }).post_id));
  } catch (e) {
    console.error("[reports] fetchHiddenPostIds error:", e);
    return new Set();
  }
}
