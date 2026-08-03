#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const input = resolve(process.argv[2] ?? "/tmp/geumdan-core-buildings.geojson");
const commerceInput = resolve(process.argv[3] ?? "/tmp/geumdan-commerce-buildings.json");
const output = resolve(process.argv[4] ?? "public/data/geumdan-buildings.geojson");
const syncDatabase = process.argv.includes("--sync");

const [raw, commerceRaw] = await Promise.all([
  readFile(input, "utf8").then(JSON.parse),
  readFile(commerceInput, "utf8").then(JSON.parse).catch(() => []),
]);

function rings(geometry) {
  if (geometry?.type === "Polygon") return geometry.coordinates;
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}

function bounds(geometry) {
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const ring of rings(geometry)) for (const [x, y] of ring) {
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function contains(geometry, point) {
  if (geometry?.type === "Polygon") return pointInRing(point, geometry.coordinates[0]);
  if (geometry?.type === "MultiPolygon") return geometry.coordinates.some(polygon => pointInRing(point, polygon[0]));
  return false;
}

function distanceMeters(a, b) {
  const x = (a[0] - b[0]) * 88000;
  const y = (a[1] - b[1]) * 111000;
  return Math.hypot(x, y);
}

function compactCoordinates(value) {
  if (typeof value === "number") return Math.round(value * 1_000_000) / 1_000_000;
  return Array.isArray(value) ? value.map(compactCoordinates) : value;
}

const candidates = raw.features
  .filter(feature => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
  .map(feature => ({ feature, box: bounds(feature.geometry) }));

const commerceByFeature = new Map();
for (const row of commerceRaw) {
  const lat = Number(row.lat); const lng = Number(row.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  const point = [lng, lat];
  const nearby = candidates.filter(({ box }) => lng >= box.minX - 0.0007 && lng <= box.maxX + 0.0007 && lat >= box.minY - 0.0007 && lat <= box.maxY + 0.0007);
  const matched = nearby.find(({ feature }) => contains(feature.geometry, point))
    ?? nearby.sort((a, b) => distanceMeters(point, [a.box.cx, a.box.cy]) - distanceMeters(point, [b.box.cx, b.box.cy]))[0];
  if (matched && distanceMeters(point, [matched.box.cx, matched.box.cy]) <= 90) commerceByFeature.set(matched.feature.id, row);
}

const features = candidates.map(({ feature }) => {
  const sourceProps = feature.properties ?? {};
  const commerce = commerceByFeature.get(feature.id);
  const sourceFloors = Number(sourceProps.num_floors);
  const commerceFloors = Number(commerce?.ground_floors ?? commerce?.floors);
  const hasSourceFloors = Number.isFinite(sourceFloors) && sourceFloors > 0;
  const hasCommerceFloors = Number.isFinite(commerceFloors) && commerceFloors > 0;
  const isApartment = sourceProps.class === "apartments";
  const isCommerce = Boolean(commerce) || sourceProps.subtype === "commercial";
  const floors = hasCommerceFloors ? commerceFloors : hasSourceFloors ? sourceFloors : null;
  const sourceHeight = Number(sourceProps.height);
  const height = hasCommerceFloors
    ? Math.max(4.2, commerceFloors * 3.45)
    : Number.isFinite(sourceHeight) && sourceHeight > 0
      ? sourceHeight
      : hasSourceFloors
        ? sourceFloors * 3.2
        : isApartment
          ? 48
          : isCommerce
            ? 16
            : 7.5;
  const dataset = sourceProps.sources?.[0]?.dataset ?? "Overture Maps";
  const confidence = hasCommerceFloors && commerce?.floor_verification !== "legacy_unverified"
    ? "official"
    : (Number.isFinite(sourceHeight) || hasSourceFloors) ? "source" : "estimated";

  return {
    type: "Feature",
    id: feature.id,
    properties: {
      id: feature.id,
      name: commerce?.name ?? sourceProps.names?.primary ?? null,
      kind: isCommerce ? "commerce" : isApartment ? "apartment" : "building",
      height: Math.round(height * 10) / 10,
      floors,
      confidence,
      commerceId: commerce?.id ?? null,
      source: dataset,
      updatedAt: sourceProps.sources?.[0]?.update_time ?? null,
    },
    geometry: { ...feature.geometry, coordinates: compactCoordinates(feature.geometry.coordinates) },
  };
});

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify({
  type: "FeatureCollection",
  metadata: {
    source: "Overture Maps buildings with Geumdan commerce overlay",
    generatedAt: new Date().toISOString(),
    bbox: [126.675, 37.565, 126.755, 37.635],
    featureCount: features.length,
  },
  features,
}));

if (syncDatabase) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required with --sync");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const datasetVersion = process.env.MAP_DATASET_VERSION ?? new Date().toISOString().slice(0, 10);
  const rows = features.map(feature => ({
    id: feature.properties.id,
    name: feature.properties.name,
    kind: feature.properties.kind,
    height_m: feature.properties.height,
    floors: feature.properties.floors,
    confidence: feature.properties.confidence,
    commerce_id: feature.properties.commerceId,
    geometry: feature.geometry,
    source_name: feature.properties.source,
    source_updated_at: feature.properties.updatedAt,
    dataset_version: datasetVersion,
    imported_at: new Date().toISOString(),
  }));
  for (let index = 0; index < rows.length; index += 200) {
    const { error } = await db.from("map_building_features").upsert(rows.slice(index, index + 200), { onConflict: "id" });
    if (error) throw error;
  }
  const { error: runError } = await db.from("map_building_dataset_runs").insert({
    dataset_version: datasetVersion,
    source_name: "Overture Maps + Geumdan building inventory",
    feature_count: features.length,
    apartment_count: features.filter(feature => feature.properties.kind === "apartment").length,
    commerce_count: features.filter(feature => feature.properties.kind === "commerce").length,
    measured_height_count: features.filter(feature => feature.properties.confidence !== "estimated").length,
    status: "ready",
    detail: { bbox: [126.675, 37.565, 126.755, 37.635] },
  });
  if (runError) throw runError;
}

const counts = Object.groupBy(features, feature => feature.properties.kind);
console.log(JSON.stringify({
  output,
  bytes: (await readFile(output)).byteLength,
  total: features.length,
  apartments: counts.apartment?.length ?? 0,
  commerce: counts.commerce?.length ?? 0,
  matchedCommerce: features.filter(feature => feature.properties.commerceId).length,
  measuredHeight: features.filter(feature => feature.properties.confidence !== "estimated").length,
}, null, 2));
