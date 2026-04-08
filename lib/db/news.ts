import { supabase } from '@/lib/supabase';
import { newsItems as mockNewsItems } from '@/lib/mockData';
import type { NewsItem } from '@/lib/types';
import type { NewsArticle } from '@/lib/api/news';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchNewsArticles(
  type?: string,
  limit = 20
): Promise<NewsItem[]> {
  if (!isSupabaseConfigured()) {
    console.log('[news] Supabase not configured, using mock data');
    return mockNewsItems;
  }

  try {
    let query = supabase
      .from('news_articles')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq('news_type', type);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('[news] No rows in DB, using mock data');
      return mockNewsItems;
    }

    return data.map((row) => ({
      id: row.id as string,
      type: '뉴스' as NewsItem['type'],
      title: row.title as string,
      summary: (row.summary as string) ?? '',
      thumbnail: (row.thumbnail as string) ?? '',
      source: (row.source as string) ?? '',
      publishedAt: (row.published_at as string) ?? new Date().toISOString(),
      url: (row.url as string) ?? '',
      viewCount: 0,
    }));
  } catch (err) {
    console.error('[news] Error fetching from Supabase, falling back to mock data:', err);
    return mockNewsItems;
  }
}

/**
 * 커뮤니티 뉴스탭용: Supabase news_articles → 정적 캐시 → 라이브 API 순서로 조회
 * 실제 기사 URL이 보장된 Supabase 데이터를 우선 사용
 */
export async function fetchNewsFromDB(limit = 30): Promise<{ articles: NewsArticle[]; source: string; ms: number }> {
  const t0 = performance.now();

  if (!isSupabaseConfigured()) {
    return { articles: [], source: '', ms: 0 };
  }

  try {
    const { data, error } = await supabase
      .from('news_articles')
      .select('id, title, summary, source, published_at, url, thumbnail')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) {
      return { articles: [], source: '', ms: Math.round(performance.now() - t0) };
    }

    const articles: NewsArticle[] = data.map((row, i) => ({
      id: (row.id as string) ?? `db-${i}`,
      title: (row.title as string) ?? '',
      summary: (row.summary as string) ?? '',
      source: (row.source as string) ?? '',
      publishedAt: (row.published_at as string) ?? new Date().toISOString(),
      url: (row.url as string) ?? '',
      thumbnail: (row.thumbnail as string) ?? undefined,
      type: '뉴스' as const,
    })).filter(a => a.title.length > 0 && a.url.length > 0);

    return { articles, source: 'DB', ms: Math.round(performance.now() - t0) };
  } catch (err) {
    console.error('[news-db] Supabase 오류:', err);
    return { articles: [], source: '', ms: Math.round(performance.now() - t0) };
  }
}
