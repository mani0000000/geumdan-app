// 인천 서해안 조석 및 해루질/낚시 조건 계산
// 음력 기반 근사 계산 (실제 조석표와 ±30~60분 오차)
//
// 서해안 물때 15일 주기 기준:
//   음력 8일·23일  = 조금(무시) = 15물   ← 최소 조차
//   음력 1일·16일  = 한사리     = 8물    ← 최대 조차 (삭·망 다음 날)
//   음력 9일·24일  = 1물        (조금 직후)
//   음력 15일·30일 = 7물        (보름 당일)

export interface TideEntry {
  type: "high" | "low";
  timeStr: string;       // "HH:MM"
  minutes: number;       // 자정 기준 분
  heightM: number;       // 조위 (m) – 인천 기본수준면 기준
}

export interface MulttaeInfo {
  day: number;           // 음력 날짜 (1-30)
  number: number;        // 물때 번호 (1=한물 … 15=조금)
  name: string;          // 한물·두물 … 한사리·조금
  size: "large" | "medium" | "small";
  rangeM: number;        // 조차 (m)
  lunarMonth: number;
  lunarDay: number;
}

export type ConditionRating = "excellent" | "good" | "poor";

export interface ActivityCondition {
  rating: ConditionRating;
  stars: 1 | 2 | 3;
  title: string;
  reason: string;
  tip: string;
}

export interface TideReport {
  multtae: MulttaeInfo;
  todayTides: TideEntry[];
  nextLowTide: TideEntry | null;
  haerujil: ActivityCondition;
  fishing: ActivityCondition;
  bestDaysThisMonth: { haerujil: number[]; fishing: number[] };
  seasonalNote: string;
}

// ── 음력 날짜 계산 ─────────────────────────────────────────────────
// 기준: 2026-04-28 04:31 KST = 음력 병오년 4월 1일 (삭/신월)
const KNOWN_NEW_MOON_KST = new Date("2026-04-28T04:31:00+09:00").getTime();
const LUNAR_MONTH_MS = 29.530589 * 24 * 3600 * 1000;

export function getLunarAge(date: Date): number {
  const diff = date.getTime() - KNOWN_NEW_MOON_KST;
  return ((diff % LUNAR_MONTH_MS) + LUNAR_MONTH_MS) % LUNAR_MONTH_MS;
}

/** 음력 날짜 (1~30) */
export function getLunarDay(date: Date): number {
  return Math.floor(getLunarAge(date) / (24 * 3600 * 1000)) + 1;
}

function getLunarMonthApprox(date: Date): number {
  // 2026-04-28 = 음력 4월 1일 기준
  const monthsElapsed = Math.floor(
    (date.getTime() - KNOWN_NEW_MOON_KST) / LUNAR_MONTH_MS
  );
  return ((monthsElapsed + 3) % 12) + 1; // 4월 = index 3 → result 4
}

// ── 물때 이름 ──────────────────────────────────────────────────────
const MULTTAE_NAMES: Record<number, string> = {
  1:  "한물",    2:  "두물",    3:  "세물",
  4:  "네물",    5:  "다섯물",  6:  "여섯물",
  7:  "일곱물",  8:  "한사리",  9:  "아홉물",
  10: "열물",    11: "열한물",  12: "열두물",
  13: "열세물",  14: "열네물",  15: "조금",
};

