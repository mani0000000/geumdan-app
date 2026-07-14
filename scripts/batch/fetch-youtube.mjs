#!/usr/bin/env node
/**
 * fetch-youtube.mjs — GitHub Actions가 1시간마다 실행
 * 검단 주민 관심사 기반 YouTube 큐레이션 → Supabase youtube_videos upsert
 *
 * 수집 조건:
 * - 검단/검단신도시/아라·원당·당하 등 지역 연관성 필수
 * - 최신 게시일 우선
 * - 구독자 많은 채널/공식·뉴스 채널 가중치
 * - 맛집·카페·소식·가볼만한 곳·교통·부동산·가족·상가·생활 주제별 검색
 */
import { createClient } from '@supabase/supabase-js';
import {
  fetchCuratedYouTubeVideos,
  toSupabaseRow,
  YOUTUBE_TOPIC_GROUPS,
} from './youtube-curation.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? '';

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

function stripColumn(rows, column) {
  return rows.map(row => {
    const copy = { ...row };
    delete copy[column];
    return copy;
  });
}

async function upsertWithColumnFallback(rows) {
  let currentRows = rows;
  const skippedColumns = [];

  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase
      .from('youtube_videos')
      .upsert(currentRows, { onConflict: 'video_id' });

    if (!error) return { ok: true, skippedColumns };

    const message = error.message ?? '';
    const col = message.match(/'([^']+)' column/)?.[1]
      ?? message.match(/Could not find the '([^']+)' column/)?.[1]
      ?? message.match(/column "([^"]+)"/)?.[1];

    if (col && !skippedColumns.includes(col)) {
      console.warn(`  ⚠️ DB 컬럼 없음: ${col} — 제외 후 재시도`);
      skippedColumns.push(col);
      currentRows = stripColumn(currentRows, col);
      continue;
    }

    return { ok: false, error };
  }

  return { ok: false, error: new Error('too many column fallback attempts') };
}

async function supportsCurationSchema() {
  const { error } = await supabase
    .from('youtube_videos')
    .select('published_at,topic,query,relevance_score')
    .limit(1);
  return !error;
}

async function pruneOutsideCollection(keepIds) {
  const keep = new Set(keepIds);
  const { data, error } = await supabase.from('youtube_videos').select('video_id');
  if (error) {
    console.warn(`  ⚠️ 이전 영상 정리 생략: ${error.message}`);
    return 0;
  }
  const stale = (data ?? []).map(row => row.video_id).filter(id => id && !keep.has(id));
  for (let index = 0; index < stale.length; index += 80) {
    const removed = await supabase.from('youtube_videos').delete().in('video_id', stale.slice(index, index + 80));
    if (removed.error) {
      console.warn(`  ⚠️ 이전 영상 정리 실패: ${removed.error.message}`);
      break;
    }
  }
  return stale.length;
}

async function saveBatchStatus(status) {
  const rows = [
    { key: 'youtube_last_collected_at', value: new Date().toISOString() },
    { key: 'youtube_last_status', value: JSON.stringify(status) },
  ];
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) console.warn(`  ⚠️ 배치 상태 저장 실패: ${error.message}`);
}

console.log('▶️  검단 YouTube 주민형 큐레이션 수집 시작...');
console.log(`  주제: ${YOUTUBE_TOPIC_GROUPS.map(group => group.label).join(', ')}`);
const t0 = Date.now();

let videos;
try {
  videos = await fetchCuratedYouTubeVideos({
    youtubeApiKey: YOUTUBE_API_KEY,
    minScore: 38,
    limit: 240,
    includeContinuation: true,
  });
  console.log(`  ✓ 큐레이션 통과: ${videos.length}개`);
} catch (e) {
  console.error('  ❌ 수집 오류:', e.message);
  process.exit(1);
}

if (videos.length === 0) {
  console.error('  ❌ 수집된 영상 없음');
  await saveBatchStatus({ videos: 0, errors: 1, reason: 'empty-result' });
  process.exit(1);
}

const now = new Date().toISOString();
const advancedSchema = await supportsCurationSchema();
const rows = advancedSchema
  ? videos.map(video => toSupabaseRow(video, now))
  : videos.map(video => ({
    video_id: video.video_id,
    title: video.title,
    channel_name: video.channel_name,
    thumbnail: video.thumbnail,
    url: video.url,
    // 구형 스키마에서는 실제 게시일을 fetched_at에 보존해 프론트 최신순을 유지한다.
    fetched_at: video.published_at || now,
  }));
let result;
if (advancedSchema) {
  result = await upsertWithColumnFallback(rows);
} else {
  const legacyWrite = await supabase
    .from('youtube_videos')
    .upsert(rows, { onConflict: 'video_id' });
  result = { ok: !legacyWrite.error, error: legacyWrite.error, skippedColumns: [] };
}

if (!result.ok) {
  console.error('❌ Supabase upsert 실패:', result.error?.message ?? result.error);
  await saveBatchStatus({ videos: 0, errors: 1, reason: result.error?.message ?? 'upsert-failed' });
  process.exit(1);
}

const pruned = await pruneOutsideCollection(videos.map(video => video.video_id));

const topicCounts = videos.reduce((acc, video) => {
  acc[video.topic] = (acc[video.topic] ?? 0) + 1;
  return acc;
}, {});

console.log(`✅ 완료 (${((Date.now() - t0) / 1000).toFixed(1)}s): ${videos.length}개 Supabase 저장`);
console.log('  주제별:', topicCounts);
console.log(`  스키마: ${advancedSchema ? '큐레이션 확장' : '레거시 호환'} · 이전 영상 ${pruned}개 정리`);
if (result.skippedColumns.length > 0) {
  console.log(`  참고: DB 미적용 컬럼 제외 저장 (${result.skippedColumns.join(', ')})`);
}
await saveBatchStatus({
  videos: videos.length,
  topics: topicCounts,
  errors: 0,
  schema: advancedSchema ? 'extended' : 'legacy',
  pruned,
  durationSeconds: Math.round((Date.now() - t0) / 1000),
});
