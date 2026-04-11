#!/usr/bin/env node
/**
 * fetch-realstate.mjs
 * 국토교통부 실거래가 API → Supabase 아파트 시세 완전 시딩
 *
 * 환경변수:
 *   DATA_GO_KR_API_KEY   - 공공데이터포털 API 키
 *   SUPABASE_URL         - Supabase 프로젝트 URL
 *   SUPABASE_SERVICE_KEY - Supabase 서비스 롤 키 (RLS 우회)
 *
 * Usage:
 *   DATA_GO_KR_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx \
 *     node scripts/batch/fetch-realstate.mjs
 *
 * 옵션:
 *   --months=N    조회할 개월 수 (기본 15, 최대 24)
 *   --seed-meta   아파트 기본 정보(apartments / apartment_sizes)도 시딩
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY  = process.env.DATA_GO_KR_API_KEY;
const SB_URL   = process.env.SUPABASE_URL;
const SB_KEY   = process.env.SUPABASE_SERVICE_KEY;

if (!API_KEY || !SB_URL || !SB_KEY) {
  console.error('❌  Missing env vars: DATA_GO_KR_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase  = createClient(SB_URL, SB_KEY);
const LAWD_CD   = '28260';   // 인천광역시 서구
const API_BASE  = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';
const GEUMDAN_DONGS = ['당하', '불로', '마전', '왕길', '대곡'];

// ── 파라미터 파싱 ──────────────────────────────────────────────
const args     = process.argv.slice(2);
const monthsArg = args.find(a => a.startsWith('--months='));
const MONTHS   = Math.min(24, parseInt((monthsArg ?? '--months=15').split('=')[1], 10) || 15);
const SEED_META = args.includes('--seed-meta');

// ── 검단신도시 아파트 마스터 데이터 ──────────────────────────────
const APT_MASTER = [
  { id: 'apt1', name: '검단 푸르지오 더 퍼스트', dong: '당하동', households: 1299, built: 2022,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 34, sqm: 114 }] },
  { id: 'apt2', name: '검단 SK뷰 센트럴',         dong: '불로동', households: 2041, built: 2023,
    sizes: [{ pyeong: 25, sqm: 84 }, { pyeong: 34, sqm: 114 }] },
  { id: 'apt3', name: '검단 한신더휴',            dong: '마전동', households:  978, built: 2021,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 33, sqm: 108 }] },
  { id: 'apt4', name: '검단 아이파크 2단지',       dong: '왕길동', households: 1560, built: 2022,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 34, sqm: 114 }] },
  { id: 'apt5', name: '검단 롯데캐슬 넥스티엘',   dong: '당하동', households: 1612, built: 2023,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 34, sqm: 114 }] },
  { id: 'apt6', name: '검단 e편한세상',           dong: '불로동', households: 1176, built: 2022,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 33, sqm: 108 }] },
  { id: 'apt7', name: '검단파크자이 1단지',        dong: '마전동', households: 1237, built: 2021,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 33, sqm: 108 }] },
  { id: 'apt8', name: '검단 우미린 에코뷰',        dong: '당하동', households:  748, built: 2022,
    sizes: [{ pyeong: 24, sqm: 79 }, { pyeong: 34, sqm: 114 }] },
];

// API 아파트명 → apt ID 매핑 (정규화 후 부분 일치)
const APT_NAME_MAP = {
  '검단푸르지오더퍼스트':  'apt1',
  '검단SK뷰센트럴':        'apt2',
  '검단SK뷰':              'apt2',
  '검단한신더휴':          'apt3',
  '검단아이파크2단지':     'apt4',
  '검단아이파크':          'apt4',
  '검단롯데캐슬넥스티엘':  'apt5',
  '검단롯데캐슬':          'apt5',
  '검단e편한세상':         'apt6',
  '검단이편한세상':        'apt6',
  '검단파크자이1단지':     'apt7',
  '검단파크자이':          'apt7',
  '검단우미린에코뷰':      'apt8',
  '검단우미린':            'apt8',
};

function normalizeAptName(name) {
  return name.replace(/\s+/g, '').replace(/[·]/g, '').replace(/[()（）]/g, '');
}

function findAptId(rawName) {
  const n = normalizeAptName(rawName);
  for (const [key, id] of Object.entries(APT_NAME_MAP)) {
    if (n.includes(key) || key.includes(n)) return id;
  }
  return null;
}

function isGeumdanDeal(item) {
  const aptName = String(item['아파트'] ?? item.aptNm ?? '');
  const dong    = String(item['법정동'] ?? item.umdNm ?? '');
  if (aptName.includes('검단')) return true;
  return GEUMDAN_DONGS.some(d => dong.includes(d));
}

function getYearMonths(count) {
  const results = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {  // i=1 → 전달부터 (당월은 데이터 미완성)
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    results.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
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
  const res = await fetch(`${API_BASE}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${dealYmd}`);
  const json = await res.json();
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

// ── 메타 시딩 (--seed-meta 플래그 시) ────────────────────────────
async function seedMeta() {
  console.log('\n📋 아파트 기본 정보 시딩...');

  const aptRows = APT_MASTER.map(a => ({
    id: a.id, name: a.name, dong: a.dong,
    households: a.households, built_year: a.built,
  }));
  const { error: e1 } = await supabase.from('apartments').upsert(aptRows, { onConflict: 'id' });
  if (e1) { console.error('❌  apartments upsert:', e1.message); return; }
  console.log(`  ✅ apartments: ${aptRows.length}개`);

  const sizeRows = APT_MASTER.flatMap(a =>
    a.sizes.map(s => ({
      apt_id: a.id, pyeong: s.pyeong, sqm: s.sqm, avg_price: 0,
    }))
  );
  const { error: e2 } = await supabase.from('apartment_sizes')
    .upsert(sizeRows, { onConflict: 'apt_id,pyeong', ignoreDuplicates: true });
  if (e2) { console.error('❌  apartment_sizes upsert:', e2.message); return; }
  console.log(`  ✅ apartment_sizes: ${sizeRows.length}개`);
}

// ── 메인 ────────────────────────────────────────────────────────
console.log(`🏘️  검단신도시 실거래가 수집 시작 (최근 ${MONTHS}개월)\n`);

try {
  if (SEED_META) await seedMeta();

  const yearMonths = getYearMonths(MONTHS);
  console.log(`📅 수집 기간: ${yearMonths[yearMonths.length - 1]} ~ ${yearMonths[0]}\n`);

  const allDeals = [];
  for (const ym of yearMonths) {
    try {
      const deals  = await fetchDeals(ym);
      const filtered = deals.filter(isGeumdanDeal);
      console.log(`  ${ym}: 전체 ${deals.length}건 → 검단 ${filtered.length}건`);
      allDeals.push(...filtered);
      await new Promise(r => setTimeout(r, 300)); // API 과부하 방지
    } catch (err) {
      console.error(`  ❌  ${ym} 실패: ${err.message}`);
    }
  }

  console.log(`\n📊 총 수집: ${allDeals.length}건`);

  // 실거래 내역 집계
  const historyRows   = [];
  const priceAccum    = new Map(); // "aptId:pyeong" → prices[]
  let   skipped = 0;

  for (const deal of allDeals) {
    const rawName  = String(deal['아파트'] ?? deal.aptNm ?? '');
    const aptId    = findAptId(rawName);
    if (!aptId) { skipped++; continue; }

    const priceStr = String(deal['거래금액'] ?? deal.dealAmount ?? '0').replace(/,/g, '');
    const price    = parseInt(priceStr, 10);
    if (!price) continue;

    const areaStr  = String(deal['전용면적'] ?? deal.excluUseAr ?? '0');
    const sqm      = parseFloat(areaStr);
    const pyeong   = Math.round(sqm / 3.305785);
    const year     = String(deal['년']  ?? deal.dealYear  ?? '');
    const month    = String(deal['월']  ?? deal.dealMonth ?? '').padStart(2, '0');
    const dealDate = `${year}-${month}`;
    const floor    = parseInt(String(deal['층'] ?? deal.floor ?? '0'), 10);

    historyRows.push({ apt_id: aptId, pyeong, price, deal_date: dealDate, floor });

    const key = `${aptId}:${pyeong}`;
    if (!priceAccum.has(key)) priceAccum.set(key, []);
    priceAccum.get(key).push(price);
  }

  console.log(`  매핑 성공: ${historyRows.length}건, 스킵: ${skipped}건`);

  // 실거래 이력 저장
  if (historyRows.length > 0) {
    // 배치 100개씩
    const BATCH = 100;
    let inserted = 0;
    for (let i = 0; i < historyRows.length; i += BATCH) {
      const chunk = historyRows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('apartment_price_history')
        .upsert(chunk, { onConflict: 'apt_id,pyeong,deal_date', ignoreDuplicates: true });
      if (error) console.error(`  ❌  history upsert batch ${i}: ${error.message}`);
      else inserted += chunk.length;
    }
    console.log(`\n✅ apartment_price_history: ${inserted}건 저장`);
  }

  // 평균 시세 재계산 + apartment_sizes 업데이트
  console.log('\n🔄 평균 시세 재계산...');
  for (const [key, prices] of priceAccum.entries()) {
    const [aptId, pyeongStr] = key.split(':');
    const pyeong    = parseInt(pyeongStr, 10);
    const avgPrice  = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const { error } = await supabase
      .from('apartment_sizes')
      .update({ avg_price: avgPrice })
      .eq('apt_id', aptId)
      .eq('pyeong', pyeong);
    if (error) console.error(`  ❌  avg_price ${aptId} ${pyeong}평: ${error.message}`);
    else console.log(`  ✅  ${aptId} ${pyeong}평 → ${avgPrice.toLocaleString()}만원`);
  }

  console.log('\n🎉 실거래가 수집 완료!');
} catch (err) {
  console.error('\n❌  실패:', err);
  process.exit(1);
}
