#!/usr/bin/env node
/**
 * 검단 로컬 SNS 정기 수집기
 *
 * - 관리자 키워드: 해시태그의 최신 게시물/릴스를 수집
 * - 관리자 계정: 게시물/릴스/스토리를 계정별 설정에 맞춰 수집
 * - 해시태그에서 발견한 계정: 비활성 후보로 자동 저장해 관리자 검토 지원
 * - 스토리는 만료 시간을 기록하고, 만료된 데이터는 자동 정리
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const HIKERAPI_KEY = process.env.HIKERAPI_KEY ?? '';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN ?? '';

const DEFAULT_KEYWORDS = [
  ['검단신도시', '지역소식'], ['검단소식', '지역소식'], ['인천검단', '지역소식'],
  ['검단구', '지역소식'], ['검단축제', '지역소식'], ['검단행사', '지역소식'],
  ['검단맛집', '맛집'], ['검단신도시맛집', '맛집'], ['검단카페', '맛집'],
  ['검단신상맛집', '맛집'], ['검단브런치', '맛집'], ['검단베이커리', '맛집'],
  ['아라동맛집', '맛집'], ['원당동맛집', '맛집'], ['당하동맛집', '맛집'],
  ['검단가볼만한곳', '가볼만한 곳'], ['검단핫플', '가볼만한 곳'],
  ['검단데이트', '가볼만한 곳'], ['검단데이트코스', '가볼만한 곳'],
  ['검단아이와', '가볼만한 곳'], ['검단아이랑', '가볼만한 곳'], ['검단나들이', '가볼만한 곳'],
  ['검단생활', '생활정보'], ['검단교통', '생활정보'], ['검단신규오픈', '생활정보'],
  ['검단상가', '생활정보'], ['검단운동', '생활정보'], ['검단반려동물', '생활정보'],
  ['검단육아', '육아·교육'], ['검단교육', '육아·교육'], ['검단학교', '육아·교육'],
];
const KEYWORD_SEED_VERSION = 2;
const POSTS_PER_KEYWORD = 10;
const ACCOUNT_MEDIA_LIMIT = 24;
const MAX_STORED = 1200;
const DELAY_MS = 900;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_KEY가 필요합니다.');
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const asArray = value => Array.isArray(value?.[0]) ? value[0]
  : Array.isArray(value?.items) ? value.items
  : Array.isArray(value?.data) ? value.data
  : Array.isArray(value) ? value
  : [];
const cleanUsername = value => String(value ?? '').trim().replace(/^@/, '').toLowerCase();

function extractHashtags(text) {
  return [...new Set((String(text ?? '').match(/#([^\s#]+)/g) ?? []).map(tag => tag.slice(1)))].slice(0, 30);
}

function imageUrl(media) {
  return media?.thumbnail_url
    ?? media?.image_versions2?.candidates?.[0]?.url
    ?? media?.image_versions?.[0]?.url
    ?? media?.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url
    ?? media?.display_url
    ?? media?.thumbnail_src
    ?? '';
}

function captionText(media) {
  return media?.caption_text ?? media?.caption?.text
    ?? media?.edge_media_to_caption?.edges?.[0]?.node?.text ?? '';
}

function timestamp(media) {
  const raw = Number(media?.taken_at_ts ?? media?.taken_at ?? media?.taken_at_timestamp ?? 0);
  return new Date(raw > 1_000_000_000 ? raw * 1000 : Date.now()).toISOString();
}

function inferCategory(text, keywordRows, fallback = '지역소식') {
  const haystack = String(text ?? '').replaceAll('#', '').toLowerCase();
  const match = keywordRows
    .filter(row => haystack.includes(String(row.keyword).toLowerCase()))
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  if (match?.category) return match.category;
  if (/맛집|카페|디저트|빵집|브런치|먹방/.test(haystack)) return '맛집';
  if (/가볼만|핫플|데이트|나들이|공원|축제|아이와/.test(haystack)) return '가볼만한 곳';
  if (/교통|버스|지하철|병원|약국|생활/.test(haystack)) return '생활정보';
  return fallback;
}

function relevanceScore(media, discoveryKeyword, source) {
  const caption = captionText(media);
  const localHits = (caption.match(/검단|아라동|원당동|당하동|불로동|마전동|오류동|왕길동/gi) ?? []).length;
  const engagement = Number(media?.like_count ?? 0) + Number(media?.comment_count ?? 0) * 3;
  return Math.min(100, 35 + localHits * 12 + (discoveryKeyword ? 15 : 0)
    + (source?.featured ? 15 : 0) + Math.min(15, Math.floor(Math.log10(engagement + 1) * 5)));
}

function normalizeMedia(media, context) {
  const username = cleanUsername(media?.user?.username ?? media?.owner?.username ?? context.username);
  const code = media?.code ?? media?.shortcode;
  const id = String(media?.pk ?? media?.id ?? code ?? '');
  const story = context.contentType === 'STORY';
  if ((!code && !story) || !id || !username) return null;

  const reel = !story && (media?.media_type === 2 || media?.product_type === 'clips' || context.contentType === 'REEL');
  const carousel = !story && media?.media_type === 8;
  const contentType = story ? 'STORY' : reel ? 'REEL' : carousel ? 'CAROUSEL' : 'POST';
  const postedAt = timestamp(media);
  const caption = captionText(media);
  const hashtags = extractHashtags(caption);
  const category = inferCategory(`${context.discoveryKeyword ?? ''} ${caption}`, context.keywords, context.category);
  const source = context.source;
  const profileImage = source?.profile_image_url ?? media?.user?.profile_pic_url ?? '';
  const url = story
    ? `https://www.instagram.com/stories/${username}/${id}/`
    : `https://www.instagram.com/${reel ? 'reel' : 'p'}/${code}/`;

  return {
    shortcode: story ? `story-${id}` : code,
    post_url: url,
    account_name: source?.display_name || username,
    username,
    // Instagram CDN query parameters include signed delivery information.
    // Removing them makes otherwise valid thumbnails fail immediately.
    image_url: String(imageUrl(media)),
    caption,
    media_type: contentType,
    content_type: contentType,
    is_reel: reel,
    is_story: story,
    like_count: Number(media?.like_count ?? 0),
    comment_count: Number(media?.comment_count ?? 0),
    view_count: Number(media?.view_count ?? media?.play_count ?? 0) || null,
    hashtags: [...new Set([context.discoveryKeyword, ...hashtags].filter(Boolean))],
    posted_at: postedAt,
    expires_at: story ? new Date(new Date(postedAt).getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
    source_id: source?.id ?? null,
    category,
    profile_image_url: profileImage,
    follower_count: Number(source?.follower_count ?? media?.user?.follower_count ?? 0),
    relevance_score: relevanceScore(media, context.discoveryKeyword, source),
    discovery_keyword: context.discoveryKeyword ?? null,
    collected_at: new Date().toISOString(),
    active: true,
    is_manual: false,
  };
}

async function hikerGet(path, params = {}) {
  if (!HIKERAPI_KEY) throw new Error('HIKERAPI_KEY 없음');
  const url = new URL(`https://api.hikerapi.com${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: { 'x-access-key': HIKERAPI_KEY },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HikerAPI ${response.status}: ${body.slice(0, 160)}`);
  }
  return response.json();
}

async function fetchHashtagHiker(keyword, keywordRows) {
  const raw = await hikerGet('/v1/hashtag/medias/top/recent/chunk', { name: keyword });
  return asArray(raw).slice(0, POSTS_PER_KEYWORD).map(media => normalizeMedia(media, {
    discoveryKeyword: keyword,
    category: inferCategory(keyword, keywordRows),
    keywords: keywordRows,
  })).filter(Boolean);
}

async function fetchHashtagScrape(keyword, keywordRows) {
  const response = await fetch(
    `https://i.instagram.com/api/v1/tags/${encodeURIComponent(keyword)}/sections/?count=${POSTS_PER_KEYWORD}&tab=recent`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Instagram 311.0.0.31.109',
        'X-IG-App-ID': '936619743392459',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok) return [];
  const data = await response.json();
  const media = (data?.sections ?? []).flatMap(section => section?.layout_content?.medias ?? []).map(item => item?.media).filter(Boolean);
  return media.slice(0, POSTS_PER_KEYWORD).map(item => normalizeMedia(item, {
    discoveryKeyword: keyword,
    category: inferCategory(keyword, keywordRows),
    keywords: keywordRows,
  })).filter(Boolean);
}

async function runApify(input) {
  const response = await fetch(
    `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${encodeURIComponent(APIFY_API_TOKEN)}&timeout=240`,
    {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input), signal: AbortSignal.timeout(250_000),
    },
  );
  if (!response.ok) throw new Error(`Apify ${response.status}: ${(await response.text()).slice(0, 160)}`);
  const items = await response.json();
  return Array.isArray(items) ? items : [];
}

function apifyInputKeyword(item, keywordRows) {
  const inputUrl = String(
    item.inputUrl ?? item.inputURL ?? item.input?.url
    ?? item.parentData?.inputUrl ?? item.parentData?.inputURL ?? item.parentData?.url ?? '',
  );
  const match = inputUrl.match(/\/explore\/tags\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const hashtag = decodeURIComponent(match[1]).replace(/^#/, '');
  return keywordRows.find(row => row.keyword === hashtag)?.keyword ?? hashtag;
}

async function fetchApifyBatch(keywordRows, sources) {
  if (!APIFY_API_TOKEN) return [];
  const hashtagUrls = keywordRows.map(row => `https://www.instagram.com/explore/tags/${encodeURIComponent(row.keyword)}/`);
  const profileUrls = sources.map(source => `https://www.instagram.com/${encodeURIComponent(source.username)}/`);
  const directUrls = [...new Set([...hashtagUrls, ...profileUrls])];
  if (!directUrls.length) return [];

  // The current Instagram Scraper accepts URL-mode inputs. Keep content types in
  // separate runs because Apify does not allow search mode and URL mode together.
  const requests = [
    {
      label: 'POST',
      input: {
        directUrls, resultsType: 'posts', resultsLimit: 6,
        onlyPostsNewerThan: '14 days', addParentData: true, skipPinnedPosts: true,
      },
    },
    {
      label: 'REEL',
      input: {
        directUrls, resultsType: 'reels', resultsLimit: 4,
        onlyPostsNewerThan: '30 days', addParentData: true, skipPinnedPosts: true,
      },
    },
  ];
  if (profileUrls.length) {
    requests.push({
      label: 'STORY',
      input: { directUrls: profileUrls, resultsType: 'stories', resultsLimit: 10, addParentData: true },
    });
  }

  const results = await Promise.allSettled(requests.map(async request => {
    const items = await runApify(request.input);
    return items.map(item => ({ ...item, __requestedType: request.label }));
  }));
  const failures = results.filter(result => result.status === 'rejected');
  failures.forEach(result => console.warn(`  Apify 부분 수집 실패: ${result.reason?.message ?? result.reason}`));
  const items = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!items.length && failures.length === requests.length) throw failures[0].reason;

  const sourceMap = new Map(sources.map(source => [source.username, source]));
  return items.map(item => {
    const username = cleanUsername(item.ownerUsername ?? item.username ?? item.owner?.username);
    const source = sourceMap.get(username);
    const caption = item.caption ?? item.alt ?? '';
    const matchingKeyword = keywordRows.find(row => String(caption).includes(row.keyword))?.keyword
      ?? item.hashtags?.find(tag => keywordRows.some(row => row.keyword === tag))
      ?? apifyInputKeyword(item, keywordRows);
    const type = String(item.type ?? item.productType ?? '').toLowerCase();
    const story = item.__requestedType === 'STORY' || type.includes('story');
    const requestedReel = item.__requestedType === 'REEL';
    return normalizeMedia({
      id: item.id,
      pk: item.id,
      code: item.shortCode ?? item.shortcode,
      shortcode: item.shortCode ?? item.shortcode,
      product_type: requestedReel || type.includes('reel') || type.includes('clip') ? 'clips' : 'feed',
      media_type: type.includes('sidecar') || type.includes('carousel') ? 8
        : requestedReel || type.includes('video') || type.includes('reel') ? 2 : 1,
      display_url: item.displayUrl ?? item.imageUrl ?? item.thumbnailUrl,
      caption_text: caption,
      like_count: item.likesCount ?? item.likes,
      comment_count: item.commentsCount ?? item.comments,
      view_count: item.videoViewCount ?? item.views,
      taken_at: item.timestamp ? new Date(item.timestamp).getTime() / 1000 : undefined,
      user: { username, profile_pic_url: item.ownerProfilePicUrl },
    }, {
      source, username, discoveryKeyword: matchingKeyword,
      category: source?.category ?? inferCategory(`${matchingKeyword ?? ''} ${caption}`, keywordRows),
      keywords: keywordRows, contentType: story ? 'STORY' : requestedReel ? 'REEL' : undefined,
    });
  }).filter(Boolean);
}

async function loadKeywords() {
  const { data, error } = await supabase.from('social_content_keywords').select('*')
    .eq('active', true).eq('collect_hashtag', true).order('priority', { ascending: false });
  if (!error && data?.length) return data;

  const { data: settings } = await supabase.from('site_settings').select('key,value')
    .in('key', ['instagram_keywords_config', 'instagram_keywords', 'instagram_keyword_seed_version']);
  const configRow = settings?.find(row => row.key === 'instagram_keywords_config');
  const seedVersion = Number(settings?.find(row => row.key === 'instagram_keyword_seed_version')?.value ?? 0);
  const configured = configRow?.value ?? settings?.find(row => row.key === 'instagram_keywords')?.value;
  if (configured) {
    try {
      const parsed = JSON.parse(configured);
      if (Array.isArray(parsed) && parsed.length) {
        let normalized = parsed.map((item, index) => typeof item === 'string'
          ? {
            keyword: item,
            category: inferCategory(item, [], '지역소식'),
            priority: 100 - index,
            active: true,
            collect_hashtag: true,
          }
          : item);
        if (!configRow || parsed.some(item => typeof item === 'string') || seedVersion < KEYWORD_SEED_VERSION) {
          const byKeyword = new Map(normalized.map(item => [item.keyword, item]));
          for (const [keyword, category] of DEFAULT_KEYWORDS) {
            if (!byKeyword.has(keyword)) byKeyword.set(keyword, {
              keyword, category, priority: 70 - byKeyword.size, active: true, collect_hashtag: true,
            });
          }
          normalized = [...byKeyword.values()];
          await supabase.from('site_settings').upsert([
            { key: 'instagram_keywords_config', value: JSON.stringify(normalized) },
            { key: 'instagram_keyword_seed_version', value: String(KEYWORD_SEED_VERSION) },
          ], { onConflict: 'key' });
        }
        return normalized.filter(item => item.active !== false && item.collect_hashtag !== false && item.keyword);
      }
    } catch { /* environment/default fallback below */ }
  }

  const env = process.env.INSTAGRAM_HASHTAGS?.split(',').map(value => value.trim()).filter(Boolean);
  const values = env?.length ? env : DEFAULT_KEYWORDS.map(([keyword]) => keyword);
  return values.map((keyword, index) => ({
    keyword,
    category: DEFAULT_KEYWORDS.find(([value]) => value === keyword)?.[1] ?? '지역소식',
    priority: values.length - index,
  }));
}

