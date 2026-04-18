/**
 * lib/api/subway.ts
 * 인천1호선 + 공항철도 + 서울9호선 실시간 도착정보
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUBWAY_API_KEY   — 인천교통공사 도시철도 (공공데이터포털 6280000)
 *   NEXT_PUBLIC_SEOUL_SUBWAY_KEY — 서울 열린데이터광장 (공항철도·9호선 도착정보)
 */

import { haversineM } from "./bus";

const IC_KEY   = process.env.NEXT_PUBLIC_SUBWAY_API_KEY   ?? "";
const AREX_KEY = process.env.NEXT_PUBLIC_SEOUL_SUBWAY_KEY ?? "";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms)),
  ]);
}

// ── 타입 정의 ─────────────────────────────────────────────────
export interface SubwayArrival {
  direction: "상행" | "하행";
  terminalStation: string;
  arrivalMin: number;
  trainNo: string;
  currentStation: string;
  isExpress: boolean;
}

export type SubwayApiType = "ic1" | "arex" | "seoul9" | "planned";

export interface SubwayStationEntry {
  id: string;
  displayName: string;
  line: string;
  lineColor: string;
  lat: number;
  lng: number;
  apiType: SubwayApiType;
  stationCode: string;
  planned?: boolean;
  timetable: {
    upFirst: string; upLast: string;
    downFirst: string; downLast: string;
    intervalMin: number;
  };
}

export interface SubwayStationWithDist extends SubwayStationEntry {
  distM: number;
}

// ── 역 데이터베이스 ───────────────────────────────────────────
const STATION_DB: SubwayStationEntry[] = [
  // 공항철도 (AREX)
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

  // 서울 9호선
  {
    id: "seoul9-gimpo",
    displayName: "김포공항역(9호선)",
    line: "9호선",
    lineColor: "#BDB048",
    lat: 37.5625, lng: 126.8013,
    apiType: "seoul9",
    stationCode: "김포공항",
    timetable: { upFirst: "05:37", upLast: "23:57", downFirst: "05:30", downLast: "23:50", intervalMin: 9 },
  },

  // 인천1호선
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

  // 검단선 (운영 중)
  {
    id: "gd-singeumdan",
    displayName: "신검단중앙역",
    line: "검단선",
    lineColor: "#00A550",
    lat: 37.5930, lng: 126.7095,
    apiType: "ic1",
    stationCode: "I050",
    timetable: { upFirst: "05:40", upLast: "23:55", downFirst: "05:35", downLast: "23:50", intervalMin: 6 },
  },
  {
    id: "gd-gdlake",
    displayName: "검단호수역",
    line: "검단선",
    lineColor: "#00A550",
    lat: 37.5870, lng: 126.7025,
    apiType: "ic1",
    stationCode: "I051",
    timetable: { upFirst: "05:42", upLast: "23:57", downFirst: "05:33", downLast: "23:48", intervalMin: 6 },
  },
  {
    id: "gd-ara",
    displayName: "아라역",
    line: "검단선",
    lineColor: "#00A550",
    lat: 37.5778, lng: 126.6932,
    apiType: "ic1",
    stationCode: "I052",
    timetable: { upFirst: "05:44", upLast: "23:59", downFirst: "05:31", downLast: "23:46", intervalMin: 6 },
  },
];

// ── 전체 역 목록 (위치 무관, 항상 표시) ──────────────────────
export function getAllSubwayStations(): SubwayStationWithDist[] {
  return STATION_DB.map(st => ({ ...st, distM: 0 }));
}

// ── GPS 기반 인근 역 탐색 ─────────────────────────────────────
export function findNearbySubwayStations(
  lat: number,
  lng: number,
  radiusM = 10000,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parse = (json: any): SubwayArrival[] => {
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
      withTimeout((async () => { const r = await fetch(url); return parse(await r.json()); })(), 2000),
      withTimeout((async () => {
        const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        return parse(await r.json());
      })(), 5000),
      withTimeout((async () => {
        const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        return parse(await r.json());
      })(), 5000),
    ]);
  } catch { return []; }
}

