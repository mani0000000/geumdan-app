#!/usr/bin/env node
/**
 * fetch-gas-prices.mjs
 * Opinet aroundAll.do → Supabase gas_stations 가격+발굴 동기화 (매시간 실행)
 *
 * 전략: Opinet 이 source of truth
 *  1. Opinet 12km 반경 내 모든 주유소+가격 수집
 *  2. DB 레코드와 opinet_id 혹은 이름 유사도로 매핑
 *  3. 매핑 성공 → UPDATE (가격·좌표 갱신), 실패 → INSERT (신규 발굴)
 *  4. 오피넷에 없는 기존 레코드 → active=false
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPINET_KEY         = (process.env.OPINET_API_KEY ?? 'F260518486').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── WGS84 → KATEC (오피넷 API 파라미터) ─────────────────────────
const D2R = Math.PI / 180;
function wgs84ToKatec(lat, lng) {
  const phi = lat * D2R, lam = lng * D2R;
  const WGS_A = 6378137.0, WGS_F = 1 / 298.257223563;
  const BES_A = 6377397.155, BES_F = 1 / 299.1528128;
  const DX = -146.43, DY = 507.89, DZ = 681.46;
  const K_LAT0 = 38 * D2R, K_LON0 = 128 * D2R, K_SCALE = 0.9999, K_FE = 400000, K_FN = 600000;
  const b = WGS_A * (1 - WGS_F), e2 = (WGS_A ** 2 - b ** 2) / WGS_A ** 2;
  const sinp = Math.sin(phi), cosp = Math.cos(phi), sinl = Math.sin(lam), cosl = Math.cos(lam);
  const Rn = WGS_A / Math.sqrt(1 - e2 * sinp ** 2);
  const Rm = WGS_A * (1 - e2) / Math.pow(1 - e2 * sinp ** 2, 1.5);
  const da = BES_A - WGS_A, df = BES_F - WGS_F;
  const dphi = (-DX * sinp * cosl - DY * sinp * sinl + DZ * cosp
    + da * (Rn * e2 * sinp * cosp) / WGS_A
    + df * (Rm * (WGS_A / b) + Rn * (b / WGS_A)) * sinp * cosp) / Rm;
  const dlam = (-DX * sinl + DY * cosl) / (Rn * cosp);
  const bLat = phi + dphi, bLon = lam + dlam;
  const ba = BES_A, bb = ba * (1 - BES_F), be2 = (ba ** 2 - bb ** 2) / ba ** 2, ep2 = (ba ** 2 - bb ** 2) / bb ** 2;
  const sb = Math.sin(bLat), cb = Math.cos(bLat), tb = Math.tan(bLat);
  const N = ba / Math.sqrt(1 - be2 * sb ** 2), T = tb ** 2, C = ep2 * cb ** 2, A = cb * (bLon - K_LON0);
  const e = be2;
  const mer = p => ba * ((1 - e / 4 - 3 * e ** 2 / 64 - 5 * e ** 3 / 256) * p
    - (3 * e / 8 + 3 * e ** 2 / 32 + 45 * e ** 3 / 1024) * Math.sin(2 * p)
    + (15 * e ** 2 / 256 + 45 * e ** 3 / 1024) * Math.sin(4 * p)
    - 35 * e ** 3 / 3072 * Math.sin(6 * p));
  const M = mer(bLat), M0 = mer(K_LAT0);
  const x = K_FE + K_SCALE * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120);
  const y = K_FN + K_SCALE * (M - M0 + N * tb * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24
    + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
  return { x: Math.round(x), y: Math.round(y) };
}

// ── KATEC → WGS84 (검단 권역 선형 근사) ──────────────────────────
const LAT_C = 37.5446, LNG_C = 126.6861;
const CENTER = wgs84ToKatec(LAT_C, LNG_C);
const COS_C = Math.cos(LAT_C * D2R);

function katecToWgs84(x, y) {
  if (!x || !y || x < 150000 || x > 600000 || y < 300000 || y > 800000) return null;
  const lat = LAT_C + (y - CENTER.y) / 111320;
  const lng = LNG_C + (x - CENTER.x) / (111320 * COS_C);
  if (lat < 37.2 || lat > 37.9 || lng < 126.3 || lng > 127.2) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

const RADIUS_M = 12000;
const PRODCD = { gasoline: 'B027', diesel: 'D047', lpg: 'K015' };

// ── 브랜드 메타 ──────────────────────────────────────────────────
const BRAND_META = {
  SKE: { name: 'SK에너지',     color: '#EF4444', bg: '#FEF2F2', short: 'SK'    },
  GSC: { name: 'GS칼텍스',     color: '#0058B0', bg: '#EFF6FF', short: 'GS'    },
  HDO: { name: '현대오일뱅크', color: '#16A34A', bg: '#F0FDF4', short: '현대'  },
  SOL: { name: 'S-OIL',        color: '#F59E0B', bg: '#FFFBEB', short: 'S-OIL' },
  RTO: { name: '알뜰주유소',   color: '#6366F1', bg: '#EEF2FF', short: '알뜰'  },
  RTX: { name: '고속도로알뜰', color: '#6366F1', bg: '#EEF2FF', short: '알뜰'  },
  NHO: { name: '농협알뜰',     color: '#059669', bg: '#ECFDF5', short: 'NH'    },
  ETC: { name: '자가상표',     color: '#6B7280', bg: '#F3F4F6', short: '일반'  },
};

// ── 주소 → 동 이름 ───────────────────────────────────────────────
const AREA_PATTERNS = [
  [/마전동/, '마전동'], [/당하동/, '당하동'], [/원당동/, '원당동'],
  [/금곡동/, '금곡동'], [/왕길동/, '왕길동'], [/오류동/, '오류동'],
  [/불로동/, '불로동'], [/대곡동/, '대곡동'], [/백석동/, '백석동'],
  [/완정동/, '당하동'], [/검단동/, '검단동'], [/가정동/, '아라동'],
  [/연희동/, '연희동'], [/심곡동/, '심곡동'],
];
function extractArea(address) {
  for (const [pat, area] of AREA_PATTERNS) if (pat.test(address)) return area;
  return /서구/.test(address) ? '서구' : '인근';
}

// ── 이름 정규화 + Jaccard 유사도 ────────────────────────────────
function normName(s) {
  return s.toLowerCase()
    .replace(/sk에너지|sk|gs칼텍스|gs|현대오일뱅크|현대|에스오일|s-oil|s\.oil/g, '')
    .replace(/농협|알뜰주유소|알뜰|셀프주유소|셀프|주유소/g, '')
    .replace(/\(주\)|\(유\)/g, '')
    .replace(/에너지|오일뱅크|오일드림/g, '')
    .replace(/\s+/g, '').replace(/[()（）[\]]/g, '').trim();
}
function bigrams(s) {
  const r = new Set();
  for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2));
  return r;
}
function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const bga = bigrams(na), bgb = bigrams(nb);
  if (!bga.size && !bgb.size) return 0;
  let inter = 0;
  for (const g of bga) if (bgb.has(g)) inter++;
  const union = bga.size + bgb.size - inter;
  return union ? inter / union : 0;
}

// ── Opinet 호출 ──────────────────────────────────────────────────
async function fetchOpinet(prodcd) {
  const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${OPINET_KEY}`
    + `&x=${CENTER.x}&y=${CENTER.y}&radius=${RADIUS_M}&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept': 'application/json,*/*',
      },
    });
    if (!res.ok) { console.warn(`  ⚠️  Opinet ${prodcd} HTTP ${res.status}`); return []; }
    const json = await res.json().catch(() => null);
    return (json?.RESULT?.OIL ?? []);
  } catch (e) {
    console.warn(`  ⚠️  Opinet ${prodcd} 실패:`, e.message);
    return [];
  }
}

