#!/usr/bin/env node
/**
 * Enrich new-Geumdan VWorld footprints with MOLIT Building Register titles.
 *
 * VWorld already supplies authoritative geometry and PNU, but recently built
 * parcels often lack joined name/use/floor columns. This script joins the
 * Building HUB title API by PNU and matches each register title to the closest
 * footprint area. It deliberately leaves low-confidence matches untouched.
 */
import { readFile, writeFile } from "node:fs/promises";

const key = process.env.DATA_GO_KR_API_KEY;
if (!key) throw new Error("DATA_GO_KR_API_KEY is required");

const FILE = new URL("../../public/data/geumdan-vworld-buildings.geojson", import.meta.url);
const TARGET = { west: 126.695, south: 37.578, east: 126.722, north: 37.614 };
const CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.BUILDING_REGISTER_CONCURRENCY ?? 8)));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function coordinates(feature) {
  const geometry = feature.geometry;
  if (geometry?.type === "Polygon") return geometry.coordinates.flat(1);
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return [];
}

function centroid(feature) {
  const points = coordinates(feature);
  if (!points.length) return null;
  const sum = points.reduce((acc, point) => [acc[0] + point[0], acc[1] + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function ringArea(ring) {
  let area = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2) * 111_000 * 88_000;
}

function footprintArea(feature) {
  const geometry = feature.geometry;
  if (geometry?.type === "Polygon") return ringArea(geometry.coordinates[0] ?? []);
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.reduce((sum, polygon) => sum + ringArea(polygon[0] ?? []), 0);
  return 0;
}

function isTarget(feature) {
  const point = centroid(feature);
  if (!point) return false;
  return point[0] >= TARGET.west && point[0] <= TARGET.east && point[1] >= TARGET.south && point[1] <= TARGET.north;
}

function pnuParts(pnu) {
  const value = String(pnu ?? "");
  if (!/^\d{19}$/.test(value)) return null;
  return {
    sigunguCd: value.slice(0, 5),
    bjdongCd: value.slice(5, 10),
    platGbCd: value.slice(10, 11),
    bun: value.slice(11, 15),
    ji: value.slice(15, 19),
  };
}

async function titlesForPnu(pnu, attempt = 0) {
  const parts = pnuParts(pnu);
  if (!parts) return [];
  const url = new URL("https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo");
  let decodedKey = key;
  try { decodedKey = decodeURIComponent(key); } catch { /* already decoded */ }
  url.searchParams.set("serviceKey", decodedKey);
  Object.entries(parts).forEach(([name, value]) => url.searchParams.set(name, value));
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("_type", "json");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const code = String(data.response?.header?.resultCode ?? "");
    if (code && code !== "00") throw new Error(`${code}: ${data.response?.header?.resultMsg ?? "unknown"}`);
    const items = data.response?.body?.items?.item ?? [];
    return Array.isArray(items) ? items : [items];
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(700 * 2 ** attempt);
    return titlesForPnu(pnu, attempt + 1);
  }
}

async function parallelMap(values, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      try { results[index] = await mapper(values[index], index); }
      catch (error) { results[index] = { error: error instanceof Error ? error.message : String(error) }; }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

function titleArea(title) {
  return number(title.archArea) || number(title.totArea) || number(title.platArea);
}

function matchTitles(features, titles) {
  const candidates = titles
    .filter((title) => number(title.grndFlrCnt) > 0)
    .map((title) => ({ title, area: titleArea(title), used: false }));
  const matches = [];
  const ordered = [...features].sort((a, b) => footprintArea(b) - footprintArea(a));
  for (const feature of ordered) {
    const area = footprintArea(feature);
    const available = candidates.filter((candidate) => !candidate.used);
    if (!available.length) break;
    available.sort((a, b) => {
      const scoreA = a.area > 0 && area > 0 ? Math.abs(Math.log(a.area / area)) : 99;
      const scoreB = b.area > 0 && area > 0 ? Math.abs(Math.log(b.area / area)) : 99;
      return scoreA - scoreB;
    });
    const best = available[0];
    const ratio = best.area > 0 && area > 0 ? Math.max(best.area / area, area / best.area) : Infinity;
    if (ratio > 4 && !(features.length === 1 && candidates.length === 1)) continue;
    best.used = true;
    matches.push([feature, best.title]);
  }
  return matches;
}

function applyTitle(feature, title) {
  const floors = number(title.grndFlrCnt);
  const basementFloors = number(title.ugrndFlrCnt);
  const registeredHeight = number(title.heit);
  const buildingName = String(title.bldNm ?? "").trim();
  const dongName = String(title.dongNm ?? "").trim();
  const purpose = String(title.mainPurpsCdNm ?? title.etcPurps ?? "").trim();
  const apartment = /공동주택|아파트/.test(`${purpose} ${buildingName}`);
  feature.properties = {
    ...feature.properties,
    name: [buildingName, dongName].filter(Boolean).join(" ") || feature.properties.name,
    buildingName,
    dongName,
    purpose,
    kind: apartment ? "apartment" : "building",
    floors,
    basementFloors,
    height: registeredHeight || Math.max(3.6, floors * (apartment ? 3.05 : 3.35)),
    registryId: String(title.mgmBldrgstPk ?? feature.properties.registryId ?? ""),
    confidence: registeredHeight ? "building_register_height" : "building_register_floor_height",
    source: "국토교통부 건축HUB 건축물대장 · VWorld WFS",
  };
}

const collection = JSON.parse(await readFile(FILE, "utf8"));
const targets = collection.features.filter((feature) => isTarget(feature) && feature.properties?.pnu && number(feature.properties?.floors) <= 1);
const grouped = Map.groupBy(targets, (feature) => String(feature.properties.pnu));
const pnus = [...grouped.keys()];
console.log(`target footprints=${targets.length}, parcels=${pnus.length}, concurrency=${CONCURRENCY}`);
const responses = await parallelMap(pnus, async (pnu, index) => {
  const titles = await titlesForPnu(pnu);
  if ((index + 1) % 100 === 0) console.log(`fetched ${index + 1}/${pnus.length}`);
  return { pnu, titles };
});

let matched = 0;
let failed = 0;
for (let index = 0; index < pnus.length; index += 1) {
  const result = responses[index];
  if (!result || result.error) { failed += 1; continue; }
  const features = grouped.get(result.pnu) ?? [];
  for (const [feature, title] of matchTitles(features, result.titles)) {
    applyTitle(feature, title);
    matched += 1;
  }
}

collection.metadata = {
  ...collection.metadata,
  registerEnrichedAt: new Date().toISOString(),
  registerTargetParcels: pnus.length,
  registerMatchedBuildings: matched,
  registerFailedParcels: failed,
};
await writeFile(FILE, JSON.stringify(collection));
console.log(JSON.stringify({ targetFootprints: targets.length, parcels: pnus.length, matched, failed }));
if (matched === 0) throw new Error("No building register records matched; static map was not enriched.");
