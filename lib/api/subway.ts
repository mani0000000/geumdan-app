/**
 * lib/api/subway.ts
 * 인천1호선 + 공항철도 + 서울9호선 실시간 도착정보 + 시간표
 *
 * 서버 라우트 /api/subway 를 통해 공공API를 호출한다.
 *   ic1   — 인천교통공사 도시철도 (공공데이터포털 6280000, DATA_GO_KR_API_KEY)
 *   seoul — 서울 열린데이터광장 (공항철도·9호선 도착정보, SEOUL_SUBWAY_KEY)
 *
 * 시간표 출처(2026-05 기준):
 *   인천1호선  https://www.ictr.or.kr/main/railway/guidance/timetable1_se.jsp
 *   공항철도   https://www.airportrailroad.com/train/normal/info/{역코드}/0|1
 *   9호선      https://www.metro9.co.kr / korailinfo.com
 *
 *   공식 시간표가 평일 / 휴일(토·일·공휴일) 2분류로만 공시되므로 본 모듈도 2분류만 다룬다.
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

// 환승역 통합 그룹 — 같은 groupKey의 entry는 환승 카드로 묶어서 표시
// 같은 좌표·같은 역사를 공유하는 노선들에만 적용한다.
export const GIMPO_AIRPORT_GROUP = "gimpoair";
export const GYEYANG_GROUP = "gyeyang";
export const GEOMAM_GROUP = "geomam";

export type SubwayDayType = "weekday" | "holiday";

export interface DayTimetable {
  upFirst: string; upLast: string;
  downFirst: string; downLast: string;
  intervalMin: number;
  intervalDisplay?: string; // 표시용 배차 문자열 (예: "5~9분") — 불규칙 배차 시 사용
}

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
    upDirection: string;   // 상행 종착역 이름 (예: "서울역")
    downDirection: string; // 하행 종착역 이름 (예: "인천공항")
    weekday: DayTimetable; // 평일
    holiday: DayTimetable; // 휴일(토·일·공휴일)
  };
}

export interface SubwayStationWithDist extends SubwayStationEntry {
  distM: number;
}

// ── 한국 공휴일 (간이) ────────────────────────────────────────
// 공식 시간표가 토·일·공휴일을 모두 "휴일"로 동일 취급하므로 주요 공휴일만 등록
const KR_HOLIDAYS_2026 = new Set([
  "2026-01-01", // 신정
  "2026-02-16", "2026-02-17", "2026-02-18", // 설 연휴
  "2026-03-01", "2026-03-02", // 삼일절 대체
  "2026-05-05", // 어린이날
  "2026-05-25", // 부처님오신날 대체
  "2026-06-03", // 21대 대선
  "2026-06-06", // 현충일
  "2026-08-15", // 광복절
  "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", // 추석 연휴
  "2026-10-03", // 개천절
  "2026-10-05", // 개천절 대체
  "2026-10-09", // 한글날
  "2026-12-25", // 성탄절
]);

export function currentDayType(now: Date = new Date()): SubwayDayType {
  const day = now.getDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return "holiday";
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return KR_HOLIDAYS_2026.has(`${yyyy}-${mm}-${dd}`) ? "holiday" : "weekday";
}

export function dayTimetable(
  t: SubwayStationEntry["timetable"],
  dayType: SubwayDayType = currentDayType(),
): DayTimetable {
  return dayType === "holiday" ? t.holiday : t.weekday;
}

// ── 역 데이터베이스 ───────────────────────────────────────────
// 인천1호선: 상행 = 송도달빛축제공원 방면(남쪽 종점), 하행 = 검단호수공원 방면(북쪽 종점)
//   (실시간 도착정보 API의 UPDOWN 라벨 및 ICTR 시각표 컬럼과 정합)
const STATION_DB: SubwayStationEntry[] = [
  // ── 공항철도 (AREX) ──────────────────────────────────────────
  // 출처: https://www.airportrailroad.com/train/normal/info/070/0 (평일/휴일 동일)
  {
    id: "arex-geomam",
    displayName: "검암역",
    line: "공항철도",
    shortLineLabel: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5569, lng: 126.6719,
    apiType: "arex",
    stationCode: "검암",
    timetable: {
      upDirection: "서울역",
      downDirection: "인천공항2터미널",
      weekday: { upFirst: "05:30", upLast: "00:04", downFirst: "05:08", downLast: "00:00", intervalMin: 10, intervalDisplay: "6~15분" },
      holiday: { upFirst: "05:30", upLast: "00:04", downFirst: "05:08", downLast: "00:00", intervalMin: 10, intervalDisplay: "6~15분" },
    },
  },
  {
    id: "arex-gyeyang",
    displayName: "계양역",
    line: "공항철도",
    shortLineLabel: "공항철도",
    lineColor: "#0065B3",
    lat: 37.5655, lng: 126.7294,
    apiType: "arex",
    stationCode: "계양",
    timetable: {
      upDirection: "서울역",
      downDirection: "인천공항2터미널",
      weekday: { upFirst: "05:36", upLast: "00:10", downFirst: "05:49", downLast: "23:51", intervalMin: 10, intervalDisplay: "6~15분" },
      holiday: { upFirst: "05:36", upLast: "00:10", downFirst: "05:49", downLast: "23:51", intervalMin: 10, intervalDisplay: "6~15분" },
    },
  },

  // ── 서울 9호선 ────────────────────────────────────────────────
  // 출처: https://korailinfo.com/bbs/board.php?bo_table=line09&wr_id=37
  {
    id: "gimpoair-9",
    displayName: "김포공항역",
    line: "9호선",
    shortLineLabel: "9호선",
    lineColor: "#BDB048",
    lat: 37.5625, lng: 126.8013,
    apiType: "seoul9",
    stationCode: "김포공항",
    timetable: {
      upDirection: "중앙보훈병원",
      downDirection: "개화",
      weekday: { upFirst: "05:35", upLast: "23:44", downFirst: "05:41", downLast: "00:57", intervalMin: 6, intervalDisplay: "3~12분" },
      holiday: { upFirst: "05:30", upLast: "22:53", downFirst: "05:40", downLast: "00:07", intervalMin: 8, intervalDisplay: "6~12분" },
    },
  },

  // ── 인천1호선 ────────────────────────────────────────────────
  // 출처: https://www.ictr.or.kr/main/railway/guidance/timetable1_se.jsp
  // 상행(up) = 송도달빛축제공원 방면, 하행(down) = 검단호수공원 방면
  {
    id: "ic1-gyeyang",
    displayName: "계양역",
    line: "인천1호선",
    shortLineLabel: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5655, lng: 126.7294,
    apiType: "ic1",
    stationCode: "I023",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:39", upLast: "00:39", downFirst: "05:42", downLast: "00:52", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:39", upLast: "00:39", downFirst: "05:42", downLast: "00:52", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
  {
    id: "ic1-bakchon",
    displayName: "박촌역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5513, lng: 126.7432,
    apiType: "ic1",
    stationCode: "I024",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:30", upLast: "00:44", downFirst: "05:37", downLast: "00:47", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:33", upLast: "00:44", downFirst: "05:37", downLast: "00:47", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
  {
    id: "ic1-imhak",
    displayName: "임학역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5441, lng: 126.7380,
    apiType: "ic1",
    stationCode: "I025",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:32", upLast: "00:46", downFirst: "05:35", downLast: "00:45", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:35", upLast: "00:46", downFirst: "05:35", downLast: "00:45", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
  {
    id: "ic1-gyesan",
    displayName: "계산역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5389, lng: 126.7285,
    apiType: "ic1",
    stationCode: "I026",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:34", upLast: "00:48", downFirst: "05:33", downLast: "00:43", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:37", upLast: "00:48", downFirst: "05:33", downLast: "00:43", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },

  // 인천1호선 검단연장 구간 (2025.6.28 개통, 운영 중)
  {
    id: "gd-singeumdan",
    displayName: "신검단중앙역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.6048, lng: 126.7024,
    apiType: "ic1",
    stationCode: "I050",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:32", upLast: "00:32", downFirst: "05:49", downLast: "00:59", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:32", upLast: "00:32", downFirst: "05:42", downLast: "00:59", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
  {
    id: "gd-gdlake",
    displayName: "검단호수공원역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.6025, lng: 126.6881,
    apiType: "ic1",
    stationCode: "I051",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      // 북쪽 종점 — 검단호수공원 방면(down) 시간표 없음
      weekday: { upFirst: "05:30", upLast: "00:30", downFirst: "-", downLast: "-", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:30", upLast: "00:30", downFirst: "-", downLast: "-", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
  {
    id: "gd-ara",
    displayName: "아라역",
    line: "인천1호선",
    lineColor: "#759CCE",
    lat: 37.5922, lng: 126.7133,
    apiType: "ic1",
    stationCode: "I052",
    timetable: {
      upDirection: "송도달빛축제공원",
      downDirection: "검단호수공원",
      weekday: { upFirst: "05:34", upLast: "00:35", downFirst: "05:47", downLast: "00:57", intervalMin: 8, intervalDisplay: "5~9분" },
      holiday: { upFirst: "05:34", upLast: "00:35", downFirst: "05:47", downLast: "00:57", intervalMin: 10, intervalDisplay: "9~10분" },
    },
  },
];

// ── 전체 역 목록 (미개통 제외) ───────────────────────────────
export function getAllSubwayStations(): SubwayStationWithDist[] {
  return STATION_DB.filter(st => !st.planned).map(st => ({ ...st, distM: 0 }));
}

// ── GPS 기반 거리 계산 + 가까운 순 정렬 (미개통 제외, 반경 제한 없음) ──
export function findNearbySubwayStations(
  lat: number,
  lng: number,
  radiusM = Infinity,
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
  const today = dayTimetable(timetable);
  if (today.upFirst === "-" && today.downFirst === "-") return true;
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const parse = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const firstStr = today.upFirst !== "-" ? today.upFirst : today.downFirst;
  const lastStr  = today.downLast !== "-" ? today.downLast : today.upLast;
  const firstMin = parse(firstStr);
  let lastMin = parse(lastStr);
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
  const today = dayTimetable(timetable);
  if (!today.intervalMin) return [];
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const calc = (
    first: string, last: string, intervalMin: number,
    direction: "상행" | "하행", destName: string,
    isExpress: boolean, expressLabel?: string,
  ): SubwayArrival[] => {
    if (!first || first === "-" || !intervalMin) return [];
    const [fH, fM] = first.split(":").map(Number);
    const [lH, lM] = last.split(":").map(Number);
    const firstMin = fH * 60 + fM;
    let lastMin = lH * 60 + lM;
    if (lastMin < firstMin) lastMin += 1440;

    let nowAdj = nowMin;
    if (nowAdj + 1440 < firstMin) nowAdj += 1440;

    const trainTypeName = isExpress ? expressLabel : undefined;

    // 첫차 전: 첫차까지 2시간 이내일 때만 안내
    if (nowAdj < firstMin) {
      if (firstMin - nowAdj > 120) return [];
      const out: SubwayArrival[] = [];
      for (let i = 0; i < perDirection; i++) {
        const arr = firstMin - nowAdj + i * intervalMin;
        if (firstMin + i * intervalMin > lastMin) break;
        out.push({ direction, terminalStation: destName, arrivalMin: arr, trainNo: "", currentStation: "시간표", isExpress, trainTypeName });
      }
      return out;
    }
    if (nowAdj > lastMin) return [];

    const nextOffset = today.intervalMin - ((nowAdj - firstMin) % today.intervalMin);
    return {
      direction,
      terminalStation: destName,
      arrivalMin: nextOffset >= today.intervalMin ? 0 : nextOffset,
      trainNo: "",
      currentStation: "시간표",
      isExpress: false,
    };
  };

  const results: SubwayArrival[] = [];
  const up   = calc(today.upFirst,   today.upLast,   "상행", timetable.upDirection);
  const down = calc(today.downFirst, today.downLast, "하행", timetable.downDirection);
  if (up)   results.push(up);
  if (down) results.push(down);
  return results;
}
