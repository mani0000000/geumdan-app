#!/usr/bin/env node
/**
 * fetch-news.mjs
 * Fetches news from Google News RSS (primary) and Naver Search API (optional).
 * Extracts og:image thumbnails by following Google News redirects to real article URLs.
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/batch/fetch-news.mjs
 *   # Naver is optional:
 *   NAVER_CLIENT_ID=xxx NAVER_CLIENT_SECRET=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx \
 *   node scripts/batch/fetch-news.mjs
 */

import { createClient } from '@supabase/supabase-js';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

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

// ─── Helpers ───────────────────────────────────────────────────────────────

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n));
}

function tagVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
}

// ─── og:image extraction ───────────────────────────────────────────────────

/**
 * Follow Google News redirect to get the real article URL.
 * Google News RSS links like https://news.google.com/rss/articles/... are
 * redirects — we must follow them to get the actual publisher URL.
 */
async function resolveGoogleNewsUrl(googleUrl, timeoutMs = 6000) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(googleUrl, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    const finalUrl = res.url;
    // If redirect resolved to a real site (not google.com), return it
    if (finalUrl && !finalUrl.includes('google.com') && !finalUrl.includes('gstatic.com')) {
      return finalUrl;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch og:image from a real article URL.
 * Reads up to 1MB to find the og:image meta tag.
 */
async function fetchOgImage(articleUrl, timeoutMs = 6000) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(articleUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      signal: ctrl.signal,
    });
    clearTimeout(tid);
    if (!res.ok) return null;

    // Read up to 1MB (og:image can be far into the <head>)
    const reader = res.body.getReader();
    const chunks = [];
    let total = 0;
    const MAX = 1024 * 1024;
    while (total < MAX) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    reader.cancel();

    const text = Buffer.concat(chunks).toString('utf8', 0, MAX);
    const m = text.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!m) return null;
    const img = m[1].trim();
    // Reject Google / gstatic assets
    if (img.includes('google.com') || img.includes('gstatic.com')) return null;
    return img;
  } catch {
    return null;
  }
}

/**
 * Given a Google News URL, resolve it to the real article URL then fetch og:image.
 */
async function getThumbFromGoogleUrl(googleUrl) {
  const realUrl = await resolveGoogleNewsUrl(googleUrl);
  if (!realUrl) return null;
  return fetchOgImage(realUrl);
}

// ─── Google News RSS ───────────────────────────────────────────────────────

const GOOGLE_NEWS_QUERIES = [
  { q: '검단신도시',         type: 'local' },
  { q: '검단 아파트',        type: 'real_estate' },
  { q: '인천 서구 부동산',   type: 'real_estate' },
  { q: '인천 서구 아파트',   type: 'real_estate' },
  { q: '인천 서구 생활정보', type: 'local' },
];

function parseGoogleRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const raw = m[1];
    const rawTitle = tagVal(raw, 'title');
    const title = stripHtml(rawTitle).replace(/ - [^-]+$/, '').trim();
    const link = tagVal(raw, 'link') || tagVal(raw, 'guid');
    const pubDate = tagVal(raw, 'pubDate');
    const sourceTag = raw.match(/<source[^>]+url="([^"]*)"[^>]*>([^<]*)<\/source>/);
    const source = sourceTag ? sourceTag[2].trim() : (rawTitle.match(/ - ([^-]+)$/) || ['', '뉴스'])[1].trim();
    const description = stripHtml(tagVal(raw, 'description')).slice(0, 200);

    if (title.length > 5 && link) {
      items.push({ title, link, pubDate, source, description });
    }
    if (items.length >= 20) break;
  }
  return items;
}

async function fetchGoogleNewsRss(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' } });
    clearTimeout(tid);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleRss(xml);
  } catch {
    return [];
  }
}

// ─── Naver News API (optional) ─────────────────────────────────────────────

const NAVER_QUERIES = [
  { query: '검단신도시', type: 'local' },
  { query: '인천 서구 부동산', type: 'real_estate' },
];

async function fetchNaverNews(query, display = 20) {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) return [];
  const params = new URLSearchParams({ query, display: String(display), sort: 'date' });
  const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
    headers: { 'X-Naver-Client-Id': NAVER_CLIENT_ID, 'X-Naver-Client-Secret': NAVER_CLIENT_SECRET },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.items || [];
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('📰 Starting news fetch...\n');

try {
  const allRows = new Map(); // url -> row (deduplicate by URL)

  // 1. Google News RSS
  console.log('📡 Fetching Google News RSS...');
  for (const { q, type } of GOOGLE_NEWS_QUERIES) {
    console.log(`  Query: "${q}"`);
    try {
      const items = await fetchGoogleNewsRss(q);
      console.log(`  → ${items.length} articles`);
      for (const item of items) {
        const url = item.link;
        if (!url || allRows.has(url)) continue;
        allRows.set(url, {
          title: item.title,
          url,
          source: item.source,
          summary: item.description,
          thumbnail: null, // will be enriched below
          published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          news_type: type,
          tags: [],
          _isGoogleUrl: true, // internal flag for redirect resolution
        });
      }
    } catch (err) {
      console.error(`  ❌ "${q}":`, err.message);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // 2. Naver API (if credentials available)
  if (NAVER_CLIENT_ID && NAVER_CLIENT_SECRET) {
    console.log('\n📡 Fetching Naver News...');
    for (const { query, type } of NAVER_QUERIES) {
      console.log(`  Query: "${query}"`);
      try {
        const items = await fetchNaverNews(query, 20);
        console.log(`  → ${items.length} articles`);
        for (const item of items) {
          const url = item.originallink || item.link;
          if (!url || allRows.has(url)) continue;
          const title = stripHtml(item.title || '');
          const source = item.originallink ? new URL(item.originallink).hostname.replace('www.', '') : '네이버뉴스';
          allRows.set(url, {
            title,
            url,
            source,
            summary: stripHtml(item.description || '').slice(0, 200),
            thumbnail: null,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            news_type: type,
            tags: [],
            _isGoogleUrl: false,
          });
        }
      } catch (err) {
        console.error(`  ❌ "${query}":`, err.message);
      }
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const rows = Array.from(allRows.values());
  console.log(`\n  Total unique articles: ${rows.length}`);

  // 3. Fetch og:image thumbnails (concurrency=4)
  console.log('\n🖼  Fetching thumbnails...');
  const CONCURRENCY = 4;
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      try {
        let thumb = null;
        if (row._isGoogleUrl) {
          thumb = await getThumbFromGoogleUrl(row.url);
        } else {
          thumb = await fetchOgImage(row.url);
        }
        if (thumb) {
          row.thumbnail = thumb;
          process.stdout.write('✓');
        } else {
          process.stdout.write('·');
        }
      } catch {
        process.stdout.write('·');
      }
    }));
  }
  console.log(`\n  Thumbnails found: ${rows.filter(r => r.thumbnail).length}/${rows.length}`);

  // 4. Remove internal flag before upsert
  for (const row of rows) delete row._isGoogleUrl;

  if (rows.length === 0) {
    console.log('  No articles to insert');
  } else {
    const { error } = await supabase
      .from('news_articles')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false });

    if (error) {
      console.warn('⚠️  Supabase upsert failed:', error.message);
    } else {
      console.log(`✅ Upserted ${rows.length} news articles`);
    }
  }

  // 5. Clean up old articles (keep last 30 days)
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