async function loadSources() {
  const { data, error } = await supabase.from('social_content_sources').select('*')
    .eq('active', true).order('featured', { ascending: false }).order('priority', { ascending: false });
  if (error) {
    console.warn(`계정 테이블을 불러오지 못했습니다: ${error.message}`);
    const { data: settings } = await supabase.from('site_settings').select('value')
      .eq('key', 'instagram_managed_sources').maybeSingle();
    try {
      const parsed = JSON.parse(settings?.value ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(source => source.active !== false) : [];
    } catch { return []; }
  }
  return data ?? [];
}

async function discoverSources(posts) {
  const candidates = [...new Map(posts.map(post => [post.username, post]).filter(([username]) => username)).values()];
  if (!candidates.length) return;
  const rows = candidates.map(post => ({
    platform: 'instagram',
    username: post.username,
    display_name: post.account_name || post.username,
    profile_url: `https://www.instagram.com/${post.username}/`,
    profile_image_url: post.profile_image_url || null,
    category: post.category || '지역소식',
    follower_count: post.follower_count || 0,
    active: false,
    featured: false,
    discovered_by: post.discovery_keyword ? `#${post.discovery_keyword}` : 'hashtag',
    last_status: '검토 대기',
  }));
  const { error } = await supabase.from('social_content_sources')
    .upsert(rows, { onConflict: 'platform,username', ignoreDuplicates: true });
  if (error) {
    const { data: settings } = await supabase.from('site_settings').select('value')
      .eq('key', 'instagram_managed_sources').maybeSingle();
    let current = [];
    try { current = JSON.parse(settings?.value ?? '[]'); } catch { /* empty */ }
    const merged = new Map(current.map(source => [source.username, source]));
    for (const row of rows) {
      if (!merged.has(row.username)) merged.set(row.username, { id: `settings-${row.username}`, ...row });
    }
    await supabase.from('site_settings').upsert([{
      key: 'instagram_managed_sources', value: JSON.stringify([...merged.values()].slice(0, 300)),
    }], { onConflict: 'key' });
  }
}

async function refreshSourceProfile(source) {
  const profile = await hikerGet('/v1/user/by/username', { username: source.username });
  const user = profile?.user ?? profile?.data ?? profile;
  const patch = {
    display_name: user?.full_name || source.display_name || source.username,
    profile_url: `https://www.instagram.com/${source.username}/`,
    profile_image_url: user?.profile_pic_url_hd ?? user?.profile_pic_url ?? source.profile_image_url,
    biography: user?.biography ?? source.biography,
    external_id: String(user?.pk ?? user?.id ?? source.external_id ?? ''),
    follower_count: Number(user?.follower_count ?? source.follower_count ?? 0),
    is_verified: Boolean(user?.is_verified ?? source.is_verified),
  };
  await supabase.from('social_content_sources').update(patch).eq('id', source.id);
  return { ...source, ...patch };
}

async function fetchAccountContent(source, keywords) {
  let refreshed = source;
  if (!source.external_id || !source.profile_image_url) refreshed = await refreshSourceProfile(source);
  const userId = refreshed.external_id;
  if (!userId) throw new Error('Instagram 사용자 ID를 확인할 수 없음');

  const collected = [];
  if (refreshed.collect_posts || refreshed.collect_reels) {
    const raw = await hikerGet('/v1/user/medias/chunk', { user_id: userId });
    for (const media of asArray(raw).slice(0, ACCOUNT_MEDIA_LIMIT)) {
      const post = normalizeMedia(media, { source: refreshed, category: refreshed.category, keywords });
      if (!post) continue;
      if (post.is_reel ? refreshed.collect_reels : refreshed.collect_posts) collected.push(post);
    }
  }

  if (refreshed.collect_reels && !collected.some(post => post.is_reel)) {
    try {
      const raw = await hikerGet('/v1/user/clips/chunk', { user_id: userId });
      collected.push(...asArray(raw).slice(0, 12).map(media => normalizeMedia(media, {
        source: refreshed, category: refreshed.category, keywords, contentType: 'REEL',
      })).filter(Boolean));
    } catch (error) {
      console.warn(`  @${source.username} 릴스 보조 수집 실패: ${error.message}`);
    }
  }

  if (refreshed.collect_stories) {
    try {
      const raw = await hikerGet('/v2/user/stories/by/username', { username: refreshed.username });
      collected.push(...asArray(raw).map(media => normalizeMedia(media, {
        source: refreshed, category: refreshed.category, keywords, contentType: 'STORY',
      })).filter(Boolean));
    } catch (error) {
      console.warn(`  @${source.username} 스토리 수집 실패: ${error.message}`);
    }
  }
  return [...new Map(collected.map(post => [post.post_url, post])).values()];
}

async function mapKnownSources(posts) {
  const usernames = [...new Set(posts.map(post => post.username).filter(Boolean))];
  if (!usernames.length) return posts;
  const { data } = await supabase.from('social_content_sources').select('*').in('username', usernames);
  const byUsername = new Map((data ?? []).map(source => [source.username, source]));
  return posts.map(post => {
    const source = byUsername.get(post.username);
    return source ? {
      ...post,
      source_id: source.id,
      profile_image_url: source.profile_image_url || post.profile_image_url,
      follower_count: source.follower_count || post.follower_count,
      account_name: source.display_name || post.account_name,
    } : post;
  });
}

function isSchemaCompatibilityError(error) {
  return ['42703', 'PGRST204', '42P10'].includes(error?.code)
    || /no unique or exclusion constraint|column .* does not exist|schema cache/i.test(error?.message ?? '');
}

async function writePosts(rows) {
  const upsert = await supabase.from('instagram_posts').upsert(rows, { onConflict: 'post_url' });
  if (!upsert.error) return { count: rows.length, error: null };
  if (!['42P10'].includes(upsert.error.code)
    && !/no unique or exclusion constraint/i.test(upsert.error.message ?? '')) {
    return { count: 0, error: upsert.error };
  }

  // Older production schemas do not have a unique index on post_url. Avoid
  // duplicate inserts there without requiring the migration to finish first.
  const existingUrls = new Set();
  for (let index = 0; index < rows.length; index += 40) {
    const urls = rows.slice(index, index + 40).map(row => row.post_url);
    const existing = await supabase.from('instagram_posts').select('post_url').in('post_url', urls);
    if (existing.error) return { count: 0, error: existing.error };
    existing.data?.forEach(row => existingUrls.add(row.post_url));
  }
  const missing = rows.filter(row => !existingUrls.has(row.post_url));
  if (!missing.length) return { count: rows.length, error: null };
  const inserted = await supabase.from('instagram_posts').insert(missing);
  return inserted.error
    ? { count: 0, error: inserted.error }
    : { count: rows.length, error: null };
}

async function upsertPosts(posts) {
  const valid = [...new Map(posts.filter(post => post.image_url && post.post_url).map(post => [post.post_url, post])).values()];
  if (!valid.length) return 0;
  const extendedColumns = [
    'account_name', 'post_url', 'image_url', 'caption', 'posted_at', 'shortcode',
    'media_type', 'is_reel', 'like_count', 'comment_count', 'view_count', 'hashtags', 'username',
  ];
  const compatible = valid.map(post => Object.fromEntries(
    Object.entries(post).filter(([key]) => extendedColumns.includes(key)),
  ));
  const minimal = compatible.map(post => ({
    account_name: post.account_name, post_url: post.post_url, image_url: post.image_url,
    caption: post.caption, posted_at: post.posted_at,
  }));

  let lastError = null;
  for (const rows of [valid, compatible, minimal]) {
    const result = await writePosts(rows);
    if (!result.error) return result.count;
    lastError = result.error;
    if (!isSchemaCompatibilityError(result.error)) break;
  }
  throw new Error(`게시물 저장 실패: ${lastError?.message ?? '알 수 없는 저장 오류'}`);
}

async function updateSourceStatus(source, status, error = null) {
  await supabase.from('social_content_sources').update({
    last_collected_at: new Date().toISOString(), last_status: status, last_error: error,
  }).eq('id', source.id);
}

async function saveBatchStatus(status) {
  const rows = [
    { key: 'instagram_last_collected_at', value: new Date().toISOString() },
    { key: 'instagram_last_status', value: JSON.stringify(status) },
  ];
  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) console.warn(`배치 상태 저장 실패: ${error.message}`);
}

