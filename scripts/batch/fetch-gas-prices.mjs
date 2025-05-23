#!/usr/bin/env node
/**
 * fetch-gas-prices.mjs
 * 오피넷 실시간 API → Supabase gas_stations 가격 업데이트
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx OPINET_API_KEY=xxx \
 *   node scripts/batch/fetch-gas-prices.mjs
 *
 * OPINET_API_KEY 미설정 시 퍼블릭 데모키(F260518486) 사용 (호출 제한 있음)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const OPINET_KEY       = (process.env.OPINET_API_KEY ?? 'F260518486').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// sb_* 키는 JWT 가 아니므로 PostgREST Authorization 헤더 제거
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
  auth:   { autoRefreshToken: false, persistSession: false },
});

// ── WGS84 → KATEC 변환 (오피넷 API 파라미터 용) ─────────────────
const D2R = Math.PI / 180;
function wgs84ToKatec(lat, lng) {
  const phi = lat * D2R, lam = lng * D2R;
  const WGS_A = 6378137.0, WGS_F = 1/298.257223563;
  const BES_A = 6377397.155, BES_F = 1/299.1528128;
  const DX = -146.43, DY = 507.89, DZ = 681.46;
  const K_LAT0 = 38*D2R, K_LON0 = 128*D2R, K_SCALE = 0.9999, K_FE = 400000, K_FN = 600000;

  const b  = WGS_A*(1-WGS_F), e2 = (WGS_A**2 - b**2)/WGS_A**2;
  const sinp = Math.sin(phi), cosp = Math.cos(phi), sinl = Math.sin(lam), cosl = Math.cos(lam);
  const Rn = WGS_A/Math.sqrt(1 - e2*sinp**2);
  const Rm = WGS_A*(1-e2)/Math.pow(1-e2*sinp**2, 1.5);
  const da = BES_A - WGS_A, df = BES_F - WGS_F;

  const dphi = (-DX*sinp*cosl - DY*sinp*sinl + DZ*cosp
    + da*(Rn*e2*sinp*cosp)/WGS_A
    + df*(Rm*(WGS_A/b) + Rn*(b/WGS_A))*sinp*cosp) / Rm;
  const dlam = (-DX*sinl + DY*cosl) / (Rn*cosp);

  const bLat = phi + dphi, bLon = lam + dlam;
  const ba = BES_A, bb = ba*(1-BES_F), be2 = (ba**2-bb**2)/ba**2, ep2 = (ba**2-bb**2)/bb**2;
  const sb = Math.sin(bLat), cb = Math.cos(bLat), tb = Math.tan(bLat);
  const N = ba/Math.sqrt(1-be2*sb**2), T = tb**2, C = ep2*cb**2, A = cb*(bLon-K_LON0);
  const e = be2;
  const mer = p => ba*((1-e/4-3*e**2/64-5*e**3/256)*p
    - (3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)
    + (15*e**2/256+45*e**3/1024)*Math.sin(4*p)
    - 35*e**3/3072*Math.sin(6*p));
  const M = mer(bLat), M0 = mer(K_LAT0);

  const x = K_FE + K_SCALE*N*(A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*ep2)*A**5/120);
  const y = K_FN + K_SCALE*(M-M0 + N*tb*(A**2/2 + (5-T+9*C+4*C**2)*A**4/24
    + (61-58*T+T**2+600*C-330*ep2)*A**6/720));
  return { x: Math.round(x), y: Math.round(y) };
}

// 검단신도시 중심
const CENTER = wgs84ToKatec(37.5446, 126.6861);
const RADIUS_M = 7000;
const PRODCD = { gasoline: 'B027', diesel: 'D047', lpg: 'K015' };

// ── 이름 정규화 ──────────────────────────────────────────────────
function normName(s) {
  return s.replace(/주유소$/,'').replace(/\(주\)/g,'').replace(/\s+/g,'')
           .replace(/[()（）]/g,'').toLowerCase();
}

function nameSimilarity(a, b) {
  const na = normName(a), nb = normName(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const minLen = Math.min(na.length, nb.length);
  let common = 0;
  for (let i = 0; i < minLen; i++) { if (na[i] === nb[i]) common++; else break; }
  return common / Math.max(na.length, nb.length);
}

// ── Opinet 호출 ──────────────────────────────────────────────────
async function fetchOpinet(prodcd) {
  const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${OPINET_KEY}`
    + `&x=${CENTER.x}&y=${CENTER.y}&radius=${RADIUS_M}&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
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
  console.log('🔄 가격 업데이트 시작...');

  // 1. DB 에서 활성 주유소 목록 로드
  const { data: dbStations, error: dbErr } = await supabase
    .from('gas_stations')
    .select('id,name,lat,lng,opinet_id')
    .eq('active', true);

  if (dbErr || !dbStations?.length) {
    console.error('❌ Supabase 주유소 목록 로드 실패:', dbErr?.message);
    process.exit(1);
  }
  console.log(`  ✅ DB 주유소 ${dbStations.length}개 로드`);

  // 2. Opinet 에서 3개 유종 병렬 로드
  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinet(PRODCD.gasoline),
    fetchOpinet(PRODCD.diesel),
    fetchOpinet(PRODCD.lpg),
  ]);
  console.log(`  ✅ Opinet 응답 — 휘발유:${gasoline.length} 경유:${diesel.length} LPG:${lpg.length}`);

  if (!gasoline.length && !diesel.length && !lpg.length) {
    console.error('❌ Opinet 에서 데이터를 받지 못했습니다. 종료.');
    process.exit(1);
  }

  // 3. UNI_ID → 가격 맵 구성
  const priceMap = new Map();
  const addToMap = (list, fuelKey) => {
    for (const s of list) {
      if (!s.UNI_ID || s.PRICE <= 0) continue;
      if (!priceMap.has(s.UNI_ID)) priceMap.set(s.UNI_ID, { name: s.OS_NM });
      priceMap.get(s.UNI_ID)[fuelKey] = s.PRICE;
    }
  };
  addToMap(gasoline, 'gasoline');
  addToMap(diesel,   'diesel');
  addToMap(lpg,      'lpg');

  // UNI_ID → station 역인덱스 (name 매칭용)
  const opinetAll = [...gasoline, ...diesel, ...lpg].reduce((m, s) => {
    if (s.UNI_ID && !m.has(s.UNI_ID)) m.set(s.UNI_ID, s);
    return m;
  }, new Map());

  // 4. DB 주유소마다 Opinet 매칭 + 업데이트
  let updated = 0, unmatched = 0;
  const now = new Date().toISOString();

  for (const dbS of dbStations) {
    // opinet_id 가 저장돼 있으면 직접 조회
    let uid = dbS.opinet_id;
    let prices = uid ? priceMap.get(uid) : null;

    // 없으면 이름 유사도로 매칭
    if (!prices) {
      let bestId = null, bestScore = 0;
      for (const [id, os] of opinetAll) {
        const score = nameSimilarity(dbS.name, os.OS_NM);
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      if (bestScore >= 0.5 && bestId) {
        uid = bestId;
        prices = priceMap.get(bestId);
        console.log(`  🔗 매칭: "${dbS.name}" ↔ "${opinetAll.get(bestId)?.OS_NM}" (score=${bestScore.toFixed(2)})`);
      }
    }

    if (!prices) {
      console.warn(`  ⚠️  미매칭: "${dbS.name}"`);
      unmatched++;
      continue;
    }

    // 5. Supabase 업데이트
    const update = {
      price_gasoline:   prices.gasoline ?? null,
      price_diesel:     prices.diesel   ?? null,
      price_lpg:        prices.lpg      ?? null,
      price_updated_at: now,
      ...(uid && uid !== dbS.opinet_id ? { opinet_id: uid } : {}),
    };

    const { error: upErr } = await supabase
      .from('gas_stations')
      .update(update)
      .eq('id', dbS.id);

    if (upErr) {
      console.error(`  ❌ 업데이트 실패 "${dbS.name}":`, upErr.message);
    } else {
      const priceStr = [
        prices.gasoline ? `휘발유 ${prices.gasoline}원` : null,
        prices.diesel   ? `경유 ${prices.diesel}원`   : null,
        prices.lpg      ? `LPG ${prices.lpg}원`       : null,
      ].filter(Boolean).join(' / ');
      console.log(`  ✅ ${dbS.name}: ${priceStr}`);
      updated++;
    }
  }

  console.log(`\n✅ 완료: ${updated}개 업데이트, ${unmatched}개 미매칭`);
}

main().catch(e => { console.error('❌ 치명적 오류:', e); process.exit(1); });
