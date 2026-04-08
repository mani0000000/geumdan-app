/**
 * lib/db/youtube.ts
 * Supabase youtube_videos 테이블에서 영상 목록 조회
 * Supabase 미설정 시 public/cache/youtube.json 정적 캐시 fallback
 */
import { supabase } from '@/lib/supabase';
import type { YouTubeVideo } from '@/lib/api/news';

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
      return d.videos as YouTubeVideo[];
    }
  } catch { /* ignore */ }
  return [];
}

export async function fetchYouTubeVideosFromDB(limit = 20): Promise<{ videos: YouTubeVideo[]; source: string; ms: number }> {
  const t0 = performance.now();

  if (!isSupabaseConfigured()) {
    const videos = await fetchFromStaticCache();
    return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
  }

  try {
    const { data, error } = await supabase
      .from('youtube_videos')
      .select('*')
      .order('fetched_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!data || data.length === 0) {
      // DB가 비어있으면 정적 캐시 사용
      const videos = await fetchFromStaticCache();
      return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
    }

    const videos: YouTubeVideo[] = data.map((row, i) => ({
      id: `db-${i}`,
      videoId: row.video_id as string,
      title: (row.title as string) ?? '검단 영상',
      channelName: (row.channel_name as string) ?? 'YouTube',
      thumbnail:
        (row.thumbnail as string) ??
        `https://img.youtube.com/vi/${row.video_id}/mqdefault.jpg`,
      url:
        (row.url as string) ??
        `https://www.youtube.com/watch?v=${row.video_id}`,
    }));

    return { videos, source: 'DB', ms: Math.round(performance.now() - t0) };
  } catch (err) {
    console.error('[youtube-db] Supabase 오류, 정적 캐시 사용:', err);
    const videos = await fetchFromStaticCache();
    return { videos, source: '캐시', ms: Math.round(performance.now() - t0) };
  }
}