// ── 물때 정보 ──────────────────────────────────────────────────────
export function getMulttaeInfo(date: Date): MulttaeInfo {
  const lunarDay = getLunarDay(date);
  const lunarMonth = getLunarMonthApprox(date);

  // 물때 번호: 음력 9일 = 1물, 음력 8일·23일 = 15물(조금)
  // number = ((lunarDay - 9) mod 15) + 1  (JS-safe 양수 mod)
  const number = ((((lunarDay - 9) % 15) + 15) % 15) + 1;
  const name = MULTTAE_NAMES[number] ?? `${number}물`;

  // ── 조차 계산 ──────────────────────────────────────────────────
  // 인천 평균 대조차(8물) ≈ 8.2 m, 소조차(15물) ≈ 3.0 m
  // rangeM = 5.6 - 2.6 * cos(2π * (number%15) / 15)
  //   phase=0 → 15물(조금) = min  /  phase≈7.5 → 7·8물(사리) = max
  const phase = number % 15; // 15물 → 0, 1물 → 1, …, 14물 → 14
  const rangeM = parseFloat(
    (5.6 - 2.6 * Math.cos((2 * Math.PI * phase) / 15)).toFixed(1)
  );

  // 크기 분류 (5~11물=large, 3~4물·12~13물=medium, 나머지=small)
  const size: "large" | "medium" | "small" =
    number >= 5 && number <= 11 ? "large"
    : (number >= 3 && number <= 4) || (number >= 12 && number <= 13) ? "medium"
    : "small";

  return { day: lunarDay, number, name, size, rangeM, lunarMonth, lunarDay };
}

// ── 인천 조석 시각 계산 ─────────────────────────────────────────────
// 기준: 음력 1일(8물/한사리) 첫 고조 ≈ 07:00 KST
//   인천항 HWI 약 11h 38min / 반일주조 주기 ≈ 12h 25min
//   매일 약 +50분 지연
const BASE_HIGH_MIN = 7 * 60;        // 07:00 KST (음력 1일 기준)
const DAILY_SHIFT_MIN = 50;          // 일 평균 지연
const HALF_PERIOD_MIN = 6 * 60 + 13; // 고조 → 저조 간격
const FULL_PERIOD_MIN = 12 * 60 + 25;// 반일주조 전주기

// 인천항 평균해면 ≈ 기본수준면 기준 4.7 m
const INCHEON_MSL = 4.7;