async function prune() {
  const storyPrune = await supabase.from('instagram_posts').delete().eq('is_story', true).lt('expires_at', new Date().toISOString());
  if (storyPrune.error) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('instagram_posts').delete().eq('media_type', 'STORY').lt('posted_at', yesterday);
  }
  const { count } = await supabase.from('instagram_posts').select('*', { count: 'exact', head: true });
  if ((count ?? 0) <= MAX_STORED) return;
  const { data } = await supabase.from('instagram_posts').select('id')
    .eq('is_manual', false).order('posted_at', { ascending: true }).limit((count ?? 0) - MAX_STORED);
  if (data?.length) await supabase.from('instagram_posts').delete().in('id', data.map(row => row.id));
}

async function main() {
  const startedAt = Date.now();
  const keywords = await loadKeywords();
  const sources = await loadSources();
  const stats = { keywords: keywords.length, sources: sources.length, posts: 0, reels: 0, stories: 0, errors: 0 };
  console.log(`검단 로컬 SNS 수집 시작 · 키워드 ${keywords.length}개 · 관리 계정 ${sources.length}개`);

  if (!HIKERAPI_KEY && APIFY_API_TOKEN) {
    try {
      let posts = await fetchApifyBatch(keywords, sources);
      await discoverSources(posts);
      posts = await mapKnownSources(posts);
      await upsertPosts(posts);
      stats.posts += posts.filter(post => !post.is_reel && !post.is_story).length;
      stats.reels += posts.filter(post => post.is_reel).length;
      stats.stories += posts.filter(post => post.is_story).length;
    } catch (error) {
      stats.errors += 1;
      console.warn(`Apify 일괄 수집 실패: ${error.message}`);
    }
  } else {
    for (const row of keywords) {
      console.log(`#${row.keyword}`);
      try {
        let posts = [];
        if (HIKERAPI_KEY) posts = await fetchHashtagHiker(row.keyword, keywords);
        if (!posts.length) posts = await fetchHashtagScrape(row.keyword, keywords);
        await discoverSources(posts);
        posts = await mapKnownSources(posts);
        stats.posts += await upsertPosts(posts);
      } catch (error) {
        stats.errors += 1;
        console.warn(`  실패: ${error.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  for (const source of sources) {
    console.log(`@${source.username}`);
    if (!HIKERAPI_KEY && APIFY_API_TOKEN) {
      await updateSourceStatus(source, '정상 · Apify 일괄 수집');
      continue;
    }
    if (!HIKERAPI_KEY) {
      await updateSourceStatus(source, '웹 폴백', '스토리 수집에는 HIKERAPI_KEY 또는 APIFY_API_TOKEN이 필요합니다.');
      continue;
    }
    try {
      const posts = await fetchAccountContent(source, keywords);
      await upsertPosts(posts);
      stats.posts += posts.filter(post => !post.is_reel && !post.is_story).length;
      stats.reels += posts.filter(post => post.is_reel).length;
      stats.stories += posts.filter(post => post.is_story).length;
      await updateSourceStatus(source, `정상 · ${posts.length}개`);
    } catch (error) {
      stats.errors += 1;
      await updateSourceStatus(source, '오류', error.message);
      console.warn(`  실패: ${error.message}`);
    }
    await sleep(DELAY_MS);
  }

  await prune();
  const status = { ...stats, durationSeconds: Math.round((Date.now() - startedAt) / 1000), api: HIKERAPI_KEY ? 'HikerAPI' : APIFY_API_TOKEN ? 'Apify' : 'web-fallback' };
  await saveBatchStatus(status);
  console.log('수집 완료', status);
}

main().catch(error => {
  console.error('수집 실패', error);
  process.exit(1);
});
