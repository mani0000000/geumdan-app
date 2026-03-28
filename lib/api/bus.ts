// 인천버스 공공데이터포털 API
// Station IDs: 당하지구 검단사거리=34000248, 당하동 주민센터=34000312, 불로지구 입구=34001102

export function hasBusApiKey(): boolean {
  return !!process.env.NEXT_PUBLIC_BUS_API_KEY;
}

export interface BusArrival {
  routeNo: string;
  destination: string;
  arrivalMin: number;
  remainingStops: number;
  isLowFloor: boolean;
  isExpress: boolean;
}

export async function fetchBusStop(stopName: string): Promise<BusArrival[]> {
  const key = process.env.NEXT_PUBLIC_BUS_API_KEY;
  if (!key) return [];

  // Station ID mapping
  const stationIdMap: Record<string, string> = {
    "당하지구 검단사거리": "34000248",
    "당하동 주민센터": "34000312",
    "불로지구 입구": "34001102",
  };

  const stationId = stationIdMap[stopName];
  if (!stationId) return [];

  try {
    const url = `https://apis.data.go.kr/6280000/busArrivalService/getBusArrivalItem` +
      `?serviceKey=${encodeURIComponent(key)}&bsId=${stationId}&_type=json`;

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    const items = data?.response?.body?.items?.item;
    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];

    return list.map((item: Record<string, unknown>) => ({
      routeNo: String(item.routeNo ?? ""),
      destination: String(item.endStop ?? ""),
      arrivalMin: Math.round(Number(item.arrtime ?? 0) / 60),
      remainingStops: Number(item.arrprevstationcnt ?? 0),
      isLowFloor: item.lowPlate === "1",
      isExpress: false,
    }));
  } catch {
    return [];
  }
}