function minutesToTimeStr(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getIncheonTides(date: Date): TideEntry[] {
  const { day: lunarDay, rangeM } = getMulttaeInfo(date);

  // 음력 1일 기준으로 lunarDay-1 만큼 시각 이동
  const shiftMin = ((lunarDay - 1) * DAILY_SHIFT_MIN) % 1440;
  const high1 = (BASE_HIGH_MIN + shiftMin) % 1440;
  const low1  = (high1 + HALF_PERIOD_MIN) % 1440;
  const high2 = (high1 + FULL_PERIOD_MIN) % 1440;
  const low2  = (low1  + FULL_PERIOD_MIN) % 1440;

  // 조위: 평균해면 ± 조차/2
  const highH = parseFloat((INCHEON_MSL + rangeM / 2).toFixed(1));
  const lowH  = parseFloat(Math.max(0.1, INCHEON_MSL - rangeM / 2).toFixed(1));

  return [
    { type: "high", timeStr: minutesToTimeStr(high1), minutes: high1, heightM: highH },
    { type: "low",  timeStr: minutesToTimeStr(low1),  minutes: low1,  heightM: lowH  },
    { type: "high", timeStr: minutesToTimeStr(high2), minutes: high2, heightM: highH },
    { type: "low",  timeStr: minutesToTimeStr(low2),  minutes: low2,  heightM: lowH  },
  ].sort((a, b) => a.minutes - b.minutes);
}

function getNextLowTide(tides: TideEntry[], date: Date): TideEntry | null {
  const nowMin = date.getHours() * 60 + date.getMinutes();
  return tides.find(t => t.type === "low" && t.minutes > nowMin)
    ?? tides.find(t => t.type === "low")
    ?? null;
}

// ── 해루질 조건 ────────────────────────────────────────────────────
export function getHaerujilCondition(
  multtae: MulttaeInfo,
  date: Date,
  tides: TideEntry[],
): ActivityCondition {
  const month = date.getMonth() + 1;
  const { size, rangeM, name } = multtae;

  const seasonBad  = month <= 2 || month === 12;
  const seasonBest = (month >= 5 && month <= 6) || (month >= 9 && month <= 10);

  // 저조 시각이 오후~저녁(15-21시)이면 유리
  const eveningLow = tides.some(t => t.type === "low" && t.minutes >= 900 && t.minutes <= 1260);

  let stars: 1 | 2 | 3 = size === "large" ? 3 : size === "medium" ? 2 : 1;
  if (seasonBad  && stars > 1) stars = (stars - 1) as 1 | 2;
  if (seasonBest && stars < 3) stars = (stars + 1) as 2 | 3;

  const rating: ConditionRating = stars === 3 ? "excellent" : stars === 2 ? "good" : "poor";
  const timingNote = eveningLow ? "오늘 저녁 물이 잘 빠집니다." : "오늘은 낮 시간대에 물이 빠집니다.";

  const titles = { excellent: "해루질 최적!", good: "해루질 가능", poor: "해루질 어려움" };
  const reasons: Record<ConditionRating, string> = {
    excellent: seasonBad
      ? "물은 많이 빠지지만 수온이 낮으니 방한에 주의하세요."
      : `${name} — 조차 ${rangeM}m, 갯벌이 넓게 드러납니다. ${timingNote}`,
    good: seasonBad
      ? "겨울철 물이 차가우므로 방한 준비 필수입니다."
      : `조차 ${rangeM}m — 적당히 물이 빠집니다. ${timingNote}`,
    poor: size === "small"
      ? `${name} — 조차 ${rangeM}m, 물이 별로 빠지지 않습니다. 3~5일 후를 노리세요.`
      : "날씨·수온 조건이 좋지 않아 해루질을 권장하지 않습니다.",
  };
  const tips: Record<ConditionRating, string> = {
    excellent: "안전장화·헤드랜턴·물통 필수. 들물 시작 전 철수!",
    good:      "구명조끼 착용 권장. 조류 방향 확인 후 입수.",
    poor:      "무리한 입수는 위험합니다. 다음 기회를 노리세요.",
  };

  return { rating, stars, title: titles[rating], reason: reasons[rating], tip: tips[rating] };
}

// ── 낚시 조건 ──────────────────────────────────────────────────────
const FISH_BY_SEASON: Record<number, string[]> = {
  1:  ["우럭(볼락)", "대구(선상)"],
  2:  ["우럭(볼락)", "가자미"],
  3:  ["우럭", "가자미", "망둥어"],
  4:  ["우럭", "도다리", "망둥어", "놀래기"],
  5:  ["우럭", "농어", "감성돔"],
  6:  ["농어", "광어", "민어", "감성돔"],
  7:  ["농어", "광어", "민어", "숭어"],
  8:  ["농어", "광어", "민어", "학공치"],
  9:  ["전어", "고등어", "농어", "광어"],
  10: ["전어", "고등어", "우럭", "학공치"],
  11: ["우럭", "고등어", "가자미"],
  12: ["우럭(볼락)", "대구(선상)"],
};

export function getFishingCondition(
  multtae: MulttaeInfo,
  date: Date,
  tides: TideEntry[],
): ActivityCondition {
  const month = date.getMonth() + 1;
  const { size, rangeM, name, number } = multtae;
  const fish = FISH_BY_SEASON[month] ?? [];

  const seasonBest = month >= 5 && month <= 10;
  const seasonBad  = month === 1 || month === 2 || month === 12;

  let stars: 1 | 2 | 3 = size === "large" ? 3 : size === "medium" ? 2 : 1;
  if (seasonBad  && stars > 1) stars = (stars - 1) as 1 | 2;
  if (seasonBest && stars < 3) stars = (stars + 1) as 2 | 3;
  // 조금(소조기) — 낚시 조류 약해 1단계 하향
  if (number >= 14 || number <= 2) stars = Math.max(1, stars - 1) as 1 | 2 | 3;

  const rating: ConditionRating = stars === 3 ? "excellent" : stars === 2 ? "good" : "poor";

  const nowMin = date.getHours() * 60 + date.getMinutes();
  const nearTide = tides.find(t => Math.abs(t.minutes - nowMin) < 90);
  const currentFlow = nearTide
    ? (nearTide.type === "high" ? "고조 시간대 — 마릿수 낚시 유리" : "저조 시간대 — 포인트 이동 권장")
    : "들물·썰물 전환점 — 입질 집중 시간";

  const fishStr = fish.slice(0, 3).join(", ");
  const titles = { excellent: "낚시 최적!", good: "낚시 양호", poor: "낚시 비추천" };
  const reasons: Record<ConditionRating, string> = {
    excellent: `조차 ${rangeM}m — 강한 조류로 어군 활성화. 이 시기 어종: ${fishStr}.`,
    good:      `조차 ${rangeM}m — 적당한 조류. 추천 어종: ${fishStr}.`,
    poor: size === "small"
      ? `${name} — 조류가 약해 입질이 떨어집니다. 갯바위·에기낚시는 가능.`
      : `겨울 한파로 어군 활동 저조. 선상 우럭낚시는 가능합니다.`,
  };
  const tips: Record<ConditionRating, string> = {
    excellent: `${currentFlow}. 밑밥 투여 효과 최고.`,
    good:      `${currentFlow}. 조류 방향에 맞게 채비 조정.`,
    poor:      "루어·에기 등 적극 탐색 낚시를 추천합니다.",
  };

  return { rating, stars, title: titles[rating], reason: reasons[rating], tip: tips[rating] };
}

// ── 이달 최적 날짜 ─────────────────────────────────────────────────
export function getBestDaysThisMonth(date: Date): { haerujil: number[]; fishing: number[] } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const haerujilDays: number[] = [];
  const fishingDays: number[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    const mt = getMulttaeInfo(day);
    if (mt.size === "large") {
      haerujilDays.push(d);
      fishingDays.push(d);
    } else if (mt.size === "medium") {
      fishingDays.push(d);
    }
  }

  return {
    haerujil: haerujilDays.slice(0, 8),
    fishing:  fishingDays.slice(0, 10),
  };
}

