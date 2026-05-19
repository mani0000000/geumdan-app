import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TAGO_SUBWAY_BASE = "https://apis.data.go.kr/1613000/SubwayInfoService";
const IC_SUBWAY_BASE   = "https://apis.data.go.kr/6280000/IcSubwayInfoService";

const ACTIONS: Record<string, { url: string; required: string[] }> = {
  // 인천교통공사 — 인천1·2호선 실시간 도착정보 (동일 엔드포인트로 양 노선 모두 제공)
  ic1:          { url: `${IC_SUBWAY_BASE}/getIcSubwayArvlList`,                       required: ["stationId"] },
  // TAGO 국토교통부 지하철정보 — 키워드 기반 역 검색 (subwayStationId 발견용)
  tagoSearch:   { url: `${TAGO_SUBWAY_BASE}/getKwrdFndSubwaySttnList`,                required: ["subwayStationName"] },
  // TAGO — 역별 시간표 조회 (정확한 첫차/막차/배차)
  tagoSchedule: { url: `${TAGO_SUBWAY_BASE}/getSubwaySttnAcctoSchdulList`,            required: ["subwayStationId", "dailyTypeCode", "upDownTypeCode"] },
  // TAGO — 역별 실시간 도착정보 (제공 시)
  tagoArvl:     { url: `${TAGO_SUBWAY_BASE}/getSubwaySttnAcctoArvlMvmnInfoList`,      required: ["subwayStationId"] },
};

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const action = sp.get("type") ?? sp.get("action") ?? "";
  const meta = ACTIONS[action];
  if (!meta) {
    return Response.json({ error: "invalid_type", allowed: Object.keys(ACTIONS) }, { status: 400 });
  }

  const key = process.env.DATA_GO_KR_API_KEY
    ?? process.env.NEXT_PUBLIC_BUS_API_KEY
    ?? process.env.NEXT_PUBLIC_MOLIT_API_KEY;
  if (!key) return Response.json({ error: "api_key_not_configured" }, { status: 500 });

  for (const k of meta.required) {
    if (!sp.get(k)) return Response.json({ error: `missing_${k}` }, { status: 400 });
  }

  const params = new URLSearchParams({ serviceKey: key, _type: "json" });
  sp.forEach((v, k) => {
    if (k === "type" || k === "action") return;
    params.set(k, v);
  });
  if (!params.has("pageNo"))    params.set("pageNo", "1");
  if (!params.has("numOfRows")) params.set("numOfRows", "20");

  const upstream = `${meta.url}?${params.toString()}`;

  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(8000) });
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
