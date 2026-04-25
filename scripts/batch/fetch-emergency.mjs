#!/usr/bin/env node
/**
 * fetch-emergency.mjs
 * Fetches emergency room data from E-Gen API and updates Supabase.
 *
 * APIs used:
 *   1. getEmrrmRltmUsefulSckbdInfoInqire — real-time ER availability (인천 서구)
 *   2. getEgytListInfoInqire             — hospital/ER list for nearby search
 *
 * Usage:
 *   DATA_GO_KR_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/batch/fetch-emergency.mjs
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.DATA_GO_KR_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: DATA_GO_KR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
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
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { global: { fetch: makeFetch(SUPABASE_SERVICE_KEY) }, auth: { autoRefreshToken: false, persistSession: false } });

// 검단신도시 중심 좌표
const GEUMDAN_LAT = 37.5446;
const GEUMDAN_LNG = 126.6861;
const MAX_DISTANCE_KM = 15.0;

const BASE_URL = 'https://apis.data.go.kr/B552657/ErmctInfoInqireService';

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRealtimeER() {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    STAGE1: '인천광역시',
    STAGE2: '서구',
    pageNo: '1',
    numOfRows: '20',
    _type: 'json',
  });

  const url = `${BASE_URL}/getEmrrmRltmUsefulSckbdInfoInqire?${params.toString()}`;
  console.log('  Fetching real-time ER data for 인천 서구...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

async function fetchERList() {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    Q0: '인천광역시',
    Q1: '서구',
    pageNo: '1',
    numOfRows: '30',
    _type: 'json',
  });

  const url = `${BASE_URL}/getEgytListInfoInqire?${params.toString()}`;
  console.log('  Fetching ER list for 인천 서구...');

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function realtimeItemToRow(item) {
  const lat = parseFloat((item.wgs84Lat || item.lat || '0').toString());
  const lng = parseFloat((item.wgs84Lon || item.lng || '0').toString());
  const dist = (lat && lng) ? haversineKm(GEUMDAN_LAT, GEUMDAN_LNG, lat, lng) : null;

  const name = (item.dutyName || '').toString();
  const isPediatric = name.includes('소아') ||
    name.includes('어린이') ||
    (item.hvs01 && parseInt(item.hvs01) > 0);

  return {
    id: `er_${(item.hpid || name).replace(/\s+/g, '_')}`,
    name,
    address: (item.dutyAddr || '').toString(),
    phone: (item.dutyTel3 || item.dutyTel1 || '').toString(),
    level: (item.dutyEryn || item.dutyDivNam || '지역응급의료기관').toString(),
    is_pediatric: isPediatric,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    distance_km: dist,
    er_available: item.hvec ? parseInt(item.hvec) : null,
  };
}

function listItemToRow(item) {
  const lat = parseFloat((item.wgs84Lat || '0').toString());
  const lng = parseFloat((item.wgs84Lon || '0').toString());
  const dist = (lat && lng) ? haversineKm(GEUMDAN_LAT, GEUMDAN_LNG, lat, lng) : null;

  const name = (item.dutyName || '').toString();
  const level = (item.dutyDivNam || '').toString();
  const isPediatric = name.includes('소아') || name.includes('어린이');

  return {
    id: `er_${(item.hpid || name).replace(/\s+/g, '_')}`,
    name,
    address: (item.dutyAddr || '').toString(),
    phone: (item.dutyTel1 || '').toString(),
    level,
    is_pediatric: isPediatric,
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    distance_km: dist,
    er_available: null,
  };
}

console.log('🚑 Starting emergency room data fetch...\n');

try {
  const allRows = new Map();

  // Fetch real-time data
  try {
    const realtimeItems = await fetchRealtimeER();
    console.log(`  Got ${realtimeItems.length} real-time ER entries`);
    for (const item of realtimeItems) {
      const row = realtimeItemToRow(item);
      if (row.distance_km === null || row.distance_km <= MAX_DISTANCE_KM) {
        allRows.set(row.id, row);
      }
    }
  } catch (err) {
    console.error('  ⚠️  Real-time ER fetch failed:', err.message);
  }

  // Fetch ER list for broader coverage
  try {
    const listItems = await fetchERList();
    console.log(`  Got ${listItems.length} ER list entries`);
    for (const item of listItems) {
      const row = listItemToRow(item);
      if (!allRows.has(row.id) && (row.distance_km === null || row.distance_km <= MAX_DISTANCE_KM)) {
        allRows.set(row.id, row);
      }
    }
  } catch (err) {
    console.error('  ⚠️  ER list fetch failed:', err.message);
  }

  const rows = Array.from(allRows.values());
  console.log(`\n  Total unique ER rows within ${MAX_DISTANCE_KM}km: ${rows.length}`);

  if (rows.length === 0) {
    console.log('  No ER data to upsert (API may not be available in test env)');
  } else {
    const { error } = await supabase
      .from('emergency_rooms')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('❌ Failed to upsert emergency rooms:', error.message);
      process.exit(1);
    }
    console.log(`✅ Upserted ${rows.length} emergency rooms`);
  }

  console.log('\n✅ Emergency room fetch complete!');
} catch (err) {
  console.error('\n❌ Emergency room fetch failed:', err.message);
  process.exit(1);
}
