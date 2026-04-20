// 인천광역시 버스 API 서버사이드 프록시
// CORS 우회 + XML → JSON 변환
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const BUS_API_KEY = Deno.env.get("BUS_API_KEY") ?? "";
const BASE = "https://apis.data.go.kr/6280000";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function xmlItems(xml: string): Record<string, string>[] {
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

function resultCode(xml: string) {
  return xml.match(/<resultCode>(\d+)<\/resultCode>/)?.[1] ?? "0";
}

async function callApi(path: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ serviceKey: BUS_API_KEY, ...params }).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Accept: "application/xml, text/xml, */*" },
  });
  const xml = await res.text();
  return { xml, code: resultCode(xml), items: xmlItems(xml) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (!BUS_API_KEY) {
    return new Response(JSON.stringify({ error: "BUS_API_KEY not set" }), { status: 500, headers: CORS });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "arrivals") {
      const stationId = url.searchParams.get("stationId") ?? "";
      const { items, code } = await callApi("/busArrivalService/getBusArrivalList", {
        stationId, pageNo: "1", numOfRows: "30",
      });
      return new Response(JSON.stringify({ items, code }), { headers: CORS });
    }

    if (action === "nearby") {
      const lat = url.searchParams.get("lat") ?? "";
      const lng = url.searchParams.get("lng") ?? "";
      const radius = url.searchParams.get("radius") ?? "5";
      const { items, code } = await callApi("/busStopInfoService/getBusStopAroundList", {
        currentlatitude: lat, currentlongitude: lng,
        distancetype: radius, pageNo: "1", numOfRows: "30",
      });
      return new Response(JSON.stringify({ items, code }), { headers: CORS });
    }

    if (action === "route-detail") {
      const routeId = url.searchParams.get("routeId") ?? "";
      const { items, code } = await callApi("/routeInfoService/getRouteInfo", { routeId });
      return new Response(JSON.stringify({ items, code }), { headers: CORS });
    }

    if (action === "route-stations") {
      const routeId = url.searchParams.get("routeId") ?? "";
      const { items, code } = await callApi("/routeInfoService/getStaionByRoute", { routeId });
      return new Response(JSON.stringify({ items, code }), { headers: CORS });
    }

    if (action === "bus-locations") {
      const routeId = url.searchParams.get("routeId") ?? "";
      const { items, code } = await callApi("/busLocationInfoService/getBusLocationList", { routeId });
      return new Response(JSON.stringify({ items, code }), { headers: CORS });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), { status: 400, headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS });
  }
});
