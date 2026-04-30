/**
 * community_posts Supabase CRUD
 *
 * ── Supabase에서 먼저 실행하세요 ──────────────────────────────
 *
 * CREATE TABLE community_posts (
 *   id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 *   category    TEXT NOT NULL,
 *   title       TEXT NOT NULL,
 *   content     TEXT NOT NULL,
 *   author      TEXT NOT NULL DEFAULT '익명',
 *   author_dong TEXT NOT NULL DEFAULT '검단',
 *   is_anonymous BOOLEAN DEFAULT FALSE,
 *   view_count   INTEGER DEFAULT 0,
 *   like_count   INTEGER DEFAULT 0,
 *   comment_count INTEGER DEFAULT 0,
 *   is_pinned   BOOLEAN DEFAULT FALSE,
 *   is_hot      BOOLEAN DEFAULT FALSE,
 *   created_at  TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at  TIMESTAMPTZ DEFAULT NOW()
 * );
 *
 * ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "public read"  ON community_posts FOR SELECT USING (true);
 * CREATE POLICY "public write" ON community_posts FOR INSERT WITH CHECK (true);
 * CREATE POLICY "public update" ON community_posts FOR UPDATE USING (true);
 * CREATE POLICY "public delete" ON community_posts FOR DELETE USING (true);
 *
 * CREATE INDEX idx_posts_created_at ON community_posts(created_at DESC);
 * CREATE INDEX idx_posts_category   ON community_posts(category);
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Post, CommunityCategory } from '@/lib/types';

function isConfigured(): boolean {
  return isSupabaseConfigured;
}

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    category: row.category as CommunityCategory,
    title: row.title as string,
    content: row.content as string,
    author: (row.is_anonymous ? '익명' : row.author) as string,
    authorDong: row.author_dong as string,
    createdAt: row.created_at as string,
    viewCount: (row.view_count as number) ?? 0,
    likeCount: (row.like_count as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    isPinned: (row.is_pinned as boolean) ?? false,
    isHot: (row.is_hot as boolean) ?? false,
  };
}

// ── 목록 조회 ────────────────────────────────────────────────
export async function fetchDBPosts(
  category?: string,
  limit = 50
): Promise<Post[]> {
  if (!isConfigured()) return [];
  try {
    let q = supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (category && category !== '전체') q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(row => rowToPost(row as Record<string, unknown>));
  } catch (e) {
    console.error('[posts] fetchDBPosts error:', e);
    return [];
  }
}

// ── 단건 조회 ────────────────────────────────────────────────
export async function fetchDBPost(id: string): Promise<Post | null> {
  if (!isConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return rowToPost(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

// ── 작성 ─────────────────────────────────────────────────────
export interface PostInput {
  category: CommunityCategory;
  title: string;
  content: string;
  author: string;
  authorDong: string;
  isAnonymous: boolean;
}

export async function createPost(input: PostInput): Promise<Post | null> {
  if (!isConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        category: input.category,
        title: input.title,
        content: input.content,
        author: input.author,
        author_dong: input.authorDong,
        is_anonymous: input.isAnonymous,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToPost(data as Record<string, unknown>);
  } catch (e) {
    console.error('[posts] createPost error:', e);
    return null;
  }
}

// ── 수정 ─────────────────────────────────────────────────────
export async function updatePost(
  id: string,
  input: Partial<Pick<PostInput, 'title' | 'content' | 'category'>>
): Promise<Post | null> {
  if (!isConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return rowToPost(data as Record<string, unknown>);
  } catch (e) {
    console.error('[posts] updatePost error:', e);
    return null;
  }
}

// ── 삭제 ─────────────────────────────────────────────────────
export async function deletePost(id: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (e) {
    console.error('[posts] deletePost error:', e);
    return false;
  }
}

// ── 조회수 증가 ───────────────────────────────────────────────
export async function incrementViewCount(id: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await supabase.rpc('increment_post_view', { post_id: id });
  } catch {
    // RPC 없을 경우 무시 (선택 기능)
  }
}

// ── 좋아요 토글 ───────────────────────────────────────────────
export async function togglePostLike(
  id: string,
  delta: 1 | -1
): Promise<void> {
  if (!isConfigured()) return;
  try {
    const { data } = await supabase
      .from('community_posts')
      .select('like_count')
      .eq('id', id)
      .single();
    const current = (data as Record<string, number> | null)?.like_count ?? 0;
    await supabase
      .from('community_posts')
      .update({ like_count: Math.max(0, current + delta) })
      .eq('id', id);
  } catch { /* silent */ }
}

// ── 댓글 수 동기화 ────────────────────────────────────────────
export async function syncCommentCount(
  id: string,
  delta: 1 | -1
): Promise<void> {
  if (!isConfigured()) return;
  try {
    const { data } = await supabase
      .from('community_posts')
      .select('comment_count')
      .eq('id', id)
      .single();
    const current = (data as Record<string, number> | null)?.comment_count ?? 0;
    await supabase
      .from('community_posts')
      .update({ comment_count: Math.max(0, current + delta) })
      .eq('id', id);
  } catch { /* silent */ }
}

// mock post ID 여부 (p1, p2, ...)
export function isMockPostId(id: string): boolean {
  return /^p\d+$/.test(id);
}
