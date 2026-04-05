import { supabase } from '@/lib/supabase';
import { newsItems as mockNewsItems } from '@/lib/mockData';
import type { NewsItem } from '@/lib/types';

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
