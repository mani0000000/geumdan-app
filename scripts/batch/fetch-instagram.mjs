#!/usr/bin/env node
/**
 * fetch-instagram.mjs — GitHub Actions 매시간 실행
 *
 * Instagram 해시태그 페이지의 공개 JSON API를 사용해
 * 최신 게시물(이미지·릴스)을 Supabase instagram_posts 테이블에 upsert.
 *
 * 수집 해시태그: 검단신도시, 검단, 인천검단, 검단라이프
 * (INSTAGRAM_HASHTAGS 환경 변수로 덮어쓸 수 있음)
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/batch/fetch-instagram.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const HASHTAGS = (process.env.INSTAGRAM_HASHTAGS ?? '검단신도시,검단,인천검단,검단라이프')
  .split(',').map(h => h.trim()).filter(Boolean);

// 설정
const POSTS_PER_TAG = 12;   // 해시태그당 수집 건수
const MAX_STORED    = 500;  // DB에 유지할 최대 레코드 수
const DELAY_MS      = 2500; // 태그 간 요청 딜레이 (429 방지)

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL, SUPABASE_SERVICE_KEY 가 설정되지 않았습니다.');
  process.exit(1);
}

// sb_* 키는 JWT가 아니므로 Authorization 헤더 제거
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Instagram 내부 웹 API로 해시태그 게시물 가져오기 ──────────────
// Instagram 웹 앱이 사용하는 GraphQL/internal API를 브라우저처럼 호출
async function fetchHashtagPosts(hashtag) {
  const encoded = encodeURIComponent(hashtag);

  // 방법 1: Instagram 내부 sections API (최신 인터페이스)
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/tags/${encoded}/sections/?count=${POSTS_PER_TAG}&tab=recent`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21A329 Instagram 311.0.0.31.109',
          'X-IG-App-ID': '936619743392459',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'Origin': 'https://www.instagram.com',
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (res.ok) {
      const data = await res.json();
      const posts = parseSectionsResponse(data, hashtag);
      if (posts.length > 0) return posts;
    }
  } catch (e) {
    console.warn(`  [sections API 실패] ${hashtag}: ${e.message}`);
  }

  // 방법 2: 구형 ?__a=1 쿼리스트링 JSON
  try {
    const res = await fetch(
      `https://www.instagram.com/explore/tags/${encoded}/?__a=1&__d=dis`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/html, */*',
          'Accept-Language': 'ko-KR,ko;q=0.9',
          'Referer': 'https://www.instagram.com/',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(12000),
      }
    );
    if (res.ok) {
      const text = await res.text();
      // 응답이 HTML(로그인 리다이렉트)이면 스킵
      if (text.trimStart().startsWith('{')) {
        const data = JSON.parse(text);
        const posts = parseLegacyResponse(data, hashtag);
        if (posts.length > 0) return posts;
      }
    }
  } catch (e) {
    console.warn(`  [legacy API 실패] ${hashtag}: ${e.message}`);
  }

  return [];
}

// ── Instagram sections API 응답 파서 ────────────────────────────
function parseSectionsResponse(data, hashtag) {
  const posts = [];
  const sections = data?.sections ?? [];
  for (const section of sections) {
    const medias = section?.layout_content?.medias ?? [];
    for (const item of medias) {
      const media = item?.media;
      if (!media) continue;
      const post = parseMediaNode(media, hashtag);
      if (post) posts.push(post);
    }
  }
  return posts;
}

// ── Instagram legacy API 응답 파서 ──────────────────────────────
function parseLegacyResponse(data, hashtag) {
  const posts = [];
  const edges =
    data?.graphql?.hashtag?.edge_hashtag_to_media?.edges ??
    data?.data?.hashtag?.edge_hashtag_to_media?.edges ?? [];
  for (const { node } of edges) {
    if (!node) continue;
    const post = parseLegacyNode(node, hashtag);
    if (post) posts.push(post);
  }
  return posts;
}

