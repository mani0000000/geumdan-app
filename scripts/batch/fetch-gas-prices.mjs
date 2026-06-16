#!/usr/bin/env node
/**
 * fetch-gas-prices.mjs
 * Opinet aroundAll.do → Supabase gas_stations 가격+발굴 동기화 (매시간 실행)
 *
 * 전략: Opinet 이 source of truth
 *  1. Opinet 다중 중심점 20km 반경 내 모든 주유소+가격 수집
 *  2. DB 레코드와 opinet_id 혹은 이름 유사도로 매핑
 *  3. 매핑 성공 → UPDATE (가격·좌표 갱신), 실패 → INSERT (신규 발굴)
 *  4. 오피넷에 없는 기존 레코드 → active=false
 *
 * 주의: Opinet API가 GitHub Actions(AWS 클라우드 IP)에서 타임아웃될 수 있음.
 *       데이터를 받지 못하면 경고만 출력하고 성공(exit 0)으로 종료.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPINET_KEY          = (process.env.OPINET_API_KEY ?? 'F260518486').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// sb_* 형식의 서비스 키는 JWT가 아니므로 PostgREST Authorization 헤더 제거 필요
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

// ── KATEC → WGS84 (정밀 역TM + 역Molodensky) ────────────────────
function katecToWgs84(kx, ky) {
  if (!kx || !ky || kx < 100000 || kx > 700000 || ky < 200000 || ky > 1000000) return null;
  const BES_A = 6377397.155, BES_F = 1 / 299.1528128;
  const WGS_A = 6378137.0,   WGS_F = 1 / 298.257223563;
  const DX = -146.43, DY = 507.89, DZ = 681.46;
  const K_LAT0 = 38 * D2R, K_LON0 = 128 * D2R, K_SCALE = 0.9999, K_FE = 400000, K_FN = 600000;

  const a = BES_A, f = BES_F, b = a * (1 - f);
  const e2 = (a * a - b * b) / (a * a);
  const ep2 = (a * a - b * b) / (b * b);

  const x1 = (kx - K_FE) / K_SCALE;
  const y1 = (ky - K_FN) / K_SCALE;

  const c0 = 1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256;
  const c2 = 3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024;
  const c4 = 15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024;
  const c6 = 35 * e2 ** 3 / 3072;
  const M0 = a * (c0 * K_LAT0 - c2 * Math.sin(2 * K_LAT0) + c4 * Math.sin(4 * K_LAT0) - c6 * Math.sin(6 * K_LAT0));

  const M1 = M0 + y1;
  const mu = M1 / (a * c0);
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu)
    + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu)
    + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);

  const sp1 = Math.sin(phi1), cp1 = Math.cos(phi1), tp1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sp1 * sp1);
  const T1 = tp1 * tp1, C1 = ep2 * cp1 * cp1;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sp1 * sp1, 1.5);
  const D = x1 / N1;

  const bLat = phi1 - (N1 * tp1 / R1) * (
    D ** 2 / 2
    - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720
  );
  const bLon = K_LON0 + (
    D - (1 + 2 * T1 + C1) * D ** 3 / 6
    + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120
  ) / cp1;

  // 역 Molodensky: Bessel → WGS84
  const sb = Math.sin(bLat), cb = Math.cos(bLat);
  const sl = Math.sin(bLon), cl = Math.cos(bLon);
  const Rn2 = a / Math.sqrt(1 - e2 * sb * sb);
  const Rm2 = a * (1 - e2) / Math.pow(1 - e2 * sb * sb, 1.5);
  const iDX = -DX, iDY = -DY, iDZ = -DZ;
  const iDa = WGS_A - BES_A, iDf = WGS_F - BES_F;

  const dphi = (
    -iDX * sb * cl - iDY * sb * sl + iDZ * cb
    + iDa * (Rn2 * e2 * sb * cb) / a
    + iDf * (Rm2 * (a / b) + Rn2 * (b / a)) * sb * cb
  ) / Rm2;
  const dlam = (-iDX * sl + iDY * cl) / (Rn2 * cb);

  const lat = (bLat + dphi) / D2R;
  const lng = (bLon + dlam) / D2R;
  if (lat < 33 || lat > 41 || lng < 124 || lng > 131) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── 다중 검색 중심점 (구검단 + 검단신도시 + 김포) ───────────────────
const SCAN_CENTERS = [
  { lat: 37.545, lng: 126.686, label: '인천 서구(구검단)' },
  { lat: 37.593, lng: 126.712, label: '검단신도시(신)' },
  { lat: 37.620, lng: 126.718, label: '김포시' },
];

const RADIUS_M = 20000;
const PRODCD = { gasoline: 'B027', diesel: 'D047', lpg: 'K015' };

// 검단 + 인천서구 + 김포만 처리
const GEUMDAN_KEYWORDS = ['마전동','당하동','원당동','불로동','대곡동','금곡동','오류동','왕길동','백석동','검단동','서구','김포'];

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
async function fetchOpinet(lat, lng, prodcd) {
  const center = wgs84ToKatec(lat, lng);
  const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${OPINET_KEY}`
    + `&x=${center.x}&y=${center.y}&radius=${RADIUS_M}&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
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
  console.log('🔄 오피넷 주유소 가격+발굴 동기화 시작 (반경', RADIUS_M / 1000, 'km, 중심점', SCAN_CENTERS.length, '개)...');

  // 1. 다중 중심점에서 3종 병렬 호출 후 UNI_ID 기준으로 통합
  const stationMap = new Map();
  function ingest(list, fuelKey) {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!stationMap.has(s.UNI_ID)) stationMap.set(s.UNI_ID, { station: s });
      const entry = stationMap.get(s.UNI_ID);
      if ((!entry.station.GIS_X_COOR || !entry.station.GIS_Y_COOR) && s.GIS_X_COOR && s.GIS_Y_COOR) {
        entry.station = { ...s, ...entry.station, GIS_X_COOR: s.GIS_X_COOR, GIS_Y_COOR: s.GIS_Y_COOR };
      }
      if (s.PRICE > 0) entry[fuelKey] = s.PRICE;
    }
  }

  let apiCallCount = 0;
  for (const center of SCAN_CENTERS) {
    const [gasoline, diesel, lpg] = await Promise.all([
      fetchOpinet(center.lat, center.lng, PRODCD.gasoline),
      fetchOpinet(center.lat, center.lng, PRODCD.diesel),
      fetchOpinet(center.lat, center.lng, PRODCD.lpg),
    ]);
    apiCallCount += gasoline.length + diesel.length + lpg.length;
    ingest(gasoline, 'gasoline');
    ingest(diesel,   'diesel');
    ingest(lpg,      'lpg');
    console.log(`  📡 ${center.label} — 휘발유:${gasoline.length} 경유:${diesel.length} LPG:${lpg.length}`);
    await new Promise(r => setTimeout(r, 400));
  }

  // 오피넷 API 응답 없음 → 경고만 출력하고 정상 종료 (CI 실패 방지)
  // (GitHub Actions AWS IP에서 오피넷 접속 차단/타임아웃 시 발생)
  if (apiCallCount === 0) {
    console.warn('⚠️  Opinet API에서 데이터를 받지 못했습니다 (접속 차단 또는 타임아웃 가능성).');
    console.warn('   가격 업데이트를 건너뜁니다. DB 데이터는 유지됩니다.');
    process.exit(0);
  }

  // 주소 기반 필터: 검단 + 인천서구 + 김포만
  for (const [id, entry] of stationMap) {
    const addr = entry.station.NEW_ADR || entry.station.VAN_ADR || '';
    if (!GEUMDAN_KEYWORDS.some(k => addr.includes(k))) stationMap.delete(id);
  }
  console.log(`  ✅ 고유 주유소 (검단+인근): ${stationMap.size}개`);

  // 2. 기존 DB 레코드 로드
  const { data: dbRows, error: dbLoadErr } = await supabase
    .from('gas_stations')
    .select('id,opinet_id,name,sort_order');
  if (dbLoadErr) throw new Error(`DB 로드 실패: ${dbLoadErr.message}`);

  const dbByOpinetId = new Map();
  const dbRawRows = [];
  let maxSort = 0;

  for (const row of dbRows ?? []) {
    if (row.opinet_id) dbByOpinetId.set(row.opinet_id, row.id);
    dbRawRows.push(row);
    if ((row.sort_order ?? 0) > maxSort) maxSort = row.sort_order;
  }
  console.log(`  ✅ DB 기존 레코드: ${dbRawRows.length}개`);

  // 3. 각 오피넷 주유소 upsert
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
      const { data: insertedRow, error } = await supabase
        .from('gas_stations').insert(payload).select('id').single();
      if (error) {
        console.error(`  ❌ 삽입 실패 "${s.OS_NM}":`, error.message);
        skipped++;
      } else {
        console.log(`  ✨ 신규 발굴: ${s.OS_NM} (${area})`);
        inserted++;
        dbByOpinetId.set(uniId, insertedRow.id);
      }
    }
  }

  // 4. 오피넷에 없는 기존 레코드 비활성화
  const activeIds = Array.from(stationMap.keys());
  if (activeIds.length > 0) {
    // PostgREST in() 필터: 문자열 값은 따옴표로 감싸야 함
    const inList = `(${activeIds.map(id => `"${id}"`).join(',')})`;
    const { error: deactivateErr } = await supabase
      .from('gas_stations')
      .update({ active: false, updated_at: now })
      .not('opinet_id', 'is', null)
      .not('opinet_id', 'in', inList)
      .eq('active', true);
    if (deactivateErr) console.warn('  ⚠️  비활성화 오류:', deactivateErr.message);
  }

  console.log(`\n✅ 완료 — 신규:${inserted}개 업데이트:${updated}개 건너뜀:${skipped}개`);
}

main().catch(e => { console.error('❌ 치명적 오류:', e); process.exit(1); });
