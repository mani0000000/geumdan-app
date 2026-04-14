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

const API_KEY = process.env.NEXT_PUBLIC_BUS_API_KEY ?? "";
const BASE = "https://apis.data.go.kr/6280000";

function qs(params: Record<string, string>) {
  return new URLSearchParams({ serviceKey: API_KEY, _type: "json", ...params }).toString();
}

function parseItems<T>(json: unknown): T[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = (json as any)?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? (item as T[]) : [item as T];
}

// 타임아웃 래퍼 — ms 이내 응답 없으면 reject
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// apis.data.go.kr는 CORS 헤더 미지원 → 3-way 병렬 레이스 (직접+프록시2개)
// 모든 경로에 4s 타임아웃 적용
async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  if (!API_KEY) return [];
  const targetUrl = `${BASE}${path}?${qs(params)}`;

  try {
    return await Promise.any([
      // 1. 직접 (CORS 허용 환경, 1.5s)
      withTimeout((async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        try {
          const res = await fetch(targetUrl, { signal: ctrl.signal });
          if (!res.ok) throw new Error("not ok");
          const data = parseItems<T>(await res.json());
          clearTimeout(tid);
          return data;
        } catch { clearTimeout(tid); throw new Error("direct failed"); }
      })(), 2000),
      // 2. allorigins.win 프록시 (4s)
      withTimeout((async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        try {
          const res = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            { signal: ctrl.signal }
          );
          if (!res.ok) throw new Error(`allorigins ${res.status}`);
          const j = await res.json();
          clearTimeout(tid);
          return parseItems<T>(JSON.parse(j.contents as string));
        } catch { clearTimeout(tid); throw new Error("allorigins failed"); }
      })(), 5000),
      // 3. corsproxy.io 프록시 (4s)
      withTimeout((async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 4000);
        try {
          const res = await fetch(
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            { signal: ctrl.signal }
          );
          if (!res.ok) throw new Error(`corsproxy ${res.status}`);
          const data = parseItems<T>(await res.json());
          clearTimeout(tid);
          return data;
        } catch { clearTimeout(tid); throw new Error("corsproxy failed"); }
      })(), 5000),
    ]);
  } catch { return []; }
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

// ─── 노선 상세정보 ────────────────────────────────────────────
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
  // 검단신도시 핵심 정류장
  "당하지구 검단사거리":   "34000248",
  "당하동 주민센터":       "34000312",
  "불로지구 입구":         "34001102",
  // 검단신도시 추가 정류장
  "검단사거리":            "34000250",
  "검단신도시입구":        "34001200",
  "당하동.검단신도시":     "34000310",
  "검단오류역":            "34001300",
  "서구청.검단":           "34000400",
  "불로동":                "34001100",
  "원당동":                "34000500",
};

export async function fetchBusStop(stationName: string): Promise<BusArrival[]> {
  const id = BUS_STATION_IDS[stationName];
  if (!id) return [];
  return fetchArrivals(id);
}

// ─── Haversine 거리 계산 (미터) ──────────────────────────────
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

// ─── 위치 기반 주변 정류장 조회 ──────────────────────────────
export interface NearbyStop {
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  distanceM: number;
}

/**
 * 주변 정류장 단일 쿼리 (distancetype: 5=1km)
 */
export async function fetchNearbyStops(
  lat: number,
  lng: number,
  radiusType: "1" | "2" | "3" | "4" | "5" = "5"
): Promise<NearbyStop[]> {
  const items = await apiFetch<Record<string, string>>(
    "/busStopInfoService/getBusStopAroundList",
    {
      currentlatitude: String(lat),
      currentlongitude: String(lng),
      distancetype: radiusType,
    }
  );
  return items
    .map(item => ({
      stationId: String(item.STATION_ID ?? item.stationId ?? ""),
      stationName: String(item.STATION_NM ?? item.stationNm ?? ""),
      lat: Number(item.GPS_LATI ?? item.gpsLati ?? lat),
      lng: Number(item.GPS_LONG ?? item.gpsLong ?? lng),
      distanceM: Number(item.DISTANCE ?? item.distance ?? 0),
    }))
    .filter(s => s.stationId && s.stationName)
    .sort((a, b) => a.distanceM - b.distanceM);
}

/**
 * 1km 반경 주변 정류장 조회 (단일 쿼리, 빠름)
 */
export async function fetchNearbyStopsWide(
  lat: number,
  lng: number,
): Promise<NearbyStop[]> {
  const stops = await fetchNearbyStops(lat, lng, "5");
  return stops
    .map(s => ({ ...s, distanceM: Math.round(haversineM(lat, lng, s.lat, s.lng)) }))
    .filter(s => s.distanceM <= 1500)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// stationId 직접 도착 정보 조회 (외부 노출용)
export async function fetchArrivalsByStationId(stationId: string): Promise<BusArrival[]> {
  return fetchArrivals(stationId);
}

export const hasBusApiKey = () => Boolean(API_KEY);
