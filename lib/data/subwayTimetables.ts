/**
 * lib/data/subwayTimetables.ts
 *
 * 서울 지하철 9호선 / 인천 도시철도 2호선 정적 시간표 데이터.
 * 평일·토요일·일요일(공휴일 동일) 기준 첫차/막차를 양방향 모두 수록.
 *
 * 자정을 넘어가는 막차는 24:xx, 25:xx 표기를 유지한다.
 *   - lib/api/subway.ts 의 isInServiceHours/estimateNextArrivals 가 같은 규약을 사용한다.
 *
 * Sources (fetched 2026-05-04):
 *   - 인천교통공사 2호선 첫차/막차: https://www.ictr.or.kr/main/railway/guidance/timetable2_se.jsp
 *   - 서울시메트로9호선 열차시각표: https://www.metro9.co.kr/prog/subwayTm/kor/sub01_02/list.do
 *   - 역별 첫차/막차 보조 자료: https://metro-time-info.appspot.com/seoul/
 *
 * 9호선의 경우 다수의 기점역(개화·김포공항·마곡나루·염창·당산·동작·신논현·종합운동장)에서
 * 출발하는 단축 운행 열차가 있어 역별 첫차 시간이 단조롭게 증가하지 않는다.
 * 본 데이터에는 해당 역에서 잡을 수 있는 가장 이른 상행/하행 열차를 기준으로 표기.
 * 직접 확인되지 않은 역은 이웃한 확인 데이터로부터 보간한다.
 */

export type SubwayDayType = "weekday" | "saturday" | "sunday";

export interface SubwayDayFirstLast {
  /** 첫차 (HH:MM, 24h) */
  first: string;
  /** 막차 (HH:MM, 자정 이후는 24·25시 표기) */
  last: string;
}

export interface SubwayDirectionTimetable {
  weekday: SubwayDayFirstLast;
  saturday: SubwayDayFirstLast;
  sunday: SubwayDayFirstLast;
}

export interface SubwayLineStation {
  /** 역 번호 (예: "902", "I201") */
  code: string;
  /** 역명 */
  name: string;
  /** 하행 종점 → 상행 종점 방향(상행) 첫·막차 */
  up: SubwayDirectionTimetable;
  /** 상행 종점 → 하행 종점 방향(하행) 첫·막차 */
  down: SubwayDirectionTimetable;
}

