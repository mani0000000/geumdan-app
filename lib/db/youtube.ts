/**
 * lib/db/youtube.ts
 * Supabase youtube_videos 테이블에서 영상 목록 조회
 * Supabase 미설정 시 public/cache/youtube.json 정적 캐시 fallback
 */
import { supabase } from '@/lib/supabase';
import { rankYouTubeVideos, type YouTubeVideo } from '@/lib/api/news';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

async function fetchFromStaticCache(): Promise<YouTubeVideo[]> {
  try {
    const res = await fetch(`${BASE_PATH}/cache/youtube.json`, { cache: 'no-store' });
    if (!res.ok) return [];
    const d = await res.json();
    if (Array.isArray(d.videos) && d.videos.length > 0) {
      return rankYouTubeVideos(d.videos as YouTubeVideo[], { minScore: 24, limit: 80 });
    }
  } catch { /* ignore */ }
  return [];
}

type YouTubeRow = Record<string, unknown>;

function mapRows(rows: YouTubeRow[]): YouTubeVideo[] {
  return rows.map((row, i) => ({
    id: `db-${i}`,
    videoId: row.video_id as string,
    title: (row.title as string) ?? '검단 영상',
    channelName: (row.channel_name as string) ?? 'YouTube',
    channelId: (row.channel_id as string) ?? undefined,
    thumbnail:
      (row.thumbnail as string) ??
      `https://img.youtube.com/vi/${row.video_id}/mqdefault.jpg`,
    url:
      (row.url as string) ??
      `https://www.youtube.com/watch?v=${row.video_id}`,
    publishedAt: (row.published_at as string) ?? (row.fetched_at as string) ?? undefined,
    topic: (row.topic as string) ?? undefined,
    query: (row.query as string) ?? undefined,
    subscriberCount: typeof row.subscriber_count === 'number' ? row.subscriber_count : undefined,
    viewCountText: (row.view_count_text as string) ?? undefined,
    relevanceScore: typeof row.relevance_score === 'number' ? row.relevance_score : undefined,
    fetchedAt: (row.fetched_at as string) ?? undefined,
  }));
}

export async function fetchYouTubeVideosFromDB(limit = 200): Promise<{ videos: YouTubeVideo[]; source: string; ms: number }> {
  const t0 = performance.now();

  if (!isSupabaseConfigured()) {
    const videos = await fetchFromStaticCache();
    return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
  }

  try {
    const advancedSelect = [
      'video_id', 'title', 'channel_name', 'channel_id', 'thumbnail', 'url',
      'published_at', 'topic', 'query', 'subscriber_count', 'view_count_text',
      'relevance_score', 'fetched_at',
    ].join(',');

    const advanced = await supabase
      .from('youtube_videos')
      .select(advancedSelect)
      .order('published_at', { ascending: false })
      .order('relevance_score', { ascending: false })
      .limit(limit);

    let data = advanced.data as YouTubeRow[] | null;
    let error: unknown = advanced.error;

    let usedLegacyShape = false;
    if (error) {
      const fallback = await supabase
        .from('youtube_videos')
        .select('video_id,title,channel_name,thumbnail,url,fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(limit);
      data = fallback.data as YouTubeRow[] | null;
      error = fallback.error;
      usedLegacyShape = true;
    }

    if (error) throw error;

    if (!data || data.length === 0) {
      // DB가 비어있으면 정적 캐시 사용
      const videos = await fetchFromStaticCache();
      return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
    }

    const videos = rankYouTubeVideos(mapRows(data as YouTubeRow[]), { minScore: 24, limit });

    return {
      videos,
      source: usedLegacyShape ? '실시간 DB' : '큐레이션 DB',
      ms: Math.round(performance.now() - t0),
    };
  } catch (err) {
    console.error('[youtube-db] Supabase 오류, 정적 캐시 사용:', err);
    const videos = await fetchFromStaticCache();
    return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
  }
}
