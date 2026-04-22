// 버스 API: OSM Overpass(정류소/노선 검색) + 인천광역시 공공API(실시간 도착)
// 실시간 공공API는 CORS 문제로 서버 라우트 /api/bus 를 거쳐 호출한다

const OVERPASS = "https://overpass-api.de/api/interpreter";

// ─── 공개 타입 ────────────────────────────────────────────────
export interface BusArrival {
  routeNo: string;
  routeId: string;
  destination: string;
  arrivalMin: number;      // -1 = 실시간 없음 (OSM 경유 노선)
  remainingStops: number;
  isLowFloor: boolean;
  isExpress: boolean;
  plateNo?: string;
  isScheduled?: boolean;   // OSM 기반 (실시간 아님)
}

export interface BusLocation {
  plateNo: string;
  stationSeq: number;
  stationId: string;
  stationName: string;
  isLowFloor: boolean;
  direction: 0 | 1;
}

export interface RouteStation {
  seq: number;
  stationId: string;
  stationName: string;
  direction: 0 | 1;
}

export interface RouteDetail {
  routeId: string;
  routeNo: string;
  routeName: string;
  startStation: string;
  endStation: string;
  firstTime: string;
  lastTime: string;
  upFirstTime: string;
  upLastTime: string;
  downFirstTime: string;
  downLastTime: string;
  interval: number;
}

export interface NearbyStop {
  stationId: string;
  osmNodeId: number;
  stationName: string;
  lat: number;
  lng: number;
  distanceM: number;
  osmRoutes: Array<{ routeNo: string; destination: string }>;
}

// ─── 내부 타입 ────────────────────────────────────────────────
interface OSMElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
}

// ─── Haversine 거리 (미터) ────────────────────────────────────
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

