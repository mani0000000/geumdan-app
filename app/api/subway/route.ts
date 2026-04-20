import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const type = sp.get("type") ?? "";

  if (type === "ic1") {
    const key = process.env.DATA_GO_KR_API_KEY
      ?? process.env.NEXT_PUBLIC_BUS_API_KEY
      ?? process.env.NEXT_PUBLIC_MOLIT_API_KEY;
    if (!key) return Response.json({ error: "api_key_not_configured" }, { status: 500 });
    const stationId = sp.get("stationId");
    if (!stationId) return Response.json({ error: "missing_stationId" }, { status: 400 });

    const url =
      `https://apis.data.go.kr/6280000/IcSubwayInfoService/getIcSubwayArvlList` +
      `?serviceKey=${encodeURIComponent(key)}&_type=json&stationId=${encodeURIComponent(stationId)}` +
      `&pageNo=1&numOfRows=10`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      return Response.json({ error: "upstream_failed", message: String(err) }, { status: 502 });
    }
  }

  if (type === "seoul") {
    const key = process.env.SEOUL_SUBWAY_KEY
      ?? process.env.NEXT_PUBLIC_SEOUL_SUBWAY_KEY
      ?? "617a4341466d616e3133314941656442";
    if (!key) return Response.json({ error: "seoul_key_not_configured" }, { status: 500 });
    const stationName = sp.get("stationName");
    if (!stationName) return Response.json({ error: "missing_stationName" }, { status: 400 });

    const url =
      `http://swopenapi.seoul.go.kr/api/subway/${encodeURIComponent(key)}` +
      `/json/realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      return Response.json({ error: "upstream_failed", message: String(err) }, { status: 502 });
    }
  }

  return Response.json({ error: "invalid_type", allowed: ["ic1", "seoul"] }, { status: 400 });
}
