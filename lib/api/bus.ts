// 인천광역시 버스 서비스 (공공데이터포털 6280000)
// 환경변수: NEXT_PUBLIC_BUS_API_KEY

export interface BusArrival {
  routeNo: string;
  routeId: string;
  destination: string;
  arrivalMin: number;
  remainingStops: number;
  isLowFloor: boolean;
  isExpress: boolean;
  plateNo?: string;
}

export interface BusStopInfo {
  stationId: string;
  stationName: string;
  arrivals: BusArrival[];
}

export interface BusLocation {
  plateNo: string;
  stationSeq: number;    // 현재 위치 정류장 순번
  stationId: string;
  stationName: string;
  isLowFloor: boolean;
  direction: 0 | 1;      // 0=상행, 1=하행
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
  firstTime: string;   // "05:30"
  lastTime: string;    // "23:00"
  upFirstTime: string;
  upLastTime: string;
  downFirstTime: string;
  downLastTime: string;
  interval: number;    // 배차 간격(분)
}

const API_KEY = process.env.NEXT_PUBLIC_BUS_API_KEY ?? "";
const BASE = "https://apis.data.go.kr/6280000";

function qs(params: Record<string, string>) {
  return new URLSearchParams({ serviceKey: API_KEY, _type: "json", ...params }).toString();
}

async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  if (!API_KEY) return [];
  try {
    const res = await fetch(`${BASE}${path}?${qs(params)}`);
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.response?.body?.items?.item ?? [];
    return Array.isArray(items) ? items : items ? [items] : [];
  } catch {
    return [];
  }
}

// ─── 버스 도착정보 ────────────────────────────────────────────
async function fetchArrivals(stationId: string): Promise<BusArrival[]> {
  const items = await apiFetch<Record<string, string | number>>(
    "/busArrivalService/getAllBusArrivalList",
    { stationId, pageNo: "1", numOfRows: "20" }
  );
  return items.map(item => ({
    routeNo: String(item.ROUTE_NO ?? ""),
    routeId: String(item.ROUTE_ID ?? item.routeId ?? ""),
    destination: String(item.DESTINATION ?? "종점"),
    arrivalMin: Math.max(0, Math.round(Number(item.ARRIVALESTIMATETIME ?? 0) / 60)),
    remainingStops: Number(item.REMAINSTOPCOUNT ?? 0),
    isLowFloor: item.LOWPLATE === "1",
    isExpress: String(item.ROUTETP ?? "").includes("급행"),
    plateNo: String(item.PLATENO ?? ""),
  }));
}

// ─── 버스 실시간 위치 ─────────────────────────────────────────
export async function fetchBusLocations(routeId: string): Promise<BusLocation[]> {
  const items = await apiFetch<Record<string, string | number>>(
    "/busLocationInfoService/getBusLocationList",
    { routeId }
  );
  return items.map(item => ({
    plateNo: String(item.PLATE_NO ?? item.plateNo ?? ""),
    stationSeq: Number(item.STATION_SEQ ?? item.stationSeq ?? 0),
    stationId: String(item.STATION_ID ?? item.stationId ?? ""),
    stationName: String(item.STATION_NM ?? item.stationName ?? ""),
    isLowFloor: item.LOW_PLATE === "1" || item.lowPlate === "1",
    direction: (Number(item.MOVE_DIR ?? item.moveDir ?? 0) === 1 ? 1 : 0) as 0 | 1,
  }));
}

// ─── 노선 상세정보 (첫차/막차/배차간격) ─────────────────────────
export async function fetchRouteDetail(routeId: string): Promise<RouteDetail | null> {
  const items = await apiFetch<Record<string, string | number>>(
    "/routeInfoService/getRouteInfo",
    { routeId }
  );
  if (!items.length) return null;
  const d = items[0];
  return {
    routeId,
    routeNo: String(d.ROUTE_NO ?? d.routeNo ?? ""),
    routeName: String(d.ROUTE_NM ?? d.routeName ?? ""),
    startStation: String(d.ST_STATION_NM ?? d.stStationNm ?? "기점"),
    endStation: String(d.ED_STATION_NM ?? d.edStationNm ?? "종점"),
    firstTime: String(d.UP_FIRST_TIME ?? d.upFirstTime ?? ""),
    lastTime: String(d.DOWN_LAST_TIME ?? d.downLastTime ?? ""),
    upFirstTime: String(d.UP_FIRST_TIME ?? d.upFirstTime ?? "-"),
    upLastTime: String(d.UP_LAST_TIME ?? d.upLastTime ?? "-"),
    downFirstTime: String(d.DOWN_FIRST_TIME ?? d.downFirstTime ?? "-"),
    downLastTime: String(d.DOWN_LAST_TIME ?? d.downLastTime ?? "-"),
    interval: Number(d.INTERVAL ?? d.interval ?? 0),
  };
}

// ─── 노선별 정류장 목록 ───────────────────────────────────────
export async function fetchStationsByRoute(routeId: string): Promise<RouteStation[]> {
  const items = await apiFetch<Record<string, string | number>>(
    "/routeInfoService/getStaionByRoute",
    { routeId }
  );
  return items.map(item => ({
    seq: Number(item.STATION_SEQ ?? item.stationSeq ?? 0),
    stationId: String(item.STATION_ID ?? item.stationId ?? ""),
    stationName: String(item.STATION_NM ?? item.stationNm ?? ""),
    direction: (Number(item.MOVE_DIR ?? item.moveDir ?? 0) === 1 ? 1 : 0) as 0 | 1,
  })).sort((a, b) => a.seq - b.seq);
}

// ─── 정류장명으로 도착정보 조회 ──────────────────────────────
export const BUS_STATION_IDS: Record<string, string> = {
  "당하지구 검단사거리": "34000248",
  "당하동 주민센터":     "34000312",
  "불로지구 입구":       "34001102",
};

export async function fetchBusStop(stationName: string): Promise<BusArrival[]> {
  const id = BUS_STATION_IDS[stationName];
  if (!id) return [];
  return fetchArrivals(id);
}

export const hasBusApiKey = () => Boolean(API_KEY);