// ─── OSM Overpass: 주변 정류소 + 경유 노선 조회 ───────────────
export async function fetchNearbyStopsWide(lat: number, lng: number): Promise<NearbyStop[]> {
  const query = `[out:json][timeout:20];
(
  node["highway"="bus_stop"](around:900,${lat},${lng});
)->.stops;
rel["type"="route"]["route"="bus"](bn.stops);
(.stops;._);
out body;`;

  const res = await fetch(OVERPASS, {
    method: "POST",
    body: query,
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

  const data: { elements: OSMElement[] } = await res.json();

  const stopNodes = data.elements.filter(
    e => e.type === "node" && e.tags?.highway === "bus_stop" && e.tags.name
  );
  const routeRels = data.elements.filter(e => e.type === "relation");

  // 정류소별 경유 노선 맵 (OSM node ID → routes)
  const stopRoutes = new Map<number, Array<{ routeNo: string; destination: string }>>();
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

  return stopNodes
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
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ─── XML 파싱 ─────────────────────────────────────────────────
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

// ─── 공공API 호출 (서버 라우트 /api/bus 경유, XML 응답) ─────────
async function apiFetch(action: string, params: Record<string, string>): Promise<Record<string, string>[]> {
  const qs = new URLSearchParams({ action, ...params }).toString();
  try {
    const res = await fetch(`/api/bus?${qs}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const code = xml.match(/<resultCode>(\d+)<\/resultCode>/)?.[1];
    if (code !== "0" && code !== "00") return [];
    return parseXmlItems(xml);
  } catch {
    return [];
  }
}

// ─── 실시간 도착정보 ──────────────────────────────────────────
export async function fetchArrivalsByStationId(stationId: string): Promise<BusArrival[]> {
  const items = await apiFetch("arrivals", {
    stationId, pageNo: "1", numOfRows: "20",
  });
  return items.map(d => ({
    routeNo: d.ROUTE_NO ?? d.routeNo ?? "",
    routeId: d.ROUTE_ID ?? d.routeId ?? "",
    destination: d.DESTINATION ?? d.destination ?? "종점",
    arrivalMin: Math.max(0, Math.round(Number(d.ARRIVALESTIMATETIME ?? d.arrivalEstimateTime ?? "0") / 60)),
    remainingStops: Number(d.REMAINSTOPCOUNT ?? d.remainStopCount ?? "0"),
    isLowFloor: d.LOWPLATE === "1" || d.lowPlate === "1",
    isExpress: (d.ROUTETP ?? d.routeTp ?? "").includes("급행"),
    plateNo: d.PLATENO ?? d.plateNo ?? "",
  }));
}

// OSM 경유 노선 → BusArrival 변환 (실시간 없음 표시용)
export function osmRoutesToArrivals(routes: Array<{ routeNo: string; destination: string }>): BusArrival[] {
  return routes.map(r => ({
    routeNo: r.routeNo,
    routeId: "",
    destination: r.destination || "방향 미상",
    arrivalMin: -1,
    remainingStops: 0,
    isLowFloor: false,
    isExpress: r.routeNo.startsWith("M") || r.routeNo.includes("급행"),
    isScheduled: true,
  }));
}

// ─── 버스 실시간 위치 ─────────────────────────────────────────
export async function fetchBusLocations(routeId: string): Promise<BusLocation[]> {
  const items = await apiFetch("locations", { routeId });
  return items.map(d => ({
    plateNo: d.PLATE_NO ?? d.plateNo ?? "",
    stationSeq: Number(d.STATION_SEQ ?? d.stationSeq ?? "0"),
    stationId: d.STATION_ID ?? d.stationId ?? "",
    stationName: d.STATION_NM ?? d.stationName ?? "",
    isLowFloor: d.LOW_PLATE === "1" || d.lowPlate === "1",
    direction: (Number(d.MOVE_DIR ?? d.moveDir ?? "0") === 1 ? 1 : 0) as 0 | 1,
  }));
}

// ─── 노선 상세정보 ────────────────────────────────────────────
export async function fetchRouteDetail(routeId: string): Promise<RouteDetail | null> {
  const items = await apiFetch("routeInfo", { routeId });
  if (!items.length) return null;
  const d = items[0];
  return {
    routeId,
    routeNo: d.ROUTE_NO ?? d.routeNo ?? "",
    routeName: d.ROUTE_NM ?? d.routeName ?? "",
    startStation: d.ST_STATION_NM ?? d.stStationNm ?? "기점",
    endStation: d.ED_STATION_NM ?? d.edStationNm ?? "종점",
    firstTime: d.UP_FIRST_TIME ?? d.upFirstTime ?? "",
    lastTime: d.DOWN_LAST_TIME ?? d.downLastTime ?? "",
    upFirstTime: d.UP_FIRST_TIME ?? d.upFirstTime ?? "-",
    upLastTime: d.UP_LAST_TIME ?? d.upLastTime ?? "-",
    downFirstTime: d.DOWN_FIRST_TIME ?? d.downFirstTime ?? "-",
    downLastTime: d.DOWN_LAST_TIME ?? d.downLastTime ?? "-",
    interval: Number(d.INTERVAL ?? d.interval ?? "0"),
  };
}

// ─── 노선별 정류장 목록 ───────────────────────────────────────
export async function fetchStationsByRoute(routeId: string): Promise<RouteStation[]> {
  const items = await apiFetch("routeStations", { routeId });
  return items.map(d => ({
    seq: Number(d.STATION_SEQ ?? d.stationSeq ?? "0"),
    stationId: d.STATION_ID ?? d.stationId ?? "",
    stationName: d.STATION_NM ?? d.stationNm ?? "",
    direction: (Number(d.MOVE_DIR ?? d.moveDir ?? "0") === 1 ? 1 : 0) as 0 | 1,
  })).sort((a, b) => a.seq - b.seq);
}

// ─── TAGO 국가대중교통 API: GPS 기반 주변 정류소 조회 (cityCode 30 = 인천) ──
export async function fetchNearbyStopsFromTago(lat: number, lng: number): Promise<NearbyStop[]> {
  const items = await apiFetch("tagoStations", {
    gpsLati: String(lat),
    gpsLong: String(lng),
    numOfRows: "20",
  });
  return items
    .map(d => {
      const sLat = Number(d.gpslati ?? d.gpsLati ?? 0);
      const sLng = Number(d.gpslong ?? d.gpsLong ?? 0);
      return {
        stationId: d.nodeid ?? d.nodeId ?? "",
        osmNodeId: 0,
        stationName: d.nodenm ?? d.nodeNm ?? "",
        lat: sLat,
        lng: sLng,
        distanceM: Math.round(haversineM(lat, lng, sLat, sLng)),
        osmRoutes: [],
      };
    })
    .filter(s => s.stationId && s.stationName)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ─── TAGO 실시간 도착정보 (인천 cityCode=30) ─────────────────────
export async function fetchArrivalsByNodeId(nodeId: string): Promise<BusArrival[]> {
  const items = await apiFetch("tagoArrivals", { cityCode: "30", nodeId });
  return items.map(d => ({
    routeNo: d.routeno ?? d.routeNo ?? "",
    routeId: d.routeid ?? d.routeId ?? "",
    destination: d.nodenm ?? d.nodeName ?? "종점",
    arrivalMin: Math.max(0, Math.round(Number(d.arrtime ?? d.arrTime ?? "0") / 60)),
    remainingStops: Number(d.arrprevstationcnt ?? d.arrPrevStationCnt ?? "0"),
    isLowFloor: (d.routetp ?? d.routeTp ?? "").includes("저상"),
    isExpress: (d.routetp ?? d.routeTp ?? "").includes("급행"),
    plateNo: d.vehicleNo ?? "",
  }));
}

// ─── 인천 공공API: GPS 기반 주변 정류소 조회 (TAGO 안 될 때 폴백) ──
export async function fetchNearbyStopsFromApi(lat: number, lng: number): Promise<NearbyStop[]> {
  const items = await apiFetch("aroundStations", {
    GPS_LATI: String(lat),
    GPS_LONG: String(lng),
    numOfRows: "20",
  });
  return items
    .map(d => {
      const sLat = Number(d.GPS_LATI ?? d.gpsLati ?? 0);
      const sLng = Number(d.GPS_LONG ?? d.gpsLong ?? 0);
      return {
        stationId: d.STATION_ID ?? d.stationId ?? "",
        osmNodeId: 0,
        stationName: d.STATION_NM ?? d.stationNm ?? "",
        lat: sLat,
        lng: sLng,
        distanceM: Math.round(haversineM(lat, lng, sLat, sLng)),
        osmRoutes: [],
      };
    })
    .filter(s => s.stationId && s.stationName)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// ─── 검단신도시 폴백 정류소 (OSM ref 기반 실제 좌표) ─────────
export const GEUMDAN_BUS_STATIONS = [
  { id: "gd-1",  stationId: "89459", name: "금강펜테리움더시글로",       lat: 37.5920, lng: 126.7095 },
  { id: "gd-2",  stationId: "42697", name: "아라역7번출구",              lat: 37.5923, lng: 126.7118 },
  { id: "gd-3",  stationId: "42454", name: "아라역6번출구",              lat: 37.5919, lng: 126.7122 },
  { id: "gd-4",  stationId: "42449", name: "서구영어마을",               lat: 37.5921, lng: 126.7053 },
  { id: "gd-5",  stationId: "89406", name: "아라센트럴파크",             lat: 37.5889, lng: 126.7101 },
  { id: "gd-6",  stationId: "89405", name: "검단한신더휴캐널파크1103동", lat: 37.5895, lng: 126.7075 },
  { id: "gd-7",  stationId: "42447", name: "원당사거리.검단선사박물관",  lat: 37.5936, lng: 126.7000 },
  { id: "gd-8",  stationId: "89393", name: "호반써밋1차 3101동",         lat: 37.5935, lng: 126.7079 },
  { id: "gd-9",  stationId: "89432", name: "아라역8번출구",              lat: 37.5935, lng: 126.7129 },
  { id: "gd-10", stationId: "42433", name: "발산초등학교(풍림아이원)",   lat: 37.5913, lng: 126.6987 },
];

// ─── TAGO: 노선번호로 routeId 검색 ───────────────────────────
export async function searchRouteByNo(routeNo: string, cityCode = "30"): Promise<string | null> {
  const items = await apiFetch("tagoRoutes", { cityCode, routeNo });
  return items[0]?.routeid ?? items[0]?.routeId ?? null;
}

// ─── TAGO: routeId로 노선 상세 조회 ─────────────────────────
export async function fetchRouteDetailFromTago(routeId: string, cityCode = "30"): Promise<RouteDetail | null> {
  const items = await apiFetch("tagoRouteDetail", { cityCode, routeId });
  if (!items.length) return null;
  const d = items[0];
  return {
    routeId,
    routeNo: d.routeno ?? d.routeNo ?? "",
    routeName: d.routenm ?? d.routeName ?? "",
    startStation: d.startnodenm ?? d.startNodeNm ?? "기점",
    endStation: d.endnodenm ?? d.endNodeNm ?? "종점",
    firstTime: "",
    lastTime: "",
    upFirstTime: d.upfirsttime ?? d.upFirstTime ?? "-",
    upLastTime: d.uplasttime ?? d.upLastTime ?? "-",
    downFirstTime: d.downfirsttime ?? d.downFirstTime ?? "-",
    downLastTime: d.downlasttime ?? d.downLastTime ?? "-",
    interval: Number(d.intervalgap ?? d.intervalGap ?? "0"),
  };
}

// ─── TAGO: routeId로 전 정류장 목록 조회 ─────────────────────
export async function fetchStationsByRouteTago(routeId: string, cityCode = "30"): Promise<RouteStation[]> {
  const items = await apiFetch("tagoRouteStations", { cityCode, routeId, numOfRows: "100" });
  return items
    .map(d => ({
      seq: Number(d.nodeord ?? d.nodeOrd ?? "0"),
      stationId: d.nodeid ?? d.nodeId ?? "",
      stationName: d.nodenm ?? d.nodeNm ?? "",
      direction: (Number(d.updowncd ?? "0") === 1 ? 1 : 0) as 0 | 1,
    }))
    .sort((a, b) => a.seq - b.seq);
}

// 서버 라우트가 키를 관리하므로 클라이언트에서는 항상 활성으로 취급
export const hasBusApiKey = () => true;
