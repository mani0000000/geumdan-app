import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache: keyed by "lat_lng" rounded to 3 decimal places (~111m grid)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const OVERPASS = "https://overpass-api.de/api/interpreter";

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

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng)) {
    return Response.json({ error: "missing_lat_lng" }, { status: 400 });
  }

  // Round to ~3 decimal places for cache key (~111m grid)
  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return Response.json(cached.data, {
      headers: { "Cache-Control": "public, max-age=3600", "X-Cache": "HIT" },
    });
  }

  const query = `[out:json][timeout:25];
(
  node["highway"="bus_stop"](around:1000,${lat},${lng});
)->.stops;
rel["type"="route"]["route"="bus"](bn.stops);
(.stops;._);
out body;`;

  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      body: query,
      signal: AbortSignal.timeout(28000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

    const data: { elements: OSMElement[] } = await res.json();

    const stopNodes = data.elements.filter(
      e => e.type === "node" && e.tags?.highway === "bus_stop" && e.tags.name
    );
    const routeRels = data.elements.filter(e => e.type === "relation");

    const stopRoutes = new Map<number, Array<{ routeNo: string; destination: string }>>();
    for (const rel of routeRels) {
      const routeNo = rel.tags?.ref ?? "";
      if (!routeNo) continue;
      const nameTag = rel.tags?.name ?? "";
      const destination =
        nameTag.includes("\u2192") ? nameTag.split("\u2192").pop()!.trim() :
        nameTag.includes("->") ? nameTag.split("->").pop()!.trim() :
        rel.tags?.to ?? "";
      for (const m of (rel.members ?? [])) {
        if (m.type !== "node") continue;
        const list = stopRoutes.get(m.ref) ?? [];
        if (!list.some(r => r.routeNo === routeNo)) list.push({ routeNo, destination });
        stopRoutes.set(m.ref, list);
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
  } catch (err) {
    return Response.json(
      { error: "overpass_failed", message: String(err) },
      { status: 502 }
    );
  }
}
