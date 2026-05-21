// Instagram feed API client — talks to external Fastify backend
// Base URL configured via NEXT_PUBLIC_INSTAGRAM_API_URL (e.g. http://localhost:3001)

export interface InstagramPost {
  id: string;
  shortcode?: string;
  permalink: string;
  mediaType?: "IMAGE" | "VIDEO" | "REEL" | "CAROUSEL" | string;
  isReel: boolean;
  thumbnailUrl: string;
  caption?: string;
  username?: string;
  likeCount: number;
  commentCount: number;
  viewCount?: number;
  hashtags?: string[];
  postedAt: string;
}

export interface InstagramStats {
  totalPosts: number;
  totalReels: number;
  totalLikes?: number;
  totalComments?: number;
  lastSyncedAt?: string;
}

export interface FetchFeedsParams {
  limit?: number;
  page?: number;
  sort?: "latest" | "popular";
  reel?: boolean;
  tag?: string;
}

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_INSTAGRAM_API_URL;
  return url ? url.replace(/\/$/, "") : "";
}

// Defensive normalizer — backend may return any of these field name conventions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(raw: any): InstagramPost | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw.post_id ?? raw.shortcode ?? raw.permalink ?? "");
  if (!id) return null;
  const mediaType = raw.mediaType ?? raw.media_type ?? raw.type ?? "";
  const isReel = Boolean(
    raw.isReel ?? raw.is_reel ?? raw.reel ?? String(mediaType).toUpperCase().includes("REEL")
  );
  return {
    id,
    shortcode: raw.shortcode ?? raw.short_code ?? undefined,
    permalink: String(raw.permalink ?? raw.post_url ?? raw.url ?? ""),
    mediaType: mediaType || undefined,
    isReel,
    thumbnailUrl: String(
      raw.thumbnailUrl ?? raw.thumbnail_url ?? raw.image_url ?? raw.display_url ?? ""
    ),
    caption: raw.caption ?? raw.text ?? "",
    username: raw.username ?? raw.account_name ?? raw.owner ?? undefined,
    likeCount: Number(raw.likeCount ?? raw.like_count ?? raw.likes ?? 0),
    commentCount: Number(raw.commentCount ?? raw.comment_count ?? raw.comments ?? 0),
    viewCount: raw.viewCount ?? raw.view_count ?? raw.views,
    hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : undefined,
    postedAt: String(raw.postedAt ?? raw.posted_at ?? raw.taken_at ?? new Date().toISOString()),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.posts)) return payload.posts;
  if (Array.isArray(payload?.feeds)) return payload.feeds;
  return [];
}

export async function fetchInstagramFeeds(params: FetchFeedsParams = {}): Promise<InstagramPost[]> {
  const base = getBaseUrl();
  if (!base) return [];
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.page != null) qs.set("page", String(params.page));
  if (params.sort) qs.set("sort", params.sort);
  if (params.reel) qs.set("reel", "true");
  if (params.tag) qs.set("tag", params.tag);
  try {
    const res = await fetch(`${base}/api/instagram-feeds?${qs.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return extractList(json)
      .map(normalize)
      .filter((p): p is InstagramPost => p !== null);
  } catch {
    return [];
  }
}

export async function fetchInstagramReels(limit = 10): Promise<InstagramPost[]> {
  return fetchInstagramFeeds({ reel: true, limit });
}

export async function fetchInstagramStats(): Promise<InstagramStats | null> {
  const base = getBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/api/instagram-stats`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const src = json?.data ?? json ?? {};
    return {
      totalPosts: Number(src.totalPosts ?? src.total_posts ?? 0),
      totalReels: Number(src.totalReels ?? src.total_reels ?? 0),
      totalLikes: src.totalLikes ?? src.total_likes,
      totalComments: src.totalComments ?? src.total_comments,
      lastSyncedAt: src.lastSyncedAt ?? src.last_synced_at,
    };
  } catch {
    return null;
  }
}
