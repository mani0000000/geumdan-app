/**
 * lib/api/subway.ts
 * 검단 인근 모든 지하철 역 + 실시간/시간표 도착정보
 *
 * 서버 라우트 /api/subway 를 통해 공공API를 호출한다.
 *   ic1/ic2  — 인천교통공사 IcSubwayInfoService (인천1·2호선 실시간)
 *   tagoArvl — 국토교통부 TAGO SubwayInfoService (서울/공항철도/김포공항/서해선/김포골드라인)
 *
 *  ※ 서울 열린데이터광장 의존 제거 — TAGO 로 통합.
 *     TAGO 가 실시간을 제공하지 않는 노선은 시간표 추정(estimateNextArrivals)으로 폴백한다.
 */

import { haversineM } from "./bus";

// ── 타입 정의 ─────────────────────────────────────────────────
export interface SubwayArrival {
  direction: "상행" | "하행";
  terminalStation: string;
  arrivalMin: number;
  trainNo: string;
  currentStation: string;
  isExpress: boolean;
  trainTypeName?: string;  // "직통", "급행" 등
}

// 인천교통공사 IcSubwayInfoService 는 1·2호선을 동일 엔드포인트로 제공한다.
// "ic1"/"ic2" 는 호선 표시 구분이며, 모두 동일 엔드포인트로 호출된다.
export type SubwayApiType = "ic1" | "ic2" | "arex" | "seoul5" | "seoul9" | "seohae" | "gimpogold" | "planned";

// 김포공항역 통합 그룹 — 같은 groupKey의 entry는 노선 탭 UI로 묶어서 표시
export const GIMPO_AIRPORT_GROUP = "gimpoair";

export interface SubwayStationEntry {
  id: string;
  displayName: string;
  line: string;
  lineColor: string;
  lat: number;
  lng: number;
  apiType: SubwayApiType;
  stationCode: string;
  /** TAGO SubwayInfoService 호출용 subwayStationId (MTRS 접두). 서울/공항철도/서해선/김포골드라인용 — 미제공 시 시간표 폴백 */
  tagoStationId?: string;
  planned?: boolean;
  groupKey?: string; // 같은 그룹(예: 김포공항역의 여러 노선)을 통합 카드로 묶을 때 사용
  shortLineLabel?: string; // 통합 카드 노선 탭에 표시할 짧은 라벨 (예: "5호선", "공항철도")
  timetable: {
    upFirst: string; upLast: string;
    downFirst: string; downLast: string;
    intervalMin: number;
    intervalDisplay?: string; // 표시용 배차 문자열 (예: "6~15분") — 불규칙 배차 시 사용
    upDirection: string;   // 상행 종착역 이름 (예: "서울역")
    downDirection: string; // 하행 종착역 이름 (예: "인천공항")
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
    timetable: { upFirst: "05:20", upLast: "23:28", downFirst: "05:43", downLast: "23:50", intervalMin: 10, intervalDisplay: "6~15분", upDirection: "서울역", downDirection: "인천공항2터미널" },
  },
  {
    id: "arex-gyeyang",
    displayName: "계양역(공항철도)",
    line: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5655, lng: 126.7294,
    apiType: "arex",
    stationCode: "계양",
    timetable: { upFirst: "05:28", upLast: "23:36", downFirst: "05:35", downLast: "23:43", intervalMin: 10, intervalDisplay: "6~15분", upDirection: "서울역", downDirection: "인천공항2터미널" },
  },

