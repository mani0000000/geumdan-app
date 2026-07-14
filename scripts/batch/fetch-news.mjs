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
import { clusterNewsArticles } from '../../lib/news/deduplicate.mjs';
import { isGoogleNewsUrl, resolveGoogleNewsArticle } from '../../lib/news/google-news.mjs';

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

function decodeEntities(str = '') {
  let decoded = str;
  for (let i = 0; i < 2; i += 1) {
    decoded = decoded
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&quot;|&#34;/gi, '"')
      .replace(/&apos;|&#39;/gi, "'")
      .replace(/&amp;/gi, '&')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
  }
  return decoded;
}

function stripHtml(str = '') {
  return decodeEntities(str).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function tagVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
  return m ? (m[1] ?? m[2] ?? '').trim() : '';
}

// ─── og:image extraction ───────────────────────────────────────────────────

/**
 * Fetch og:image from a real article URL.
 * Reads up to 1MB to find the og:image meta tag.
 */
async function fetchOpenGraph(articleUrl, timeoutMs = 6000) {
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.7',
      },
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

    const descriptionMatch = text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      ?? text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i)
      ?? text.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const description = descriptionMatch?.[1] ? stripHtml(descriptionMatch[1]).slice(0, 220) : null;
    if (!m) return { thumbnail: null, description };
    const img = m[1].trim();
    // Reject Google / gstatic assets
    if (img.includes('google.com') || img.includes('gstatic.com')) return { thumbnail: null, description };
    let thumbnail = img;
    try { thumbnail = new URL(img, res.url || articleUrl).toString(); } catch { /* keep original */ }
    return { thumbnail, description };
  } catch {
    return { thumbnail: null, description: null };
  }
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
    const description = stripHtml(tagVal(raw, 'description'))
      .replace(title, '')
      .replace(source, '')
      .trim()
      .slice(0, 220);

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

  const collectedRows = Array.from(allRows.values())
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 90);

  // 3. Google News 중계 URL을 실제 언론사 URL로 복원한 뒤 OG 이미지/설명을 수집한다.
  console.log('\n🖼  Resolving publisher URLs and metadata...');
  const CONCURRENCY = 6;
  for (let i = 0; i < collectedRows.length; i += CONCURRENCY) {
    const batch = collectedRows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      try {
        let googleThumbnail = null;
        if (row._isGoogleUrl || isGoogleNewsUrl(row.url)) {
          const resolved = await resolveGoogleNewsArticle(row.url, { timeoutMs: 9000 });
          googleThumbnail = resolved.thumbnail;
          if (!isGoogleNewsUrl(resolved.url)) row.url = resolved.url;
        }

        const metadata = isGoogleNewsUrl(row.url)
          ? { thumbnail: null, description: null }
          : await fetchOpenGraph(row.url, 8000);
        row.thumbnail = metadata.thumbnail || googleThumbnail || null;
        if (row.thumbnail) {
          process.stdout.write('✓');
        } else {
          process.stdout.write('·');
        }
        if (metadata.description && metadata.description.length >= 24) {
          row.summary = metadata.description;
        } else if (!row.summary || row.summary.length < 20) {
          row.summary = `${row.title.replace(/[.!?]+$/, '')} 관련 검단 지역 소식입니다.`;
        }
      } catch {
        process.stdout.write('·');
      }
    }));
  }

  // 실제 URL 복원 뒤 같은 이슈를 다시 묶어 이미지와 설명이 좋은 대표 기사만 남긴다.
  const issueClusters = clusterNewsArticles(collectedRows, { maxHours: 96 });
  const rows = issueClusters.map(cluster => cluster.article);
  const duplicateCount = collectedRows.length - rows.length;
  console.log(`\n  URL unique articles: ${collectedRows.length}`);
  console.log(`  Issue unique articles: ${rows.length} (${duplicateCount} same-issue articles grouped)`);
  console.log(`  Thumbnails found: ${rows.filter(r => r.thumbnail).length}/${rows.length}`);

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

      const enrichedCount = rows.filter(row => row.thumbnail && !isGoogleNewsUrl(row.url)).length;
      if (enrichedCount >= 6) {
        const { error: cleanupGoogleError } = await supabase
          .from('news_articles')
          .delete()
          .like('url', 'https://news.google.com/%');
        if (cleanupGoogleError) {
          console.warn('⚠️  Could not clean up Google relay rows:', cleanupGoogleError.message);
        } else {
          console.log('✅ Google relay rows replaced with publisher URLs');
        }
      }
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
