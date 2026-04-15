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

// apis.data.go.kr는 CORS 헤더 미지원 → 3-way 병렬 레이스 (직접+프록시2개)
// 직접 시도는 1.5s 타임아웃으로 CORS가 되는 환경이면 가장 빠르게 응답
async function apiFetch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  if (!API_KEY) return [];
  const targetUrl = `${BASE}${path}?${qs(params)}`;

  try {
    return await Promise.any([
      // 1. 직접 (CORS 허용 환경 / 서버사이드용, 1.5s 타임아웃)
      (async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        try {
          const res = await fetch(targetUrl, { signal: ctrl.signal });
          if (!res.ok) throw new Error("not ok");
          const data = parseItems<T>(await res.json());
          clearTimeout(tid);
          return data;
        } catch { clearTimeout(tid); throw new Error("direct failed"); }
      })(),
      // 2. allorigins.win 프록시
      (async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`allorigins ${res.status}`);
        const j = await res.json();
        return parseItems<T>(JSON.parse(j.contents as string));
      })(),
      // 3. corsproxy.io 프록시
      (async () => {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`corsproxy ${res.status}`);
        return parseItems<T>(await res.json());
      })(),
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

// ─── 검단신도시 주요 정류장 (좌표 포함, 좌표검색 API 없이 직접 조회) ──
export const GEUMDAN_BUS_STATIONS = [
  { id: "gd-1",  stationId: "34000248", name: "당하지구 검단사거리", lat: 37.5930, lng: 126.7095 },
  { id: "gd-2",  stationId: "34000312", name: "당하동 주민센터",     lat: 37.5917, lng: 126.7071 },
  { id: "gd-3",  stationId: "34001102", name: "불로지구 입구",       lat: 37.5870, lng: 126.7025 },
  { id: "gd-4",  stationId: "34000250", name: "검단사거리",          lat: 37.5922, lng: 126.7088 },
  { id: "gd-5",  stationId: "34000310", name: "당하동.검단신도시",   lat: 37.5908, lng: 126.7062 },
  { id: "gd-6",  stationId: "34001200", name: "검단신도시입구",      lat: 37.5882, lng: 126.7042 },
  { id: "gd-7",  stationId: "34001300", name: "검단오류역",          lat: 37.5778, lng: 126.6932 },
  { id: "gd-8",  stationId: "34000400", name: "서구청.검단",         lat: 37.5868, lng: 126.6990 },
  { id: "gd-9",  stationId: "34001100", name: "불로동",              lat: 37.5852, lng: 126.7018 },
  { id: "gd-10", stationId: "34000500", name: "원당동",              lat: 37.5838, lng: 126.6952 },
];

export async function fetchBusStop(stationName: string): Promise<BusArrival[]> {
  const station = GEUMDAN_BUS_STATIONS.find(s => s.name === stationName);
  if (!station) return [];
  return fetchArrivals(station.stationId);
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
 * 3km 반경 주변 정류장 조회
 * 중심 + 4방향(1.5km 오프셋)으로 5방향 병렬 쿼리 후 중복 제거
 * 각 방향에서 1km 반경 쿼리 → 합쳐서 약 3km 커버
 */
export async function fetchNearbyStopsWide(
  lat: number,
  lng: number,
): Promise<NearbyStop[]> {
  // 1.5km 오프셋 (위도 1° ≈ 111km, 경도 1° ≈ 88km @37.5°N)
  const LAT_OFF = 0.0135; // ~1.5km
  const LNG_OFF = 0.0170; // ~1.5km
  const points: [number, number][] = [
    [lat, lng],
    [lat + LAT_OFF, lng],
    [lat - LAT_OFF, lng],
    [lat, lng + LNG_OFF],
    [lat, lng - LNG_OFF],
  ];

  const results = await Promise.all(
    points.map(([la, lo]) => fetchNearbyStops(la, lo, "5"))
  );

  // 중복 제거: 실제 거리 기준으로 stationId 별 최소 거리 유지
  const map = new Map<string, NearbyStop>();
  for (const stops of results) {
    for (const stop of stops) {
      const realDist = haversineM(lat, lng, stop.lat, stop.lng);
      const withRealDist = { ...stop, distanceM: Math.round(realDist) };
      const existing = map.get(stop.stationId);
      if (!existing || withRealDist.distanceM < existing.distanceM) {
        map.set(stop.stationId, withRealDist);
      }
    }
  }

  return Array.from(map.values())
    .filter(s => s.distanceM <= 3000)
    .sort((a, b) => a.distanceM - b.distanceM);
}

// stationId 직접 도착 정보 조회 (외부 노출용)
export async function fetchArrivalsByStationId(stationId: string): Promise<BusArrival[]> {
  return fetchArrivals(stationId);
}

export const hasBusApiKey = () => Boolean(API_KEY);
