import { supabaseAdmin } from "@/lib/supabase-admin";

// ── 뉴스 ──────────────────────────────────────────────────────

export interface AdminNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  thumbnail: string | null;
  published_at: string;
}

export async function adminFetchNews(limit = 100): Promise<AdminNewsArticle[]> {
  const { data, error } = await supabaseAdmin
    .from("news_articles")
    .select("id, title, url, source, summary, thumbnail, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminNewsArticle[];
}

export async function adminCreateNews(article: Omit<AdminNewsArticle, "id">): Promise<void> {
  const { error } = await supabaseAdmin
    .from("news_articles")
    .insert({ ...article, news_type: "local" });
  if (error) throw new Error(error.message);
}

export async function adminDeleteNews(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("news_articles").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 유튜브 ────────────────────────────────────────────────────

export interface AdminYouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  channel_name: string;
  thumbnail: string | null;
  url: string;
  fetched_at: string;
}

export async function adminFetchYouTube(limit = 100): Promise<AdminYouTubeVideo[]> {
  const { data, error } = await supabaseAdmin
    .from("youtube_videos")
    .select("video_id, title, channel_name, thumbnail, url, fetched_at")
    .order("fetched_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ ...row, id: row.video_id as string })) as AdminYouTubeVideo[];
}

export async function adminCreateYouTube(video: Omit<AdminYouTubeVideo, "id">): Promise<void> {
  const { error } = await supabaseAdmin
    .from("youtube_videos")
    .insert({ ...video });
  if (error) throw new Error(error.message);
}

export async function adminDeleteYouTube(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("youtube_videos").delete().eq("video_id", id);
  if (error) throw new Error(error.message);
}

// ── 인스타그램 ────────────────────────────────────────────────

export interface AdminInstagramPost {
  id: string;
  account_name: string;
  post_url: string;
  image_url: string | null;
  caption: string | null;
  posted_at: string;
}

export async function adminFetchInstagram(limit = 100): Promise<AdminInstagramPost[]> {
  const { data, error } = await supabaseAdmin
    .from("instagram_posts")
    .select("id, account_name, post_url, image_url, caption, posted_at")
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminInstagramPost[];
}

export async function adminCreateInstagram(post: Omit<AdminInstagramPost, "id">): Promise<void> {
  const { error } = await supabaseAdmin
    .from("instagram_posts")
    .insert({ ...post });
  if (error) throw new Error(error.message);
}

export async function adminDeleteInstagram(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("instagram_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
