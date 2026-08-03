#!/usr/bin/env node
/**
 * Collect store facts from the documented Kakao Local API.
 * A store is published only at building level when its normalized road address
 * exactly equals the building road address. Floor is deliberately left unknown.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const kakaoKey = process.env.KAKAO_REST_API_KEY;
if (!url || !serviceKey || !kakaoKey) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_KEY, KAKAO_REST_API_KEY are required.");
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const categoryCodes = ["FD6", "CE7", "CS2", "MT1", "HP8", "PM9", "AG2", "BK9"];
const keywordGroups = ["학원", "미용실", "네일", "세탁소", "필라테스", "헬스", "안경", "베이커리", "동물병원"];

function normalizedAddress(value) {
  return String(value ?? "")
    .replace(/인천광역시/g, "인천")
    // 2026 행정구역 개편 전 DB의 '서구'와 개편 후 API의 '검단구'를 동일시한다.
    .replace(/인천\s*검단구/g, "인천 서구")
    .replace(/[\s,()-]/g, "")
    .toLowerCase();
}
function category(place) {
  const map = { CE7: "카페", FD6: "음식점", CS2: "편의점", MT1: "마트", HP8: "병원/약국", PM9: "병원/약국", AG2: "부동산", BK9: "기타" };
  if (map[place.category_group_code]) return map[place.category_group_code];
  const text = `${place.category_name} ${place.place_name}`;
  if (/학원|교습|태권도|미술|음악/.test(text)) return "학원";
  if (/미용|헤어|네일/.test(text)) return "미용";
  if (/세탁/.test(text)) return "세탁";
  if (/헬스|필라테스|요가/.test(text)) return "헬스/운동";
  if (/베이커리|빵집/.test(text)) return "카페";
  return "기타";
}
async function kakao(path, params) {
  const endpoint = new URL(`https://dapi.kakao.com/v2/local/search/${path}.json`);
  Object.entries(params).forEach(([key, value]) => endpoint.searchParams.set(key, String(value)));
  const response = await fetch(endpoint, { headers: { Authorization: `KakaoAK ${kakaoKey}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Kakao ${path} ${response.status}`);
  return response.json();
}
async function collect(building) {
  const found = new Map();
  const categoryResults = await Promise.all(categoryCodes.map(code =>
    kakao("category", { category_group_code: code, x: building.lng, y: building.lat, radius: 120, size: 15, sort: "distance" })
      .catch(error => ({ documents: [], _error: error.message })),
  ));
  const keywordResults = await Promise.all(keywordGroups.map(word =>
    kakao("keyword", { query: `${building.name} ${word}`, x: building.lng, y: building.lat, radius: 160, size: 15, sort: "distance" })
      .catch(error => ({ documents: [], _error: error.message })),
  ));
  for (const result of [...categoryResults, ...keywordResults]) {
    for (const place of result.documents ?? []) found.set(place.id, place);
  }
  const target = normalizedAddress(building.address);
  return [...found.values()].filter(place => target && normalizedAddress(place.road_address_name) === target);
}

const { data: buildings, error } = await db.from("buildings").select("id,name,address,lat,lng").eq("is_published", true).not("lat", "is", null).not("lng", "is", null);
if (error) throw error;
const summary = [];
for (const building of buildings ?? []) {
  try {
    const places = await collect(building);
    const now = new Date().toISOString();
    const candidates = places.map(place => ({
      source_type: "kakao_local_api", source_place_id: place.id, name: place.place_name,
      category: category(place), phone: place.phone || null, source_url: place.place_url || `https://place.map.kakao.com/${place.id}`,
      source_payload: { address_name: place.address_name, road_address_name: place.road_address_name, category_name: place.category_name, x: place.x, y: place.y, verification: "exact_road_address" },
      suggested_building_id: building.id, suggested_floor_label: null, review_status: "verified", reviewed_at: now, reviewed_by: "exact_address_batch", updated_at: now,
    }));
    if (candidates.length) {
      const { error: candidateError } = await db.from("store_place_candidates").upsert(candidates, { onConflict: "source_type,source_place_id" });
      if (candidateError) throw candidateError;
      const rows = places.map((place, index) => ({
        id: `kakao_exact_${place.id}`, building_id: building.id, floor_label: "층 미확인", name: place.place_name,
        category: category(place), phone: place.phone || null, is_open: true, x: 5 + (index % 4) * 23, y: 5 + Math.floor(index / 4) * 18, w: 21, h: 16,
        is_published: true, source_type: "kakao_local_api", source_name: "Kakao Local API", source_url: place.place_url || `https://place.map.kakao.com/${place.id}`,
        source_checked_at: now, placement_verification: "official_api_exact_address", floor_verification: "unverified",
        extra_info: { road_address_name: place.road_address_name, category_name: place.category_name }, updated_at: now,
      }));
      const { error: storeError } = await db.from("stores").upsert(rows, { onConflict: "id" });
      if (storeError) throw storeError;
    }
    const { count, error: countError } = await db.from("stores").select("id", { count: "exact", head: true }).eq("building_id", building.id).eq("is_published", true);
    if (countError) throw countError;
    const { error: buildingError } = await db.from("buildings").update({ total_stores: count ?? 0, has_data: (count ?? 0) > 0 }).eq("id", building.id);
    if (buildingError) throw buildingError;
    summary.push({ buildingId: building.id, exactAddressStores: places.length });
  } catch (cause) { summary.push({ buildingId: building.id, error: cause instanceof Error ? cause.message : String(cause) }); }
}
const exact = summary.reduce((sum, item) => sum + (item.exactAddressStores ?? 0), 0);
console.log(JSON.stringify({ checkedBuildings: summary.length, exactAddressStores: exact, summary }, null, 2));
if (!summary.length) throw new Error("No geocoded buildings were available for store collection.");
