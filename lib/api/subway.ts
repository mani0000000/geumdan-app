/**
 * lib/api/subway.ts
 * 인천1호선 + 공항철도 실시간 도착정보
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUBWAY_API_KEY  — 인천교통공사 도시철도 (공공데이터포털 6280000)
 *   NEXT_PUBLIC_SEOUL_SUBWAY_KEY — 서울 열린데이터광장 (공항철도 AREX 도착정보)
 */

import { haversineM } from "./bus";

const IC_KEY   = process.env.NEXT_PUBLIC_SUBWAY_API_KEY  ?? "";
const AREX_KEY = process.env.NEXT_PUBLIC_SEOUL_SUBWAY_KEY ?? "";

// ── 타임아웃 래퍼 ─────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// ── 타입 정의 ─────────────────────────────────────────────────
export interface SubwayArrival {
  direction: "상행" | "하행";
  terminalStation: string;  // 종착역
  arrivalMin: number;
  trainNo: string;
  currentStation: string;   // 현재 열차 위치
  isExpress: boolean;
}

export interface SubwayStationEntry {
  id: string;
  displayName: string;   // "계양역(인천1호선)"
  line: string;
  lineColor: string;
  lat: number;
  lng: number;
  apiType: "ic1" | "arex";
  stationCode: string;   // ic1: "I023" / arex: 역 이름
  timetable: {
    upFirst: string; upLast: string;
    downFirst: string; downLast: string;
    intervalMin: number;
  };
}

export interface SubwayStationWithDist extends SubwayStationEntry {
  distM: number;
}

// ── 역 데이터베이스 (검단신도시 인근) ───────────────────────────
const STATION_DB: SubwayStationEntry[] = [
  {
    id: "arex-geomam",
    displayName: "검암역",
    line: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5575, lng: 126.6721,
    apiType: "arex",
    stationCode: "검암",
    timetable: { upFirst: "05:20", upLast: "23:28", downFirst: "05:43", downLast: "23:50", intervalMin: 30 },
  },
  {
    id: "arex-gyeyang",
    displayName: "계양역(공항철도)",
    line: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5655, lng: 126.7294,
    apiType: "arex",
    stationCode: "계양",
    timetable: { upFirst: "05:28", upLast: "23:36", downFirst: "05:35", downLast: "23:43", intervalMin: 30 },
  },
  {
    id: "ic1-gyeyang",
    displayName: "계양역(인천1호선)",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5655, lng: 126.7294,
    apiType: "ic1",
    stationCode: "I023",
    timetable: { upFirst: "05:35", upLast: "23:55", downFirst: "05:27", downLast: "23:47", intervalMin: 6 },
  },
  {
    id: "ic1-bakchon",
    displayName: "박촌역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5513, lng: 126.7432,
    apiType: "ic1",
    stationCode: "I024",
    timetable: { upFirst: "05:37", upLast: "23:57", downFirst: "05:25", downLast: "23:45", intervalMin: 6 },
  },
  {
    id: "ic1-imhak",
    displayName: "임학역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5441, lng: 126.7380,
    apiType: "ic1",
    stationCode: "I025",
    timetable: { upFirst: "05:39", upLast: "23:59", downFirst: "05:23", downLast: "23:43", intervalMin: 6 },
  },
  {
    id: "ic1-gyesan",
    displayName: "계산역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5389, lng: 126.7285,
    apiType: "ic1",
    stationCode: "I026",
    timetable: { upFirst: "05:41", upLast: "00:01", downFirst: "05:21", downLast: "23:41", intervalMin: 6 },
  },
];

// ── GPS 기반 인근 역 탐색 ─────────────────────────────────────
export function findNearbySubwayStations(
  lat: number,
  lng: number,
  radiusM = 8000,
): SubwayStationWithDist[] {
  return STATION_DB
    .map(st => ({ ...st, distM: Math.round(haversineM(lat, lng, st.lat, st.lng)) }))
    .filter(st => st.distM <= radiusM)
    .sort((a, b) => a.distM - b.distM);
}

export function hasSubwayKey() { return Boolean(IC_KEY || AREX_KEY); }

// ── 인천1호선 도착정보 ────────────────────────────────────────
async function fetchIc1Arrivals(stationCode: string): Promise<SubwayArrival[]> {
  if (!IC_KEY) return [];
  const url =
    `https://apis.data.go.kr/6280000/IcSubwayInfoService/getIcSubwayArvlList` +
    `?serviceKey=${IC_KEY}&_type=json&stationId=${stationCode}&pageNo=1&numOfRows=10`;

  const tryFetch = async (proxyUrl: string): Promise<SubwayArrival[]> => {
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error(`${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    // allorigins wraps in {contents:"..."}
    const data = json?.contents ? JSON.parse(json.contents) : json;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data?.response?.body?.items?.item as any[] | undefined;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(item => ({
      direction: String(item.UPDOWN ?? item.updown ?? "상행") === "1" ? "상행" : "하행",
      terminalStation: String(item.DESTINATION_NM ?? item.destinationNm ?? "종착"),
      arrivalMin: Math.max(0, Math.round(Number(item.ARRIVALESTIMATETIME ?? 0) / 60)),
      trainNo: String(item.TRAINNO ?? item.trainNo ?? ""),
      currentStation: String(item.CURRENT_STATION_NM ?? item.currentStationNm ?? ""),
      isExpress: String(item.TRAINTYPE ?? "").includes("급행"),
    }));
  };

  try {
    return await Promise.any([
      withTimeout(tryFetch(url), 2000),
      withTimeout(
        tryFetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`),
        5000,
      ),
      withTimeout(
        tryFetch(`https://corsproxy.io/?${encodeURIComponent(url)}`),
        5000,
      ),
    ]);
  } catch {
    return [];
  }
}

// ── 공항철도(AREX) 도착정보 — 서울 열린데이터광장 ─────────────
async function fetchArexArrivals(stationName: string): Promise<SubwayArrival[]> {
  if (!AREX_KEY) return [];
  const url =
    `http://swopenapi.seoul.go.kr/api/subway/${AREX_KEY}/json/realtimeStationArrival/0/10/${encodeURIComponent(stationName)}`;

  try {
    const res = await withTimeout(fetch(url), 5000);
    if (!res.ok) throw new Error(`${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = json?.realtimeArrivalList ?? [];
    // 공항철도만 필터
    return list
      .filter(item => String(item.subwayId ?? "") === "9" || String(item.trainLineNm ?? "").includes("공항"))
      .map(item => ({
        direction: String(item.updnLine ?? "").includes("상") ? "상행" : "하행",
        terminalStation: String(item.bstatnNm ?? "종착"),
        arrivalMin: Math.max(0, Math.round(Number(item.barvlDt ?? 0) / 60)),
        trainNo: String(item.btrainNo ?? ""),
        currentStation: String(item.arvlMsg3 ?? ""),
        isExpress: String(item.btrainSttus ?? "").includes("급행"),
      }));
  } catch {
    return [];
  }
}

// ── 공통 도착정보 조회 ────────────────────────────────────────
export async function fetchSubwayArrivals(
  station: SubwayStationWithDist,
): Promise<SubwayArrival[]> {
  if (station.apiType === "ic1") return fetchIc1Arrivals(station.stationCode);
  if (station.apiType === "arex") return fetchArexArrivals(station.stationCode);
  return [];
}
