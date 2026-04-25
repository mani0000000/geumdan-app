#!/usr/bin/env node
/**
 * fetch-pharmacies.mjs
 * Fetches pharmacy data from 공공데이터포털 HIRA API and updates Supabase.
 *
 * Usage:
 *   DATA_GO_KR_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/batch/fetch-pharmacies.mjs
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

// 검단신도시 중심 좌표 (위도, 경도)
const GEUMDAN_LAT = 37.5446;
const GEUMDAN_LNG = 126.6861;
const MAX_DISTANCE_KM = 5.0;

const API_BASE = 'https://apis.data.go.kr/B551182/pharmacyInfoService/getParmacyBasisList';

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

async function fetchPharmacies(pageNo = 1) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    Q_CITY_CD: '280000',  // 인천
    Q_BORO_CD: '280260',  // 서구
    numOfRows: '100',
    pageNo: String(pageNo),
    _type: 'json',
  });

  const url = `${API_BASE}?${params.toString()}`;
  console.log(`  Fetching pharmacies page ${pageNo}...`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  const body = json?.response?.body;
  const items = body?.items?.item;
  const totalCount = body?.totalCount ?? 0;

  if (!items) return { items: [], totalCount: 0 };
  return {
    items: Array.isArray(items) ? items : [items],
    totalCount,
  };
}

function itemToRow(item) {
  const lat = parseFloat(item.yadmPos?.lat || item.YPos || '0');
  const lng = parseFloat(item.yadmPos?.lon || item.XPos || '0');

  // Detect night pharmacy by name or operating hours
  const name = (item.yadmNm || item.dutyName || '').toString();
  const nightHours = (item.dutyTime8s || '').toString();
  const isNightPharmacy = name.includes('야간') ||
    name.includes('24') ||
    name.includes('심야') ||
    (nightHours && nightHours !== '0000');

  return {
    id: `ph_${item.ykiho || item.hpid || name.replace(/\s+/g, '_')}`,
    name,
    address: (item.addr || item.dutyAddr || '').toString(),
    phone: (item.telno || item.dutyTel1 || '').toString(),
    lat: isNaN(lat) ? null : lat,
    lng: isNaN(lng) ? null : lng,
    is_night_pharmacy: isNightPharmacy,
    weekday_hours: item.dutyTime1s && item.dutyTime1c
      ? `${item.dutyTime1s}~${item.dutyTime1c}`
      : null,
    weekend_hours: item.dutyTime6s && item.dutyTime6c
      ? `토 ${item.dutyTime6s}~${item.dutyTime6c}`
      : null,
    dong: (item.sgguCdNm || '').toString(),
  };
}

console.log('💊 Starting pharmacy data fetch...\n');

try {
  const allItems = [];
  let pageNo = 1;
  let fetched = 0;

  const { items: firstPage, totalCount } = await fetchPharmacies(pageNo);
  allItems.push(...firstPage);
  fetched += firstPage.length;
  console.log(`  Total pharmacies in 인천 서구: ${totalCount}`);

  while (fetched < totalCount) {
    pageNo++;
    const { items } = await fetchPharmacies(pageNo);
    if (items.length === 0) break;
    allItems.push(...items);
    fetched += items.length;
  }

  console.log(`  Fetched ${allItems.length} pharmacies total`);

  // Filter to near 검단신도시
  const rows = allItems
    .map(itemToRow)
    .filter(row => {
      if (!row.lat || !row.lng) return false;
      const dist = haversineKm(GEUMDAN_LAT, GEUMDAN_LNG, row.lat, row.lng);
      return dist <= MAX_DISTANCE_KM;
    });

  console.log(`  Filtered to ${rows.length} pharmacies within ${MAX_DISTANCE_KM}km of 검단신도시`);

  if (rows.length === 0) {
    console.log('  No pharmacies to upsert (API may not be available in test env)');
  } else {
    const { error } = await supabase
      .from('pharmacies')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error('❌ Failed to upsert pharmacies:', error.message);
      process.exit(1);
    }
    console.log(`✅ Upserted ${rows.length} pharmacies`);
  }

  console.log('\n✅ Pharmacy fetch complete!');
} catch (err) {
  console.error('\n❌ Pharmacy fetch failed:', err.message);
  process.exit(1);
}
