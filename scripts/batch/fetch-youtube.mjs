#!/usr/bin/env node
/**
 * fetch-youtube.mjs — GitHub Actions가 1시간마다 실행
 * YouTube innertube API (키 불필요, Node.js 환경)
 * → Supabase youtube_videos 테이블에 upsert
 *
 * Supabase 테이블 스키마 (최초 1회 실행 전 생성 필요):
 *   CREATE TABLE youtube_videos (
 *     video_id     TEXT PRIMARY KEY,
 *     title        TEXT NOT NULL,
 *     channel_name TEXT,
 *     thumbnail    TEXT,
 *     url          TEXT NOT NULL,
 *     fetched_at   TIMESTAMPTZ DEFAULT NOW()
 *   );
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

// sb_* keys are not JWTs — strip Authorization: Bearer for PostgREST
function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/rest/v1/')) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.slice(7) === key) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { global: { fetch: makeFetch(SUPABASE_KEY) }, auth: { autoRefreshToken: false, persistSession: false } });

// YouTube innertube API (공개 키, 브라우저와 동일)
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`;

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
  ]);
}

async function fetchYouTubeInnertube(query = '검단신도시') {
  const res = await withTimeout(
    fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240101.00.00',
            hl: 'ko',
            gl: 'KR',
          },
        },
        query,
      }),
    }),
    15000,
    'innertube'
  );

  if (!res.ok) throw new Error(`innertube HTTP ${res.status}`);
  const data = await res.json();

  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];

  const videos = [];
  for (const section of contents) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const vr = item?.videoRenderer;
      if (!vr?.videoId) continue;
      const videoId = vr.videoId;
      videos.push({
        video_id: videoId,
        title: vr.title?.runs?.[0]?.text ?? '검단 영상',
        channel_name: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
        thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${videoId}`,
      });
      if (videos.length >= 20) break;
    }
    if (videos.length >= 20) break;
  }
  return videos;
}

// 다양한 카테고리 쿼리로 풍부한 검단 콘텐츠 수집 (라운드로빈 교차 정렬)
async function fetchAllQueries() {
  const queries = [
    '검단신도시 맛집',
    '검단신도시 카페',
    '검단신도시 공원 볼거리',
    '검단신도시 브이로그 일상',
    '검단신도시 소식 뉴스',
  ];
  const results = await Promise.allSettled(queries.map(q => fetchYouTubeInnertube(q)));

  // 카테고리별 버킷에 담기
  const buckets = results.map(r => (r.status === 'fulfilled' ? r.value : []));

  // 라운드로빈: 각 카테고리에서 1개씩 교차 → 주제 균형 보장
  const seen = new Set();
  const all = [];
  const maxRounds = 6;
  for (let round = 0; round < maxRounds; round++) {
    for (const bucket of buckets) {
      const v = bucket[round];
      if (!v) continue;
      if (!seen.has(v.video_id)) {
        seen.add(v.video_id);
        all.push(v);
      }
    }
  }
  return all.slice(0, 30);
}

// ── 실행 ──────────────────────────────────────────────────────
console.log('▶️  검단신도시 YouTube 영상 수집 시작...');
const t0 = Date.now();

let videos;
try {
  videos = await fetchAllQueries();
  console.log(`  ✓ innertube API: ${videos.length}개 수집`);
} catch (e) {
  console.error('  ❌ innertube 오류:', e.message);
  process.exit(1);
}

if (videos.length === 0) {
  console.log('  ⚠️ 수집된 영상 없음, 종료');
  process.exit(0);
}

// Supabase upsert
const now = new Date().toISOString();
const rows = videos.map(v => ({ ...v, fetched_at: now }));

const { error } = await supabase
  .from('youtube_videos')
  .upsert(rows, { onConflict: 'video_id' });

if (error) {
  console.warn('⚠️  Supabase upsert 실패 (테이블 미생성 또는 연결 오류):', error.message);
  console.warn('   → supabase/migrations/20260419_news_youtube.sql 을 Supabase에서 실행하세요.');
  process.exit(0);
}

console.log(`✅ 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s): ${videos.length}개 영상 Supabase 저장`);
