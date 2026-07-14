#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.MOLIT_API_KEY || process.env.DATA_GO_KR_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars: DATA_GO_KR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const TRADE_API = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
const RENT_API = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';
const DISTRICTS = [
  { code: '28290', name: '인천광역시 검단구', current: true },
  { code: '28260', name: '인천광역시 서구(개편 전)', current: false },
];
const GEUMDAN_LEGAL_DONGS = new Set([
  '검암동', '백석동', '시천동', '원당동', '당하동', '마전동',
  '불로동', '대곡동', '금곡동', '오류동', '왕길동',
]);
const GEUMDAN_ADMIN_DONGS = [
  '검단동', '불로대곡동', '원당동', '당하동',
  '오류왕길동', '마전동', '아라1동', '아라2동',
];

const args = process.argv.slice(2);
const monthsArg = args.find(arg => arg.startsWith('--months='));
const MONTHS = Math.min(24, Math.max(1, Number(monthsArg?.split('=')[1] || 18)));

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

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim();
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function parseItems(xml) {
  const items = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;
  while ((itemMatch = itemPattern.exec(xml)) !== null) {
    const row = {};
    const fieldPattern = /<([a-zA-Z_가-힣0-9]+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(itemMatch[1])) !== null) {
      row[fieldMatch[1]] = decodeXml(fieldMatch[2]);
    }
    items.push(row);
  }
  return items;
}

function stringValue(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return '';
}

