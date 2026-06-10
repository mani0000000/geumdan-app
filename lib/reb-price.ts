/**
 * 한국부동산원(R-ONE) 아파트 시세 / 가격 지수 API
 *
 * - calcMarketSummary: 기존 DB(apartment_trades/rentals)에서 최근 6개월 평균 시세 계산
 * - fetchRebPriceIndex: 한국부동산원 지역별 가격지수 API (MOLIT 실패 시 대체)
 */

const REB_API = "https://apis.data.go.kr/1611000/AptPriceInfoService/getAptPriceInfo";

// ── 공개 인터페이스 ─────────────────────────────────────────────
export interface AptMarketSummary {
  apt_name: string;
  dong: string;
  pyeong: number;
  sqm: number;
  avg_trade_price: number | null;    // 매매 평균 (만원)
  avg_jeonse_price: number | null;   // 전세 평균 (만원)
  latest_trade_date: string | null;  // YYYY-MM
  trade_count: number;
  jeonse_count: number;
  source: "molit_calc" | "reb_api";
}

// ── XML 파서 (realestate-batch.ts 와 동일 패턴) ─────────────────
function extract(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
}

function parseItems(xml: string): Record<string, unknown>[] {
  const items: Record<string, unknown>[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const tagRe = /<([a-zA-Z_가-힣0-9]+)>([\s\S]*?)<\/\1>/g;
    const obj: Record<string, unknown> = {};
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(body)) !== null) {
      obj[t[1]] = t[2].trim();
    }
    items.push(obj);
  }
  return items;
}

// ── PostgREST GET ────────────────────────────────────────────────
async function pgrestGet(
  supabaseUrl: string,
  supabaseKey: string,
  path: string,
): Promise<unknown[]> {
  const headers: Record<string, string> = {
    "apikey":  supabaseKey,
    "Accept":  "application/json",
  };
  if (supabaseKey.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${supabaseKey}`;
  }
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostgREST GET ${path} → ${res.status}: ${txt.slice(0, 240)}`);
  }
  return res.json() as Promise<unknown[]>;
}

// ── 유틸 ────────────────────────────────────────────────────────

/** sqm을 10㎡ 단위로 반올림 (59.98 → 60, 84.83 → 80) */
function roundSqmToPyeongRange(sqm: number): number {
  return Math.round(sqm / 10) * 10;
}

/** 평균 (null 제외) */
function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((s, n) => s + n, 0) / nums.length);
}

/** YYYYMM 문자열로 Date 반환 */
function parseYM(yyyymm: string): Date {
  const y = parseInt(yyyymm.slice(0, 4), 10);
  const m = parseInt(yyyymm.slice(4, 6), 10) - 1;
  return new Date(y, m, 1);
}

