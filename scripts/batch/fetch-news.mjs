#!/usr/bin/env node
/**
 * fetch-news.mjs
 * Fetches news from Naver Search API and inserts into Supabase.
 *
 * Usage:
 *   NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx \
 *   node scripts/batch/fetch-news.mjs
 */

import { createClient } from '@supabase/supabase-js';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const QUERIES = [
  { query: '검단신도시',         type: 'local' },
  { query: '인천 서구 부동산',   type: 'real_estate' },
  { query: '인천 서구 아파트',   type: 'real_estate' },
];

const API_URL = 'https://openapi.naver.com/v1/search/news.json';

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

async function fetchNaverNews(query, display = 20) {
  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: 'date',
  });

  const res = await fetch(`${API_URL}?${params.toString()}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for query "${query}"`);
  }

  const json = await res.json();
  return json.items || [];
}

function itemToRow(item, newsType) {
  const title = stripHtml(item.title || '');
  const description = stripHtml(item.description || '');
  const url = item.link || item.originallink || '';
  const source = item.originallink
    ? new URL(item.originallink).hostname.replace('www.', '')
    : '네이버뉴스';
  const publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();

  return {
    title,
    url,
    source,
    summary: description,
    thumbnail: null,
    published_at: publishedAt,
    news_type: newsType,
    tags: [],
  };
}

console.log('📰 Starting news fetch...\n');

try {
  const allRows = new Map(); // url -> row (deduplicate by URL)

  for (const { query, type } of QUERIES) {
    console.log(`  Fetching "${query}"...`);
    try {
      const items = await fetchNaverNews(query, 20);
      console.log(`  Got ${items.length} articles`);

      for (const item of items) {
        const row = itemToRow(item, type);
        if (row.url && !allRows.has(row.url)) {
          allRows.set(row.url, row);
        }
      }
    } catch (err) {
      console.error(`  ❌ Failed to fetch "${query}":`, err.message);
    }

    // Small delay between requests to be polite
    await new Promise(r => setTimeout(r, 200));
  }

  const rows = Array.from(allRows.values());
  console.log(`\n  Total unique articles: ${rows.length}`);

  if (rows.length === 0) {
    console.log('  No articles to insert');
  } else {
    // Use upsert with onConflict=url to avoid duplicates
    const { error } = await supabase
      .from('news_articles')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: true });

    if (error) {
      console.warn('⚠️  Supabase upsert 실패 (테이블 미생성 또는 연결 오류):', error.message);
      console.warn('   → supabase/migrations/20260419_news_youtube.sql 을 Supabase에서 실행하세요.');
    } else {
      console.log(`✅ Upserted ${rows.length} news articles`);
    }
  }

  // Clean up old articles (keep last 30 days)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const { error: deleteError } = await supabase
    .from('news_articles')
    .delete()
    .lt('published_at', cutoff.toISOString());

  if (deleteError) {
    console.warn('⚠️  Could not clean up old articles:', deleteError.message);
  } else {
    console.log('✅ Old articles cleaned up (> 30 days)');
  }

  console.log('\n✅ News fetch complete!');
} catch (err) {
  console.error('\n❌ News fetch failed:', err.message);
  process.exit(1);
}
