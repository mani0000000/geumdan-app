#!/usr/bin/env node
/**
 * fetch-youtube.mjs — GitHub Actions가 1시간마다 실행
 * YouTube innertube API (키 불필요, Node.js 환경)
 * → Supabase youtube_videos 테이블에 upsert (최대 200개 누적)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not set');
  process.exit(1);
}

function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/rest/v1/')) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.slice(7) === key) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: makeFetch(SUPABASE_KEY) },
  auth: { autoRefreshToken: false, persistSession: false },
});

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/search?key=${INNERTUBE_KEY}`;
const INNERTUBE_CONTEXT = {
  client: { clientName: 'WEB', clientVersion: '2.20240101.00.00', hl: 'ko', gl: 'KR' },
};

async function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms)),
  ]);
}

function parseVideos(data) {
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents ?? [];
  const videos = [];
  let continuationToken = null;

  for (const section of contents) {
    // continuation token for page 2
    if (section?.continuationItemRenderer) {
      continuationToken =
        section.continuationItemRenderer?.continuationEndpoint
          ?.continuationCommand?.token ?? null;
      continue;
    }
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
    }
  }
  return { videos, continuationToken };
}

function parseContinuationVideos(data) {
  const items =
    data?.onResponseReceivedCommands?.[0]
      ?.appendContinuationItemsAction?.continuationItems ?? [];
  const videos = [];
  for (const section of items) {
    for (const item of section?.itemSectionRenderer?.contents ?? []) {
      const vr = item?.videoRenderer;
      if (!vr?.videoId) continue;
      videos.push({
        video_id: vr.videoId,
        title: vr.title?.runs?.[0]?.text ?? '검단 영상',
        channel_name: vr.ownerText?.runs?.[0]?.text ?? 'YouTube',
        thumbnail: `https://img.youtube.com/vi/${vr.videoId}/mqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${vr.videoId}`,
      });
    }
  }
  return videos;
}

async function fetchQuery(query) {
  const res = await withTimeout(
    fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, query }),
    }),
    15000,
    `search:${query}`
  );
  if (!res.ok) throw new Error(`innertube HTTP ${res.status}`);
  return parseVideos(await res.json());
}

async function fetchContinuation(token) {
  const res = await withTimeout(
    fetch(INNERTUBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ context: INNERTUBE_CONTEXT, continuation: token }),
    }),
    15000,
    'continuation'
  );
  if (!res.ok) throw new Error(`continuation HTTP ${res.status}`);
  return parseContinuationVideos(await res.json());
}

// ── 검색어 15개 — 검단 생활 전반 커버 ─────────────────────────
const QUERIES = [
  '검단신도시 맛집',
  '검단신도시 카페',
  '검단신도시 브이로그 일상',
  '검단신도시 소식 뉴스',
  '검단신도시 공원 산책',
  '검단신도시 쇼핑 마트',
  '검단신도시 부동산 아파트',
  '검단신도시 운동 헬스',
  '검단신도시 문화 축제 행사',
  '검단신도시 교통 버스 지하철',
  '검단신도시 아이 어린이 가족',
  '검단신도시 병원 의료',
  '인천 서구 검단 생활',
  '검단아라 검단오류동',
  '검단신도시 후기 정보',
];

async function fetchAllQueries() {
  const results = await Promise.allSettled(QUERIES.map(q => fetchQuery(q)));

  // 1차: 각 쿼리 첫 페이지 (라운드로빈)
  const buckets = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value.videos;
    console.warn(`  ⚠️ 쿼리 실패: ${QUERIES[i]}`);
    return [];
  });
  const continuationTokens = results.map(r =>
    r.status === 'fulfilled' ? r.value.continuationToken : null
  );

  const seen = new Set();
  const all = [];

  // 라운드로빈으로 1페이지 교차 수집
  const maxRound1 = Math.max(...buckets.map(b => b.length));
  for (let i = 0; i < maxRound1; i++) {
    for (const bucket of buckets) {
      if (i >= bucket.length) continue;
      const v = bucket[i];
      if (!seen.has(v.video_id)) { seen.add(v.video_id); all.push(v); }
    }
  }
  console.log(`  1페이지 수집: ${all.length}개`);

  // 2차: continuation token으로 2페이지 수집 (200개 미만인 경우)
  if (all.length < 200) {
    const contFetches = continuationTokens
      .map((t, i) => t ? { token: t, query: QUERIES[i] } : null)
      .filter(Boolean);

    const contResults = await Promise.allSettled(
      contFetches.map(({ token }) => fetchContinuation(token))
    );

    const contBuckets = contResults.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      console.warn(`  ⚠️ 2페이지 실패: ${contFetches[i].query}`);
      return [];
    });

    const maxRound2 = Math.max(...contBuckets.map(b => b.length), 0);
    for (let i = 0; i < maxRound2; i++) {
      for (const bucket of contBuckets) {
        if (i >= bucket.length) continue;
        const v = bucket[i];
        if (!seen.has(v.video_id)) { seen.add(v.video_id); all.push(v); }
      }
    }
    console.log(`  2페이지 추가 후: ${all.length}개`);
  }

  return all.slice(0, 200);
}

// ── 실행 ──────────────────────────────────────────────────────
console.log('▶️  검단신도시 YouTube 영상 수집 시작...');
const t0 = Date.now();

let videos;
try {
  videos = await fetchAllQueries();
  console.log(`  ✓ 총 ${videos.length}개 수집`);
} catch (e) {
  console.error('  ❌ 수집 오류:', e.message);
  process.exit(1);
}

if (videos.length === 0) {
  console.log('  ⚠️ 수집된 영상 없음, 종료');
  process.exit(0);
}

const now = new Date().toISOString();
const rows = videos.map(v => ({ ...v, fetched_at: now }));

const { error } = await supabase
  .from('youtube_videos')
  .upsert(rows, { onConflict: 'video_id' });

if (error) {
  console.warn('⚠️  Supabase upsert 실패:', error.message);
  process.exit(0);
}

console.log(`✅ 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s): ${videos.length}개 Supabase 저장`);