// ── 메인 ─────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 오피넷 주유소 가격+발굴 동기화 시작 (반경', RADIUS_M / 1000, 'km)...');

  // 1. Opinet 3종 병렬 호출
  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinet(PRODCD.gasoline),
    fetchOpinet(PRODCD.diesel),
    fetchOpinet(PRODCD.lpg),
  ]);
  console.log(`  ✅ Opinet — 휘발유:${gasoline.length} 경유:${diesel.length} LPG:${lpg.length}`);

  if (gasoline.length + diesel.length + lpg.length === 0) {
    console.error('❌ Opinet 에서 데이터를 받지 못했습니다. 종료.');
    process.exit(1);
  }

  // 2. UNI_ID 기준으로 주유소+가격 통합
  const stationMap = new Map();
  function ingest(list, fuelKey) {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!stationMap.has(s.UNI_ID)) stationMap.set(s.UNI_ID, { station: s });
      const entry = stationMap.get(s.UNI_ID);
      // 좌표가 없으면 이 레코드에서 가져오기
      if ((!entry.station.GIS_X_COOR || !entry.station.GIS_Y_COOR) && s.GIS_X_COOR && s.GIS_Y_COOR) {
        entry.station = { ...s, ...entry.station, GIS_X_COOR: s.GIS_X_COOR, GIS_Y_COOR: s.GIS_Y_COOR };
      }
      if (s.PRICE > 0) entry[fuelKey] = s.PRICE;
    }
  }
  ingest(gasoline, 'gasoline');
  ingest(diesel,   'diesel');
  ingest(lpg,      'lpg');
  console.log(`  ✅ 고유 주유소: ${stationMap.size}개`);

  // 3. 기존 DB 레코드 로드
  const { data: dbRows } = await supabase
    .from('gas_stations')
    .select('id,opinet_id,name,sort_order');

  const dbByOpinetId = new Map();  // opinet_id → db row id
  const dbRawRows = [];            // raw rows for name similarity fallback
  let maxSort = 0;

  for (const row of dbRows ?? []) {
    if (row.opinet_id) dbByOpinetId.set(row.opinet_id, row.id);
    dbRawRows.push(row);
    if ((row.sort_order ?? 0) > maxSort) maxSort = row.sort_order;
  }
  console.log(`  ✅ DB 기존 레코드: ${dbRawRows.length}개`);

  // 4. 각 오피넷 주유소 upsert
  const now = new Date().toISOString();
  let inserted = 0, updated = 0, skipped = 0;
  let sortCounter = maxSort;

  for (const [uniId, entry] of stationMap) {
    const s   = entry.station;
    const wgs = katecToWgs84(s.GIS_X_COOR ?? 0, s.GIS_Y_COOR ?? 0);
    if (!wgs) {
      console.warn(`  ⚠️  좌표 변환 실패: ${s.OS_NM}`);
      skipped++;
      continue;
    }

    const address   = s.NEW_ADR || s.VAN_ADR || '';
    const area      = extractArea(address);
    const brandCode = BRAND_META[s.POLL_DIV_CD] ? s.POLL_DIV_CD : 'ETC';
    const isSelf    = /셀프/i.test(s.OS_NM);
    const isAlttul  = ['RTO', 'RTX', 'NHO'].includes(brandCode);
    const hasPrices = (entry.gasoline ?? 0) > 0 || (entry.diesel ?? 0) > 0 || (entry.lpg ?? 0) > 0;

    // opinet_id 직접 매핑 → 이름 유사도 폴백
    let existingId = dbByOpinetId.get(uniId);
    if (!existingId) {
      let bestId = null, bestScore = 0;
      for (const row of dbRawRows) {
        const score = nameSimilarity(s.OS_NM, row.name);
        if (score > bestScore) { bestScore = score; bestId = row.id; }
      }
      if (bestScore >= 0.5 && bestId) existingId = bestId;
    }

    if (existingId) {
      // UPDATE 기존 레코드
      const payload = {
        opinet_id:  uniId,
        lat:        wgs.lat,
        lng:        wgs.lng,
        address:    address || undefined,
        brand_code: brandCode,
        brand_name: BRAND_META[brandCode]?.name ?? '자가상표',
        is_self:    isSelf,
        is_alttul:  isAlttul,
        active:     true,
        updated_at: now,
        ...(hasPrices ? {
          price_gasoline:   entry.gasoline ?? null,
          price_diesel:     entry.diesel   ?? null,
          price_lpg:        entry.lpg      ?? null,
          price_updated_at: now,
        } : {}),
      };
      // undefined 키 제거
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      const { error } = await supabase.from('gas_stations').update(payload).eq('id', existingId);
      if (error) {
        console.error(`  ❌ 업데이트 실패 "${s.OS_NM}":`, error.message);
        skipped++;
      } else {
        const priceStr = [
          entry.gasoline ? `휘발유 ${entry.gasoline}원` : null,
          entry.diesel   ? `경유 ${entry.diesel}원`     : null,
          entry.lpg      ? `LPG ${entry.lpg}원`         : null,
        ].filter(Boolean).join(' / ') || '(가격 없음)';
        console.log(`  ✅ 업데이트: ${s.OS_NM} — ${priceStr}`);
        updated++;
      }
    } else {
      // INSERT 신규 주유소
      sortCounter++;
      const payload = {
        name:             s.OS_NM,
        opinet_id:        uniId,
        brand_code:       brandCode,
        brand_name:       BRAND_META[brandCode]?.name ?? '자가상표',
        area, address,
        lat:              wgs.lat,
        lng:              wgs.lng,
        is_self:          isSelf,
        is_alttul:        isAlttul,
        active:           true,
        sort_order:       sortCounter,
        price_gasoline:   entry.gasoline ?? null,
        price_diesel:     entry.diesel   ?? null,
        price_lpg:        entry.lpg      ?? null,
        price_updated_at: hasPrices ? now : null,
        created_at:       now,
        updated_at:       now,
      };
      const { error } = await supabase.from('gas_stations').insert(payload);
      if (error) {
        console.error(`  ❌ 삽입 실패 "${s.OS_NM}":`, error.message);
        skipped++;
      } else {
        console.log(`  ✨ 신규 발굴: ${s.OS_NM} (${area})`);
        inserted++;
        // 이후 중복 삽입 방지용으로 opinet_id 등록
        dbByOpinetId.set(uniId, sortCounter);
      }
    }
  }

  // 5. 오피넷에 없는 기존 레코드 비활성화
  const activeIds = Array.from(stationMap.keys());
  if (activeIds.length > 0) {
    const { error: deactivateErr } = await supabase
      .from('gas_stations')
      .update({ active: false, updated_at: now })
      .not('opinet_id', 'is', null)
      .not('opinet_id', 'in', `(${activeIds.map(id => `"${id}"`).join(',')})`)
      .eq('active', true);
    if (deactivateErr) console.warn('  ⚠️  비활성화 오류:', deactivateErr.message);
  }

  console.log(`\n✅ 완료 — 신규:${inserted}개 업데이트:${updated}개 건너뜀:${skipped}개`);
}

main().catch(e => { console.error('❌ 치명적 오류:', e); process.exit(1); });
