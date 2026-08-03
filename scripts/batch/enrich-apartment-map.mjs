#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const kakaoKey = process.env.KAKAO_REST_API_KEY;
const dryRun = !process.argv.includes("--apply");
if (!url || !serviceKey || !kakaoKey) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_KEY and KAKAO_REST_API_KEY are required");

const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/아파트|공동주택|주상복합|\(thehuecanalpark\)/gi, "")
    .replace(/[\s·._()\-]/g, "");
}

function similarity(left, right) {
  const a = normalize(left); const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 82 + Math.min(a.length, b.length) / Math.max(a.length, b.length) * 15;
  const grams = value => new Set(Array.from({ length: Math.max(0, value.length - 1) }, (_, index) => value.slice(index, index + 2)));
  const aa = grams(a); const bb = grams(b);
  const overlap = [...aa].filter(value => bb.has(value)).length;
  return (2 * overlap / Math.max(1, aa.size + bb.size)) * 100;
}

async function search(query, useBias = true) {
  const requestUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  requestUrl.searchParams.set("query", query);
  if (useBias) {
    requestUrl.searchParams.set("x", "126.708");
    requestUrl.searchParams.set("y", "37.589");
    requestUrl.searchParams.set("radius", "20000");
  }
  requestUrl.searchParams.set("size", "15");
  const response = await fetch(requestUrl, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Kakao keyword API ${response.status}`);
  return (await response.json()).documents ?? [];
}

const { data: apartments, error } = await db.from("apartments").select("id,name,dong,lat,lng").order("name");
if (error) throw error;

const report = [];
for (const apartment of apartments ?? []) {
  try {
    const withoutRegion = apartment.name.replace(/^검단\s*/i, "");
    const queries = [
      apartment.name,
      `${apartment.name} 아파트`,
      `${apartment.dong ?? ""} ${apartment.name}`,
      `${withoutRegion} 검단`,
      `${withoutRegion} 인천 서구`,
    ];
    const documents = [];
    for (const query of [...new Set(queries.map(value => value.trim()).filter(Boolean))]) {
      documents.push(...await search(query, false));
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const ranked = documents
      .filter(item => `${item.road_address_name} ${item.address_name}`.includes("인천 서구"))
      .map(item => ({
        item,
        score: similarity(apartment.name, item.place_name)
          + (/아파트|주거/.test(item.category_name ?? "") ? 12 : 0)
          + (String(item.place_name ?? "").includes("상가") ? -8 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (!best || best.score < 52) {
      report.push({ id: apartment.id, name: apartment.name, status: "not_matched", best: best?.item?.place_name ?? null, score: best?.score ?? 0 });
      continue;
    }
    const lat = Number(best.item.y); const lng = Number(best.item.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("invalid coordinates");
    if (!dryRun) {
      const { error: updateError } = await db.from("apartments").update({ lat, lng, updated_at: new Date().toISOString() }).eq("id", apartment.id);
      if (updateError) throw updateError;
    }
    report.push({ id: apartment.id, name: apartment.name, status: dryRun ? "matched_dry_run" : "updated", place: best.item.place_name, lat, lng, score: Math.round(best.score) });
  } catch (cause) {
    report.push({ id: apartment.id, name: apartment.name, status: "error", message: cause instanceof Error ? cause.message : String(cause) });
  }
  await new Promise(resolve => setTimeout(resolve, 120));
}

console.log(JSON.stringify({
  mode: dryRun ? "dry-run" : "apply",
  total: report.length,
  updated: report.filter(item => /updated|matched/.test(item.status)).length,
  statusCounts: Object.groupBy(report, item => item.status),
  report,
}, null, 2));

const completed = report.filter(item => /updated|matched/.test(item.status)).length;
if (completed === 0) throw new Error("No apartment coordinates were matched; do not treat this batch as successful");
