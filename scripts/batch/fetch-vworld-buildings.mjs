import { mkdir, writeFile } from "node:fs/promises";

const key = process.env.VWORLD_API_KEY;
if (!key) throw new Error("VWORLD_API_KEY is required");

const ROOT = { west: 126.675, south: 37.565, east: 126.725, north: 37.635 };
const OUTPUT = new URL("../../public/data/geumdan-vworld-buildings.geojson", import.meta.url);
const MAX_FEATURES = 1000;
const MIN_SPAN = 0.00045;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(bounds, attempt = 0) {
  const url = new URL("https://api.vworld.kr/req/wfs");
  const params = {
    service: "WFS",
    request: "GetFeature",
    version: "1.1.0",
    typename: "lt_c_bldginfo",
    bbox: `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`,
    srsname: "EPSG:4326",
    output: "application/json",
    exceptions: "application/json",
    maxfeatures: String(MAX_FEATURES),
    domain: "geumdan-app.vercel.app",
    key,
  };
  Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(45_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (!text.trimStart().startsWith("{")) throw new Error(text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    const data = JSON.parse(text);
    if (!Array.isArray(data.features)) throw new Error("features missing");
    return data;
  } catch (error) {
    if (attempt >= 3) throw error;
    await sleep(800 * (2 ** attempt));
    return request(bounds, attempt + 1);
  }
}

function split(bounds) {
  const midX = (bounds.west + bounds.east) / 2;
  const midY = (bounds.south + bounds.north) / 2;
  return [
    { west: bounds.west, south: bounds.south, east: midX, north: midY },
    { west: midX, south: bounds.south, east: bounds.east, north: midY },
    { west: bounds.west, south: midY, east: midX, north: bounds.north },
    { west: midX, south: midY, east: bounds.east, north: bounds.north },
  ];
}

async function collect(bounds, depth = 0) {
  const data = await request(bounds);
  const matched = Number(data.numberMatched ?? data.totalFeatures ?? data.features.length);
  const saturated = matched >= MAX_FEATURES || data.features.length >= MAX_FEATURES;
  const canSplit = (bounds.east - bounds.west) > MIN_SPAN && (bounds.north - bounds.south) > MIN_SPAN;
  if (saturated && canSplit) {
    const chunks = [];
    for (const child of split(bounds)) {
      chunks.push(...await collect(child, depth + 1));
      await sleep(120);
    }
    return chunks;
  }
  console.log(`depth=${depth} matched=${matched} returned=${data.features.length}`);
  return data.features;
}

const raw = await collect(ROOT);
const unique = new Map();
raw.forEach((feature, index) => {
  if (!feature?.geometry || !["Polygon", "MultiPolygon"].includes(feature.geometry.type)) return;
  const properties = feature.properties ?? {};
  const id = String(properties.ufid || properties.geoidn || feature.id || `vworld-${index}`);
  const floors = Number(properties.grnd_flr) || 0;
  const registeredHeight = Number(properties.height) || 0;
  const name = [properties.bld_nm, properties.dong_nm].filter(Boolean).join(" ") || "건축물";
  const apartment = /아파트|공동주택/.test(`${properties.bld_nm ?? ""} ${properties.usability ?? ""}`);
  unique.set(id, {
    type: "Feature",
    id,
    properties: {
      id,
      name,
      buildingName: properties.bld_nm || "",
      dongName: properties.dong_nm || "",
      purpose: properties.usability || "",
      kind: apartment ? "apartment" : "building",
      floors,
      height: registeredHeight || Math.max(3.6, floors * 3.15),
      registryId: properties.bldrgst_pk || "",
      pnu: properties.pnu || "",
      confidence: registeredHeight ? "official_geometry_height" : "official_geometry_floor_height",
      source: "국토교통부 GIS건물통합정보 · VWorld WFS",
    },
    geometry: feature.geometry,
  });
});

const result = {
  type: "FeatureCollection",
  metadata: {
    generatedAt: new Date().toISOString(),
    source: "VWorld lt_c_bldginfo",
    officialGeometry: true,
    buildingCount: unique.size,
  },
  features: [...unique.values()],
};
await mkdir(new URL("../../public/data/", import.meta.url), { recursive: true });
await writeFile(OUTPUT, JSON.stringify(result));
console.log(`saved ${unique.size} official buildings`);
