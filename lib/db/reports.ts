/**
 * lib/db/reports.ts
 * Post hide & report actions backed by Supabase.
 * Falls back to localStorage for hiding when Supabase is unavailable.
 */

import { supabase } from '@/lib/supabase';

export type ReportReason =
  | 'spam'
  | 'obscene'
  | 'privacy'
  | 'harassment'
  | 'illegal'
  | 'hate'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: '스팸/광고',
  obscene: '음란물',
  privacy: '개인정보 노출',
  harassment: '욕설/혐오',
  illegal: '불법 콘텐츠',
  hate: '혐오 표현',
  other: '기타',
};

// ─── Hide ────────────────────────────────────────────────────────────────

const HIDDEN_KEY = 'gd_hidden_posts';

export async function fetchHiddenPostIds(nickname: string): Promise<Set<string>> {
  const local = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') as string[];
  return new Set(local);
}

export async function hidePost(postId: string, nickname: string): Promise<boolean> {
  try {
    const current = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') as string[];
    if (!current.includes(postId)) {
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...current, postId]));
    }
    return true;
  } catch {
    return false;
  }
}

export async function unhidePost(postId: string, nickname: string): Promise<boolean> {
  try {
    const current = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]') as string[];
    const next = current.filter(id => id !== postId);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

// ─── Report ──────────────────────────────────────────────────────────────

export async function reportPost(params: {
  postId: string;
  reporterNickname: string;
  reason: ReportReason;
  detail?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('post_reports')
      .insert({
        post_id: params.postId,
        reporter_nickname: params.reporterNickname,
        reason: params.reason,
        detail: params.detail ?? '',
        created_at: new Date().toISOString(),
      });
    return !error;
  } catch {
    return false;
  }
}

export async function reportComment(params: {
  commentId: string;
  reporterNickname: string;
  reason: ReportReason;
  detail?: string;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('comment_reports')
      .insert({
        comment_id: params.commentId,
        reporter_nickname: params.reporterNickname,
        reason: params.reason,
        detail: params.detail ?? '',
        created_at: new Date().toISOString(),
      });
    return !error;
  } catch {
    return false;
  }
}
