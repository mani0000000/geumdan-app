// 인천 서해안 조석 및 해루질/낚시 조건 계산
// 음력 기반 근사 계산 (실제 조석표와 ±30분 오차)

export interface TideEntry {
  type: "high" | "low";
  timeStr: string;       // "HH:MM"
  minutes: number;       // 자정 기준 분
  heightM: number;       // 조위 (m)
}

export interface MulttaeInfo {
  day: number;           // 음력 날짜 (1-30)
  number: number;        // 물때 번호 (1-15)
  name: string;          // 조금, 한사리 등
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

// ── 음력 날짜 계산 ────────────────────────────────────────────────
// 기준: 2024-02-10 KST = 음력 갑진년 1월 1일 (삭/신월)
const KNOWN_NEW_MOON_KST = new Date("2024-02-10T00:00:00+09:00").getTime();
const LUNAR_MONTH_MS = 29.530589 * 24 * 3600 * 1000;

export function getLunarAge(date: Date): number {
  const diff = date.getTime() - KNOWN_NEW_MOON_KST;
  return ((diff % LUNAR_MONTH_MS) + LUNAR_MONTH_MS) % LUNAR_MONTH_MS;
}

export function getLunarDay(date: Date): number {
  return Math.floor(getLunarAge(date) / (24 * 3600 * 1000)) + 1;
}

function getLunarMonthApprox(date: Date): number {
  // 대략적인 음력 월 추정 (정확한 한국 음력 전환은 복잡하므로 근사)
  const totalDaysSinceRef = (date.getTime() - KNOWN_NEW_MOON_KST) / (24 * 3600 * 1000);
  return (Math.floor(totalDaysSinceRef / 29.53) % 12) + 1;
}

// ── 물때 정보 ────────────────────────────────────────────────────
const MULTTAE_NAMES: Record<number, string> = {
  1: "한사리",  2: "두물",    3: "세물",
  4: "네물",    5: "다섯물",  6: "여섯물",
  7: "일곱물",  8: "조금",    9: "아홉물",
  10: "열물",   11: "열한물", 12: "열두물",
  13: "열세물", 14: "열네물", 15: "보름사리",
};

export function getMulttaeInfo(date: Date): MulttaeInfo {
  const lunarDay = getLunarDay(date);
  const lunarMonth = getLunarMonthApprox(date);

  // 1-15 물때 번호로 변환 (15일 주기)
  const number = lunarDay <= 15 ? lunarDay : lunarDay - 15;
  const name = MULTTAE_NAMES[number] ?? `${number}물`;

  // 조차 계산: 사리(1,15물)=9m, 조금(7-8물)=3m (코사인 근사)
  const rangeM = parseFloat(
    (6 + 3 * Math.cos((2 * Math.PI * (number - 1)) / 15)).toFixed(1)
  );
  const size: "large" | "medium" | "small" =
    number <= 3 || number >= 13 ? "large" : number <= 6 || number >= 10 ? "medium" : "small";

  return { day: lunarDay, number, name, size, rangeM, lunarMonth, lunarDay };
}

// ── 인천 조석 시각 계산 ───────────────────────────────────────────
// 기준: 음력 1일 첫 고조 ≈ 02:30 KST, 이후 매일 +50분
// 인천항 반일주조: 고조-저조 간격 ≈ 6시간 13분
const BASE_HIGH_MIN = 2 * 60 + 30;  // 02:30
const DAILY_SHIFT_MIN = 50;
const HALF_PERIOD_MIN = 6 * 60 + 13;
const FULL_PERIOD_MIN = 12 * 60 + 25;

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(((minutes % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const m = Math.floor(((minutes % (24 * 60)) + 24 * 60) % (24 * 60) % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getIncheonTides(date: Date): TideEntry[] {
  const multtae = getMulttaeInfo(date);
  const lunarDay = multtae.day;

  const shiftMin = ((lunarDay - 1) * DAILY_SHIFT_MIN) % (24 * 60);
  const high1Min = (BASE_HIGH_MIN + shiftMin + 24 * 60) % (24 * 60);
  const low1Min  = (high1Min + HALF_PERIOD_MIN) % (24 * 60);
  const high2Min = (high1Min + FULL_PERIOD_MIN) % (24 * 60);
  const low2Min  = (low1Min  + FULL_PERIOD_MIN) % (24 * 60);

  const highH = parseFloat((multtae.rangeM / 2 + 1.5).toFixed(1));
  const lowH  = parseFloat(Math.max(0.1, (1.5 - multtae.rangeM / 2)).toFixed(1));

  const entries: TideEntry[] = [
    { type: "high", timeStr: minutesToTimeStr(high1Min), minutes: high1Min, heightM: highH },
    { type: "low",  timeStr: minutesToTimeStr(low1Min),  minutes: low1Min,  heightM: lowH  },
    { type: "high", timeStr: minutesToTimeStr(high2Min), minutes: high2Min, heightM: highH },
    { type: "low",  timeStr: minutesToTimeStr(low2Min),  minutes: low2Min,  heightM: lowH  },
  ];
  return entries.sort((a, b) => a.minutes - b.minutes);
}

function getNextLowTide(tides: TideEntry[], date: Date): TideEntry | null {
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const upcoming = tides.filter(t => t.type === "low" && t.minutes > nowMin);
  return upcoming[0] ?? tides.find(t => t.type === "low") ?? null;
}

// ── 해루질 조건 ───────────────────────────────────────────────────
export function getHaerujilCondition(
  multtae: MulttaeInfo,
  date: Date,
  tides: TideEntry[],
): ActivityCondition {
  const month = date.getMonth() + 1;
  const { number, size, rangeM } = multtae;

  // 계절 보정
  const seasonOk = month >= 4 && month <= 10;
  const seasonBest = (month >= 5 && month <= 6) || (month >= 9 && month <= 10);
  const seasonBad = month <= 2 || month === 12;

  // 저조 시각이 오후~저녁(15-21시)이면 좋음
  const lowTides = tides.filter(t => t.type === "low");
  const eveningLow = lowTides.some(t => t.minutes >= 15 * 60 && t.minutes <= 21 * 60);

  // 물때 점수 (사리=좋음, 조금=나쁨)
  let stars: 1 | 2 | 3 = size === "large" ? 3 : size === "medium" ? 2 : 1;
  if (seasonBad) stars = Math.max(1, stars - 1) as 1 | 2 | 3;
  if (seasonBest && stars < 3) stars = (stars + 1) as 2 | 3;

  const rating: ConditionRating =
    stars === 3 ? "excellent" : stars === 2 ? "good" : "poor";

  const timingNote = eveningLow ? "오늘 저녁 물이 잘 빠집니다." : "오늘은 낮 시간대에 물이 빠집니다.";

  const titles = { excellent: "해루질 최적!", good: "해루질 가능", poor: "해루질 어려움" };
  const reasons: Record<ConditionRating, string> = {
    excellent: seasonBad
      ? "물은 많이 빠지지만 수온이 너무 낮아 조심하세요."
      : `${multtae.name} — 조차 ${rangeM}m로 갯벌이 넓게 드러납니다. ${timingNote}`,
    good: seasonBad
      ? "겨울철 물이 차가우므로 방한 준비 필수입니다."
      : `조차 ${rangeM}m — 적당히 물이 빠집니다. ${timingNote}`,
    poor: size === "small"
      ? `${multtae.name} — 조차 ${rangeM}m로 물이 별로 빠지지 않습니다. 3~5일 후를 노리세요.`
      : "날씨·수온 조건이 좋지 않아 해루질을 권장하지 않습니다.",
  };
  const tips: Record<ConditionRating, string> = {
    excellent: "안전장화·헤드랜턴·물통 필수. 들물 시작 전 철수!",
    good: "구명조끼 착용 권장. 조류 방향 확인 후 입수.",
    poor: "무리한 입수는 위험합니다. 다음 기회를 노리세요.",
  };

  return {
    rating, stars,
    title: titles[rating],
    reason: reasons[rating],
    tip: tips[rating],
  };
}

// ── 낚시 조건 ────────────────────────────────────────────────────
const FISH_BY_SEASON: Record<number, string[]> = {
  1: ["우럭(볼락)", "대구(선상)"],
  2: ["우럭(볼락)", "가자미"],
  3: ["우럭", "가자미", "망둥어"],
  4: ["우럭", "도다리", "망둥어", "놀래기"],
  5: ["우럭", "농어", "감성돔"],
  6: ["농어", "광어", "민어", "감성돔"],
  7: ["농어", "광어", "민어", "숭어"],
  8: ["농어", "광어", "민어", "학공치"],
  9: ["전어", "고등어", "농어", "광어"],
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
  const { number, size, rangeM } = multtae;
  const fish = FISH_BY_SEASON[month] ?? [];

  // 계절 보정
  const seasonBest = (month >= 5 && month <= 10);
  const seasonBad = month === 1 || month === 2 || month === 12;

  // 물때 점수: 낚시는 사리/중간이 좋고 조금은 보통
  // 조금(소조기)도 활성화되는 어종 있으나 전반적으로 사리~중간이 좋음
  let stars: 1 | 2 | 3 = size === "large" ? 3 : size === "medium" ? 2 : 1;
  if (seasonBad) stars = Math.max(1, stars - 1) as 1 | 2 | 3;
  if (seasonBest && stars < 3) stars = (stars + 1) as 2 | 3;
  // 조금은 낚시도 1단계 하향
  if (number >= 7 && number <= 9) stars = Math.max(1, stars - 1) as 1 | 2 | 3;

  const rating: ConditionRating =
    stars === 3 ? "excellent" : stars === 2 ? "good" : "poor";

  // 들물/썰물 시간 파악
  const nowMin = date.getHours() * 60 + date.getMinutes();
  const fishingTip = tides.find(t => {
    const diff = Math.abs(t.minutes - nowMin);
    return diff < 90;
  });
  const currentFlow = fishingTip
    ? (fishingTip.type === "high" ? "고조 시간대 — 마릿수 낚시 유리" : "저조 시간대 — 포인트 이동 권장")
    : "들물·썰물 전환점 근처 — 입질 집중 시간";

  const fishStr = fish.slice(0, 3).join(", ");
  const titles = { excellent: "낚시 최적!", good: "낚시 양호", poor: "낚시 비추천" };
  const reasons: Record<ConditionRating, string> = {
    excellent: `조차 ${rangeM}m — 강한 조류로 어군 활성화. 이 시기 어종: ${fishStr}.`,
    good: `조차 ${rangeM}m — 적당한 조류. 추천 어종: ${fishStr}.`,
    poor: size === "small"
      ? `${multtae.name} — 조류가 약해 입질이 떨어집니다. 갯바위·에기낚시는 가능.`
      : `겨울 한파로 어군 활동 저조. 선상 우럭낚시는 가능합니다.`,
  };
  const tips: Record<ConditionRating, string> = {
    excellent: `${currentFlow}. 밑밥 투여 효과 최고.`,
    good: `${currentFlow}. 조류 방향에 맞게 채비 조정.`,
    poor: "루어·에기 등 적극 탐색 낚시를 추천합니다.",
  };

  return {
    rating, stars,
    title: titles[rating],
    reason: reasons[rating],
    tip: tips[rating],
  };
}

// ── 이달 최적 날짜 ────────────────────────────────────────────────
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

// ── 계절 안내 ─────────────────────────────────────────────────────
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

// ── 전체 리포트 ──────────────────────────────────────────────────
export function getTideReport(date: Date = new Date()): TideReport {
  const multtae = getMulttaeInfo(date);
  const todayTides = getIncheonTides(date);
  const nextLowTide = getNextLowTide(todayTides, date);
  const haerujil = getHaerujilCondition(multtae, date, todayTides);
  const fishing = getFishingCondition(multtae, date, todayTides);
  const bestDaysThisMonth = getBestDaysThisMonth(date);
  const seasonalNote = getSeasonalNote(date);

  return { multtae, todayTides, nextLowTide, haerujil, fishing, bestDaysThisMonth, seasonalNote };
}