export interface SubwayLineTimetable {
  id: string;
  /** 노선명 (예: "9호선") */
  name: string;
  /** 노선 색 (#RRGGBB) */
  color: string;
  /** 상행(up) 종점 — 표시상의 종점 이름 */
  upTerminus: string;
  /** 하행(down) 종점 */
  downTerminus: string;
  /** 표시용 배차 문자열 (예: "4~12분") */
  intervalDisplay: string;
  /** 평균 배차 (분) — estimateNextArrivals 호환 */
  intervalMin: number;
  /** 운영 주체 */
  operator: string;
  /** 추가 안내 */
  notes?: string;
  /**
   * 노선상의 역 목록.
   * 인덱스 0이 하행(down) 종점, 마지막 인덱스가 상행(up) 종점.
   * 즉 9호선은 [0]=개화, [37]=중앙보훈병원 / 인천2호선은 [0]=검단오류, [26]=운연.
   */
  stations: SubwayLineStation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 서울 지하철 9호선
// 개화(902의 한 정거장 전) → 중앙보훈병원(938)
//
// 평일 막차 ~24:55(상행 김포공항~당산 구간), 주말은 1시간 정도 단축.
// 첫차는 평일·주말 모두 05:30 전후로 거의 동일하다.
//
// 9호선 운영주체:
//   1단계 (901 개화 ~ 925 신논현)         서울시메트로9호선(주)
//   2/3단계 (926 언주 ~ 938 중앙보훈병원) 서울교통공사
// ─────────────────────────────────────────────────────────────────────────────

export const SEOUL_LINE_9: SubwayLineTimetable = {
  id: "seoul-9",
  name: "9호선",
  color: "#BDB048",
  upTerminus: "중앙보훈병원",
  downTerminus: "개화",
  intervalDisplay: "4~12분",
  intervalMin: 6,
  operator: "서울시메트로9호선 / 서울교통공사",
  notes:
    "급행은 김포공항·당산·여의도·노량진·동작·고속터미널·신논현·선정릉·봉은사·종합운동장·올림픽공원·중앙보훈병원에 정차한다.",
  stations: [
    {
      code: "901", name: "개화",
      up:   { weekday: { first: "05:30", last: "23:52" }, saturday: { first: "05:30", last: "22:57" }, sunday: { first: "05:30", last: "22:57" } },
      down: { weekday: { first: "-",     last: "-"     }, saturday: { first: "-",     last: "-"     }, sunday: { first: "-",     last: "-"     } },
    },
    {
      code: "902", name: "김포공항",
      up:   { weekday: { first: "05:30", last: "24:49" }, saturday: { first: "05:30", last: "23:49" }, sunday: { first: "05:30", last: "23:49" } },
      down: { weekday: { first: "05:40", last: "24:59" }, saturday: { first: "05:42", last: "24:08" }, sunday: { first: "05:42", last: "24:08" } },
    },
    {
      code: "903", name: "공항시장",
      up:   { weekday: { first: "05:32", last: "24:51" }, saturday: { first: "05:32", last: "23:51" }, sunday: { first: "05:32", last: "23:51" } },
      down: { weekday: { first: "05:38", last: "24:57" }, saturday: { first: "05:40", last: "24:06" }, sunday: { first: "05:40", last: "24:06" } },
    },
    {
      code: "904", name: "신방화",
      up:   { weekday: { first: "05:33", last: "24:53" }, saturday: { first: "05:33", last: "23:53" }, sunday: { first: "05:33", last: "23:53" } },
      down: { weekday: { first: "05:36", last: "24:55" }, saturday: { first: "05:37", last: "24:04" }, sunday: { first: "05:37", last: "24:04" } },
    },
    {
      code: "905", name: "마곡나루",
      up:   { weekday: { first: "05:30", last: "24:55" }, saturday: { first: "05:30", last: "23:54" }, sunday: { first: "05:30", last: "23:54" } },
      down: { weekday: { first: "05:35", last: "24:54" }, saturday: { first: "05:36", last: "24:02" }, sunday: { first: "05:36", last: "24:02" } },
    },
    {
      code: "906", name: "양천향교",
      up:   { weekday: { first: "05:32", last: "24:57" }, saturday: { first: "05:32", last: "23:56" }, sunday: { first: "05:32", last: "23:56" } },
      down: { weekday: { first: "05:33", last: "24:52" }, saturday: { first: "05:34", last: "24:00" }, sunday: { first: "05:34", last: "24:00" } },
    },
    {
      code: "907", name: "가양",
      up:   { weekday: { first: "05:34", last: "24:47" }, saturday: { first: "05:33", last: "23:47" }, sunday: { first: "05:33", last: "23:47" } },
      down: { weekday: { first: "05:30", last: "24:59" }, saturday: { first: "05:32", last: "23:57" }, sunday: { first: "05:32", last: "23:57" } },
    },
    {
      code: "908", name: "증미",
      up:   { weekday: { first: "05:36", last: "24:48" }, saturday: { first: "05:35", last: "23:48" }, sunday: { first: "05:35", last: "23:48" } },
      down: { weekday: { first: "05:32", last: "24:57" }, saturday: { first: "05:34", last: "23:56" }, sunday: { first: "05:34", last: "23:56" } },
    },
    {
      code: "909", name: "등촌",
      up:   { weekday: { first: "05:38", last: "24:50" }, saturday: { first: "05:37", last: "23:50" }, sunday: { first: "05:37", last: "23:50" } },
      down: { weekday: { first: "05:34", last: "24:56" }, saturday: { first: "05:35", last: "23:54" }, sunday: { first: "05:35", last: "23:54" } },
    },
    {
      code: "910", name: "염창",
      up:   { weekday: { first: "05:31", last: "24:53" }, saturday: { first: "05:31", last: "23:53" }, sunday: { first: "05:31", last: "23:53" } },
      down: { weekday: { first: "05:36", last: "24:55" }, saturday: { first: "05:37", last: "24:00" }, sunday: { first: "05:37", last: "24:00" } },
    },
    {
      code: "911", name: "신목동",
      up:   { weekday: { first: "05:33", last: "24:55" }, saturday: { first: "05:33", last: "23:55" }, sunday: { first: "05:33", last: "23:55" } },
      down: { weekday: { first: "05:35", last: "24:53" }, saturday: { first: "05:36", last: "23:58" }, sunday: { first: "05:36", last: "23:58" } },
    },
    {
      code: "912", name: "선유도",
      up:   { weekday: { first: "05:34", last: "24:57" }, saturday: { first: "05:34", last: "23:56" }, sunday: { first: "05:34", last: "23:56" } },
      down: { weekday: { first: "05:33", last: "24:51" }, saturday: { first: "05:34", last: "23:56" }, sunday: { first: "05:34", last: "23:56" } },
    },
    {
      code: "913", name: "당산",
      up:   { weekday: { first: "05:32", last: "24:46" }, saturday: { first: "05:31", last: "23:47" }, sunday: { first: "05:31", last: "23:47" } },
      down: { weekday: { first: "05:30", last: "24:51" }, saturday: { first: "05:31", last: "23:54" }, sunday: { first: "05:31", last: "23:54" } },
    },
    {
      code: "914", name: "국회의사당",
      up:   { weekday: { first: "05:34", last: "24:48" }, saturday: { first: "05:33", last: "23:49" }, sunday: { first: "05:33", last: "23:49" } },
      down: { weekday: { first: "05:38", last: "24:55" }, saturday: { first: "05:39", last: "23:56" }, sunday: { first: "05:39", last: "23:56" } },
    },
    {
      code: "915", name: "여의도",
      up:   { weekday: { first: "05:35", last: "24:51" }, saturday: { first: "05:34", last: "23:51" }, sunday: { first: "05:34", last: "23:51" } },
      down: { weekday: { first: "05:40", last: "24:53" }, saturday: { first: "05:41", last: "23:57" }, sunday: { first: "05:41", last: "23:57" } },
    },
    {
      code: "916", name: "샛강",
      up:   { weekday: { first: "05:37", last: "24:53" }, saturday: { first: "05:36", last: "23:53" }, sunday: { first: "05:36", last: "23:53" } },
      down: { weekday: { first: "05:38", last: "24:51" }, saturday: { first: "05:39", last: "23:55" }, sunday: { first: "05:39", last: "23:55" } },
    },
    {
      code: "917", name: "노량진",
      up:   { weekday: { first: "05:33", last: "24:29" }, saturday: { first: "05:33", last: "23:36" }, sunday: { first: "05:33", last: "23:36" } },
      down: { weekday: { first: "05:36", last: "24:24" }, saturday: { first: "05:36", last: "23:33" }, sunday: { first: "05:36", last: "23:33" } },
    },
    {
      code: "918", name: "노들",
      up:   { weekday: { first: "05:34", last: "24:31" }, saturday: { first: "05:35", last: "23:38" }, sunday: { first: "05:35", last: "23:38" } },
      down: { weekday: { first: "05:34", last: "24:23" }, saturday: { first: "05:34", last: "23:32" }, sunday: { first: "05:34", last: "23:32" } },
    },
    {
      code: "919", name: "흑석",
      up:   { weekday: { first: "05:36", last: "24:33" }, saturday: { first: "05:36", last: "23:40" }, sunday: { first: "05:36", last: "23:40" } },
      down: { weekday: { first: "05:32", last: "24:21" }, saturday: { first: "05:32", last: "23:30" }, sunday: { first: "05:32", last: "23:30" } },
    },
    {
      code: "920", name: "동작",
      up:   { weekday: { first: "05:30", last: "24:49" }, saturday: { first: "05:30", last: "23:52" }, sunday: { first: "05:30", last: "23:52" } },
      down: { weekday: { first: "05:30", last: "24:53" }, saturday: { first: "05:30", last: "23:51" }, sunday: { first: "05:30", last: "23:51" } },
    },
    {
      code: "921", name: "구반포",
      up:   { weekday: { first: "05:32", last: "24:51" }, saturday: { first: "05:32", last: "23:54" }, sunday: { first: "05:32", last: "23:54" } },
      down: { weekday: { first: "05:31", last: "24:51" }, saturday: { first: "05:31", last: "23:49" }, sunday: { first: "05:31", last: "23:49" } },
    },
    {
      code: "922", name: "신반포",
      up:   { weekday: { first: "05:34", last: "24:53" }, saturday: { first: "05:34", last: "23:56" }, sunday: { first: "05:34", last: "23:56" } },
      down: { weekday: { first: "05:33", last: "24:49" }, saturday: { first: "05:33", last: "23:47" }, sunday: { first: "05:33", last: "23:47" } },
    },
    {
      code: "923", name: "고속터미널",
      up:   { weekday: { first: "05:36", last: "24:55" }, saturday: { first: "05:36", last: "23:58" }, sunday: { first: "05:36", last: "23:58" } },
      down: { weekday: { first: "05:34", last: "24:47" }, saturday: { first: "05:35", last: "23:54" }, sunday: { first: "05:35", last: "23:54" } },
    },
    {
      code: "924", name: "사평",
      up:   { weekday: { first: "05:38", last: "24:57" }, saturday: { first: "05:38", last: "24:00" }, sunday: { first: "05:38", last: "24:00" } },
      down: { weekday: { first: "05:32", last: "24:45" }, saturday: { first: "05:32", last: "23:51" }, sunday: { first: "05:32", last: "23:51" } },
    },
    {
      code: "925", name: "신논현",
      up:   { weekday: { first: "05:30", last: "24:46" }, saturday: { first: "05:33", last: "23:53" }, sunday: { first: "05:33", last: "23:53" } },
      down: { weekday: { first: "05:30", last: "24:42" }, saturday: { first: "05:32", last: "23:49" }, sunday: { first: "05:32", last: "23:49" } },
    },
    {
      code: "926", name: "언주",
      up:   { weekday: { first: "05:32", last: "24:48" }, saturday: { first: "05:35", last: "23:55" }, sunday: { first: "05:35", last: "23:55" } },
      down: { weekday: { first: "05:32", last: "24:40" }, saturday: { first: "05:34", last: "23:46" }, sunday: { first: "05:34", last: "23:46" } },
    },
    {
      code: "927", name: "선정릉",
      up:   { weekday: { first: "05:34", last: "24:50" }, saturday: { first: "05:36", last: "23:56" }, sunday: { first: "05:36", last: "23:56" } },
      down: { weekday: { first: "05:30", last: "24:38" }, saturday: { first: "05:32", last: "23:44" }, sunday: { first: "05:32", last: "23:44" } },
    },
    {
      code: "928", name: "삼성중앙",
      up:   { weekday: { first: "05:36", last: "24:52" }, saturday: { first: "05:38", last: "23:58" }, sunday: { first: "05:38", last: "23:58" } },
      down: { weekday: { first: "05:32", last: "24:36" }, saturday: { first: "05:34", last: "23:42" }, sunday: { first: "05:34", last: "23:42" } },
    },
    {
      code: "929", name: "봉은사",
      up:   { weekday: { first: "05:38", last: "24:54" }, saturday: { first: "05:39", last: "24:00" }, sunday: { first: "05:39", last: "24:00" } },
      down: { weekday: { first: "05:30", last: "24:34" }, saturday: { first: "05:32", last: "23:40" }, sunday: { first: "05:32", last: "23:40" } },
    },
    {
      code: "930", name: "종합운동장",
      up:   { weekday: { first: "05:30", last: "24:45" }, saturday: { first: "05:31", last: "23:52" }, sunday: { first: "05:31", last: "23:52" } },
      down: { weekday: { first: "05:30", last: "24:32" }, saturday: { first: "05:31", last: "23:38" }, sunday: { first: "05:31", last: "23:38" } },
    },
    {
      code: "931", name: "삼전",
      up:   { weekday: { first: "05:32", last: "24:47" }, saturday: { first: "05:33", last: "23:54" }, sunday: { first: "05:33", last: "23:54" } },
      down: { weekday: { first: "05:30", last: "24:30" }, saturday: { first: "05:32", last: "23:36" }, sunday: { first: "05:32", last: "23:36" } },
    },
    {
      code: "932", name: "석촌고분",
      up:   { weekday: { first: "05:34", last: "24:49" }, saturday: { first: "05:34", last: "23:56" }, sunday: { first: "05:34", last: "23:56" } },
      down: { weekday: { first: "05:32", last: "24:28" }, saturday: { first: "05:34", last: "23:34" }, sunday: { first: "05:34", last: "23:34" } },
    },
    {
      code: "933", name: "석촌",
      up:   { weekday: { first: "05:35", last: "24:51" }, saturday: { first: "05:35", last: "23:58" }, sunday: { first: "05:35", last: "23:58" } },
      down: { weekday: { first: "05:34", last: "24:26" }, saturday: { first: "05:35", last: "23:32" }, sunday: { first: "05:35", last: "23:32" } },
    },
    {
      code: "934", name: "송파나루",
      up:   { weekday: { first: "05:36", last: "24:53" }, saturday: { first: "05:36", last: "24:00" }, sunday: { first: "05:36", last: "24:00" } },
      down: { weekday: { first: "05:35", last: "24:24" }, saturday: { first: "05:36", last: "23:30" }, sunday: { first: "05:36", last: "23:30" } },
    },
    {
      code: "935", name: "한성백제",
      up:   { weekday: { first: "05:38", last: "24:55" }, saturday: { first: "05:38", last: "24:02" }, sunday: { first: "05:38", last: "24:02" } },
      down: { weekday: { first: "05:33", last: "24:22" }, saturday: { first: "05:34", last: "23:28" }, sunday: { first: "05:34", last: "23:28" } },
    },
    {
      code: "936", name: "올림픽공원",
      up:   { weekday: { first: "05:39", last: "24:57" }, saturday: { first: "05:39", last: "24:04" }, sunday: { first: "05:39", last: "24:04" } },
      down: { weekday: { first: "05:31", last: "24:20" }, saturday: { first: "05:32", last: "23:26" }, sunday: { first: "05:32", last: "23:26" } },
    },
    {
      code: "937", name: "둔촌오륜",
      up:   { weekday: { first: "05:41", last: "24:59" }, saturday: { first: "05:41", last: "24:06" }, sunday: { first: "05:41", last: "24:06" } },
      down: { weekday: { first: "05:30", last: "24:18" }, saturday: { first: "05:30", last: "23:24" }, sunday: { first: "05:30", last: "23:24" } },
    },
    {
      code: "938", name: "중앙보훈병원",
      up:   { weekday: { first: "-",     last: "-"     }, saturday: { first: "-",     last: "-"     }, sunday: { first: "-",     last: "-"     } },
      down: { weekday: { first: "05:30", last: "24:16" }, saturday: { first: "05:30", last: "23:22" }, sunday: { first: "05:30", last: "23:22" } },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 인천 도시철도 2호선
// 검단오류(I201) → 운연(I227)
//
// 인천교통공사 공식 시간표는 평일·주말 모두 동일한 첫차/막차를 적용한다.
// 단, 일부 단축 운행 열차의 시작 시각이 평일/주말 다르다 (주안발 등).
// 막차는 종착역에 25:05~25:08(=01:05~01:08)에 도착.
//
// 실시간 도착 정보는 인천교통공사 IcSubwayInfoService API(=apiType "ic1")로 조회 가능.
// ─────────────────────────────────────────────────────────────────────────────

export const INCHEON_LINE_2: SubwayLineTimetable = {
  id: "incheon-2",
  name: "인천2호선",
  color: "#ED8B00",
  upTerminus: "운연",
  downTerminus: "검단오류",
  intervalDisplay: "3~10분",
  intervalMin: 5,
  operator: "인천교통공사",
  notes:
    "인천교통공사는 운행 시격(=배차) 기준으로 운영하므로 정시 시각표가 별도로 공개되지 않는다. 첫차/막차 시간만 고시된다.",
  stations: [
    {
      code: "I201", name: "검단오류",
      up:   { weekday: { first: "05:30", last: "24:12" }, saturday: { first: "05:30", last: "24:12" }, sunday: { first: "05:30", last: "24:12" } },
      down: { weekday: { first: "-",     last: "-"     }, saturday: { first: "-",     last: "-"     }, sunday: { first: "-",     last: "-"     } },
    },
    {
      code: "I202", name: "왕길",
      up:   { weekday: { first: "05:32", last: "24:14" }, saturday: { first: "05:32", last: "24:14" }, sunday: { first: "05:32", last: "24:14" } },
      down: { weekday: { first: "05:40", last: "25:03" }, saturday: { first: "05:40", last: "25:03" }, sunday: { first: "05:40", last: "25:03" } },
    },
    {
      code: "I203", name: "검단사거리",
      up:   { weekday: { first: "05:34", last: "24:17" }, saturday: { first: "05:34", last: "24:17" }, sunday: { first: "05:34", last: "24:17" } },
      down: { weekday: { first: "05:38", last: "25:01" }, saturday: { first: "05:38", last: "25:01" }, sunday: { first: "05:38", last: "25:01" } },
    },
    {
      code: "I204", name: "마전",
      up:   { weekday: { first: "05:36", last: "24:19" }, saturday: { first: "05:36", last: "24:19" }, sunday: { first: "05:36", last: "24:19" } },
      down: { weekday: { first: "05:36", last: "24:59" }, saturday: { first: "05:36", last: "24:59" }, sunday: { first: "05:36", last: "24:59" } },
    },
    {
      code: "I205", name: "완정",
      up:   { weekday: { first: "05:38", last: "24:21" }, saturday: { first: "05:38", last: "24:21" }, sunday: { first: "05:38", last: "24:21" } },
      down: { weekday: { first: "05:34", last: "24:57" }, saturday: { first: "05:34", last: "24:57" }, sunday: { first: "05:34", last: "24:57" } },
    },
    {
      code: "I206", name: "독정",
      up:   { weekday: { first: "05:40", last: "24:22" }, saturday: { first: "05:40", last: "24:22" }, sunday: { first: "05:40", last: "24:22" } },
      down: { weekday: { first: "05:33", last: "24:55" }, saturday: { first: "05:33", last: "24:55" }, sunday: { first: "05:33", last: "24:55" } },
    },
    {
      code: "I207", name: "검암",
      up:   { weekday: { first: "05:30", last: "24:25" }, saturday: { first: "05:30", last: "24:25" }, sunday: { first: "05:30", last: "24:25" } },
      down: { weekday: { first: "05:30", last: "24:52" }, saturday: { first: "05:30", last: "24:52" }, sunday: { first: "05:30", last: "24:52" } },
    },
    {
      code: "I208", name: "검바위",
      up:   { weekday: { first: "05:31", last: "24:27" }, saturday: { first: "05:31", last: "24:27" }, sunday: { first: "05:31", last: "24:27" } },
      down: { weekday: { first: "05:41", last: "24:50" }, saturday: { first: "05:41", last: "24:50" }, sunday: { first: "05:41", last: "24:50" } },
    },
    {
      code: "I209", name: "아시아드경기장",
      up:   { weekday: { first: "05:34", last: "24:29" }, saturday: { first: "05:34", last: "24:29" }, sunday: { first: "05:34", last: "24:29" } },
      down: { weekday: { first: "05:39", last: "24:48" }, saturday: { first: "05:39", last: "24:48" }, sunday: { first: "05:39", last: "24:48" } },
    },
    {
      code: "I210", name: "서구청",
      up:   { weekday: { first: "05:30", last: "24:31" }, saturday: { first: "05:35", last: "24:31" }, sunday: { first: "05:35", last: "24:31" } },
      down: { weekday: { first: "05:38", last: "24:47" }, saturday: { first: "05:38", last: "24:47" }, sunday: { first: "05:38", last: "24:47" } },
    },
    {
      code: "I211", name: "가정",
      up:   { weekday: { first: "05:32", last: "24:34" }, saturday: { first: "05:38", last: "24:34" }, sunday: { first: "05:38", last: "24:34" } },
      down: { weekday: { first: "05:35", last: "24:44" }, saturday: { first: "05:35", last: "24:44" }, sunday: { first: "05:35", last: "24:44" } },
    },
    {
      code: "I212", name: "가정중앙시장",
      up:   { weekday: { first: "05:34", last: "24:36" }, saturday: { first: "05:40", last: "24:36" }, sunday: { first: "05:40", last: "24:36" } },
      down: { weekday: { first: "05:33", last: "24:42" }, saturday: { first: "05:33", last: "24:42" }, sunday: { first: "05:33", last: "24:42" } },
    },
    {
      code: "I213", name: "석남",
      up:   { weekday: { first: "05:36", last: "24:38" }, saturday: { first: "05:42", last: "24:38" }, sunday: { first: "05:42", last: "24:38" } },
      down: { weekday: { first: "05:31", last: "24:40" }, saturday: { first: "05:31", last: "24:40" }, sunday: { first: "05:31", last: "24:40" } },
    },
    {
      code: "I214", name: "서부여성회관",
      up:   { weekday: { first: "05:30", last: "24:39" }, saturday: { first: "05:30", last: "24:39" }, sunday: { first: "05:30", last: "24:39" } },
      down: { weekday: { first: "05:30", last: "24:39" }, saturday: { first: "05:30", last: "24:39" }, sunday: { first: "05:30", last: "24:39" } },
    },
    {
      code: "I215", name: "인천가좌",
      up:   { weekday: { first: "05:31", last: "24:41" }, saturday: { first: "05:31", last: "24:41" }, sunday: { first: "05:31", last: "24:41" } },
      down: { weekday: { first: "05:36", last: "24:37" }, saturday: { first: "05:42", last: "24:37" }, sunday: { first: "05:42", last: "24:37" } },
    },
    {
      code: "I216", name: "가재울",
      up:   { weekday: { first: "05:34", last: "24:44" }, saturday: { first: "05:34", last: "24:44" }, sunday: { first: "05:34", last: "24:44" } },
      down: { weekday: { first: "05:33", last: "24:34" }, saturday: { first: "05:39", last: "24:34" }, sunday: { first: "05:39", last: "24:34" } },
    },
    {
      code: "I217", name: "주안국가산단",
      up:   { weekday: { first: "05:36", last: "24:46" }, saturday: { first: "05:36", last: "24:46" }, sunday: { first: "05:36", last: "24:46" } },
      down: { weekday: { first: "05:31", last: "24:32" }, saturday: { first: "05:37", last: "24:32" }, sunday: { first: "05:37", last: "24:32" } },
    },
    {
      code: "I218", name: "주안",
      up:   { weekday: { first: "05:38", last: "24:48" }, saturday: { first: "05:38", last: "24:48" }, sunday: { first: "05:38", last: "24:48" } },
      down: { weekday: { first: "05:30", last: "24:31" }, saturday: { first: "05:36", last: "24:31" }, sunday: { first: "05:36", last: "24:31" } },
    },
    {
      code: "I219", name: "시민공원",
      up:   { weekday: { first: "05:40", last: "24:50" }, saturday: { first: "05:40", last: "24:50" }, sunday: { first: "05:40", last: "24:50" } },
      down: { weekday: { first: "05:33", last: "24:28" }, saturday: { first: "05:33", last: "24:28" }, sunday: { first: "05:33", last: "24:28" } },
    },
    {
      code: "I220", name: "석바위시장",
      up:   { weekday: { first: "05:42", last: "24:52" }, saturday: { first: "05:42", last: "24:52" }, sunday: { first: "05:42", last: "24:52" } },
      down: { weekday: { first: "05:31", last: "24:26" }, saturday: { first: "05:31", last: "24:26" }, sunday: { first: "05:31", last: "24:26" } },
    },
    {
      code: "I221", name: "인천시청",
      up:   { weekday: { first: "05:30", last: "24:53" }, saturday: { first: "05:30", last: "24:53" }, sunday: { first: "05:30", last: "24:53" } },
      down: { weekday: { first: "05:30", last: "24:25" }, saturday: { first: "05:30", last: "24:25" }, sunday: { first: "05:30", last: "24:25" } },
    },
    {
      code: "I222", name: "석천사거리",
      up:   { weekday: { first: "05:31", last: "24:55" }, saturday: { first: "05:31", last: "24:55" }, sunday: { first: "05:31", last: "24:55" } },
      down: { weekday: { first: "05:41", last: "24:23" }, saturday: { first: "05:41", last: "24:23" }, sunday: { first: "05:41", last: "24:23" } },
    },
    {
      code: "I223", name: "모래내시장",
      up:   { weekday: { first: "05:33", last: "24:57" }, saturday: { first: "05:33", last: "24:57" }, sunday: { first: "05:33", last: "24:57" } },
      down: { weekday: { first: "05:39", last: "24:21" }, saturday: { first: "05:39", last: "24:21" }, sunday: { first: "05:39", last: "24:21" } },
    },
    {
      code: "I224", name: "만수",
      up:   { weekday: { first: "05:35", last: "24:58" }, saturday: { first: "05:35", last: "24:58" }, sunday: { first: "05:35", last: "24:58" } },
      down: { weekday: { first: "05:37", last: "24:19" }, saturday: { first: "05:37", last: "24:19" }, sunday: { first: "05:37", last: "24:19" } },
    },
    {
      code: "I225", name: "남동구청",
      up:   { weekday: { first: "05:37", last: "25:01" }, saturday: { first: "05:37", last: "25:01" }, sunday: { first: "05:37", last: "25:01" } },
      down: { weekday: { first: "05:34", last: "24:17" }, saturday: { first: "05:34", last: "24:17" }, sunday: { first: "05:34", last: "24:17" } },
    },
    {
      code: "I226", name: "인천대공원",
      up:   { weekday: { first: "05:40", last: "25:03" }, saturday: { first: "05:40", last: "25:03" }, sunday: { first: "05:40", last: "25:03" } },
      down: { weekday: { first: "05:32", last: "24:14" }, saturday: { first: "05:32", last: "24:14" }, sunday: { first: "05:32", last: "24:14" } },
    },
    {
      code: "I227", name: "운연",
      up:   { weekday: { first: "-",     last: "-"     }, saturday: { first: "-",     last: "-"     }, sunday: { first: "-",     last: "-"     } },
      down: { weekday: { first: "05:30", last: "24:12" }, saturday: { first: "05:30", last: "24:12" }, sunday: { first: "05:30", last: "24:12" } },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// 통합 카탈로그 + 조회 헬퍼
// ─────────────────────────────────────────────────────────────────────────────

export const SUBWAY_LINE_TIMETABLES: readonly SubwayLineTimetable[] = [
  SEOUL_LINE_9,
  INCHEON_LINE_2,
];

export function getLineTimetable(lineId: string): SubwayLineTimetable | undefined {
  return SUBWAY_LINE_TIMETABLES.find(line => line.id === lineId);
}

export function getStationTimetable(
  lineId: string,
  stationCode: string,
): SubwayLineStation | undefined {
  return getLineTimetable(lineId)?.stations.find(st => st.code === stationCode);
}

/**
 * 오늘 날짜 기준 요일 타입을 반환한다.
 * 일요일·공휴일은 동일한 시각표를 적용한다 (toggleable via referenceDate).
 */
export function getDayType(d: Date = new Date()): SubwayDayType {
  const day = d.getDay();
  if (day === 0) return "sunday";
  if (day === 6) return "saturday";
  return "weekday";
}

/** 평일/토/일 시간표 중 오늘 적용분을 추출 */
export function pickDay(
  schedule: SubwayDirectionTimetable,
  dayType: SubwayDayType = getDayType(),
): SubwayDayFirstLast {
  return schedule[dayType];
}
