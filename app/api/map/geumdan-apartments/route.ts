import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Position = [number, number];
type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: Position[][] | Position[][][];
};
type VWorldFeature = {
  id?: string | number;
  geometry?: Geometry | null;
  properties?: Record<string, unknown>;
};

const GEUMDAN_BOUNDS = {
  west: 126.675,
  south: 37.565,
  east: 126.725,
  north: 37.635,
};
const GRID_SIZE = 4;

function textValue(properties: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = properties[key];
    if (value != null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function numberValue(properties: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(properties[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function isValidGeometry(geometry: VWorldFeature["geometry"]): geometry is Geometry {
  return Boolean(geometry && ["Polygon", "MultiPolygon"].includes(geometry.type) && Array.isArray(geometry.coordinates));
}

function gridBounds() {
  const width = (GEUMDAN_BOUNDS.east - GEUMDAN_BOUNDS.west) / GRID_SIZE;
  const height = (GEUMDAN_BOUNDS.north - GEUMDAN_BOUNDS.south) / GRID_SIZE;
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);
    return {
      west: GEUMDAN_BOUNDS.west + width * x,
      east: GEUMDAN_BOUNDS.west + width * (x + 1),
      south: GEUMDAN_BOUNDS.south + height * y,
      north: GEUMDAN_BOUNDS.south + height * (y + 1),
    };
  });
}

async function fetchCell(key: string, bounds: ReturnType<typeof gridBounds>[number]) {
  const url = new URL("https://api.vworld.kr/req/wfs");
  url.searchParams.set("service", "WFS");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("version", "1.1.0");
  url.searchParams.set("typename", "lt_c_bldginfo");
  // VWorld WFS 1.1은 EPSG:4326 bbox를 위도,경도 순서로 받는다.
  url.searchParams.set("bbox", `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`);
  url.searchParams.set("srsname", "EPSG:4326");
  url.searchParams.set("output", "application/json");
  url.searchParams.set("exceptions", "application/json");
  url.searchParams.set("maxfeatures", "1000");
  url.searchParams.set("key", key);
  url.searchParams.set("domain", "geumdan-app.vercel.app");

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) throw new Error(`VWorld WFS ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.features)) {
    const message = data?.response?.status ?? data?.error?.text ?? data?.message ?? "invalid response";
    throw new Error(`VWorld WFS: ${message}`);
  }
  return data.features as VWorldFeature[];
}

function normalizeFeature(feature: VWorldFeature, index: number) {
  if (!isValidGeometry(feature.geometry)) return null;
  const raw = feature.properties ?? {};
  const registryId = textValue(raw, "mgm_bldrgst_pk", "mgmBldrgstPk", "regstr_pk", "ufid");
  const id = registryId || textValue(raw, "ufid", "fid") || String(feature.id ?? `building-${index}`);
  const buildingName = textValue(raw, "bld_nm", "bldNm", "building_name");
  const dongName = textValue(raw, "dong_nm", "dongNm");
  const purpose = textValue(raw, "main_purps_cd_nm", "mainPurpsCdNm", "main_purpose", "use_nm", "use");
  const floors = Math.round(numberValue(raw, "grnd_flr", "grndFlrCnt", "ground_floor_count", "ground_floors"));
  const registeredHeight = numberValue(raw, "height", "bld_height", "bldHeight");
  const height = registeredHeight || Math.max(3.6, floors * 3.15);
  const name = [buildingName, dongName].filter(Boolean).join(" ") || dongName || "건축물";
  const apartment = /아파트|공동주택/.test(`${buildingName} ${purpose}`);

  return {
    type: "Feature" as const,
    id,
    properties: {
      id,
      name,
      buildingName,
      dongName,
      purpose,
      kind: apartment ? "apartment" : "building",
      floors,
      height,
      registryId,
      confidence: registeredHeight ? "official_geometry_height" : "official_geometry_floor_height",
      source: "국토교통부 GIS건물통합정보 · VWorld WFS",
    },
    geometry: feature.geometry,
  };
}

export async function GET() {
  const key = process.env.VWORLD_API_KEY;
  if (!key) {
    return NextResponse.json({
      type: "FeatureCollection",
      metadata: { degraded: true, reason: "VWORLD_API_KEY missing" },
      features: [],
    }, { status: 503 });
  }

  try {
    const cells = await Promise.all(gridBounds().map((bounds) => fetchCell(key, bounds)));
    const unique = new Map<string, ReturnType<typeof normalizeFeature>>();
    cells.flat().forEach((feature, index) => {
      const normalized = normalizeFeature(feature, index);
      if (normalized) unique.set(String(normalized.id), normalized);
    });
    const features = [...unique.values()].filter(Boolean);
    const apartments = features.filter((feature) => feature?.properties.kind === "apartment").length;

    return NextResponse.json({
      type: "FeatureCollection",
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "VWorld lt_c_bldginfo",
        officialGeometry: true,
        buildingCount: features.length,
        apartmentBuildingCount: apartments,
      },
      features,
    }, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch (error) {
    return NextResponse.json({
      type: "FeatureCollection",
      metadata: {
        degraded: true,
        reason: error instanceof Error ? error.message : "VWorld WFS request failed",
      },
      features: [],
    }, { status: 502 });
  }
}
