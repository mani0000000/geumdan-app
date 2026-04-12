// 한국부동산원(R-ONE) 주간 아파트 동향 API
// 환경변수: NEXT_PUBLIC_MOLIT_API_KEY (공공데이터포털 공통 키)
// 인천광역시 서구 LAWD_CD: 28260
// 오퍼레이션: B552555/weekMKTSttus/getWeekMKTSttus

const API_KEY = process.env.NEXT_PUBLIC_MOLIT_API_KEY ?? "";
const REB_BASE =
  "https://apis.data.go.kr/B552555/weekMKTSttus/getWeekMKTSttus";

export interface RebWeeklyStats {
  period: string;      // 예) "202512"
  changeRate: number;  // 전주 대비 매매가격 변동률 (%)
  source: "reb";
}

/** 현재 기준 최근 주차 YYYYWW 반환 */
function currentWeekCode(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${now.getFullYear()}${String(week).padStart(2, "0")}`;
}

/** 전전주 YYYYWW (R-ONE은 2주 딜레이가 있는 경우 있음) */
function prevWeekCode(): string {
  const now = new Date();
  const two = new Date(now.getTime() - 14 * 86400000);
  const jan1 = new Date(two.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((two.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7
  );
  return `${two.getFullYear()}${String(week).padStart(2, "0")}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseRebItems(json: any): Record<string, string>[] {
  const item = json?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

async function rebFetch(week: string): Promise<Record<string, string>[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({
    serviceKey: API_KEY,
    LAWD_CD: "28260",
    START_WEEK: week,
    END_WEEK: week,
    pageNo: "1",
    numOfRows: "20",
    _type: "json",
  });
  const targetUrl = `${REB_BASE}?${params}`;

  try {
    return await Promise.any([
      // 1. 직접 호출 (2s 타임아웃)
      (async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 2000);
        try {
          const res = await fetch(targetUrl, { signal: ctrl.signal });
          clearTimeout(tid);
          if (!res.ok) throw new Error("direct not ok");
          return parseRebItems(await res.json());
        } catch {
          clearTimeout(tid);
          throw new Error("direct failed");
        }
      })(),
      // 2. allorigins 프록시
      (async () => {
        const res = await fetch(
          `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
        );
        if (!res.ok) throw new Error(`allorigins ${res.status}`);
        const j = await res.json();
        return parseRebItems(JSON.parse(j.contents as string));
      })(),
      // 3. corsproxy.io
      (async () => {
        const res = await fetch(
          `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`
        );
        if (!res.ok) throw new Error(`corsproxy ${res.status}`);
        return parseRebItems(await res.json());
      })(),
    ]);
  } catch {
    return [];
  }
}

/**
 * 한국부동산원 주간 아파트 동향 조회 (인천 서구)
 * 실패 시 null 반환 → 호출 측에서 computed fallback 사용
 */
export async function fetchRebWeeklyStats(): Promise<RebWeeklyStats | null> {
  if (!API_KEY) return null;
  try {
    // 최근 주, 안되면 전전주 시도
    for (const week of [currentWeekCode(), prevWeekCode()]) {
      const items = await rebFetch(week);
      if (!items.length) continue;

      // 인천 서구(28260) 또는 인천 전체 행 우선 탐색
      const row =
        items.find(
          (it) =>
            String(it["지역코드"] ?? it.regionCode ?? "").includes("28260") ||
            String(it["지역명"] ?? it.regionName ?? "").includes("서구")
        ) ??
        items.find((it) =>
          String(it["지역명"] ?? it.regionName ?? "").includes("인천")
        ) ??
        items[0];

      const changeRate = parseFloat(
        String(
          row["매매변동률"] ??
          row["변동률"] ??
          row.saleChangeRate ??
          row.changeRate ??
          "0"
        ).replace(/[^0-9.\-]/g, "")
      );
      if (isNaN(changeRate)) continue;
      return { period: week, changeRate, source: "reb" };
    }
    return null;
  } catch {
    return null;
  }
}
