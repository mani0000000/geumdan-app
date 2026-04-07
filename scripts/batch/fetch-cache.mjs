#!/usr/bin/env node
/**
 * fetch-cache.mjs
 * Fetches news and YouTube videos for 검단신도시, saves to public/cache/
 * Run by GitHub Actions every 3 hours → triggers a deploy with fresh data.
 *
 * Node.js has no CORS restrictions, so we call APIs directly without proxies.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, '../../public/cache');
mkdirSync(CACHE_DIR, { recursive: true });

const NAVER_ID     = process.env.NAVER_CLIENT_ID ?? '';
const NAVER_SECRET = process.env.NAVER_CLIENT_SECRET ?? '';

// ── Helpers ────────────────────────────────────────────────
function stripHtml(s = '') {
  return s.replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .trim();
}
function extractSource(title) {
  const m = title.match(/ - ([^-]+)$/);
  return m ? m[1].trim() : '뉴스';
}
function safeDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); } catch { return '뉴스'; }
}
function loadExisting(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    return data;
  } catch { return null; }
}

// ── 뉴스 수집 ──────────────────────────────────────────────
async function fetchNews() {
  // 1. Naver News API (date-sorted, most reliable)
  if (NAVER_ID && NAVER_SECRET) {
    try {
      const params = new URLSearchParams({ query: '검단신도시', display: '20', sort: 'date' });
      const res = await fetch(`https://openapi.naver.com/v1/search/news.json?${params}`, {
        headers: { 'X-Naver-Client-Id': NAVER_ID, 'X-Naver-Client-Secret': NAVER_SECRET },
      });
      if (res.ok) {
        const { items = [] } = await res.json();
        if (items.length > 0) {
          const articles = items.map((item, i) => ({
            id: `nv-${i}`,
            title: stripHtml(item.title ?? ''),
            summary: stripHtml(item.description ?? '').slice(0, 120),
            source: safeDomain(item.originallink || item.link || ''),
            publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            url: item.originallink || item.link || '#',
            type: '뉴스',
          })).filter(n => n.title.length > 5);
          console.log(`📰 Naver: ${articles.length}건`);
          return articles;
        }
      }
    } catch (e) { console.error('Naver error:', e.message); }
  }

  // 2. Google News RSS (direct — no CORS in Node.js)
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent('검단신도시')}&hl=ko&gl=KR&ceid=KR:ko`;
    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
    });
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m, i) => {
      const raw = m[1];
      const getTag = (tag) => {
        const mm = raw.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`));
        return mm ? stripHtml(mm[1].trim()) : '';
      };
      const title   = getTag('title');
      const link    = raw.match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '#';
      const pubDate = raw.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? '';
      const src     = getTag('source') || extractSource(title);
      return {
        id: `gr-${i}`, title, summary: '', source: src,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        url: link, type: '뉴스',
      };
    }).filter(n => n.title.length > 5).slice(0, 20);
    console.log(`📰 Google RSS: ${items.length}건`);
    return items;
  } catch (e) { console.error('Google RSS error:', e.message); }

  return [];
}

// ── 유튜브 수집 ────────────────────────────────────────────
async function fetchYouTube() {
  const query = '검단신도시';
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
      }
    );
    const html = await res.text();

    // ytInitialData JSON 파싱
    const match = html.match(/var ytInitialData\s*=\s*(\{[\s\S]+?\});\s*(?:var |<\/script>)/);
    if (match) {
      try {
        const ytData = JSON.parse(match[1]);
        const sections =
          ytData?.contents?.twoColumnSearchResultsRenderer
            ?.primaryContents?.sectionListRenderer?.contents ?? [];
        const videos = [];
        for (const section of sections) {
          for (const item of (section?.itemSectionRenderer?.contents ?? [])) {
            const vr = item?.videoRenderer;
            if (!vr?.videoId) continue;
            const videoId = vr.videoId;
            videos.push({
              id: `yt-${videos.length}`,
              videoId,
              title: vr.title?.runs?.[0]?.text ?? `${query} 영상`,
              channelName: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
              thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
            });
            if (videos.length >= 12) break;
          }
          if (videos.length >= 12) break;
        }
        if (videos.length > 0) {
          console.log(`▶️  YouTube (ytInitialData): ${videos.length}개`);
          return videos;
        }
      } catch {}
    }

    // regex fallback — video ID만 추출
    const seen = new Set();
    const videos = [];
    for (const m of html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        videos.push({
          id: `yt-${videos.length}`, videoId: m[1],
          title: `${query} 영상 ${videos.length + 1}`,
          channelName: 'YouTube',
          thumbnail: `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${m[1]}`,
        });
        if (videos.length >= 12) break;
      }
    }
    console.log(`▶️  YouTube (regex): ${videos.length}개`);
    return videos;
  } catch (e) {
    console.error('YouTube error:', e.message);
    return [];
  }
}

// ── 실행 ──────────────────────────────────────────────────
const [news, youtube] = await Promise.all([fetchNews(), fetchYouTube()]);
const now = new Date().toISOString();

// Keep existing data if new fetch returned nothing
const existingNews    = loadExisting(`${CACHE_DIR}/news.json`);
const existingYt      = loadExisting(`${CACHE_DIR}/youtube.json`);

const finalNews    = news.length    > 0 ? news    : (existingNews?.articles    ?? []);
const finalVideos  = youtube.length > 0 ? youtube : (existingYt?.videos        ?? []);

writeFileSync(
  `${CACHE_DIR}/news.json`,
  JSON.stringify({ fetchedAt: now, articles: finalNews }, null, 2)
);
writeFileSync(
  `${CACHE_DIR}/youtube.json`,
  JSON.stringify({ fetchedAt: now, videos: finalVideos }, null, 2)
);

console.log(`✅ Cache saved: ${finalNews.length}개 뉴스, ${finalVideos.length}개 유튜브`);
