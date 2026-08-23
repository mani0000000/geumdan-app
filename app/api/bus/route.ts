import type { NextRequest } from "next/server";
import { GEUMDAN_BUS_STATIONS } from "@/lib/api/bus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUS_BASE = "https://apis.data.go.kr/6280000";
const TAGO_BASE = "https://apis.data.go.kr/1613000";
const INCHEON_CITY_CODE = "23";

type ActionMeta = { base: string; path: string; required: string[] };

const ACTIONS: Record<string, ActionMeta> = {
  // 인천 전용 API
  arrivals: { base: BUS_BASE, path: "/busArrivalService/getBusArrivalList", required: ["stationId"] },
  locations: { base: BUS_BASE, path: "/busLocationInfoService/getBusLocationList", required: ["routeId"] },
  routeInfo: { base: BUS_BASE, path: "/routeInfoService/getRouteInfo", required: ["routeId"] },
  routeStations: { base: BUS_BASE, path: "/busRouteService/getBusRouteSectionList", required: ["routeId"] },
  aroundStations: { base: BUS_BASE, path: "/busStationAroundInfoService/getBusStationAroundList", required: ["GPS_LATI", "GPS_LONG"] },

  // 국가대중교통 TAGO API
  tagoStations: { base: TAGO_BASE, path: "/BusSttnInfoInqireService/getCrdntPrxmtSttnList", required: ["gpsLati", "gpsLong"] },
  tagoStationSearch: { base: TAGO_BASE, path: "/BusSttnInfoInqireService/getSttnNoList", required: ["cityCode", "nodeNm"] },
  tagoArrivals: { base: TAGO_BASE, path: "/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList", required: ["cityCode", "nodeId"] },
  tagoLocations: { base: TAGO_BASE, path: "/BusLcInfoInqireService/getRouteAcctoBusLcList", required: ["cityCode", "routeId"] },
  // 기존 배포본/캐시된 클라이언트가 쓰던 action 이름도 유지한다.
  tagoBusLocation: { base: TAGO_BASE, path: "/BusLcInfoInqireService/getRouteAcctoBusLcList", required: ["cityCode", "routeId"] },
  tagoRoutes: { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteNoList", required: ["cityCode", "routeNo"] },
  tagoRouteDetail: { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteInfoIem", required: ["cityCode", "routeId"] },
  tagoRouteStations: { base: TAGO_BASE, path: "/BusRouteInfoInqireService/getRouteAcctoThrghSttnList", required: ["cityCode", "routeId"] },
};

type XmlRow = Record<string, string>;

type NearbyRow = {
  stationId: string;
  stationNo: string;
  stationName: string;
  cityCode: string;
  lat: number;
  lng: number;
  distanceM: number;
  osmRoutes?: Array<{ routeNo: string; destination: string }>;
};

const NEARBY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const ARRIVAL_CACHE_TTL_MS = 15 * 1000;
const nearbyCache = new Map<string, { expiresAt: number; rows: Omit<NearbyRow, "distanceM">[] }>();
const nearbyPending = new Map<string, Promise<Omit<NearbyRow, "distanceM">[]>>();
const arrivalCache = new Map<string, { expiresAt: number; rows: ReturnType<typeof mapArrival>[] }>();
const arrivalPending = new Map<string, Promise<ReturnType<typeof mapArrival>[]>>();
let upstreamUnavailableUntil = 0;

function upstreamAvailable() {
  return Date.now() >= upstreamUnavailableUntil;
}

function setBoundedCache<K, V>(cache: Map<K, V>, key: K, value: V, maxSize: number) {
  if (cache.size >= maxSize) cache.delete(cache.keys().next().value as K);
  cache.set(key, value);
}

function parseXmlItems(xml: string): XmlRow[] {
  const items: XmlRow[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemPattern.exec(xml)) !== null) {
    const row: XmlRow = {};
    const fieldPattern = /<([^\/>\s]+)>([^<]*)<\/\1>/gi;
    let fieldMatch: RegExpExecArray | null;
    while ((fieldMatch = fieldPattern.exec(itemMatch[1])) !== null) {
      row[fieldMatch[1]] = fieldMatch[2].trim();
    }
    items.push(row);
  }
  return items;
}

function isSuccessfulXml(xml: string): boolean {
  const code = xml.match(/<resultCode>([^<]+)<\/resultCode>/i)?.[1];
  return code === "0" || code === "00";
}

function parseJsonResponse(text: string): { success: boolean; rows: XmlRow[] } | null {
  if (!text.trimStart().startsWith("{")) return null;
  try {
    const payload = JSON.parse(text) as {
      response?: { header?: { resultCode?: string | number }; body?: { items?: { item?: unknown } | string } };
    };
    const code = String(payload.response?.header?.resultCode ?? "");
    const raw = typeof payload.response?.body?.items === "object" ? payload.response.body.items.item : [];
    const items = Array.isArray(raw) ? raw : raw && typeof raw === "object" ? [raw] : [];
    const rows = items.map(item => Object.fromEntries(Object.entries(item as Record<string, unknown>).map(([key, value]) => [key, value == null ? "" : String(value)])));
    return { success: code === "0" || code === "00", rows };
  } catch { return null; }
}

function upstreamUrl(meta: ActionMeta, key: string, values: Record<string, string>): string {
  const params = new URLSearchParams(values);
  if (!params.has("pageNo")) params.set("pageNo", "1");
  if (!params.has("numOfRows")) params.set("numOfRows", "20");
  // serviceKey를 URLSearchParams에 넣으면 인증키가 이중 인코딩될 수 있다.
  return `${meta.base}${meta.path}?serviceKey=${key}&${params.toString()}`;
}

async function fetchXml(meta: ActionMeta, key: string, values: Record<string, string>, timeoutMs = 8000) {
  const response = await fetch(upstreamUrl(meta, key, values), {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  return { response, text };
}

async function fetchItems(meta: ActionMeta, key: string, values: Record<string, string>, timeoutMs = 8000): Promise<XmlRow[]> {
  try {
    const { response, text } = await fetchXml(meta, key, values, timeoutMs);
    const json = parseJsonResponse(text);
    const success = json ? json.success : isSuccessfulXml(text);
    if (!response.ok || !success) {
      // 인증 오류/HTTP 오류가 확인된 인스턴스에서는 같은 실패를 정류장마다 반복하지 않는다.
      if (/SERVICE_KEY|HTTP_ERROR|returnReasonCode|인증|키가 등록되지/i.test(text) || response.status >= 400) {
        upstreamUnavailableUntil = Date.now() + 5 * 60 * 1000;
      }
      return [];
    }
    return json ? json.rows : parseXmlItems(text);
  } catch {
    // 정류장 한 곳의 순간적인 지연이 이후 모든 정류장 조회를 막지 않게 한다.
    // 인증/HTTP 오류만 위 분기에서 전역 쿨다운하며 네트워크 타임아웃은 즉시 재시도 가능하다.
    return [];
  }
}

function numberValue(row: XmlRow, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function stringValue(row: XmlRow, ...keys: string[]): string {
  for (const key of keys) {
    if (row[key]) return row[key];
  }
  return "";
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function verifiedNearbyRows(lat: number, lng: number): NearbyRow[] {
  return GEUMDAN_BUS_STATIONS.map((station) => ({
    stationId: station.stationId,
    stationNo: station.stationId,
    stationName: station.name,
    cityCode: INCHEON_CITY_CODE,
    lat: station.lat,
    lng: station.lng,
    distanceM: Math.round(haversineM(lat, lng, station.lat, station.lng)),
    osmRoutes: station.routes,
  })).sort((a, b) => a.distanceM - b.distanceM);
}

function scheduledArrivals(routes: Array<{ routeNo: string; destination: string }> = []) {
  return routes.map((route) => ({
    routeNo: route.routeNo,
    routeId: "",
    destination: route.destination || "방향 확인",
    arrivalMin: -1,
    remainingStops: 0,
    isLowFloor: false,
    isExpress: route.routeNo.startsWith("M") || route.routeNo.includes("급행"),
    plateNo: "",
    stationName: "",
    isScheduled: true,
  }));
}

function findVerifiedStation(stopId: string, stationName = "", lat?: number, lng?: number) {
  const normalizedId = stopId.replace(/^gd-/, "");
  const normalizeName = (value: string) => value.replace(/[\s().·-]/g, "").toLowerCase();
  return GEUMDAN_BUS_STATIONS.find((station) => station.id === stopId || station.stationId === stopId || station.stationId.endsWith(normalizedId))
    ?? GEUMDAN_BUS_STATIONS.find((station) => stationName && normalizeName(station.name) === normalizeName(stationName))
    ?? (Number.isFinite(lat) && Number.isFinite(lng)
      ? [...GEUMDAN_BUS_STATIONS].sort((a, b) => haversineM(lat!, lng!, a.lat, a.lng) - haversineM(lat!, lng!, b.lat, b.lng))[0]
      : undefined);
}

function mapArrival(row: XmlRow) {
  const routeType = stringValue(row, "routetp", "routeTp", "ROUTETP");
  return {
    routeNo: stringValue(row, "routeno", "routeNo", "ROUTE_NO"),
    routeId: stringValue(row, "routeid", "routeId", "ROUTE_ID"),
    destination: stringValue(row, "endnodenm", "endNodeNm", "routenm", "routeName") || "방향 정보 없음",
    arrivalMin: Math.max(0, Math.round(numberValue(row, "arrtime", "arrTime", "ARRIVALESTIMATETIME") / 60)),
    remainingStops: numberValue(row, "arrprevstationcnt", "arrPrevStationCnt", "REMAINSTOPCOUNT"),
    isLowFloor: routeType.includes("저상") || stringValue(row, "vehicletp", "vehicleTp").includes("저상"),
    isExpress: routeType.includes("급행") || routeType.includes("광역"),
    plateNo: stringValue(row, "vehicleno", "vehicleNo", "PLATENO"),
    stationName: stringValue(row, "nodenm", "nodeName", "STATION_NM"),
  };
}

async function nearbyRows(key: string, lat: number, lng: number): Promise<NearbyRow[]> {
  if (!key || !upstreamAvailable()) return verifiedNearbyRows(lat, lng);
  // 약 100m 격자로 묶어 정적인 정류장 목록을 재사용한다. 실제 거리는 요청 좌표로 다시 계산한다.
  const cellLat = Number(lat.toFixed(3));
  const cellLng = Number(lng.toFixed(3));
  const cacheKey = `${cellLat},${cellLng}`;
  const now = Date.now();
  const cached = nearbyCache.get(cacheKey);
  let baseRows = cached && cached.expiresAt > now ? cached.rows : undefined;

  if (!baseRows) {
    let pending = nearbyPending.get(cacheKey);
    if (!pending) {
      pending = fetchItems(ACTIONS.tagoStations, key, {
        gpsLati: String(cellLat),
        gpsLong: String(cellLng),
        numOfRows: "30",
      }, 4_500).then((rows) => rows.map((row) => ({
        stationId: stringValue(row, "nodeid", "nodeId"),
        stationNo: stringValue(row, "nodeno", "nodeNo"),
        stationName: stringValue(row, "nodenm", "nodeNm"),
        cityCode: stringValue(row, "citycode", "cityCode") || INCHEON_CITY_CODE,
        lat: numberValue(row, "gpslati", "gpsLati"),
        lng: numberValue(row, "gpslong", "gpsLong"),
      })).filter((row) => row.stationId && row.stationName && row.lat && row.lng));
      nearbyPending.set(cacheKey, pending);
    }
    try {
      baseRows = await pending;
      if (baseRows.length > 0) {
        setBoundedCache(nearbyCache, cacheKey, { expiresAt: now + NEARBY_CACHE_TTL_MS, rows: baseRows }, 200);
      }
    } finally {
      nearbyPending.delete(cacheKey);
    }
  }

  const resolvedRows = baseRows?.length ? baseRows : verifiedNearbyRows(lat, lng);
  return resolvedRows.map((row) => ({
    ...row,
    distanceM: Math.round(haversineM(lat, lng, row.lat, row.lng)),
  })).sort((a, b) => a.distanceM - b.distanceM);
}

async function arrivalRows(key: string, cityCode: string, nodeId: string) {
  if (!key || !upstreamAvailable()) return [];
  const cacheKey = `${cityCode}:${nodeId}`;
  const cached = arrivalCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;

  let pending = arrivalPending.get(cacheKey);
  if (!pending) {
    pending = fetchItems(ACTIONS.tagoArrivals, key, {
      cityCode,
      nodeId,
      numOfRows: "100",
    }, 5_500).then(async (rows) => {
      // TAGO가 간헐적으로 성공 코드와 빈 목록을 함께 반환한다. 한 번만 재조회해
      // 정류장별 부분 미수신을 줄이고, 계속 비면 실제 접근 차량 없음으로 처리한다.
      const resolved = rows.length ? rows : await fetchItems(ACTIONS.tagoArrivals, key, {
        cityCode,
        nodeId,
        numOfRows: "100",
      }, 7_000);
      return resolved.map(mapArrival).filter((arrival) => arrival.routeNo);
    });
    arrivalPending.set(cacheKey, pending);
  }
  try {
    const arrivals = await pending;
    // 빈 응답은 캐시하지 않아 다음 자동 갱신에서 즉시 회복할 수 있게 한다.
    if (arrivals.length > 0) {
      setBoundedCache(arrivalCache, cacheKey, { expiresAt: Date.now() + ARRIVAL_CACHE_TTL_MS, rows: arrivals }, 500);
    }
    return arrivals;
  } finally {
    arrivalPending.delete(cacheKey);
  }
}

async function handleNearbyStops(sp: URLSearchParams, key: string) {
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "missing_lat_lng" }, { status: 400 });
  }
  return Response.json(await nearbyRows(key, lat, lng), {
    headers: { "Cache-Control": "private, max-age=30" },
  });
}

async function handleNearbyWithArrivals(sp: URLSearchParams, key: string) {
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "missing_lat_lng" }, { status: 400 });
  }

  const nearby = await nearbyRows(key, lat, lng);
  const withinRadius = nearby.filter((stop) => stop.distanceM <= 500).slice(0, 4);
  const selected = withinRadius.length > 0 ? withinRadius : nearby.slice(0, 1);
  const stops = await Promise.all(selected.map(async (stop) => ({
    ...stop,
    osmNodeId: 0,
    osmRoutes: stop.osmRoutes ?? [],
    arrivals: key && upstreamAvailable()
      ? await arrivalRows(key, stop.cityCode, stop.stationId).then((rows) => rows.length ? rows : scheduledArrivals(stop.osmRoutes))
      : scheduledArrivals(stop.osmRoutes),
  })));

  return Response.json(stops, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function handleResolveArrivals(sp: URLSearchParams, key: string) {
  const stopId = sp.get("stopId") ?? "";
  const cityCode = sp.get("cityCode") ?? INCHEON_CITY_CODE;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const stationName = sp.get("name") ?? "";

  if (!stopId) return Response.json({ error: "missing_stopId" }, { status: 400 });

  if (key && /[A-Za-z]/.test(stopId) && !stopId.startsWith("gd-")) {
    const direct = await arrivalRows(key, cityCode, stopId);
    if (direct.length > 0 || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return Response.json(direct, { headers: { "Cache-Control": "no-store" } });
    }
  }

  if (key && Number.isFinite(lat) && Number.isFinite(lng)) {
    const nearby = await nearbyRows(key, lat, lng);
    const normalized = stopId.replace(/^gd-/, "");
    const match = nearby.find((stop) => stop.stationId === stopId || stop.stationNo === stopId)
      ?? nearby.find((stop) => stationName && stop.stationName.replace(/\s/g, "") === stationName.replace(/\s/g, ""))
      ?? nearby.find((stop) => stop.stationNo.endsWith(normalized))
      ?? nearby[0];
    if (match) {
      const arrivals = await arrivalRows(key, match.cityCode, match.stationId);
      if (arrivals.length > 0) {
        return Response.json(arrivals, { headers: { "Cache-Control": "no-store", "X-Bus-Data-Source": "live" } });
      }
      const verified = findVerifiedStation(match.stationId, match.stationName, match.lat, match.lng);
      return Response.json(scheduledArrivals(verified?.routes ?? match.osmRoutes), {
        headers: { "Cache-Control": "private, max-age=60", "X-Bus-Data-Source": "verified-fallback" },
      });
    }
  }

  const verified = findVerifiedStation(stopId, stationName, lat, lng);
  return Response.json(scheduledArrivals(verified?.routes), {
    headers: {
      "Cache-Control": "private, max-age=60",
      "X-Bus-Data-Source": "verified-fallback",
    },
  });
}

async function handleStationSearch(sp: URLSearchParams, key: string) {
  const query = (sp.get("q") ?? "").trim();
  if (query.length < 2) return Response.json([]);
  const rows = await fetchItems(ACTIONS.tagoStationSearch, key, {
    cityCode: sp.get("cityCode") ?? INCHEON_CITY_CODE,
    nodeNm: query,
    numOfRows: "30",
  }, 10_000);
  return Response.json(rows.map((row) => ({
    stationId: stringValue(row, "nodeid", "nodeId"),
    stationNo: stringValue(row, "nodeno", "nodeNo"),
    stationName: stringValue(row, "nodenm", "nodeNm"),
    cityCode: stringValue(row, "citycode", "cityCode") || INCHEON_CITY_CODE,
    lat: numberValue(row, "gpslati", "gpsLati"),
    lng: numberValue(row, "gpslong", "gpsLong"),
    distanceM: 0,
    osmNodeId: 0,
    osmRoutes: [],
  })).filter((row) => row.stationId && row.stationName));
}

export async function GET(request: NextRequest) {
  const rawKey = process.env.DATA_GO_KR_API_KEY
    ?? process.env.NEXT_PUBLIC_BUS_API_KEY
    ?? process.env.NEXT_PUBLIC_MOLIT_API_KEY
    ?? "";
  // Vercel에 실수로 빈 따옴표("")가 저장된 경우도 미설정으로 취급한다.
  const key = rawKey.trim().replace(/^(["'])(.*)\1$/, "$2").trim();

  const sp = request.nextUrl.searchParams;
  const action = sp.get("action") ?? "";

  if (action === "nearbyStops") return handleNearbyStops(sp, key);
  if (action === "nearbyWithArrivals") return handleNearbyWithArrivals(sp, key);
  if (action === "resolveArrivals") return handleResolveArrivals(sp, key);
  if (action === "searchStation") {
    if (key) return handleStationSearch(sp, key);
    const query = (sp.get("q") ?? "").replace(/\s/g, "");
    return Response.json(GEUMDAN_BUS_STATIONS.filter((station) => station.name.replace(/\s/g, "").includes(query)).map((station) => ({
      stationId: station.stationId, stationNo: station.stationId, stationName: station.name,
      cityCode: INCHEON_CITY_CODE, lat: station.lat, lng: station.lng, distanceM: 0, osmNodeId: 0, osmRoutes: station.routes,
    })));
  }

  if (!key) return Response.json({ error: "api_key_not_configured", fallbackAvailable: true }, { status: 503 });

  const meta = ACTIONS[action];
  if (!meta) {
    return Response.json({
      error: "invalid_action",
      allowed: [...Object.keys(ACTIONS), "nearbyStops", "nearbyWithArrivals", "resolveArrivals", "searchStation"],
    }, { status: 400 });
  }

  for (const required of meta.required) {
    if (!sp.get(required)) return Response.json({ error: `missing_${required}` }, { status: 400 });
  }

  const values: Record<string, string> = {};
  sp.forEach((value, name) => {
    if (name !== "action") values[name] = value;
  });

  try {
    const { response, text } = await fetchXml(meta, key, values);
    const cacheControl = ["tagoRoutes", "tagoRouteDetail", "tagoRouteStations", "routeInfo", "routeStations"].includes(action)
      ? "public, s-maxage=21600, stale-while-revalidate=86400"
      : "no-store";
    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/xml",
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    return Response.json({ error: "upstream_failed", message: String(error) }, { status: 502 });
  }
}
