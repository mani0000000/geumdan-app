#!/usr/bin/env node
/**
 * fetch-kakao-stores.mjs
 * Fetches real store listings near each building using the Kakao Local Search API
 * and upserts them into the Supabase `stores` table.
 *
 * Kakao Local Search docs: https://developers.kakao.com/docs/latest/ko/local/dev-guide
 * Endpoint: GET https://dapi.kakao.com/v2/local/search/keyword.json
 * Auth header: Authorization: KakaoAK {REST_API_KEY}
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, KAKAO_REST_API_KEY
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... KAKAO_REST_API_KEY=... \
 *     node scripts/batch/fetch-kakao-stores.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const KAKAO_REST_API_KEY   = process.env.KAKAO_REST_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !KAKAO_REST_API_KEY) {
  console.error('❌ Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, KAKAO_REST_API_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ─── Building targets ────────────────────────────────────────────────────────
// Each entry defines one building and the Kakao search keywords to use.
// Radius is in meters. We'll search each keyword and aggregate unique results.

const BUILDINGS = [
  { id: 'b1',  name: '검단 센트럴 타워',     lat: 37.5448, lng: 126.6863, radius: 50,  keywords: ['검단 센트럴 타워'] },
  { id: 'nb2', name: '당하 스퀘어몰',         lat: 37.5462, lng: 126.6878, radius: 50,  keywords: ['당하 스퀘어몰'] },
  { id: 'nb3', name: '검단 플리마켓 타운',    lat: 37.5435, lng: 126.6844, radius: 50,  keywords: ['검단 플리마켓'] },
  { id: 'nb4', name: '불로대곡 상가단지',     lat: 37.5421, lng: 126.6831, radius: 80,  keywords: ['불로대곡 상가'] },
  { id: 'nb5', name: '마전 주민센터 상가',    lat: 37.5470, lng: 126.6901, radius: 80,  keywords: ['마전 주민센터'] },
  { id: 'nb6', name: '원당 금곡 상권 A',      lat: 37.5535, lng: 126.6730, radius: 80,  keywords: ['금곡대로 상가', '원당 근린상가'] },
  { id: 'nb7', name: '오류왕길 근린상가',     lat: 37.5500, lng: 126.6940, radius: 80,  keywords: ['오류동 상가', '왕길동 상가'] },
  { id: 'nb8', name: '백석 아라 타운',        lat: 37.5360, lng: 126.6800, radius: 80,  keywords: ['백석동 상가', '아라 타운'] },
];

// Kakao category group codes → our categories
const KAKAO_CATEGORY_MAP = {
  'CE7': '카페',        // 카페
  'FD6': '음식점',      // 음식점
  'CS2': '편의점',      // 편의점
  'MT1': '마트',        // 대형마트
  'HP8': '병원/약국',   // 병원
  'PM9': '병원/약국',   // 약국
  'BK9': '기타',        // 은행
  'CT1': '기타',        // 문화시설
  'AG2': '기타',        // 중개업소
  'PK6': '기타',        // 주차장
  'OL7': '기타',        // 주유소
  'SW8': '기타',        // 지하철역
  'AT4': '기타',        // 관광명소
  'AD5': '기타',        // 숙박
  'ETC': '기타',
};

// ─── Kakao API helpers ───────────────────────────────────────────────────────

async function kakaoKeywordSearch(keyword, lng, lat, radius, page = 1) {
  const params = new URLSearchParams({
    query:  keyword,
    x:      String(lng),
    y:      String(lat),
    radius: String(radius),
    page:   String(page),
    size:   '15',
    sort:   'distance',
  });

  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_REST_API_KEY}` } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kakao API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Fetch all pages for one keyword (max 3 pages = 45 results)
async function fetchAllPages(keyword, lng, lat, radius) {
  const places = [];
  for (let page = 1; page <= 3; page++) {
    const data = await kakaoKeywordSearch(keyword, lng, lat, radius, page);
    places.push(...(data.documents ?? []));
    if (data.meta?.is_end) break;
    await sleep(200); // be polite to the API
  }
  return places;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Store normalization ─────────────────────────────────────────────────────

function normalizeCategory(kakaoCategory, groupCode) {
  // groupCode is the primary category group
  if (groupCode && KAKAO_CATEGORY_MAP[groupCode]) {
    return KAKAO_CATEGORY_MAP[groupCode];
  }
  // Fallback: parse kakaoCategory string (e.g. "음식점 > 한식 > 해장국")
  const cat = kakaoCategory ?? '';
  if (cat.includes('카페') || cat.includes('커피')) return '카페';
  if (cat.includes('음식') || cat.includes('식당') || cat.includes('한식') || cat.includes('일식') || cat.includes('중식')) return '음식점';
  if (cat.includes('편의점')) return '편의점';
  if (cat.includes('마트') || cat.includes('슈퍼')) return '마트';
  if (cat.includes('약국') || cat.includes('병원') || cat.includes('의원') || cat.includes('치과')) return '병원/약국';
  if (cat.includes('미용') || cat.includes('헤어') || cat.includes('네일')) return '미용';
  if (cat.includes('학원') || cat.includes('교습')) return '학원';
  return '기타';
}

// Assign simple floor map positions in a grid layout (evenly distributed)
function assignPosition(index, total) {
  const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const w = Math.floor(90 / cols);
  const h = Math.floor(85 / Math.ceil(total / cols));
  return {
    x: 5 + col * (w + 2),
    y: 5 + row * (h + 2),
    w,
    h,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

console.log('🗺️  Starting Kakao stores fetch...\n');

let totalInserted = 0;
let totalBuildings = 0;

for (const building of BUILDINGS) {
  console.log(`🏢 Processing: ${building.name} (${building.id})`);

  // Collect places from all keywords, deduplicate by Kakao place id
  const seen = new Map();
  for (const keyword of building.keywords) {
    try {
      const places = await fetchAllPages(keyword, building.lng, building.lat, building.radius);
      for (const place of places) {
        if (!seen.has(place.id)) {
          seen.set(place.id, place);
        }
      }
      console.log(`  📍 "${keyword}": ${places.length} results`);
    } catch (err) {
      console.warn(`  ⚠️  Failed to search "${keyword}": ${err.message}`);
    }
    await sleep(300);
  }

  if (seen.size === 0) {
    console.log(`  ℹ️  No results found, skipping.\n`);
    continue;
  }

  // Convert to store rows
  const places = [...seen.values()];
  const storeRows = places.map((place, i) => {
    const pos = assignPosition(i, places.length);
    return {
      id:           `kakao_${building.id}_${place.id}`,
      building_id:  building.id,
      name:         place.place_name,
      category:     normalizeCategory(place.category_name, place.category_group_code),
      floor_label:  '1F', // Kakao doesn't provide floor info; default to 1F
      phone:        place.phone || null,
      hours:        null, // Kakao basic search doesn't include hours
      is_open:      true,
      x:            pos.x,
      y:            pos.y,
      w:            pos.w,
      h:            pos.h,
      is_premium:   false,
    };
  });

  // Upsert into Supabase
  const { error } = await supabase
    .from('stores')
    .upsert(storeRows, { onConflict: 'id' });

  if (error) {
    console.error(`  ❌ Upsert error for ${building.id}: ${error.message}`);
  } else {
    console.log(`  ✅ Upserted ${storeRows.length} stores for ${building.name}`);
    totalInserted += storeRows.length;
    totalBuildings++;

    // Update building has_data = true and total_stores count
    await supabase
      .from('buildings')
      .update({ has_data: true, total_stores: storeRows.length })
      .eq('id', building.id);
  }

  await sleep(500); // pause between buildings
  console.log('');
}

console.log(`✅ Done. Processed ${totalBuildings} buildings, ${totalInserted} stores total.`);
