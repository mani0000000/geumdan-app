/**
 * community_comments CRUD
 *
 * 읽기: Supabase anon client (SELECT은 RLS 없어도 공개 허용)
 * 쓰기: /api/admin/db 서버 라우트 (service key → RLS 우회)
 *
 * ── Supabase에서 먼저 실행하세요 ──────────────────────────────
 *
 * CREATE TABLE community_comments (
 *   id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *   post_id     TEXT NOT NULL,
 *   author      TEXT NOT NULL DEFAULT '익명',
 *   author_dong TEXT NOT NULL DEFAULT '검단',
 *   content     TEXT NOT NULL,
 *   like_count  INTEGER DEFAULT 0,
 *   is_anonymous BOOLEAN DEFAULT FALSE,
 *   created_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public read"   ON community_comments FOR SELECT USING (true);
 * CREATE POLICY "public write"  ON community_comments FOR INSERT WITH CHECK (true);
 * CREATE POLICY "public update" ON community_comments FOR UPDATE USING (true);
 * CREATE POLICY "public delete" ON community_comments FOR DELETE USING (true);
 *
 * CREATE INDEX idx_comments_post_id    ON community_comments(post_id);
 * CREATE INDEX idx_comments_created_at ON community_comments(created_at ASC);
 */

import { supabase } from '@/lib/supabase';

export interface DBComment {
  id: string;
  postId: string;
  author: string;
  authorDong: string;
  content: string;
  likeCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

function rowToComment(row: Record<string, unknown>): DBComment {
  return {
    id: row.id as string,
    postId: row.post_id as string,
    author: row.author as string,
    authorDong: row.author_dong as string,
    content: row.content as string,
    likeCount: (row.like_count as number) ?? 0,
    isAnonymous: (row.is_anonymous as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

/** 서버 라우트를 통해 service key로 Supabase 쓰기 */
async function dbPost(
  method: "POST" | "PATCH" | "DELETE",
  rows: unknown,
  opts: { eq?: string } = {}
): Promise<Response> {
  return fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table: "community_comments", method, rows, ...opts }),
  });
}

// ── 목록 조회 ────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<DBComment[]> {
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(row => rowToComment(row as Record<string, unknown>));
  } catch (e) {
    console.error('[comments] fetchComments error:', e);
    return [];
  }
}

// ── 작성 ─────────────────────────────────────────────────────
export interface CommentInput {
  postId: string;
  author: string;
  authorDong: string;
  content: string;
  isAnonymous: boolean;
}

export async function createComment(
  input: CommentInput
): Promise<DBComment | null> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row = {
      id,
      post_id: input.postId,
      author: input.author,
      author_dong: input.authorDong,
      content: input.content,
      is_anonymous: input.isAnonymous,
      like_count: 0,
      created_at: now,
    };
    const res = await dbPost("POST", [row]);
    if (!res.ok) {
      const body = await res.text();
      console.error('[comments] createComment server error:', res.status, body);
      return null;
    }
    // 서버 응답에서 실제 row 반환하거나 로컬 객체 반환
    return {
      id,
      postId: input.postId,
      author: input.author,
      authorDong: input.authorDong,
      content: input.content,
      likeCount: 0,
      isAnonymous: input.isAnonymous,
      createdAt: now,
    };
  } catch (e) {
    console.error('[comments] createComment error:', e);
    return null;
  }
}

// ── 삭제 ─────────────────────────────────────────────────────
export async function deleteComment(id: string): Promise<boolean> {
  try {
    const res = await dbPost("DELETE", null, { eq: `id=eq.${id}` });
    if (!res.ok) {
      console.error('[comments] deleteComment error:', res.status);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[comments] deleteComment error:', e);
    return false;
  }
}

// ── 좋아요 토글 ───────────────────────────────────────────────
export async function toggleCommentLike(
  id: string,
  delta: 1 | -1
): Promise<void> {
  try {
    // 현재값 조회
    const { data } = await supabase
      .from('community_comments')
      .select('like_count')
      .eq('id', id)
      .single();
    const current = (data as Record<string, number> | null)?.like_count ?? 0;
    await dbPost("PATCH", { like_count: Math.max(0, current + delta) }, { eq: `id=eq.${id}` });
  } catch { /* silent */ }
}

// ── 내 댓글 조회 ──────────────────────────────────────────────
export interface MyCommentWithPost extends DBComment {
  postTitle?: string;
  postCategory?: string;
}

export async function fetchMyComments(userId: string): Promise<MyCommentWithPost[]> {
  try {
    // author_user_id 컬럼으로 필터 (없으면 빈 배열 반환)
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('author_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];

    const comments = (data ?? []).map(
      row => rowToComment(row as Record<string, unknown>) as MyCommentWithPost
    );

    // 게시글 제목/카테고리 일괄 조회
    const postIds = [...new Set(comments.map(c => c.postId))];
    if (postIds.length > 0) {
      const { data: posts } = await supabase
        .from('community_posts')
        .select('id,title,category')
        .in('id', postIds);
      if (posts) {
        const postMap = new Map(
          (posts as { id: string; title: string; category: string }[]).map(p => [p.id, p])
        );
        comments.forEach(c => {
          const post = postMap.get(c.postId);
          if (post) { c.postTitle = post.title; c.postCategory = post.category; }
        });
      }
    }

    return comments;
  } catch {
    return [];
  }
}
