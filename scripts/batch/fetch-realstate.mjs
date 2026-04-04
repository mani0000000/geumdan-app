#!/usr/bin/env node
/**
 * fetch-realstate.mjs
 * Fetches real apartment deal data from 국토교통부 API and updates Supabase.
 *
 * Usage:
 *   DATA_GO_KR_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/batch/fetch-realstate.mjs
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.DATA_GO_KR_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: DATA_GO_KR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 검단신도시 관련 법정동명
const GEUMDAN_DONGS = ['당하', '불로', '마전', '왕길', '대곡'];
const LAWD_CD = '28260'; // 인천 서구
const API_BASE = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

function getYearMonths(count = 2) {
  const results = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    results.push(`${year}${month}`);
  }
  return results;
}

async function fetchDeals(dealYmd) {
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    LAWD_CD,
    DEAL_YMD: dealYmd,
    numOfRows: '100',
    pageNo: '1',
    _type: 'json',
  });

  const url = `${API_BASE}?${params.toString()}`;
  console.log(`  Fetching deals for ${dealYmd}...`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${dealYmd}`);
  }

  const json = await res.json();
  const items = json?.response?.body?.items?.item;
  if (!items) return [];
  return Array.isArray(items) ? items : [items];
}

function isGeumdanDeal(item) {
  const aptName = (item['아파트'] || item.aptNm || '').toString();
  const dong = (item['법정동'] || item.umdNm || '').toString();

  if (aptName.includes('검단')) return true;
  return GEUMDAN_DONGS.some(d => dong.includes(d));
}

function dealToRow(item, aptId) {
  const price = parseInt((item['거래금액'] || item.dealAmount || '0').toString().replace(/,/g, ''), 10);
  const year = (item['년'] || item.dealYear || '').toString();
  const month = String(item['월'] || item.dealMonth || '').padStart(2, '0');
  const dealDate = `${year}-${month}`;
  const floor = parseInt((item['층'] || item.floor || '0').toString(), 10);
  const areaStr = (item['전용면적'] || item.excluUseAr || '0').toString();
  const sqm = parseFloat(areaStr);
  const pyeong = Math.round(sqm / 3.305785);

  return { apt_id: aptId, pyeong, price, deal_date: dealDate, floor };
}

// Map deal 아파트명 to our apt IDs
const APT_NAME_MAP = {
  '검단푸르지오더퍼스트': 'apt1',
  '검단SK뷰센트럴': 'apt2',
  '검단한신더휴': 'apt3',
  '검단아이파크2단지': 'apt4',
};

function normalizeAptName(name) {
  return name.replace(/\s+/g, '').replace(/[·]/g, '');
}

function findAptId(aptName) {
  const normalized = normalizeAptName(aptName);
  for (const [key, id] of Object.entries(APT_NAME_MAP)) {
    if (normalized.includes(key.replace(/\s+/g, '')) || key.includes(normalized)) {
      return id;
    }
  }
  return null;
}

console.log('🏘️  Starting real estate data fetch...\n');

try {
  const yearMonths = getYearMonths(2);
  console.log(`Fetching deals for months: ${yearMonths.join(', ')}`);

  const allDeals = [];
  for (const ym of yearMonths) {
    try {
      const deals = await fetchDeals(ym);
      const filtered = deals.filter(isGeumdanDeal);
      console.log(`  Found ${filtered.length} Geumdan deals in ${ym} (of ${deals.length} total)`);
      allDeals.push(...filtered);
    } catch (err) {
      console.error(`  ❌ Failed to fetch ${ym}:`, err.message);
    }
  }

  // Group by apt and insert price history
  const rowsToInsert = [];
  const aptAvgUpdates = new Map(); // aptId+pyeong -> prices[]

  for (const deal of allDeals) {
    const aptName = (deal['아파트'] || deal.aptNm || '').toString();
    const aptId = findAptId(aptName);
    if (!aptId) {
      console.log(`  Skipping unknown apt: ${aptName}`);
      continue;
    }

    const row = dealToRow(deal, aptId);
    rowsToInsert.push(row);

    const key = `${aptId}:${row.pyeong}`;
    if (!aptAvgUpdates.has(key)) aptAvgUpdates.set(key, []);
    aptAvgUpdates.get(key).push(row.price);
  }

  if (rowsToInsert.length > 0) {
    console.log(`\nInserting ${rowsToInsert.length} price history rows...`);
    const { error } = await supabase
      .from('apartment_price_history')
      .upsert(rowsToInsert, { ignoreDuplicates: true });
    if (error) {
      console.error('❌ Failed to insert price history:', error.message);
    } else {
      console.log('✅ Price history inserted');
    }
  } else {
    console.log('\nNo new deals to insert');
  }

  // Recalculate avg prices
  for (const [key, prices] of aptAvgUpdates.entries()) {
    const [aptId, pyeongStr] = key.split(':');
    const pyeong = parseInt(pyeongStr, 10);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

    const { error } = await supabase
      .from('apartment_sizes')
      .update({ avg_price: avgPrice })
      .eq('apt_id', aptId)
      .eq('pyeong', pyeong);

    if (error) {
      console.error(`❌ Failed to update avg price for ${aptId} ${pyeong}평:`, error.message);
    } else {
      console.log(`✅ Updated avg price for ${aptId} ${pyeong}평: ${avgPrice.toLocaleString()}만원`);
    }
  }

  console.log('\n✅ Real estate fetch complete!');
} catch (err) {
  console.error('\n❌ Real estate fetch failed:', err);
  process.exit(1);
}
