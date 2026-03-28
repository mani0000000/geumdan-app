// 인천광역시 버스도착정보 서비스 (공공데이터포털)
// API 키 발급: https://www.data.go.kr/data/15000520/openapi.do
// 환경변수: NEXT_PUBLIC_BUS_API_KEY
//
// 주요 정류장 ID (인천 서구 검단):
//   당하지구 검단사거리 → 34000248
//   당하동 주민센터    → 34000312
//   불로지구 입구      → 34001102

export interface BusArrival {
  routeNo: string;
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

const API_KEY = process.env.NEXT_PUBLIC_BUS_API_KEY ?? "";

// 인천 버스 API CORS 허용 확인됨 (data.go.kr)
async function fetchArrivals(stationId: string): Promise<BusArrival[]> {
  if (!API_KEY) return [];
  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      stationId,
      pageNo: "1",
      numOfRows: "20",
      _type: "json",
    });
    const res = await fetch(
      `https://apis.data.go.kr/6280000/busArrivalService/getAllBusArrivalList?${params}`
    );
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.response?.body?.items?.item ?? [];
    const list = Array.isArray(items) ? items : [items];
    return list.map((item: Record<string, string | number>) => ({
      routeNo: String(item.ROUTE_NO ?? ""),
      destination: String(item.DESTINATION ?? "종점"),
      arrivalMin: Math.max(0, Math.round(Number(item.ARRIVALESTIMATETIME ?? 0) / 60)),
      remainingStops: Number(item.REMAINSTOPCOUNT ?? 0),
      isLowFloor: item.LOWPLATE === "1",
      isExpress: String(item.ROUTETP ?? "").includes("급행"),
      plateNo: String(item.PLATENO ?? ""),
    }));
  } catch {
    return [];
  }
}

export const BUS_STATION_IDS: Record<string, string> = {
  "당하지구 검단사거리": "34000248",
  "당하동 주민센터": "34000312",
  "불로지구 입구": "34001102",
};

export async function fetchBusStop(stationName: string): Promise<BusArrival[]> {
  const id = BUS_STATION_IDS[stationName];
  if (!id) return [];
  return fetchArrivals(id);
}

export const hasBusApiKey = () => Boolean(API_KEY);
