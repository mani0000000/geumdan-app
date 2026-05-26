#!/usr/bin/env node
/**
 * sync-gas-stations.mjs
 * 오피넷 API → Supabase gas_stations 가격·좌표 일괄 동기화
 *
 * Usage:
 *   SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx \
 *   [OPINET_API_KEY=xxx] \
 *   node scripts/batch/sync-gas-stations.mjs
 *
 * 개선 사항:
 *  - 브랜드명 제거 후 Jaccard bigram 유사도로 이름 매칭 (threshold 0.35)
 *  - wgs84ToKatec 으로 정확한 KATEC 중심 계산 → katecToWgs84 오차 최소화
 *  - 반경 10km로 확장
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const OPINET_KEY       = (process.env.OPINET_API_KEY ?? 'F260518486').trim();
const RADIUS_M         = 10000;
const PRODCD           = { gasoline: 'B027', diesel: 'D047', lpg: 'K015' };
const GEUMDAN          = { lat: 37.5446, lng: 126.6861 };

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 환경변수 누락: SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// ── sb_* 키 대응 fetch ───────────────────────────────────────────────────────
function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/rest/v1/')) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.slice(7) === key) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  global: { fetch: makeFetch(SUPABASE_KEY) },
  auth:   { autoRefreshToken: false, persistSession: false },
});

// ── WGS84 → KATEC (Molodensky + TM) ─────────────────────────────────────────
const D2R = Math.PI / 180;
function wgs84ToKatec(lat, lng) {
  const phi = lat * D2R, lam = lng * D2R;
  const WA = 6378137.0, WF = 1/298.257223563;
  const BA = 6377397.155, BF = 1/299.1528128;
  const DX = -146.43, DY = 507.89, DZ = 681.46;
  const K_LAT0 = 38*D2R, K_LON0 = 128*D2R, K_SC = 0.9999, K_FE = 400000, K_FN = 600000;
  const b = WA*(1-WF), e2 = (WA**2-b**2)/WA**2;
  const sinp = Math.sin(phi), cosp = Math.cos(phi), sinl = Math.sin(lam), cosl = Math.cos(lam);
  const Rn = WA/Math.sqrt(1-e2*sinp**2);
  const Rm = WA*(1-e2)/Math.pow(1-e2*sinp**2, 1.5);
  const da = BA-WA, df = BF-WF;
  const dphi = (-DX*sinp*cosl - DY*sinp*sinl + DZ*cosp
    + da*(Rn*e2*sinp*cosp)/WA
    + df*(Rm*(WA/b)+Rn*(b/WA))*sinp*cosp)/Rm;
  const dlam = (-DX*sinl + DY*cosl)/(Rn*cosp);
  const bLat = phi+dphi, bLon = lam+dlam;
  const ba = BA, bb = ba*(1-BF), be2 = (ba**2-bb**2)/ba**2, ep2 = (ba**2-bb**2)/bb**2;
  const sb2 = Math.sin(bLat), cb = Math.cos(bLat), tb = Math.tan(bLat);
  const N = ba/Math.sqrt(1-be2*sb2**2), T = tb**2, C = ep2*cb**2, A = cb*(bLon-K_LON0);
  const e = be2;
  const mer = p => ba*((1-e/4-3*e**2/64-5*e**3/256)*p
    -(3*e/8+3*e**2/32+45*e**3/1024)*Math.sin(2*p)
    +(15*e**2/256+45*e**3/1024)*Math.sin(4*p)
    -35*e**3/3072*Math.sin(6*p));
  const M = mer(bLat), M0 = mer(K_LAT0);
  const x = K_FE + K_SC*N*(A+(1-T+C)*A**3/6+(5-18*T+T**2+72*C-58*ep2)*A**5/120);
  const y = K_FN + K_SC*(M-M0+N*tb*(A**2/2+(5-T+9*C+4*C**2)*A**4/24
    +(61-58*T+T**2+600*C-330*ep2)*A**6/720));
  return { x: Math.round(x), y: Math.round(y) };
}

// 정확한 KATEC 중심 계산
const CENTER_KATEC = wgs84ToKatec(GEUMDAN.lat, GEUMDAN.lng);
const COS_C = Math.cos(GEUMDAN.lat * D2R);
console.log(`📍 KATEC 중심: x=${CENTER_KATEC.x}, y=${CENTER_KATEC.y}`);

function katecToWgs84(x, y) {
  if (!x || !y || x < 150000 || x > 600000 || y < 300000 || y > 800000) return null;
  const lat = GEUMDAN.lat + (y - CENTER_KATEC.y) / 111320;
  const lng = GEUMDAN.lng + (x - CENTER_KATEC.x) / (111320 * COS_C);
  if (lat < 37.2 || lat > 37.9 || lng < 126.3 || lng > 127.2) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

// ── 이름 정규화 + Jaccard 유사도 ─────────────────────────────────────────────
function normName(s) {
  return s.toLowerCase()
    .replace(/sk에너지|sk|gs칼텍스|gs|현대오일뱅크|현대|에스오일|s-oil|s\.oil/g, '')
    .replace(/농협|알뜰주유소|알뜰|셀프주유소|셀프|주유소/g, '')
    .replace(/\(주\)|\(유\)/g, '')
    .replace(/에너지|오일뱅크|오일드림/g, '')
    .replace(/\s+/g, '').replace(/[()（）\[\]]/g, '').trim();
}

function bigrams(s) {
  const r = new Set();
  for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i+2));
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

// ── Opinet API 호출 ───────────────────────────────────────────────────────────
async function fetchOpinet(prodcd) {
  const url = `https://www.opinet.co.kr/api/aroundAll.do?code=${OPINET_KEY}`
    + `&x=${CENTER_KATEC.x}&y=${CENTER_KATEC.y}&radius=${RADIUS_M}&prodcd=${prodcd}&sort=1&out=json`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36',
        Accept: 'application/json,*/*',
      },
    });
    if (!res.ok) { console.warn(`  ⚠️  Opinet ${prodcd} HTTP ${res.status}`); return []; }
    const json = await res.json().catch(() => null);
    return json?.RESULT?.OIL ?? [];
  } catch (e) {
    console.warn(`  ⚠️  Opinet ${prodcd} 실패:`, e.message);
    return [];
  }
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🔄 주유소 동기화 시작...\n');

  // 1. DB 주유소
  const { data: dbStations, error: dbErr } = await sb
    .from('gas_stations').select('id,name,lat,lng,opinet_id').eq('active', true);
  if (dbErr || !dbStations?.length) {
    console.error('❌ DB 로드 실패:', dbErr?.message); process.exit(1);
  }
  console.log(`DB 주유소: ${dbStations.length}개`);

  // 2. Opinet 병렬 로드
  const [gasoline, diesel, lpg] = await Promise.all([
    fetchOpinet(PRODCD.gasoline), fetchOpinet(PRODCD.diesel), fetchOpinet(PRODCD.lpg),
  ]);
  console.log(`Opinet: 휘발유 ${gasoline.length} / 경유 ${diesel.length} / LPG ${lpg.length}\n`);

  if (!gasoline.length && !diesel.length && !lpg.length) {
    console.error('❌ Opinet 응답 없음'); process.exit(1);
  }

  // 3. 인덱스 구성
  const priceMap = new Map();
  const opinetAll = new Map();

  function ingest(list, fuel) {
    for (const s of list) {
      if (!s.UNI_ID) continue;
      if (!opinetAll.has(s.UNI_ID)) opinetAll.set(s.UNI_ID, s);
      if (s.PRICE > 0) {
        if (!priceMap.has(s.UNI_ID)) priceMap.set(s.UNI_ID, {});
        priceMap.get(s.UNI_ID)[fuel] = s.PRICE;
      }
    }
  }
  ingest(gasoline, 'gasoline'); ingest(diesel, 'diesel'); ingest(lpg, 'lpg');
  console.log(`Opinet 고유 주유소: ${opinetAll.size}개\n`);

  const gisMap = new Map();
  for (const [uid, s] of opinetAll) {
    if (s.GIS_X_COOR && s.GIS_Y_COOR) {
      const wgs = katecToWgs84(s.GIS_X_COOR, s.GIS_Y_COOR);
      if (wgs) gisMap.set(uid, wgs);
    }
  }

  // 4. 매칭 + 업데이트
  let updated = 0, unmatched = 0;
  const now = new Date().toISOString();

  for (const dbS of dbStations) {
    let uid = dbS.opinet_id ?? null;
    let matchScore = uid ? 1.0 : 0;

    if (!uid) {
      let bestId = null, bestScore = 0;
      for (const [id, os] of opinetAll) {
        const score = nameSimilarity(dbS.name, os.OS_NM);
        if (score > bestScore) { bestScore = score; bestId = id; }
      }
      if (bestScore >= 0.35 && bestId) {
        uid = bestId;
        matchScore = bestScore;
        const opiName = opinetAll.get(bestId).OS_NM;
        console.log(`  🔗 "${dbS.name}" ↔ "${opiName}" (score=${bestScore.toFixed(2)})`);
      }
    }

    if (!uid) {
      console.warn(`  ⚠️  미매칭: "${dbS.name}"`);
      unmatched++;
      continue;
    }

    const prices = priceMap.get(uid) ?? {};
    const gis = gisMap.get(uid);
    const opiS = opinetAll.get(uid);

    const update = {
      opinet_id:        uid,
      price_gasoline:   prices.gasoline ?? null,
      price_diesel:     prices.diesel   ?? null,
      price_lpg:        prices.lpg      ?? null,
      price_updated_at: now,
      ...(gis ? { lat: gis.lat, lng: gis.lng } : {}),
    };

    const { error: upErr } = await sb.from('gas_stations').update(update).eq('id', dbS.id);
    if (upErr) {
      console.error(`  ❌ 업데이트 실패 "${dbS.name}":`, upErr.message);
    } else {
      const pStr = [
        prices.gasoline ? `휘발유 ${prices.gasoline}원` : null,
        prices.diesel   ? `경유 ${prices.diesel}원`   : null,
        prices.lpg      ? `LPG ${prices.lpg}원`       : null,
      ].filter(Boolean).join(' / ') || '가격 없음';
      const cStr = gis
        ? ` [${gis.lat}, ${gis.lng}]${gis.lat !== dbS.lat || gis.lng !== dbS.lng ? ' (좌표 갱신)' : ''}`
        : '';
      console.log(`  ✅ ${dbS.name}: ${pStr}${cStr}`);
      updated++;
    }
  }

  // 5. 미매칭 Opinet 스테이션 출력 (참고용)
  const matchedUids = new Set(dbStations.map(s => s.opinet_id).filter(Boolean));
  const unmatchedOpinet = [];
  for (const [uid, os] of opinetAll) {
    if (!matchedUids.has(uid)) {
      const gis = gisMap.get(uid);
      unmatchedOpinet.push({ uid, name: os.OS_NM, address: os.NEW_ADR ?? os.VAN_ADR, gis });
    }
  }
  if (unmatchedOpinet.length) {
    console.log(`\n📋 DB에 없는 Opinet 주유소 (${unmatchedOpinet.length}개) — 필요 시 추가:`);
    unmatchedOpinet.forEach(s => {
      const gStr = s.gis ? `${s.gis.lat}, ${s.gis.lng}` : '좌표없음';
      console.log(`     ${s.name} [${s.uid}] — ${s.address ?? ''} (${gStr})`);
    });
  }

  console.log(`\n✅ 완료: ${updated}개 업데이트, ${unmatched}개 미매칭`);
}

main().catch(e => { console.error('❌ 오류:', e); process.exit(1); });
