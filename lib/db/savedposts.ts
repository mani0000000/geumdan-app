/**
 * lib/db/savedposts.ts
 * 저장한 글 (user_favorite_posts) CRUD
 *
 * Supabase 테이블:
 *   CREATE TABLE IF NOT EXISTS user_favorite_posts (
 *     id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *     user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 *     post_id     TEXT NOT NULL,
 *     title       TEXT,
 *     category    TEXT,
 *     created_at  TIMESTAMPTZ DEFAULT NOW(),
 *     UNIQUE(user_id, post_id)
 *   );
 *   ALTER TABLE user_favorite_posts ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "public_fav_posts" ON user_favorite_posts FOR ALL USING (true) WITH CHECK (true);
 *   CREATE INDEX IF NOT EXISTS idx_fav_posts_user ON user_favorite_posts(user_id);
 */
import { supabase } from "@/lib/supabase";

export interface SavedPost {
  id: string;
  post_id: string;
  title: string;
  category: string;
  created_at: string;
}

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}
function lsSet(key: string, val: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, val);
}

const SAVED_KEY = "geumdan_saved_posts";

export async function getSavedPosts(): Promise<SavedPost[]> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_favorite_posts")
        .select("id,post_id,title,category,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (data) return data as SavedPost[];
    } catch {}
  }

  const cached = lsGet(SAVED_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function savePost(
  postId: string,
  title: string,
  category: string
): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase.from("user_favorite_posts").upsert(
      { user_id: uid, post_id: postId, title, category },
      { onConflict: "user_id,post_id" }
    );
  }

  const cached = lsGet(SAVED_KEY);
  const prev: SavedPost[] = cached ? JSON.parse(cached) : [];
  if (!prev.find((p) => p.post_id === postId)) {
    lsSet(
      SAVED_KEY,
      JSON.stringify([
        {
          id: crypto.randomUUID(),
          post_id: postId,
          title,
          category,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
    );
  }
}

export async function unsavePost(postId: string): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase
      .from("user_favorite_posts")
      .delete()
      .eq("user_id", uid)
      .eq("post_id", postId);
  }

  const cached = lsGet(SAVED_KEY);
  const prev: SavedPost[] = cached ? JSON.parse(cached) : [];
  lsSet(SAVED_KEY, JSON.stringify(prev.filter((p) => p.post_id !== postId)));
}

export async function isPostSaved(postId: string): Promise<boolean> {
  const list = await getSavedPosts();
  return list.some((p) => p.post_id === postId);
}

export async function getSavedPostCount(): Promise<number> {
  const list = await getSavedPosts();
  return list.length;
}
