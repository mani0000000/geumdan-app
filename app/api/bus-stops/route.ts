import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

// In-memory cache: keyed by "lat_lng" rounded to 3 decimal places (~111m grid)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Overpass mirrors — try in order until one responds. The official endpoint
// is heavily rate-limited; falling through to mirrors keeps the chain alive.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.osm.ch/api/interpreter",
];

interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchOverpass(query: string, timeoutMs: number): Promise<{ elements: OSMElement[] } | null> {
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: query,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      return (await res.json()) as { elements: OSMElement[] };
    } catch {
      // try next mirror
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: "missing_lat_lng" }, { status: 400 });
  }

  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600", "X-Cache": "HIT" },
    });
  }

  // Stage 1: lightweight stops-only query (fast, ~2-4s typical).
  // Returns nearby bus stop nodes without route relations — guarantees we
  // can show stops even if Overpass is slow on the heavier query.
  const stopsOnlyQuery = `[out:json][timeout:8];
node["highway"="bus_stop"](around:1000,${lat},${lng});
out body;`;

  const stopsOnly = await fetchOverpass(stopsOnlyQuery, 9000);
  if (!stopsOnly) {
    return Response.json(
      { error: "overpass_failed", message: "all overpass mirrors timed out" },
      { status: 502 },
    );
  }

  const stopNodes = stopsOnly.elements.filter(
    e => e.type === "node" && e.tags?.highway === "bus_stop" && e.tags.name
  );

  if (stopNodes.length === 0) {
    const empty = { stops: [], source: "osm" as const };
    cache.set(cacheKey, { data: empty, ts: Date.now() });
    return Response.json(empty, {
      headers: { "Cache-Control": "public, max-age=3600", "X-Cache": "MISS" },
    });
  }

  // Stage 2: fetch route relations for these stops in a separate, smaller query.
  // We bound to bbox around our stops which is much faster than the original
  // (.stops;._); pattern. If it times out, we still return stops without routes.
  const stopRoutes = new Map<number, Array<{ routeNo: string; destination: string }>>();
  const routesQuery = `[out:json][timeout:10];
node["highway"="bus_stop"](around:1000,${lat},${lng})->.stops;
rel["type"="route"]["route"="bus"](bn.stops);
out body;`;

  const routesData = await fetchOverpass(routesQuery, 11000);
  if (routesData) {
    const routeRels = routesData.elements.filter(e => e.type === "relation");
    for (const rel of routeRels) {
      const routeNo = rel.tags?.ref ?? "";
      if (!routeNo) continue;
      const nameTag = rel.tags?.name ?? "";
      const destination =
        nameTag.includes("→") ? nameTag.split("→").pop()!.trim() :
        nameTag.includes("->") ? nameTag.split("->").pop()!.trim() :
        rel.tags?.to ?? "";
      for (const m of (rel.members ?? [])) {
        if (m.type !== "node") continue;
        const list = stopRoutes.get(m.ref) ?? [];
        if (!list.some(r => r.routeNo === routeNo)) list.push({ routeNo, destination });
        stopRoutes.set(m.ref, list);
      }
    }
  }

  const stops = stopNodes
    .map(s => {
      const dist = haversineM(lat, lng, s.lat!, s.lon!);
      const routes = stopRoutes.get(s.id) ?? [];
      return {
        stationId: s.tags!.ref ?? String(s.id),
        osmNodeId: s.id,
        stationName: s.tags!.name!,
        lat: s.lat!,
        lng: s.lon!,
        distanceM: Math.round(dist),
        osmRoutes: routes.sort((a, b) => a.routeNo.localeCompare(b.routeNo, "ko")),
      };
    })
    .filter(s => s.distanceM <= 1200)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, 20);

  const result = { stops, source: "osm" as const };
  cache.set(cacheKey, { data: result, ts: Date.now() });

  return Response.json(result, {
    headers: { "Cache-Control": "public, max-age=3600", "X-Cache": "MISS" },
  });
}
