#!/usr/bin/env node
/**
 * fetch-news.mjs
 * Pulls news from Google News RSS (always) + Naver Search API (if creds set),
 * resolves og:image for each article, and upserts into Supabase.
 *
 * Required: SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
 */

import { createClient } from '@supabase/supabase-js';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const NAVER_ENABLED = Boolean(NAVER_CLIENT_ID && NAVER_CLIENT_SECRET);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}
console.log(`   Naver source: ${NAVER_ENABLED ? 'enabled' : 'DISABLED (creds missing) — Google News RSS only'}`);

// sb_* keys are not JWTs — strip Authorization: Bearer for PostgREST to avoid "Invalid Compact JWS"
function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/rest/v1/')) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.slice(7) === key) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  global: { fetch: makeFetch(SUPABASE_SERVICE_KEY) },
  auth: { autoRefreshToken: false, persistSession: false },
});

const QUERIES = [
  { query: '검단신도시',         type: 'local' },
  { query: '인천 서구 부동산',   type: 'real_estate' },
  { query: '인천 서구 아파트',   type: 'real_estate' },
];

const API_URL = 'https://openapi.naver.com/v1/search/news.json';

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

async function fetchOgImage(url, timeoutMs = 6000) {
  if (!url) return null;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GeumdanNewsBot/1.0; +https://geumdan.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    // Google News redirect pages put og:image near the END of a ~600KB doc,
    // so we have to scan much more than a typical <head>.
    const html = (await res.text()).slice(0, 1_000_000);
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (!m) return null;
    let resolved;
    try {
      resolved = new URL(m[1], url).href;
    } catch {
      return null;
    }
    // Reject the Google News redirect logo — it isn't an article image.
    if (/(^|\.)google\.com\//i.test(resolved) || /gstatic\.com\//i.test(resolved)) return null;
    return resolved;
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

async function enrichWithOgImages(rows, concurrency = 4) {
  let cursor = 0;
  let hits = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= rows.length) return;
      const row = rows[i];
      // Re-fetch when thumbnail is missing OR is a Google asset (logo).
      if (!row.url) continue;
      if (row.thumbnail && !/google|gstatic/i.test(row.thumbnail)) continue;
      const og = await fetchOgImage(row.url);
      if (og) {
        row.thumbnail = og;
        hits++;
      } else if (row.thumbnail && /google|gstatic/i.test(row.thumbnail)) {
        // Clear the bad google-logo thumbnail so the row at least falls back
        // to the gradient placeholder instead of showing a wrong image.
        row.thumbnail = null;
      }
    }
  });
  await Promise.all(workers);
  return hits;
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

const GOOGLE_RSS_QUERIES = [
  { query: '검단신도시',       type: 'local' },
  { query: '검단 아파트',      type: 'local' },
  { query: '인천 서구 검단',   type: 'local' },
  { query: '검단 부동산',      type: 'real_estate' },
  { query: '검단 분양',        type: 'real_estate' },
];

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function rssStripXml(s) {
  return decodeEntities(decodeEntities(s)).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function rssTagVal(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
  const m = xml.match(re);
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
}

function rssExtractSource(title) {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : '구글뉴스';
}

function rssFirstImg(html) {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function rssExtractMediaImage(raw) {
  const thumb = raw.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i);
  if (thumb?.[1]) return thumb[1];
  const mediaContents = raw.matchAll(/<media:content\b([^>]*)\/?>/gi);
  for (const m of mediaContents) {
    const attrs = m[1] ?? '';
    const url = attrs.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (!url) continue;
    const medium = attrs.match(/\bmedium=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (medium === 'image' || (type && type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(url)) {
      return url;
    }
  }
  const enclosures = raw.matchAll(/<enclosure\b([^>]*)\/?>/gi);
  for (const m of enclosures) {
    const attrs = m[1] ?? '';
    const url = attrs.match(/\burl=["']([^"']+)["']/i)?.[1];
    if (!url) continue;
    const type = attrs.match(/\btype=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (type?.startsWith('image/')) return url;
  }
  const ce = raw.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i);
  if (ce?.[1]) {
    const src = rssFirstImg(decodeEntities(ce[1]));
    if (src) return src;
  }
  const dm = raw.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
  if (dm?.[1]) {
    const src = rssFirstImg(decodeEntities(dm[1]));
    if (src) return src;
  }
  return null;
}

async function fetchGoogleRssRows(query, type) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeumdanApp/1.0)' },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const rows = [];
    const items = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const m of items) {
      const raw = m[1];
      const title = rssStripXml(rssTagVal(raw, 'title'));
      const link = rssTagVal(raw, 'link') || rssTagVal(raw, 'guid');
      const desc = rssStripXml(rssTagVal(raw, 'description')).slice(0, 160);
      const pub = rssTagVal(raw, 'pubDate');
      const source = rssStripXml(rssTagVal(raw, 'source')) || rssExtractSource(title);
      if (title.length < 5 || !link || link === '#') continue;
      rows.push({
        title,
        url: link,
        source,
        summary: desc,
        thumbnail: rssExtractMediaImage(raw),
        published_at: pub ? new Date(pub).toISOString() : new Date().toISOString(),
        news_type: type,
        tags: [],
      });
      if (rows.length >= 30) break;
    }
    return rows;
  } catch {
    return [];
  } finally {
    clearTimeout(tid);
  }
}

console.log('📰 Starting news fetch...\n');

try {
  const allRows = new Map(); // url -> row (deduplicate by URL)

  if (NAVER_ENABLED) {
    for (const { query, type } of QUERIES) {
      console.log(`  [Naver] "${query}"...`);
      try {
        const items = await fetchNaverNews(query, 20);
        console.log(`    got ${items.length}`);
        for (const item of items) {
          const row = itemToRow(item, type);
          if (row.url && !allRows.has(row.url)) allRows.set(row.url, row);
        }
      } catch (err) {
        console.error(`    ❌ ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  for (const { query, type } of GOOGLE_RSS_QUERIES) {
    console.log(`  [Google RSS] "${query}"...`);
    const rows = await fetchGoogleRssRows(query, type);
    console.log(`    got ${rows.length}`);
    for (const row of rows) {
      if (row.url && !allRows.has(row.url)) allRows.set(row.url, row);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  const rows = Array.from(allRows.values());
  console.log(`\n  Total unique articles: ${rows.length}`);

  if (rows.length === 0) {
    console.log('  No articles to insert');
  } else {
    console.log(`  Fetching og:image for ${rows.length} articles...`);
    const hits = await enrichWithOgImages(rows);
    console.log(`  Got og:image for ${hits}/${rows.length} articles`);

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
