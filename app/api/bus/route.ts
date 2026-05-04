import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUS_BASE  = "https://apis.data.go.kr/6280000";
const TAGO_BASE = "https://apis.data.go.kr/1613000";

const ACTIONS: Record<string, { base: string; path: string; required: string[] }> = {
  // 인천 전용 API
  arrivals:          { base: BUS_BASE,  path: "/busArrivalService/getBusArrivalList",                         required: ["stationId"] },
  locations:         { base: BUS_BASE,  path: "/busLocationInfoService/getBusLocationList",                    required: ["routeId"] },
  routeInfo:         { base: BUS_BASE,  path: "/routeInfoService/getRouteInfo",                                required: ["routeId"] },
  routeStations:     { base: BUS_BASE,  path: "/routeInfoService/getStaionByRoute",                            required: ["routeId"] },
  aroundStations:    { base: BUS_BASE,  path: "/busStationAroundInfoService/getBusStationAroundList",          required: ["GPS_LATI", "GPS_LONG"] },
  // 국가대중교통 TAGO API (전국 공통 - cityCode=30 인천)
  tagoStations:      { base: TAGO_BASE, path: "/BusSttnInfoInqireService/getCrdntPrxmtSttnList",               required: ["gpsLati", "gpsLong"] },
  tagoArrivals:      { base: TAGO_BASE, path: "/BusArrivalService/getArrivalInfoList",                         required: ["cityCode", "nodeId"] },
  tagoRoutes:        { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteInfoList",                   required: ["cityCode", "routeNo"] },
  tagoRouteDetail:   { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteInfoIem",                    required: ["cityCode", "routeId"] },
  tagoRouteStations: { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteSttnList",                   required: ["cityCode", "routeId"] },
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

  const upstream = `${meta.base}${meta.path}?serviceKey=${encodeURIComponent(key)}&${params.toString()}`;

  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/xml",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json({ error: "upstream_failed", message: String(err) }, { status: 502 });
  }
}
