import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

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
  return adminApiGet<AdminNewsArticle>("news_articles", {
    select: "id,title,url,source,summary,thumbnail,published_at",
    order: "published_at.desc",
    limit,
  });
}

export async function adminCreateNews(article: Omit<AdminNewsArticle, "id">): Promise<void> {
  await adminApiPost("news_articles", "POST", [{ ...article, news_type: "local" }]);
}

export async function adminDeleteNews(id: string): Promise<void> {
  await adminApiPost("news_articles", "DELETE", null, { eq: `id=eq.${id}` });
}

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
  const rows = await adminApiGet<Omit<AdminYouTubeVideo, "id"> & { video_id: string }>("youtube_videos", {
    select: "video_id,title,channel_name,thumbnail,url,fetched_at",
    order: "fetched_at.desc",
    limit,
  });
  return rows.map(r => ({ ...r, id: r.video_id }));
}

export async function adminCreateYouTube(video: Omit<AdminYouTubeVideo, "id">): Promise<void> {
  await adminApiPost("youtube_videos", "POST", [video]);
}

export async function adminDeleteYouTube(id: string): Promise<void> {
  await adminApiPost("youtube_videos", "DELETE", null, { eq: `video_id=eq.${id}` });
}

export interface AdminInstagramPost {
  id: string;
  account_name: string;
  post_url: string;
  image_url: string | null;
  caption: string | null;
  posted_at: string;
}

export async function adminFetchInstagram(limit = 100): Promise<AdminInstagramPost[]> {
  return adminApiGet<AdminInstagramPost>("instagram_posts", {
    select: "id,account_name,post_url,image_url,caption,posted_at",
    order: "posted_at.desc",
    limit,
  });
}

export async function adminCreateInstagram(post: Omit<AdminInstagramPost, "id">): Promise<void> {
  await adminApiPost("instagram_posts", "POST", [post]);
}

export async function adminDeleteInstagram(id: string): Promise<void> {
  await adminApiPost("instagram_posts", "DELETE", null, { eq: `id=eq.${id}` });
}