function parseMediaNode(media, hashtag) {
  const code = media.code ?? media.shortcode;
  if (!code) return null;
  const mediaType = media.media_type === 2 ? 'REEL'
    : media.media_type === 8 ? 'CAROUSEL'
    : 'IMAGE';
  const thumb =
    media.image_versions2?.candidates?.[0]?.url ??
    media.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ?? '';
  const caption = media.caption?.text ?? '';
  const tags = extractHashtags(caption);

  return {
    shortcode:     code,
    post_url:      `https://www.instagram.com/p/${code}/`,
    account_name:  media.user?.username ?? media.owner?.username ?? 'unknown',
    username:      media.user?.username ?? media.owner?.username,
    image_url:     thumb.split('?')[0],   // strip expiry query params
    caption,
    media_type:    mediaType,
    is_reel:       mediaType === 'REEL',
    like_count:    media.like_count ?? 0,
    comment_count: media.comment_count ?? 0,
    view_count:    media.view_count ?? media.play_count ?? null,
    hashtags:      [...new Set([hashtag, ...tags])],
    posted_at:     new Date((media.taken_at ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

function parseLegacyNode(node, hashtag) {
  const code = node.shortcode;
  if (!code) return null;
  const mediaType = node.__typename === 'GraphVideo' ? 'REEL'
    : node.__typename === 'GraphSidecar' ? 'CAROUSEL'
    : 'IMAGE';
  const thumb =
    node.thumbnail_src ?? node.display_url ?? node.thumbnail_resources?.[0]?.src ?? '';
  const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
  const tags = extractHashtags(caption);

  return {
    shortcode:     code,
    post_url:      `https://www.instagram.com/p/${code}/`,
    account_name:  node.owner?.username ?? 'unknown',
    username:      node.owner?.username,
    image_url:     thumb.split('?')[0],
    caption,
    media_type:    mediaType,
    is_reel:       mediaType === 'REEL',
    like_count:    node.edge_liked_by?.count ?? node.edge_media_preview_like?.count ?? 0,
    comment_count: node.edge_media_to_comment?.count ?? 0,
    view_count:    node.video_view_count ?? null,
    hashtags:      [...new Set([hashtag, ...tags])],
    posted_at:     new Date((node.taken_at_timestamp ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#([^\s#]+)/g) ?? [];
  return matches.map(h => h.slice(1)).slice(0, 20);
}

// ── Supabase upsert ──────────────────────────────────────────────
async function upsertPosts(posts) {
  if (!posts.length) return 0;

  // post_url 기준 dedup (shortcode가 없는 레거시 경우를 위해)
  const unique = Object.values(
    Object.fromEntries(posts.map(p => [p.post_url, p]))
  );

  // image_url이 빈 레코드 제외
  const valid = unique.filter(p => p.image_url);
  if (!valid.length) return 0;

  const { error } = await supabase
    .from('instagram_posts')
    .upsert(valid, { onConflict: 'post_url', ignoreDuplicates: false });

  if (error) {
    console.error('  upsert 오류:', error.message);
    // shortcode conflict일 수도 있으므로 개별 처리
    let saved = 0;
    for (const p of valid) {
      const { error: e2 } = await supabase
        .from('instagram_posts')
        .upsert(p, { onConflict: 'post_url', ignoreDuplicates: true });
      if (!e2) saved++;
    }
    return saved;
  }
  return valid.length;
}

// ── 오래된 레코드 정리 ────────────────────────────────────────────
async function pruneOldPosts() {
  const { count } = await supabase
    .from('instagram_posts')
    .select('*', { count: 'exact', head: true });
  if ((count ?? 0) <= MAX_STORED) return;

  const excess = (count ?? 0) - MAX_STORED;
  const { data: old } = await supabase
    .from('instagram_posts')
    .select('id')
    .order('posted_at', { ascending: true })
    .limit(excess);

  if (old?.length) {
    const ids = old.map(r => r.id);
    await supabase.from('instagram_posts').delete().in('id', ids);
    console.log(`🗑️  오래된 게시물 ${ids.length}개 삭제 (총 ${count}개 → ${MAX_STORED}개 유지)`);
  }
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📷 Instagram 수집 시작 (해시태그: ${HASHTAGS.join(', ')})`);
  console.log(`   ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}\n`);

  let totalSaved = 0;

  for (const tag of HASHTAGS) {
    console.log(`  #${tag} 수집 중...`);
    try {
      const posts = await fetchHashtagPosts(tag);
      if (!posts.length) {
        console.log(`  → 수집된 게시물 없음 (API 차단 또는 게시물 없음)`);
      } else {
        const saved = await upsertPosts(posts);
        totalSaved += saved;
        console.log(`  → ${posts.length}개 가져옴, ${saved}개 저장`);
      }
    } catch (e) {
      console.error(`  → 오류: ${e.message}`);
    }
    if (HASHTAGS.indexOf(tag) < HASHTAGS.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  await pruneOldPosts();

  console.log(`\n✅ 완료 — 총 ${totalSaved}개 저장됨\n`);
}

main().catch(e => {
  console.error('❌ 예기치 않은 오류:', e);
  process.exit(1);
});
