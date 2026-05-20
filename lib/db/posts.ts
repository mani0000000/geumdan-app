/**
 * community_posts Supabase CRUD
 *
 * ── Supabase에서 먼저 실행하세요 ────────────────────────────────────────────────
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
 * -- 사진/영상 첨부 (기존 테이블이 있다면 아래 실행)
 * ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
 * ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';
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

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Post, CommunityCategory } from '@/lib/types';

function isConfigured(): boolean {
  return isSupabaseConfigured;
}

function toUrlArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string' && v.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string' && v.length > 0);
      }
    } catch { /* not JSON */ }
  }
  return [];
}

function rowToPost(row: Record<string, unknown>): Post {
  return {
    id: row.id as string,
    category: row.category as CommunityCategory,
    title: row.title as string,
    content: row.content as string,
    author: row.author as string,
    authorDong: row.author_dong as string,
    authorAvatarUrl: (row.author_avatar_url as string | null) ?? null,
    authorUserId: (row.user_id as string | null) ?? null,
    createdAt: row.created_at as string,
    viewCount: (row.view_count as number) ?? 0,
    likeCount: (row.like_count as number) ?? 0,
    commentCount: (row.comment_count as number) ?? 0,
    images: toUrlArray(row.image_urls).length > 0
      ? toUrlArray(row.image_urls)
      : toUrlArray(row.images),
    videos: toUrlArray(row.video_urls),
    isPinned: (row.is_pinned as boolean) ?? false,
    isHot: (row.is_hot as boolean) ?? false,
    isHidden: (row.is_hidden as boolean) ?? false,
  };
}

const POST_SELECT = '*, users:user_id (nickname, dong, avatar_url, status)';

// ── 목록 조회 ────────────────────────────────────────────────
// 어드민이 숨김 처리한(is_hidden=true) 게시글은 제외
export async function fetchDBPosts(
  category?: string,
  limit = 50
): Promise<Post[]> {
  if (!isConfigured()) return [];
  try {
    let q = supabase
      .from('community_posts')
      .select(POST_SELECT)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (category && category !== '전체') q = q.eq('category', category);
    const { data, error } = await q;
    if (error) {
      // Embedded resource 미지원 환경(=마이그레이션 전) 폴백
      const fb = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      return (fb.data ?? []).map(row => rowToPost(row as Record<string, unknown>));
    }
    return (data ?? [])
      .map(row => rowToPost(row as Record<string, unknown>))
      .filter(p => !p.isHidden);
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
      .select(POST_SELECT)
      .eq('id', id)
      .single();
    if (error) {
      const fb = await supabase
        .from('community_posts')
        .select('*')
        .eq('id', id)
        .single();
      if (fb.error || !fb.data) return null;
      return rowToPost(fb.data as Record<string, unknown>);
    }
    return rowToPost(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

// ── 작성 ─────────────────────────────────────────────────────────
export interface PostInput {
  category: CommunityCategory;
  title: string;
  content: string;
  author: string;
  authorDong: string;
  authorAvatarUrl?: string | null;
  userId?: string | null;
  images?: string[];
  videos?: string[];
}

export interface CreatePostResult {
  post: Post;
  imagesDropped: boolean;
}

function isMediaColumnMissing(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === 'PGRST204' && /['"]?(?:images|image_urls|video_urls)['"]? column/i.test(e.message ?? '');
}

export async function createPost(input: PostInput): Promise<CreatePostResult> {
  if (!isConfigured()) {
    throw new Error('서비스 설정이 완료되지 않았어요. 관리자에게 문의해주세요.');
  }
  const base = {
    category: input.category,
    title: input.title,
    content: input.content,
    author: input.author,
    author_dong: input.authorDong,
    author_avatar_url: input.authorAvatarUrl ?? null,
    user_id: input.userId ?? null,
  };
  const hasMedia = (input.images?.length ?? 0) > 0 || (input.videos?.length ?? 0) > 0;
  const payload = hasMedia
    ? { ...base, image_urls: input.images ?? [], video_urls: input.videos ?? [] }
    : base;

  let { data, error } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .single();

  let imagesDropped = false;
  if (error && hasMedia && isMediaColumnMissing(error)) {
    console.warn('[posts] media columns missing — retrying without media');
    imagesDropped = true;
    ({ data, error } = await supabase
      .from('community_posts')
      .insert(base)
      .select()
      .single());
  }

  if (error) {
    console.error('[posts] createPost error:', error);
    throw new Error(error.message || '글 등록에 실패했습니다.');
  }
  return { post: rowToPost(data as Record<string, unknown>), imagesDropped };
}

// ── 내가 쓴 글 ─────────────────────────────────────────────────────
export async function fetchMyPosts(userId: string, limit = 100): Promise<Post[]> {
  if (!isConfigured() || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(row => rowToPost(row as Record<string, unknown>));
  } catch (e) {
    console.error('[posts] fetchMyPosts error:', e);
    return [];
  }
}

// ── 수정 ─────────────────────────────────────────────────────────
export type UpdatePostInput = Partial<
  Pick<PostInput, 'title' | 'content' | 'category' | 'images' | 'videos'>
>;

export async function updatePost(
  id: string,
  input: UpdatePostInput
): Promise<Post | null> {
  if (!isConfigured()) return null;

  const { images, videos, ...rest } = input;
  const basePatch: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };
  const mediaPatch: Record<string, unknown> = {};
  if (images !== undefined) mediaPatch.image_urls = images;
  if (videos !== undefined) mediaPatch.video_urls = videos;

  try {
    const fullPatch = { ...basePatch, ...mediaPatch };
    const { data, error } = await supabase
      .from('community_posts')
      .update(fullPatch)
      .eq('id', id)
      .select(POST_SELECT)
      .single();

    if (error && Object.keys(mediaPatch).length > 0 && isMediaColumnMissing(error)) {
      console.warn('[posts] media columns missing — retrying without media');
      const fb = await supabase
        .from('community_posts')
        .update(basePatch)
        .eq('id', id)
        .select(POST_SELECT)
        .single();
      if (fb.error) throw fb.error;
      return rowToPost(fb.data as Record<string, unknown>);
    }
    if (error) throw error;
    return rowToPost(data as Record<string, unknown>);
  } catch (e) {
    console.error('[posts] updatePost error:', e);
    return null;
  }
}

// ── 삭제 ─────────────────────────────────────────────────────────
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

// ── 조회수 증가 ───────────────────────────────────────────────────
export async function incrementViewCount(id: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await supabase.rpc('increment_post_view', { post_id: id });
  } catch {
    // RPC 없을 경우 무시 (선택 기능)
  }
}

// ── 좋아요 토글 ──────────────────────────────────────────────────
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

// ── 댓글 수 동기화 ────────────────────────────────────────────────
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
