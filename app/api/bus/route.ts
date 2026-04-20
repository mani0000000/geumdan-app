import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUS_BASE = "https://apis.data.go.kr/6280000";

const ACTIONS: Record<string, { path: string; required: string[] }> = {
  arrivals:       { path: "/busArrivalService/getBusArrivalList",            required: ["stationId"] },
  locations:      { path: "/busLocationInfoService/getBusLocationList",       required: ["routeId"] },
  routeInfo:      { path: "/routeInfoService/getRouteInfo",                   required: ["routeId"] },
  routeStations:  { path: "/routeInfoService/getStaionByRoute",               required: ["routeId"] },
  aroundStations: { path: "/busStationAroundInfoService/getBusStationAroundList", required: ["GPS_LATI", "GPS_LONG"] },
};

export async function GET(request: NextRequest) {
  const key = process.env.DATA_GO_KR_API_KEY;
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

  const params = new URLSearchParams({ serviceKey: key });
  sp.forEach((v, k) => { if (k !== "action") params.set(k, v); });
  if (!params.has("pageNo")) params.set("pageNo", "1");
  if (!params.has("numOfRows")) params.set("numOfRows", "20");

  const upstream = `${BUS_BASE}${meta.path}?${params.toString()}`;

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
