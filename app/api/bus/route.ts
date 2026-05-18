import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const BUS_BASE  = "https://apis.data.go.kr/6280000";
const TAGO_BASE = "https://apis.data.go.kr/1613000";

// nearby-stops 류는 좌표가 100m 이상 변하지 않으면 사실상 정적이라 5분 TTL.
// 노선/정류장 메타도 5분. arrivals 만 30s 라이브 캐시.
const STATIC_ACTIONS = new Set([
  "routeInfo", "routeStations",
  "tagoRouteStations", "tagoRouteDetail", "tagoRoutes",
  "tagoStations", "tagoStationsByName", "aroundStations",
  "stationByName", "routeList",
]);
const STATIC_TTL_MS  = 5 * 60 * 1000;
const DEFAULT_TTL_MS = 30 * 1000;

type CacheEntry = { ts: number; body: string; contentType: string };
const cache = new Map<string, CacheEntry>();

const ACTIONS: Record<string, { base: string; path: string; required: string[] }> = {
  // 인천 전용 API
  arrivals:          { base: BUS_BASE,  path: "/busArrivalService/getBusArrivalList",                         required: ["stationId"] },
  locations:         { base: BUS_BASE,  path: "/busLocationInfoService/getBusLocationList",                    required: ["routeId"] },
  routeInfo:         { base: BUS_BASE,  path: "/routeInfoService/getRouteInfo",                                required: ["routeId"] },
  routeStations:     { base: BUS_BASE,  path: "/routeInfoService/getStaionByRoute",                            required: ["routeId"] },
  aroundStations:    { base: BUS_BASE,  path: "/busStationAroundInfoService/getBusStationAroundList",          required: ["GPS_LATI", "GPS_LONG"] },
  stationByName:     { base: BUS_BASE,  path: "/stationService/getStationByName",                              required: ["stationName"] },
  routeList:         { base: BUS_BASE,  path: "/busRouteService/getBusRouteList",                              required: ["routeNo"] },
  // 국가대중교통 TAGO API (전국 공통 - cityCode=23 인천)
  tagoStations:      { base: TAGO_BASE, path: "/BusSttnInfoInqireService/getCrdntPrxmtSttnList",               required: ["gpsLati", "gpsLong"] },
  tagoStationsByName:{ base: TAGO_BASE, path: "/BusSttnInfoInqireService/getSttnNoList",                       required: ["cityCode", "nodeNm"] },
  tagoArrivals:      { base: TAGO_BASE, path: "/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList",       required: ["cityCode", "nodeId"] },
  tagoRoutes:        { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteNoList",                     required: ["cityCode", "routeNo"] },
  tagoRouteDetail:   { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteInfoIem",                    required: ["cityCode", "routeId"] },
  tagoRouteStations: { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteAcctoThrghSttnList",         required: ["cityCode", "routeId"] },
  tagoBusLocation:   { base: TAGO_BASE, path: "/BusLcInfoInqireService/getRouteAcctoBusLcList",                required: ["cityCode", "routeId"] },
};

export async function GET(request: NextRequest) {
  const key = process.env.DATA_GO_KR_API_KEY
    ?? process.env.NEXT_PUBLIC_BUS_API_KEY
    ?? process.env.NEXT_PUBLIC_MOLIT_API_KEY;
  if (!key) {
    return Response.json({ error: "api_key_not_configured" }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action") ?? "";
  const meta = ACTIONS[action];
  if (!meta) {
    return Response.json({ error: "invalid_action", allowed: Object.keys(ACTIONS) }, { status: 400 });
  }

  for (const k of meta.required) {
    if (!sp.get(k)) return Response.json({ error: `missing_${k}` }, { status: 400 });
  }

  // serviceKey는 URLSearchParams에 넣으면 이중 인코딩됨 (data.go.kr 403 원인)
  // 나머지 파라미터만 URLSearchParams로 처리하고, serviceKey는 raw로 직접 붙임
  const params = new URLSearchParams();
  sp.forEach((v, k) => { if (k !== "action") params.set(k, v); });
  if (!params.has("pageNo"))    params.set("pageNo", "1");
  if (!params.has("numOfRows")) params.set("numOfRows", "20");
  // TAGO requires _type=xml or json explicitly on some endpoints
  if (meta.base === TAGO_BASE && !params.has("_type")) params.set("_type", "xml");

  const upstream = `${meta.base}${meta.path}?serviceKey=${encodeURIComponent(key)}&${params.toString()}`;

  const cacheKeyParams = new URLSearchParams(params);
  cacheKeyParams.delete("serviceKey");
  const cacheKey = `${meta.base}${meta.path}?${cacheKeyParams.toString()}`;
  const ttl = STATIC_ACTIONS.has(action) ? STATIC_TTL_MS : DEFAULT_TTL_MS;

  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < ttl) {
    return new Response(hit.body, {
      status: 200,
      headers: { "Content-Type": hit.contentType, "Cache-Control": "no-store", "X-Bus-Cache": "HIT" },
    });
  }

  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/xml";
    if (res.ok) {
      // Surface non-zero resultCode as an upstream message (still 200 so existing
      // clients keep working, but we add a header for diagnostics).
      const code = text.match(/<resultCode>(\d+)<\/resultCode>/)?.[1] ?? "";
      const msg  = text.match(/<resultMsg>([^<]+)<\/resultMsg>/)?.[1] ?? "";
      const headers: Record<string, string> = {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      };
      if (code) headers["X-Upstream-Code"] = code;
      if (msg)  headers["X-Upstream-Msg"]  = encodeURIComponent(msg);
      if (code === "0" || code === "00") {
        cache.set(cacheKey, { ts: Date.now(), body: text, contentType });
      } else if (code) {
        // Don't cache error responses — log to server console for debugging
        console.warn(`[api/bus] ${action} upstream resultCode=${code} msg=${msg}`);
      }
      return new Response(text, { status: 200, headers });
    }
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": contentType, "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.warn(`[api/bus] ${action} fetch failed:`, err);
    return Response.json({ error: "upstream_failed", message: String(err) }, { status: 502 });
  }
}