  // ── 김포공항역 환승 그룹 ─ 5호선·9호선·공항철도·서해선·김포골드라인 ──
  {
    id: "gimpoair-5",
    displayName: "김포공항역",
    line: "5호선",
    shortLineLabel: "5호선",
    lineColor: "#996CAC",
    lat: 37.5625, lng: 126.8013,
    apiType: "seoul5",
    stationCode: "김포공항",
    groupKey: GIMPO_AIRPORT_GROUP,
    timetable: { upFirst: "05:38", upLast: "00:13", downFirst: "05:18", downLast: "23:36", intervalMin: 6, intervalDisplay: "5~10분", upDirection: "방화", downDirection: "하남검단산" },
  },
  {
    id: "gimpoair-9",
    displayName: "김포공항역",
    line: "9호선",
    shortLineLabel: "9호선",
    lineColor: "#BDB048",
    lat: 37.5625, lng: 126.8013,
    apiType: "seoul9",
    stationCode: "김포공항",
    groupKey: GIMPO_AIRPORT_GROUP,
    timetable: { upFirst: "05:37", upLast: "23:57", downFirst: "05:30", downLast: "23:50", intervalMin: 9, upDirection: "중앙보훈병원", downDirection: "개화" },
  },
  {
    id: "gimpoair-arex",
    displayName: "김포공항역",
    line: "공항철도",
    shortLineLabel: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5625, lng: 126.8013,
    apiType: "arex",
    stationCode: "김포공항",
    groupKey: GIMPO_AIRPORT_GROUP,
    timetable: { upFirst: "05:43", upLast: "00:11", downFirst: "05:24", downLast: "23:54", intervalMin: 8, intervalDisplay: "6~12분", upDirection: "서울역", downDirection: "인천공항2터미널" },
  },
  {
    id: "gimpoair-seohae",
    displayName: "김포공항역",
    line: "서해선",
    shortLineLabel: "서해선",
    lineColor: "#81A914",
    lat: 37.5625, lng: 126.8013,
    apiType: "seohae",
    stationCode: "김포공항",
    groupKey: GIMPO_AIRPORT_GROUP,
    timetable: { upFirst: "05:36", upLast: "23:43", downFirst: "05:33", downLast: "23:23", intervalMin: 14, intervalDisplay: "12~20분", upDirection: "일산", downDirection: "원시" },
  },
  {
    id: "gimpoair-gold",
    displayName: "김포공항역",
    line: "김포골드라인",
    shortLineLabel: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.5625, lng: 126.8013,
    apiType: "gimpogold",
    stationCode: "김포공항",
    groupKey: GIMPO_AIRPORT_GROUP,
    timetable: { upFirst: "05:30", upLast: "00:09", downFirst: "-", downLast: "-", intervalMin: 4, intervalDisplay: "3~10분", upDirection: "양촌", downDirection: "-" },
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
    timetable: { upFirst: "05:35", upLast: "23:55", downFirst: "05:27", downLast: "23:47", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "ic1-gyulhyeon",
    displayName: "귤현역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5594, lng: 126.7411,
    apiType: "ic1",
    stationCode: "I024",
    timetable: { upFirst: "05:36", upLast: "23:56", downFirst: "05:26", downLast: "23:46", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "ic1-bakchon",
    displayName: "박촌역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5513, lng: 126.7432,
    apiType: "ic1",
    stationCode: "I025",
    timetable: { upFirst: "05:37", upLast: "23:57", downFirst: "05:25", downLast: "23:45", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "ic1-imhak",
    displayName: "임학역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5441, lng: 126.7380,
    apiType: "ic1",
    stationCode: "I026",
    timetable: { upFirst: "05:39", upLast: "23:59", downFirst: "05:23", downLast: "23:43", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "ic1-gyesan",
    displayName: "계산역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5389, lng: 126.7285,
    apiType: "ic1",
    stationCode: "I027",
    timetable: { upFirst: "05:41", upLast: "00:01", downFirst: "05:21", downLast: "23:41", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },

  // 인천1호선 검단 연장 구간 — 검단호수공원역이 현재 하행 종점
  {
    id: "gd-singeumdan",
    displayName: "신검단중앙역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5930, lng: 126.7095,
    apiType: "ic1",
    stationCode: "I050",
    timetable: { upFirst: "05:40", upLast: "23:55", downFirst: "05:35", downLast: "23:50", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "gd-gdlake",
    displayName: "검단호수공원역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5870, lng: 126.7025,
    apiType: "ic1",
    stationCode: "I051",
    timetable: { upFirst: "05:42", upLast: "23:57", downFirst: "-", downLast: "-", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },
  {
    id: "gd-ara",
    displayName: "아라역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5778, lng: 126.6932,
    apiType: "ic1",
    stationCode: "I052",
    timetable: { upFirst: "05:44", upLast: "23:59", downFirst: "05:31", downLast: "23:46", intervalMin: 6, upDirection: "국제업무지구", downDirection: "검단호수공원" },
  },

  // 서울 9호선 — 검단에서 가장 가까운 서쪽 종점
  {
    id: "seoul9-gaehwa",
    displayName: "개화역",
    line: "9호선",
    lineColor: "#BDB048",
    lat: 37.5783, lng: 126.7986,
    apiType: "seoul9",
    stationCode: "개화",
    timetable: { upFirst: "05:30", upLast: "23:52", downFirst: "-", downLast: "-", intervalMin: 6, intervalDisplay: "4~12분", upDirection: "중앙보훈병원", downDirection: "개화" },
  },

  // 인천2호선 — 검단신도시 통과 구간
  {
    id: "ic2-geomdanoryu",
    displayName: "검단오류역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.6079, lng: 126.6488,
    apiType: "ic2",
    stationCode: "I201",
    timetable: { upFirst: "05:30", upLast: "24:12", downFirst: "-", downLast: "-", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-wanggil",
    displayName: "왕길역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.6004, lng: 126.6595,
    apiType: "ic2",
    stationCode: "I202",
    timetable: { upFirst: "05:32", upLast: "24:14", downFirst: "05:40", downLast: "25:03", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-geomdansageori",
    displayName: "검단사거리역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5961, lng: 126.6692,
    apiType: "ic2",
    stationCode: "I203",
    timetable: { upFirst: "05:34", upLast: "24:17", downFirst: "05:38", downLast: "25:01", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-majeon",
    displayName: "마전역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5891, lng: 126.6781,
    apiType: "ic2",
    stationCode: "I204",
    timetable: { upFirst: "05:36", upLast: "24:19", downFirst: "05:36", downLast: "24:59", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-wanjeong",
    displayName: "완정역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5818, lng: 126.6847,
    apiType: "ic2",
    stationCode: "I205",
    timetable: { upFirst: "05:38", upLast: "24:21", downFirst: "05:34", downLast: "24:57", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-dokjeong",
    displayName: "독정역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5810, lng: 126.6790,
    apiType: "ic2",
    stationCode: "I206",
    timetable: { upFirst: "05:40", upLast: "24:23", downFirst: "05:32", downLast: "24:55", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-geomam",
    displayName: "검암역(인천2호선)",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5688, lng: 126.6731,
    apiType: "ic2",
    stationCode: "I207",
    timetable: { upFirst: "05:42", upLast: "24:25", downFirst: "05:30", downLast: "24:53", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },
  {
    id: "ic2-gajeong",
    displayName: "가정역",
    line: "인천2호선",
    lineColor: "#ED8B00",
    lat: 37.5481, lng: 126.6635,
    apiType: "ic2",
    stationCode: "I208",
    timetable: { upFirst: "05:44", upLast: "24:27", downFirst: "05:28", downLast: "24:51", intervalMin: 5, intervalDisplay: "3~10분", upDirection: "운연", downDirection: "검단오류" },
  },

  // ── 김포 골드라인 (양촌 ↔ 김포공항) — TAGO 시간표 폴백 ─────────
  {
    id: "gold-yangchon",
    displayName: "양촌역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6463, lng: 126.6402,
    apiType: "gimpogold",
    stationCode: "양촌",
    timetable: { upFirst: "-", upLast: "-", downFirst: "05:30", downLast: "23:55", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "-", downDirection: "양촌" },
  },
  {
    id: "gold-gurae",
    displayName: "구래역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6457, lng: 126.6298,
    apiType: "gimpogold",
    stationCode: "구래",
    timetable: { upFirst: "05:32", upLast: "23:57", downFirst: "05:30", downLast: "23:55", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-masan",
    displayName: "마산역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6336, lng: 126.6432,
    apiType: "gimpogold",
    stationCode: "마산",
    timetable: { upFirst: "05:34", upLast: "23:59", downFirst: "05:28", downLast: "23:53", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-janggi",
    displayName: "장기역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6263, lng: 126.6499,
    apiType: "gimpogold",
    stationCode: "장기",
    timetable: { upFirst: "05:36", upLast: "00:01", downFirst: "05:26", downLast: "23:51", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-unyang",
    displayName: "운양역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6182, lng: 126.6643,
    apiType: "gimpogold",
    stationCode: "운양",
    timetable: { upFirst: "05:38", upLast: "00:03", downFirst: "05:24", downLast: "23:49", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-geolpobukbyeon",
    displayName: "걸포북변역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6092, lng: 126.6927,
    apiType: "gimpogold",
    stationCode: "걸포북변",
    timetable: { upFirst: "05:40", upLast: "00:05", downFirst: "05:22", downLast: "23:47", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-sau",
    displayName: "사우(김포시청)역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6149, lng: 126.7156,
    apiType: "gimpogold",
    stationCode: "사우",
    timetable: { upFirst: "05:42", upLast: "00:07", downFirst: "05:20", downLast: "23:45", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-pungmu",
    displayName: "풍무역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6101, lng: 126.7320,
    apiType: "gimpogold",
    stationCode: "풍무",
    timetable: { upFirst: "05:44", upLast: "00:09", downFirst: "05:18", downLast: "23:43", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
  {
    id: "gold-gochon",
    displayName: "고촌역",
    line: "김포골드라인",
    lineColor: "#AA8F3D",
    lat: 37.6020, lng: 126.7693,
    apiType: "gimpogold",
    stationCode: "고촌",
    timetable: { upFirst: "05:46", upLast: "00:11", downFirst: "05:16", downLast: "23:41", intervalMin: 4, intervalDisplay: "3~7분", upDirection: "김포공항", downDirection: "양촌" },
  },
];

// ── 전체 역 목록 (미개통 제외) ───────────────────────────────
export function getAllSubwayStations(): SubwayStationWithDist[] {
  return STATION_DB.filter(st => !st.planned).map(st => ({ ...st, distM: 0 }));
}

// ── GPS 기반 인근 역 탐색 (미개통 제외) ──────────────────────
export function findNearbySubwayStations(
  lat: number,
  lng: number,
  radiusM = 10000,
): SubwayStationWithDist[] {
  return STATION_DB
    .filter(st => !st.planned)
    .map(st => ({ ...st, distM: Math.round(haversineM(lat, lng, st.lat, st.lng)) }))
    .filter(st => st.distM <= radiusM)
    .sort((a, b) => a.distM - b.distM);
}

// 서버 라우트가 키를 관리하므로 클라이언트는 항상 활성으로 취급
export function hasSubwayKey() { return true; }

// 운행 시간 내인지 확인 (종료 후 스테일 데이터 방지)
function isInServiceHours(timetable: SubwayStationEntry["timetable"]): boolean {
  if (timetable.upFirst === "-") return true;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const parse = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const firstMin = parse(timetable.upFirst);
  // 종점역(편도)인 경우 downLast가 "-" → upLast로 폴백
  const lastTimeStr = timetable.downLast !== "-" ? timetable.downLast : timetable.upLast;
  let lastMin = parse(lastTimeStr);
  if (lastMin < firstMin) lastMin += 1440;
  // 첫차 20분 전 ~ 막차 30분 후 사이
  const start = firstMin - 20;
  const end = lastMin + 30;
  const nowAdj = nowMin < start - 600 ? nowMin + 1440 : nowMin;
  return nowAdj >= start && nowAdj <= end;
}

// ── 인천1호선 도착정보 ────────────────────────────────────────
async function fetchIc1Arrivals(stationCode: string): Promise<SubwayArrival[]> {
  try {
    const res = await fetch(
      `/api/subway?type=ic1&stationId=${encodeURIComponent(stationCode)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
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
  } catch {
    return [];
  }
}

// ── TAGO 실시간 도착정보 (제공 노선만) ────────────────────────
//   ※ TAGO SubwayInfoService 가 실시간을 미제공하면 빈 배열 → 시간표 폴백.
async function fetchTagoArrivals(subwayStationId: string): Promise<SubwayArrival[]> {
  if (!subwayStationId) return [];
  try {
    const res = await fetch(
      `/api/subway?type=tagoArvl&subwayStationId=${encodeURIComponent(subwayStationId)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = data?.response?.body?.items?.item as any[] | undefined;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(item => {
      const upDown = String(item.upDownTypeCode ?? item.upDown ?? "").toUpperCase();
      const direction = upDown === "U" ? "상행" as const : "하행" as const;
      const arrTime = Number(item.arrTime ?? item.arvlTime ?? 0);
      const typeStr = String(item.trainTypeNm ?? item.trainType ?? "");
      const isExpress = typeStr.includes("급행") || typeStr.includes("직통");
      const trainTypeName = typeStr.includes("직통") ? "직통"
        : typeStr.includes("급행") ? "급행"
        : undefined;
      return {
        direction,
        terminalStation: String(item.endSubwayStationNm ?? item.terminalSubwayStationNm ?? "종착"),
        arrivalMin: Math.max(0, Math.round(arrTime / 60)),
        trainNo: String(item.trainNo ?? ""),
        currentStation: String(item.subwayStationNm ?? ""),
        isExpress,
        trainTypeName,
      };
    });
  } catch {
    return [];
  }
}

// ── 공통 도착정보 조회 ────────────────────────────────────────
export async function fetchSubwayArrivals(
  station: SubwayStationWithDist,
): Promise<SubwayArrival[]> {
  // 운행 시간 외 → 시간표 추정으로 폴백 (스테일 실시간 데이터 방지)
  if (!isInServiceHours(station.timetable)) return [];
  // 인천 1·2호선은 인천교통공사 실시간 (검증된 동작 노선)
  if (station.apiType === "ic1" || station.apiType === "ic2") {
    return fetchIc1Arrivals(station.stationCode);
  }
  // 그 외 노선은 TAGO 실시간 시도 → 미제공이면 시간표 폴백
  if (station.tagoStationId) return fetchTagoArrivals(station.tagoStationId);
  return [];
}

// ── 시간표 기반 다음 열차 추정 (실시간 API 미설정 시 폴백) ────
// perDirection: 방향당 반환할 열차 수 (기본 1대)
export function estimateNextArrivals(
  timetable: SubwayStationEntry["timetable"],
  perDirection = 1,
): SubwayArrival[] {
  if (!timetable.intervalMin || timetable.upFirst === "-") return [];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const calc = (first: string, last: string, direction: "상행" | "하행", destName: string): SubwayArrival[] => {
    if (!first || first === "-") return [];
    const [fH, fM] = first.split(":").map(Number);
    const [lH, lM] = last.split(":").map(Number);
    const firstMin = fH * 60 + fM;
    let lastMin = lH * 60 + lM;
    if (lastMin < firstMin) lastMin += 1440;

    let nowAdj = nowMin;
    if (nowAdj + 1440 < firstMin) nowAdj += 1440;

    // 첫차 전: 첫차까지 2시간 이내일 때만 안내
    if (nowAdj < firstMin) {
      if (firstMin - nowAdj > 120) return [];
      const out: SubwayArrival[] = [];
      for (let i = 0; i < perDirection; i++) {
        const arr = firstMin - nowAdj + i * timetable.intervalMin;
        if (firstMin + i * timetable.intervalMin > lastMin) break;
        out.push({ direction, terminalStation: destName, arrivalMin: arr, trainNo: "", currentStation: "시간표", isExpress: false });
      }
      return out;
    }
    if (nowAdj > lastMin) return [];

    const nextOffset = timetable.intervalMin - ((nowAdj - firstMin) % timetable.intervalMin);
    const baseArr = nextOffset >= timetable.intervalMin ? 0 : nextOffset;
    const out: SubwayArrival[] = [];
    for (let i = 0; i < perDirection; i++) {
      const arr = baseArr + i * timetable.intervalMin;
      if (nowAdj + arr > lastMin) break;
      out.push({ direction, terminalStation: destName, arrivalMin: arr, trainNo: "", currentStation: "시간표", isExpress: false });
    }
    return out;
  };

  return [
    ...calc(timetable.upFirst,   timetable.upLast,   "상행", timetable.upDirection),
    ...calc(timetable.downFirst, timetable.downLast, "하행", timetable.downDirection),
  ];
}
