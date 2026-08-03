#!/usr/bin/env node
/**
 * Verify commerce-building floor counts with documented official APIs.
 * 1) Kakao Local address API: road address -> legal-dong/lot codes
 * 2) MOLIT Building HUB register API: title record -> ground/basement floors
 *
 * Default is dry-run. `--apply` updates only records with an exact address match.
 */
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const LIMIT = Number(process.argv.find(value => value.startsWith("--limit="))?.split("=")[1] ?? 0);
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const KAKAO_KEY = process.env.KAKAO_REST_API_KEY;
const DATA_KEY = process.env.DATA_GO_KR_API_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY || !KAKAO_KEY || !DATA_KEY) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_KEY, KAKAO_REST_API_KEY, DATA_GO_KR_API_KEY are required.");
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function addressDocument(address) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json"); url.searchParams.set("query", address);
  const response = await fetch(url, { headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Kakao address API ${response.status}`);
  const data = await response.json(); return data.documents?.[0] ?? null;
}
function padded(value, size) { return String(value || "0").padStart(size, "0"); }
async function buildingTitles(addressRow) {
  const address = addressRow.address ?? addressRow.road_address ?? {};
  const bCode = String(address.b_code ?? "");
  if (bCode.length < 10) return [];
  const url = new URL("https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo");
  let decodedDataKey = DATA_KEY;
  try { decodedDataKey = decodeURIComponent(DATA_KEY); } catch { /* already decoded */ }
  url.searchParams.set("serviceKey", decodedDataKey); url.searchParams.set("sigunguCd", bCode.slice(0, 5)); url.searchParams.set("bjdongCd", bCode.slice(5, 10));
  url.searchParams.set("platGbCd", address.mount_yn === "Y" ? "1" : "0"); url.searchParams.set("bun", padded(address.main_address_no, 4)); url.searchParams.set("ji", padded(address.sub_address_no, 4));
  url.searchParams.set("numOfRows", "100"); url.searchParams.set("pageNo", "1"); url.searchParams.set("_type", "json");
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (!response.ok) throw new Error(`Building HUB HTTP ${response.status}`);
  const data = await response.json();
  const resultCode = String(data.response?.header?.resultCode ?? "");
  if (resultCode && resultCode !== "00") throw new Error(`Building HUB ${resultCode}: ${data.response?.header?.resultMsg ?? "unknown"}`);
  const items = data.response?.body?.items?.item ?? []; return Array.isArray(items) ? items : [items];
}
function normalized(value) { return String(value ?? "").replace(/\s+/g, "").toLowerCase(); }
function chooseTitle(building, titles) {
  if (!titles.length) return null;
  const name = normalized(building.name).replace(/(상가|상가동|단지상가)$/g, "");
  const nameMatches = titles.filter(item => {
    const registered = normalized(item.bldNm);
    return registered && (registered.includes(name) || name.includes(registered));
  });
  if (nameMatches.length === 1) return nameMatches[0];
  if (titles.length === 1) return titles[0];
  return null;
}

const { data: buildings, error } = await db.from("buildings").select("id,name,address,floors,floor_verification").eq("is_published", true).order("name");
if (error) throw error;
const report = [];
for (const building of (LIMIT ? buildings.slice(0, LIMIT) : buildings)) {
  if (!building.address || !/인천/.test(building.address)) { report.push({ id: building.id, status: "skip_incomplete_address" }); continue; }
  try {
    const addressRow = await addressDocument(building.address); if (!addressRow) { report.push({ id: building.id, status: "address_not_found" }); continue; }
    const titles = await buildingTitles(addressRow);
    const title = chooseTitle(building, titles); if (!title) { report.push({ id: building.id, status: titles.length > 1 ? "ambiguous_register_titles" : "register_not_found", candidates: titles.length }); continue; }
    const ground = Number(title.grndFlrCnt); const basement = Number(title.ugrndFlrCnt);
    if (!Number.isFinite(ground) || ground < 1) { report.push({ id: building.id, status: "invalid_floor_count" }); continue; }
    const sourceUrl = "https://www.data.go.kr/data/15134735/openapi.do";
    if (APPLY) {
      const checkedAt = new Date().toISOString();
      const { error: updateError } = await db.from("buildings").update({ floors: ground, ground_floors: ground, basement_floors: Number.isFinite(basement) ? basement : 0, floor_verification: "public_building_register", source_type: "public_open_api", source_name: "국토교통부 건축HUB 건축물대장", source_url: sourceUrl, source_checked_at: checkedAt }).eq("id", building.id);
      if (updateError) throw updateError;
    }
    report.push({ id: building.id, name: building.name, status: APPLY ? "updated" : "verified_dry_run", ground, basement });
  } catch (cause) { report.push({ id: building.id, status: "error", message: cause instanceof Error ? cause.message : String(cause) }); }
}
const verified = report.filter(item => /verified|updated/.test(item.status)).length;
console.log(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", checked: report.length, verified, statusCounts: Object.groupBy(report, item => item.status), report }, null, 2));
if (verified === 0) throw new Error("No building floor records were verified; inspect statusCounts before treating this run as successful.");