// ── 서울 열린데이터 지하철 공통 ───────────────────────────────
async function fetchSeoulSubwayArrivals(
  stationName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lineFilter: (item: any) => boolean,
): Promise<SubwayArrival[]> {
  if (!AREX_KEY) return [];
  const targetUrl =
    `http://swopenapi.seoul.go.kr/api/subway/${AREX_KEY}/json/realtimeStationArrival/0/20/${encodeURIComponent(stationName)}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parse = (data: any): SubwayArrival[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const list: any[] = data?.realtimeArrivalList ?? [];
    return list.filter(lineFilter).map(item => ({
      direction: String(item.updnLine ?? "").includes("상") ? "상행" : "하행",
      terminalStation: String(item.bstatnNm ?? "종착"),
      arrivalMin: Math.max(0, Math.round(Number(item.barvlDt ?? 0) / 60)),
      trainNo: String(item.btrainNo ?? ""),
      currentStation: String(item.arvlMsg3 ?? ""),
      isExpress: String(item.btrainSttus ?? "").includes("급행"),
    }));
  };

  const proxyUrls = [
    `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  ];

  try {
    return await Promise.any(
      proxyUrls.map(pu => withTimeout((async () => {
        const r = await fetch(pu);
        if (!r.ok) throw new Error(`${r.status}`);
        const j = await r.json();
        return parse(j?.contents ? JSON.parse(j.contents) : j);
      })(), 6000))
    );
  } catch { return []; }
}

async function fetchArexArrivals(stationName: string): Promise<SubwayArrival[]> {
  return fetchSeoulSubwayArrivals(stationName, item =>
    String(item.trainLineNm ?? "").includes("공항철도") ||
    String(item.subwayId ?? "") === "1065"
  );
}

async function fetchSeoul9Arrivals(stationName: string): Promise<SubwayArrival[]> {
  return fetchSeoulSubwayArrivals(stationName, item =>
    String(item.trainLineNm ?? "").includes("9호선") ||
    String(item.subwayId ?? "") === "1009"
  );
}

// ── 공통 도착정보 조회 ────────────────────────────────────────
export async function fetchSubwayArrivals(
  station: SubwayStationWithDist,
): Promise<SubwayArrival[]> {
  if (station.apiType === "ic1")    return fetchIc1Arrivals(station.stationCode);
  if (station.apiType === "arex")   return fetchArexArrivals(station.stationCode);
  if (station.apiType === "seoul9") return fetchSeoul9Arrivals(station.stationCode);
  return [];
}

// ── 시간표 기반 다음 열차 추정 (실시간 API 미설정 시 폴백) ────
export function estimateNextArrivals(
  timetable: SubwayStationEntry["timetable"],
): SubwayArrival[] {
  if (!timetable.intervalMin || timetable.upFirst === "-") return [];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const calc = (first: string, last: string, direction: "상행" | "하행"): SubwayArrival | null => {
    if (!first || first === "-") return null;
    const [fH, fM] = first.split(":").map(Number);
    const [lH, lM] = last.split(":").map(Number);
    const firstMin = fH * 60 + fM;
    let lastMin = lH * 60 + lM;
    if (lastMin < firstMin) lastMin += 1440; // 자정 넘어가는 경우

    let nowAdj = nowMin;
    if (nowAdj + 1440 < firstMin) nowAdj += 1440; // 자정 이전 조정

    if (nowAdj < firstMin) {
      if (firstMin - nowAdj > 120) return null; // 2시간 이상 남으면 표시 안 함
      return { direction, terminalStation: `${direction} 방면`, arrivalMin: firstMin - nowAdj, trainNo: "", currentStation: "시간표", isExpress: false };
    }
    if (nowAdj > lastMin) return null; // 운행 종료

    const nextOffset = timetable.intervalMin - ((nowAdj - firstMin) % timetable.intervalMin);
    return {
      direction,
      terminalStation: `${direction} 방면`,
      arrivalMin: nextOffset >= timetable.intervalMin ? 0 : nextOffset,
      trainNo: "",
      currentStation: "시간표",
      isExpress: false,
    };
  };

  const results: SubwayArrival[] = [];
  const up   = calc(timetable.upFirst,   timetable.upLast,   "상행");
  const down = calc(timetable.downFirst, timetable.downLast, "하행");
  if (up)   results.push(up);
  if (down) results.push(down);
  return results;
}