function numberValue(row, ...keys) {
  const raw = stringValue(row, ...keys).replace(/[,\s]/g, '');
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function targetMonths(count) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

async function sleep(ms) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApiPage(endpoint, districtCode, yearMonth, pageNo, attempt = 1) {
  const params = new URLSearchParams({
    serviceKey: API_KEY.includes('%') ? decodeURIComponent(API_KEY) : API_KEY,
    LAWD_CD: districtCode,
    DEAL_YMD: yearMonth,
    pageNo: String(pageNo),
    numOfRows: '1000',
  });
  try {
    const response = await fetch(`${endpoint}?${params}`, {
      headers: { 'User-Agent': 'GeumdanTown/1.0' },
      signal: AbortSignal.timeout(20_000),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 100)}`);
    const code = tagValue(body, 'resultCode');
    if (code && code !== '00' && code !== '000') {
      const message = tagValue(body, 'resultMsg') || 'unknown error';
      if (/NODATA|데이터없음/i.test(message)) return { items: [], total: 0 };
      throw new Error(`${code} ${message}`);
    }
    return {
      items: parseItems(body),
      total: Number(tagValue(body, 'totalCount')) || 0,
    };
  } catch (error) {
    if (attempt < 3) {
      await sleep(500 * attempt);
      return fetchApiPage(endpoint, districtCode, yearMonth, pageNo, attempt + 1);
    }
    throw error;
  }
}

async function fetchApi(endpoint, districtCode, yearMonth) {
  const rows = [];
  for (let page = 1; page <= 50; page += 1) {
    const result = await fetchApiPage(endpoint, districtCode, yearMonth, page);
    rows.push(...result.items);
    if (rows.length >= result.total || result.items.length < 1000) break;
  }
  return rows;
}

function isTargetDong(row, district) {
  if (district.current) return true;
  return GEUMDAN_LEGAL_DONGS.has(stringValue(row, 'umdNm', '법정동'));
}

function mapTrade(row) {
  const aptName = stringValue(row, 'aptNm', '아파트');
  const dong = stringValue(row, 'umdNm', '법정동');
  const area = numberValue(row, 'excluUseAr', '전용면적');
  const amount = numberValue(row, 'dealAmount', '거래금액');
  const year = numberValue(row, 'dealYear', '년');
  const month = numberValue(row, 'dealMonth', '월');
  if (!aptName || !dong || !area || !amount || !year || !month) return null;
  const cancelRaw = stringValue(row, 'cdealDay', '해제사유발생일');
  const cancelMatch = cancelRaw.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  let cancelDate = null;
  if (cancelMatch) {
    let cancelYear = Number(cancelMatch[1]);
    if (cancelYear < 100) cancelYear += cancelYear < 50 ? 2000 : 1900;
    cancelDate = `${cancelYear}-${cancelMatch[2].padStart(2, '0')}-${cancelMatch[3].padStart(2, '0')}`;
  }
  return {
    apt_name: aptName,
    sigungu: '인천광역시 검단구',
    dong,
    jibun: stringValue(row, 'jibun', '지번'),
    road_address: stringValue(row, 'roadNm', '도로명') || null,
    exclu_use_ar: area,
    pyeong: Math.round(area / 3.305785),
    floor_no: numberValue(row, 'floor', '층'),
    build_year: numberValue(row, 'buildYear', '건축년도'),
    deal_year: year,
    deal_month: month,
    deal_day: numberValue(row, 'dealDay', '일'),
    deal_amount: amount,
    bjdong_cd: stringValue(row, 'bjdongCd', '법정동시군구코드') || '',
    cancel_yn: stringValue(row, 'cdealType', '해제여부') === 'O' || Boolean(cancelDate),
    cancel_date: cancelDate,
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function mapRental(row) {
  const aptName = stringValue(row, 'aptNm', '아파트');
  const dong = stringValue(row, 'umdNm', '법정동');
  const area = numberValue(row, 'excluUseAr', '전용면적');
  const year = numberValue(row, 'dealYear', '년');
  const month = numberValue(row, 'dealMonth', '월');
  const deposit = numberValue(row, 'deposit', '보증금액') || 0;
  const monthlyRent = numberValue(row, 'monthlyRent', '월세금액') || 0;
  if (!aptName || !dong || !area || !year || !month || (!deposit && !monthlyRent)) return null;
  return {
    apt_name: aptName,
    sigungu: '인천광역시 검단구',
    dong,
    jibun: stringValue(row, 'jibun', '지번'),
    road_address: stringValue(row, 'roadNm', '도로명') || null,
    exclu_use_ar: area,
    pyeong: Math.round(area / 3.305785),
    floor_no: numberValue(row, 'floor', '층'),
    build_year: numberValue(row, 'buildYear', '건축년도'),
    contract_year: year,
    contract_month: month,
    contract_day: numberValue(row, 'dealDay', '일'),
    rent_type: monthlyRent > 0 ? '월세' : '전세',
    deposit,
    monthly_rent: monthlyRent,
    bjdong_cd: stringValue(row, 'bjdongCd', '법정동시군구코드') || '',
    raw: row,
    fetched_at: new Date().toISOString(),
  };
}

function naturalKey(row, type) {
  const fields = type === 'trade'
    ? ['apt_name', 'dong', 'jibun', 'exclu_use_ar', 'floor_no', 'deal_year', 'deal_month', 'deal_day', 'deal_amount']
    : ['apt_name', 'dong', 'jibun', 'exclu_use_ar', 'floor_no', 'contract_year', 'contract_month', 'contract_day', 'deposit', 'monthly_rent'];
  return fields.map(field => row[field] ?? '').join('|');
}

async function upsertChunks(table, rows, onConflict) {
  for (let index = 0; index < rows.length; index += 200) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(index, index + 200), { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`${table} upsert: ${error.message}`);
  }
}

function normalizedName(value) {
  return value.replace(/[^0-9a-zA-Z가-힣]/g, '').toLowerCase();
}

async function discoverApartments(trades, rentals) {
  const { data: existing, error } = await supabase.from('apartments').select('id,name,dong');
  if (error) throw new Error(`apartments select: ${error.message}`);
  const existingKeys = new Set((existing || []).map(row => `${normalizedName(row.name)}|${normalizedName(row.dong || '')}`));
  const discovered = new Map();
  for (const row of [...trades, ...rentals]) {
    const key = `${normalizedName(row.apt_name)}|${normalizedName(row.dong)}`;
    if (existingKeys.has(key) || discovered.has(key)) continue;
    discovered.set(key, {
      id: `apt-auto-${createHash('sha1').update(key).digest('hex').slice(0, 16)}`,
      name: row.apt_name,
      dong: row.dong,
      households: 0,
      built_year: row.build_year || null,
      updated_at: new Date().toISOString(),
    });
  }
  const rows = [...discovered.values()];
  if (rows.length > 0) await upsertChunks('apartments', rows, 'id');
  return rows;
}

async function createLog(months) {
  const { data, error } = await supabase.from('realestate_batch_log').insert({
    status: 'running', trigger_source: 'cron', target_months: months,
  }).select('id').single();
  if (error) {
    console.warn(`batch log insert skipped: ${error.message}`);
    return null;
  }
  return data.id;
}

async function finishLog(id, values) {
  if (!id) return;
  const { error } = await supabase.from('realestate_batch_log').update({
    ...values,
    finished_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) console.warn(`batch log update skipped: ${error.message}`);
}

const months = targetMonths(MONTHS);
const logId = await createLog(months);
const tradeMap = new Map();
const rentalMap = new Map();
const details = [];
let tradeSuccesses = 0;
let rentalSuccesses = 0;

console.log(`🏘️ 검단구 시세 수집 시작: ${months.at(-1)} ~ ${months[0]} (당월 포함)`);

for (const yearMonth of months) {
  const detail = { yearMonth, districts: [], trades: 0, rentals: 0, errors: [] };
  for (const district of DISTRICTS) {
    let districtHadData = false;
    try {
      const rawTrades = await fetchApi(TRADE_API, district.code, yearMonth);
      tradeSuccesses += 1;
      for (const item of rawTrades) {
        if (!isTargetDong(item, district)) continue;
        const row = mapTrade(item);
        if (row) tradeMap.set(naturalKey(row, 'trade'), row);
      }
      detail.trades += rawTrades.length;
      districtHadData ||= rawTrades.length > 0;
    } catch (error) {
      detail.errors.push(`매매 ${district.code}: ${error.message}`);
    }

    try {
      const rawRentals = await fetchApi(RENT_API, district.code, yearMonth);
      rentalSuccesses += 1;
      for (const item of rawRentals) {
        if (!isTargetDong(item, district)) continue;
        const row = mapRental(item);
        if (row) rentalMap.set(naturalKey(row, 'rental'), row);
      }
      detail.rentals += rawRentals.length;
      districtHadData ||= rawRentals.length > 0;
    } catch (error) {
      detail.errors.push(`임대 ${district.code}: ${error.message}`);
    }

    detail.districts.push({ code: district.code, hadData: districtHadData });
    // 신설 검단구 코드에서 데이터가 확인되면 같은 월의 구 서구 코드는 중복 조회하지 않는다.
    if (district.current && districtHadData) break;
    await sleep(120);
  }
  console.log(`${yearMonth}: 매매 원본 ${detail.trades} / 임대 원본 ${detail.rentals}${detail.errors.length ? ` / 오류 ${detail.errors.length}` : ''}`);
  details.push(detail);
}

const trades = [...tradeMap.values()];
const rentals = [...rentalMap.values()];
let status = 'success';
let errorMessage = null;

try {
  if (tradeSuccesses === 0 || trades.length === 0) {
    throw new Error('모든 매매 API 조회가 실패했거나 수집 결과가 0건입니다.');
  }
  await upsertChunks(
    'apartment_trades', trades,
    'apt_name,dong,jibun,exclu_use_ar,floor_no,deal_year,deal_month,deal_day,deal_amount',
  );
  if (rentals.length > 0) {
    await upsertChunks(
      'apartment_rentals', rentals,
      'apt_name,dong,jibun,exclu_use_ar,floor_no,contract_year,contract_month,contract_day,deposit,monthly_rent',
    );
  }
  const newApartments = await discoverApartments(trades, rentals);
  if (rentalSuccesses === 0) status = 'partial';
  console.log(`✅ 매매 ${trades.length}건, 임대 ${rentals.length}건, 신규 단지 ${newApartments.length}곳`);
  console.log(`✅ 확인 법정동: ${[...new Set([...trades, ...rentals].map(row => row.dong))].sort().join(', ')}`);
} catch (error) {
  status = 'failed';
  errorMessage = error.message;
  console.error(`❌ ${errorMessage}`);
}

await finishLog(logId, {
  status,
  trades_count: trades.length,
  rentals_count: rentals.length,
  error_message: errorMessage,
  detail: {
    months: details,
    district_codes: DISTRICTS.map(district => district.code),
    administrative_dongs: GEUMDAN_ADMIN_DONGS,
    legal_dongs: [...new Set([...trades, ...rentals].map(row => row.dong))].sort(),
    complex_count: new Set([...trades, ...rentals].map(row => `${row.apt_name}|${row.dong}`)).size,
  },
});

if (status === 'failed') process.exit(1);