// ── 계절 안내 ──────────────────────────────────────────────────────
export function getSeasonalNote(date: Date): string {
  const month = date.getMonth() + 1;
  const notes: Record<number, string> = {
    1:  "한겨울 — 해루질 비시즌. 선상 우럭·대구낚시 시즌.",
    2:  "겨울 끝 — 갯벌 수온 회복 중. 낚시는 볼락 시즌.",
    3:  "봄 시작 — 도다리·가자미 낚시 시즌. 해루질 준비 시기.",
    4:  "봄 — 바지락·모시조개 해루질 본격 시작!",
    5:  "봄 최성기 — 해루질·낚시 모두 활발. 농어 시즌 시작.",
    6:  "초여름 — 낙지·게 해루질 최고. 민어·광어 낚시 시즌.",
    7:  "한여름 — 해루질 최성기(낙지·소라). 농어·광어 대물 시즌.",
    8:  "한여름 — 해루질 풍성. 야간 바다에 주의.",
    9:  "초가을 — 조개류 맛 최고! 전어·고등어 낚시 대박.",
    10: "가을 최성기 — 해루질·낚시 모두 한해 최고 시즌.",
    11: "늦가을 — 해루질 마무리. 우럭 낚시 양호.",
    12: "초겨울 — 해루질 비시즌. 선상 우럭 낚시.",
  };
  return notes[month] ?? "";
}

// ── 전체 리포트 ────────────────────────────────────────────────────
export function getTideReport(date: Date = new Date()): TideReport {
  const multtae        = getMulttaeInfo(date);
  const todayTides     = getIncheonTides(date);
  const nextLowTide    = getNextLowTide(todayTides, date);
  const haerujil       = getHaerujilCondition(multtae, date, todayTides);
  const fishing        = getFishingCondition(multtae, date, todayTides);
  const bestDaysThisMonth = getBestDaysThisMonth(date);
  const seasonalNote   = getSeasonalNote(date);

  return { multtae, todayTides, nextLowTide, haerujil, fishing, bestDaysThisMonth, seasonalNote };
}