/** 6개월 전 YYYYMM 문자열 반환 (필터용) */
function sixMonthsAgoYM(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── DB 기반 시세 계산 ────────────────────────────────────────────

interface TradeRecord {
  apt_name: string;
  dong: string;
  exclu_use_ar: number;
  pyeong: number | null;
  deal_year: number;
  deal_month: number;
  deal_amount: number;
}

interface RentalRecord {
  apt_name: string;
  dong: string;
  exclu_use_ar: number;
  pyeong: number | null;
  contract_year: number;
  contract_month: number;
  rent_type: "전세" | "월세";
  deposit: number;
}

/**
 * apartment_trades / apartment_rentals DB에서
 * 최근 6개월 데이터를 가져와 아파트별·평형대별 평균 시세를 계산한다.
 */
export async function calcMarketSummary(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<AptMarketSummary[]> {
  const cutoff = parseYM(sixMonthsAgoYM());

  // ── 매매 데이터 가져오기 ──────────────────────────────────────
  const tradeFields = "apt_name,dong,exclu_use_ar,pyeong,deal_year,deal_month,deal_amount";
  const tradeRows = (await pgrestGet(
    supabaseUrl,
    supabaseKey,
    `apartment_trades?select=${tradeFields}&cancel_yn=eq.false&order=deal_year.desc,deal_month.desc&limit=2000`,
  )) as TradeRecord[];

  // 6개월 컷오프 (JS 필터)
  const recentTrades = tradeRows.filter(r => {
    const d = new Date(r.deal_year, r.deal_month - 1, 1);
    return d >= cutoff;
  });

  // ── 전세 데이터 가져오기 ─────────────────────────────────────
  const rentalFields = "apt_name,dong,exclu_use_ar,pyeong,contract_year,contract_month,rent_type,deposit";
  const rentalRows = (await pgrestGet(
    supabaseUrl,
    supabaseKey,
    `apartment_rentals?select=${rentalFields}&rent_type=eq.전세&order=contract_year.desc,contract_month.desc&limit=2000`,
  )) as RentalRecord[];

  const recentRentals = rentalRows.filter(r => {
    const d = new Date(r.contract_year, r.contract_month - 1, 1);
    return d >= cutoff;
  });

  // ── 그룹핑: apt_name + dong + roundedSqm ─────────────────────
  type GroupKey = string; // `${apt_name}|${dong}|${roundedSqm}`

  const tradeGroups = new Map<GroupKey, { amounts: number[]; latestYM: string }>();
  for (const r of recentTrades) {
    const sqmR = roundSqmToPyeongRange(r.exclu_use_ar);
    const key: GroupKey = `${r.apt_name}|${r.dong}|${sqmR}`;
    const ym = `${r.deal_year}-${String(r.deal_month).padStart(2, "0")}`;
    const existing = tradeGroups.get(key);
    if (existing) {
      existing.amounts.push(r.deal_amount);
      if (ym > existing.latestYM) existing.latestYM = ym;
    } else {
      tradeGroups.set(key, { amounts: [r.deal_amount], latestYM: ym });
    }
  }

  const jeonseGroups = new Map<GroupKey, number[]>();
  for (const r of recentRentals) {
    const sqmR = roundSqmToPyeongRange(r.exclu_use_ar);
    const key: GroupKey = `${r.apt_name}|${r.dong}|${sqmR}`;
    const existing = jeonseGroups.get(key);
    if (existing) {
      existing.push(r.deposit);
    } else {
      jeonseGroups.set(key, [r.deposit]);
    }
  }

  // ── 합치기 ───────────────────────────────────────────────────
  const allKeys = new Set([...tradeGroups.keys(), ...jeonseGroups.keys()]);
  const results: AptMarketSummary[] = [];

  for (const key of allKeys) {
    const [aptName, dong, sqmRStr] = key.split("|");
    const sqmR = parseInt(sqmRStr, 10);
    const pyeong = Math.round(sqmR / 3.305785);

    const tradeData = tradeGroups.get(key);
    const jeonseAmounts = jeonseGroups.get(key) ?? [];

    results.push({
      apt_name:         aptName,
      dong,
      pyeong,
      sqm:              sqmR,
      avg_trade_price:  tradeData ? avg(tradeData.amounts) : null,
      avg_jeonse_price: jeonseAmounts.length > 0 ? avg(jeonseAmounts) : null,
      latest_trade_date: tradeData?.latestYM ?? null,
      trade_count:      tradeData?.amounts.length ?? 0,
      jeonse_count:     jeonseAmounts.length,
      source:           "molit_calc",
    });
  }

  // ── 정렬: dong → apt_name ─────────────────────────────────────
  results.sort((a, b) => {
    const dongCmp = a.dong.localeCompare(b.dong, "ko");
    if (dongCmp !== 0) return dongCmp;
    return a.apt_name.localeCompare(b.apt_name, "ko");
  });

  return results;
}

// ── 한국부동산원 지역 가격지수 API ───────────────────────────────

/**
 * 한국부동산원 API에서 인천 서구(sggCd=28260) 아파트 가격지수를 가져온다.
 * 응답이 XML이며, realestate-batch.ts 와 동일한 파서를 사용한다.
 * 오류 발생 시 null 반환.
 */
export async function fetchRebPriceIndex(
  apiKey: string,
): Promise<{ period: string; indexValue: number; changeRate: number } | null> {
  try {
    const params = new URLSearchParams({
      serviceKey: apiKey.includes("%") ? decodeURIComponent(apiKey) : apiKey,
      sggCd:      "28260",
      pageNo:     "1",
      numOfRows:  "100",
    });
    const url = `${REB_API}?${params.toString()}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      console.warn(`[reb-price] HTTP ${res.status} from REB API`);
      return null;
    }
    const xml = await res.text();

    const resultCode = extract(xml, "resultCode");
    if (resultCode && resultCode !== "00" && resultCode !== "000") {
      const msg = extract(xml, "resultMsg") || "(no msg)";
      console.warn(`[reb-price] REB resultCode=${resultCode}: ${msg}`);
      return null;
    }

    const items = parseItems(xml);
    if (items.length === 0) return null;

    // 가장 최신 period (baseDt 또는 baseYm 필드) 기준으로 정렬
    const sorted = [...items].sort((a, b) => {
      const aStr = String(a["baseDt"] ?? a["baseYm"] ?? "");
      const bStr = String(b["baseDt"] ?? b["baseYm"] ?? "");
      return bStr.localeCompare(aStr);
    });

    const latest = sorted[0];
    const periodRaw = String(latest["baseDt"] ?? latest["baseYm"] ?? "");
    // YYYYMM or YYYYMMDD → YYYY-MM
    const period = periodRaw.length >= 6
      ? `${periodRaw.slice(0, 4)}-${periodRaw.slice(4, 6)}`
      : periodRaw;

    const indexValue = parseFloat(
      String(latest["aptPriceIndex"] ?? latest["priceIndex"] ?? latest["index"] ?? "0")
        .replace(/,/g, ""),
    );
    const changeRate = parseFloat(
      String(latest["changeRate"] ?? latest["chgRate"] ?? latest["fluctuationRate"] ?? "0")
        .replace(/,/g, ""),
    );

    if (!Number.isFinite(indexValue) || indexValue === 0) return null;

    return { period, indexValue, changeRate: Number.isFinite(changeRate) ? changeRate : 0 };
  } catch (err) {
    console.warn("[reb-price] fetchRebPriceIndex error:", err);
    return null;
  }
}
