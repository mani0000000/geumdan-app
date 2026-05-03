/**
 * community_comments Supabase CRUD
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
  authorAvatar: string | null;
  authorId: string | null;
  content: string;
  likeCount: number;
  isAnonymous: boolean;
  createdAt: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const COMMENT_SELECT = '*, users:user_id (nickname, dong, avatar_url, status)';

function rowToComment(row: Record<string, unknown>): DBComment {
  const userRow = (row.users ?? null) as
    | { nickname?: string; dong?: string; avatar_url?: string | null; status?: string }
    | null;
  const isAnonymous = (row.is_anonymous as boolean) ?? false;
  const author = isAnonymous
    ? '익명'
    : (userRow?.nickname ?? (row.author as string));
  const authorDong = isAnonymous
    ? (row.author_dong as string)
    : (userRow?.dong ?? (row.author_dong as string));
  const authorAvatar = isAnonymous ? null : (userRow?.avatar_url ?? null);
  return {
    id: row.id as string,
    postId: row.post_id as string,
    author,
    authorDong,
    authorAvatar,
    authorId: (row.user_id as string | null) ?? null,
    content: row.content as string,
    likeCount: (row.like_count as number) ?? 0,
    isAnonymous,
    createdAt: row.created_at as string,
  };
}

// ── 목록 조회 ────────────────────────────────────────────────
export async function fetchComments(postId: string): Promise<DBComment[]> {
  if (!isConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .select(COMMENT_SELECT)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) {
      const fb = await supabase
        .from('community_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      return (fb.data ?? []).map(row => rowToComment(row as Record<string, unknown>));
    }
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
  userId?: string | null;
}

export async function createComment(
  input: CommentInput
): Promise<DBComment | null> {
  if (!isConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('community_comments')
      .insert({
        post_id: input.postId,
        author: input.author,
        author_dong: input.authorDong,
        content: input.content,
        is_anonymous: input.isAnonymous,
        user_id: input.userId ?? null,
      })
      .select(COMMENT_SELECT)
      .single();
    if (error) throw error;
    return rowToComment(data as Record<string, unknown>);
  } catch (e) {
    console.error('[comments] createComment error:', e);
    return null;
  }
}

// ── 삭제 ─────────────────────────────────────────────────────
export async function deleteComment(id: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
  if (!isConfigured()) return;
  try {
    const { data } = await supabase
      .from('community_comments')
      .select('like_count')
      .eq('id', id)
      .single();
    const current = (data as Record<string, number> | null)?.like_count ?? 0;
    await supabase
      .from('community_comments')
      .update({ like_count: Math.max(0, current + delta) })
      .eq('id', id);
  } catch { /* silent */ }
}
