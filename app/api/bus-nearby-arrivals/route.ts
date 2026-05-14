import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const TAGO_BASE = "https://apis.data.go.kr/1613000";
const NEARBY_RADIUS_M = 500;
const NEARBY_MAX = 4;
const CACHE_TTL_MS = 30 * 1000;

type CacheEntry = { ts: number; body: string };
const cache = new Map<string, CacheEntry>();

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

function parseXmlItems(xml: string): Record<string, string>[] {
  const items: Record<string, string>[] = [];
  const re = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) {
    const obj: Record<string, string> = {};
    const fr = /<([^\/>\s]+)>([^<]*)<\/\1>/gi;
    let f;
    while ((f = fr.exec(m[1])) !== null) obj[f[1]] = f[2].trim();
    items.push(obj);
  }
  return items;
}

async function tagoGet(
  key: string,
  path: string,
  params: Record<string, string>,
): Promise<Record<string, string>[]> {
  const p = new URLSearchParams(params);
  if (!p.has("pageNo")) p.set("pageNo", "1");
  if (!p.has("numOfRows")) p.set("numOfRows", "20");
  p.set("_type", "xml");
  const url = `${TAGO_BASE}${path}?serviceKey=${encodeURIComponent(key)}&${p.toString()}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const code = xml.match(/<resultCode>(\d+)<\/resultCode>/)?.[1];
    if (code !== "0" && code !== "00") return [];
    return parseXmlItems(xml);
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const key =
    process.env.DATA_GO_KR_API_KEY ??
    process.env.NEXT_PUBLIC_BUS_API_KEY ??
    process.env.NEXT_PUBLIC_MOLIT_API_KEY;
  if (!key) return Response.json({ error: "api_key_not_configured" }, { status: 500 });

  const sp = request.nextUrl.searchParams;
  const lat = parseFloat(sp.get("lat") ?? "");
  const lng = parseFloat(sp.get("lng") ?? "");
  if (isNaN(lat) || isNaN(lng))
    return Response.json({ error: "missing_coords" }, { status: 400 });

  // ~111m grid cache key — good hit rate for검단 users
  const cacheKey = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
    return new Response(hit.body, {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const t0 = Date.now();

  // Step 1: nearby stops
  const stopItems = await tagoGet(
    key,
    "/BusSttnInfoInqireService/getCrdntPrxmtSttnList",
    { gpsLati: String(lat), gpsLong: String(lng), numOfRows: "10" },
  );

  const allStops = stopItems
    .map(d => ({
      stationId: d.nodeid ?? d.nodeId ?? "",
      stationName: d.nodenm ?? d.nodeNm ?? "",
      lat: Number(d.gpslati ?? d.gpsLati ?? 0),
      lng: Number(d.gpslong ?? d.gpsLong ?? 0),
    }))
    .filter(s => s.stationId && s.stationName)
    .map(s => ({ ...s, distanceM: Math.round(haversineM(lat, lng, s.lat, s.lng)) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  const within = allStops.filter(s => s.distanceM <= NEARBY_RADIUS_M).slice(0, NEARBY_MAX);
  const stops = within.length > 0 ? within : allStops.slice(0, 1);

  if (stops.length === 0) {
    const body = JSON.stringify({ stops: [] });
    return new Response(body, { headers: { "Content-Type": "application/json", "X-Cache": "MISS" } });
  }

  // Step 2: arrivals for all stops in parallel
  const stopsWithArrivals = await Promise.all(
    stops.map(async stop => {
      const items = await tagoGet(
        key,
        "/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList",
        { cityCode: "23", nodeId: stop.stationId, numOfRows: "15" },
      );
      const arrivals = items.map(d => {
        const routeTp = d.routetp ?? d.routeTp ?? "";
        const vehicleTp = d.vehicletp ?? d.vehicleTp ?? "";
        return {
          routeNo: d.routeno ?? d.routeNo ?? "",
          routeId: d.routeid ?? d.routeId ?? "",
          destination: "종점",
          arrivalMin: Math.max(0, Math.round(Number(d.arrtime ?? d.arrTime ?? "0") / 60)),
          remainingStops: Number(d.arrprevstationcnt ?? d.arrPrevStationCnt ?? "0"),
          isLowFloor: vehicleTp.includes("저상"),
          isExpress: routeTp.includes("급행") || routeTp.includes("직행"),
          plateNo: "",
          isScheduled: false,
        };
      });
      return { ...stop, arrivals };
    }),
  );

  console.log(
    `[bus-nearby-arrivals] ${lat.toFixed(3)},${lng.toFixed(3)} stops=${stops.length} ${Date.now() - t0}ms`,
  );

  const body = JSON.stringify({ stops: stopsWithArrivals });
  cache.set(cacheKey, { ts: Date.now(), body });
  return new Response(body, {
    headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
  });
}
