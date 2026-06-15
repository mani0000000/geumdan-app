#!/usr/bin/env node
/**
 * sync-kakao-stores.mjs
 *
 * 카카오 로컬 검색 API를 사용하여 buildings 테이블의 모든 건물(lat/lng 있는 것)
 * 반경 내 매장을 검색하고 stores 테이블에 upsert한다.
 *
 * 사용법:
 *   KAKAO_REST_API_KEY=<key> SUPABASE_SERVICE_KEY=<key> node scripts/batch/sync-kakao-stores.mjs
 *
 *   특정 건물만:
 *   KAKAO_REST_API_KEY=<key> SUPABASE_SERVICE_KEY=<key> \
 *     node scripts/batch/sync-kakao-stores.mjs --building b_syace3p
 *
 *   반경 지정 (기본 200m):
 *   ... node scripts/batch/sync-kakao-stores.mjs --radius 300
 *
 * 필요 환경변수:
 *   KAKAO_REST_API_KEY  — 카카오 개발자 REST API 키
 *   SUPABASE_SERVICE_KEY — Supabase 서비스 역할 키
 *   SUPABASE_URL        — (선택) 기본값: https://plwpfnbhyzblgvliiole.supabase.co
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://plwpfnbhyzblgvliiole.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY ?? "";

if (!SERVICE_KEY || !KAKAO_KEY) {
  console.error("❌ 필수 환경변수 누락:");
  if (!KAKAO_KEY) console.error("   KAKAO_REST_API_KEY=<카카오 REST API 키>");
  if (!SERVICE_KEY) console.error("   SUPABASE_SERVICE_KEY=<Supabase 서비스 역할 키>");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── CLI 인수 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const buildingArg = args.includes("--building")
  ? args[args.indexOf("--building") + 1]
  : null;
const radiusArg = args.includes("--radius")
  ? parseInt(args[args.indexOf("--radius") + 1], 10)
  : 200;
const dryRun = args.includes("--dry-run");

// ── 카테고리 매핑 ────────────────────────────────────────────────────────────
const GROUP_MAP = {
  CE7: "카페",
  FD6: "음식점",
  CS2: "편의점",
  MT1: "마트",
  HP8: "병원/약국",
  PM9: "병원/약국",
  AG2: "부동산",
  BK9: "기타",
  CT1: "기타",
  PK6: "기타",
  OL7: "기타",
  SW8: "기타",
  ETC: "기타",
};

function normalizeCategory(catName, groupCode) {
  if (GROUP_MAP[groupCode]) return GROUP_MAP[groupCode];
  const c = catName ?? "";
  if (c.includes("카페") || c.includes("커피")) return "카페";
  if (c.includes("미용") || c.includes("헤어") || c.includes("네일")) return "미용";
  if (c.includes("학원") || c.includes("교습")) return "학원";
  if (c.includes("약국") || c.includes("병원") || c.includes("의원") || c.includes("치과") || c.includes("한의") || c.includes("안과") || c.includes("피부")) return "병원/약국";
  if (c.includes("마트") || c.includes("슈퍼")) return "마트";
  if (c.includes("편의점")) return "편의점";
  if (c.includes("음식") || c.includes("식당") || c.includes("한식") || c.includes("일식") || c.includes("중식") || c.includes("분식") || c.includes("치킨") || c.includes("피자")) return "음식점";
  if (c.includes("헬스") || c.includes("피트니스") || c.includes("필라테스") || c.includes("요가")) return "헬스/운동";
  if (c.includes("세탁")) return "세탁";
  if (c.includes("반려") || c.includes("애견") || c.includes("펫")) return "반려동물";
  if (c.includes("베이커리") || c.includes("빵") || c.includes("제과")) return "베이커리";
  if (c.includes("안경")) return "안경원";
  if (c.includes("꽃")) return "꽃집";
  if (c.includes("스터디")) return "스터디카페";
  if (c.includes("중개") || c.includes("부동산")) return "부동산";
  return "기타";
}

// ── Kakao API ────────────────────────────────────────────────────────────────
async function kakaoSearch(query, lng, lat, radius, page = 1) {
  const params = new URLSearchParams({
    query,
    x: String(lng),
    y: String(lat),
    radius: String(radius),
    page: String(page),
    size: "15",
    sort: "distance",
  });
  const res = await fetch(
    `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
    { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` } }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Kakao ${res.status}: ${t.slice(0, 100)}`);
  }
  return res.json();
}

async function fetchAllPages(query, lng, lat, radius) {
  const places = [];
  for (let page = 1; page <= 3; page++) {
    const data = await kakaoSearch(query, lng, lat, radius, page);
    places.push(...(data.documents ?? []));
    if (data.meta?.is_end) break;
    await sleep(200);
  }
  return places;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── 건물명 변형 키워드 생성 ──────────────────────────────────────────────────
function buildingQueries(name) {
  const queries = [name];
  // "3차" 등 차수 제거
  const stripped = name.replace(/[0-9]+차/g, "").replace(/\s+/g, " ").trim();
  if (stripped && stripped !== name) queries.push(stripped);
  // "플러스" 제거
  const noPlus = name.replace(/플러스/g, "").trim();
  if (noPlus && noPlus !== name && !queries.includes(noPlus)) queries.push(noPlus);
  return queries;
}

// ── 메인 ────────────────────────────────────────────────────────────────────
console.log("🗺️  카카오 매장 동기화 시작\n");

// 건물 목록 조회
const query = sb.from("buildings").select("id, name, lat, lng").not("lat", "is", null).not("lng", "is", null);
if (buildingArg) query.eq("id", buildingArg);
const { data: buildings, error: bErr } = await query.order("name");

if (bErr || !buildings?.length) {
  console.error("❌ 건물 조회 실패:", bErr?.message ?? "결과 없음");
  process.exit(1);
}

console.log(`📋 처리 대상: ${buildings.length}개 건물 (반경 ${radiusArg}m)${dryRun ? " [DRY RUN]" : ""}\n`);

let totalStores = 0;
let totalBuildings = 0;

for (const bld of buildings) {
  const name = bld.name;
  const queries = buildingQueries(name);
  const seen = new Map();

  process.stdout.write(`🏢 ${name} (${bld.id}) ... `);

  for (const q of queries) {
    try {
      const places = await fetchAllPages(q, bld.lng, bld.lat, radiusArg);
      for (const p of places) {
        if (!seen.has(p.id)) seen.set(p.id, p);
      }
    } catch (e) {
      console.warn(`\n  ⚠️  "${q}" 검색 오류: ${e.message}`);
    }
    await sleep(300);
  }

  const places = [...seen.values()];
  console.log(`${places.length}개 발견`);

  if (places.length === 0 || dryRun) {
    if (places.length > 0) {
      for (const p of places.slice(0, 5)) {
        console.log(`    - ${p.place_name} (${p.category_group_name})`);
      }
      if (places.length > 5) console.log(`    ... 외 ${places.length - 5}개`);
    }
    continue;
  }

  // upsert
  const rows = places.map(p => ({
    id:          `kakao_${bld.id}_${p.id}`,
    building_id: bld.id,
    name:        p.place_name,
    category:    normalizeCategory(p.category_name, p.category_group_code),
    floor_label: "1F",
    phone:       p.phone || null,
    hours:       null,
    is_open:     true,
    is_premium:  false,
    x: 0, y: 0, w: 10, h: 10,
    extra_info: {
      kakao_url:      p.place_url || null,
      kakao_category: p.category_name || null,
      address:        p.road_address_name || p.address_name || null,
    },
  }));

  const { error: uErr } = await sb
    .from("stores")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: false });

  if (uErr) {
    console.error(`  ❌ upsert 실패: ${uErr.message}`);
    continue;
  }

  // 건물 갱신
  const { count } = await sb
    .from("stores")
    .select("id", { count: "exact", head: true })
    .eq("building_id", bld.id)
    .neq("name", "공실");

  await sb.from("buildings").update({
    has_data:     true,
    total_stores: count ?? rows.length,
  }).eq("id", bld.id);

  console.log(`  ✅ ${rows.length}개 upsert 완료`);
  totalStores += rows.length;
  totalBuildings++;

  await sleep(500);
}

console.log(`\n✅ 완료: ${totalBuildings}개 건물, 총 ${totalStores}개 매장 동기화`);
