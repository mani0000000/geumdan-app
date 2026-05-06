/**
 * 검단신도시 부동산 배치 — 공유 모듈
 *
 * 국토교통부 실거래가/전월세 API → Supabase apartment_trades / apartment_rentals 적재
 *
 * 사용처:
 *   scripts/fetch_realestate.ts                     (CLI)
 *   app/api/cron/realestate/route.ts                (Vercel Cron)
 *   app/api/admin/realestate/run-batch/route.ts     (어드민 수동 실행)
 */
// ── API 엔드포인트 ──────────────────────────────────────────────
// data.go.kr HTTPS 엔드포인트 (구 openapi.molit.go.kr는 해외에서 접근 불가)
const TRADE_API  = "https://apis.data.go.kr/1613000/RTMSOBJSvc/getRTMSDataSvcAptTradeDev";
const RENTAL_API = "https://apis.data.go.kr/1613000/RTMSOBJSvc/getRTMSDataSvcApartRent";

// 인천광역시 서구 LAWD_CD (5자리 시군구 코드, 2018년 이후 적용)
export const LAWD_CD_SEOGU = "28260";

// ── 검단신도시 법정동 ──────────────────────────────────────────
// API 응답의 `법정동` 필드(이름)로 필터링한다. 10자리 법정동코드(`bjdongCd`)도
// 함께 적재하지만, 행정구역 개편으로 코드가 변경된 적이 있어 이름 기준 필터가 안전하다.
export const GEUMDAN_DONGS = [
  "검단동", "당하동", "불로동", "마전동",
  "대곡동", "금곡동", "원당동", "왕길동", "백석동",
] as const;

// 참고용 — 실제 적재 시점의 법정동 코드 (변동 가능)
export const GEUMDAN_BJDONG_CODES: Record<string, string> = {
  검단동: "2826010400",
  당하동: "2826010500",
  불로동: "2826010600",
  마전동: "2826010700",
  대곡동: "2826010800",
  금곡동: "2826010900",
  원당동: "2826011000",
  왕길동: "2826011100",
  백석동: "2826011200",
};

export type RawApiItem = Record<string, unknown>;

export interface BatchOptions {
  apiKey:         string;
  supabaseUrl:    string;
  supabaseKey:    string;            // service_role
  months:         number;            // 1 = 전월만, 6 = 최근 6개월
  yearMonths?:    string[];          // 직접 지정 시 우선 (YYYYMM)
  triggerSource?: "cron" | "admin" | "cli";
}

export interface MonthDetail {
  yearMonth:    string;
  tradesAll:    number;
  tradesKept:   number;
  rentalsAll:   number;
  rentalsKept:  number;
  error?:       string;
}

export interface BatchResult {
  status:       "success" | "partial" | "failed";
  tradesCount:  number;
  rentalsCount: number;
  details:      MonthDetail[];
  error?:       string;
  logId?:       number;
}

// ── 유틸 ────────────────────────────────────────────────────────
export function previousYearMonths(count: number, refDate = new Date()): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
    out.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function pickStr(obj: RawApiItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function pickInt(obj: RawApiItem, ...keys: string[]): number | null {
  const s = pickStr(obj, ...keys).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function pickFloat(obj: RawApiItem, ...keys: string[]): number | null {
  const s = pickStr(obj, ...keys).replace(/[,\s]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function sqmToPyeong(sqm: number | null): number | null {
  if (!sqm) return null;
  return Math.round(sqm / 3.305785);
}

function isGeumdanDong(dongRaw: string): boolean {
  return GEUMDAN_DONGS.some(d => dongRaw.includes(d));
}

// ── XML 파서 (MOLIT 응답이 _type=json 미지원 시 대비) ────────────
function extract(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : "";
}

function parseItems(xml: string): RawApiItem[] {
  const items: RawApiItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const body = m[1];
    const tagRe = /<([a-zA-Z_가-힣0-9]+)>([\s\S]*?)<\/\1>/g;
    const obj: RawApiItem = {};
    let t: RegExpExecArray | null;
    while ((t = tagRe.exec(body)) !== null) {
      obj[t[1]] = t[2].trim();
    }
    items.push(obj);
  }
  return items;
}

// ── API 호출 ────────────────────────────────────────────────────
async function callMolit(
  base: string,
  apiKey: string,
  lawdCd: string,
  dealYmd: string,
  pageNo: number,
  numOfRows: number,
): Promise<{ items: RawApiItem[]; totalCount: number }> {
  const params = new URLSearchParams({
    // data.go.kr 포털 키는 URL 인코딩 상태 → 디코딩 후 URLSearchParams 재인코딩
    serviceKey: apiKey.includes('%') ? decodeURIComponent(apiKey) : apiKey,
    LAWD_CD:    lawdCd,
    DEAL_YMD:   dealYmd,
    pageNo:     String(pageNo),
    numOfRows:  String(numOfRows),
  });
  const url = `${base}?${params.toString()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '(no body)');
    throw new Error(`MOLIT HTTP ${res.status} (${dealYmd}): ${errBody.substring(0, 300)}`);
  }
  const xml = await res.text();

  const resultCode = extract(xml, "resultCode");
  if (resultCode && resultCode !== "00" && resultCode !== "000") {
    const msg = extract(xml, "resultMsg") || "(no msg)";
    throw new Error(`MOLIT resultCode=${resultCode}: ${msg}`);
  }

  const items = parseItems(xml);
  const totalCount = parseInt(extract(xml, "totalCount") || "0", 10) || items.length;
  return { items, totalCount };
}

async function fetchAll(
  base: string,
  apiKey: string,
  lawdCd: string,
  dealYmd: string,
): Promise<RawApiItem[]> {
  const PAGE = 1000;
  const out: RawApiItem[] = [];
  let page = 1;
  while (true) {
    const { items, totalCount } = await callMolit(base, apiKey, lawdCd, dealYmd, page, PAGE);
    out.push(...items);
    if (out.length >= totalCount || items.length < PAGE) break;
    page++;
    if (page > 50) break; // 안전 가드
  }
  return out;
}

// ── 매핑: API → DB row ──────────────────────────────────────────
interface TradeRow {
  apt_name:     string;
  sigungu:      string;
  dong:         string;
  jibun:        string;
  road_address: string | null;
  exclu_use_ar: number;
  pyeong:       number | null;
  floor_no:     number | null;
  build_year:   number | null;
  deal_year:    number;
  deal_month:   number;
  deal_day:     number | null;
  deal_amount:  number;
  bjdong_cd:    string;
  cancel_yn:    boolean;
  cancel_date:  string | null;
  raw:          RawApiItem;
}

function mapTrade(item: RawApiItem): TradeRow | null {
  const aptName = pickStr(item, "aptNm", "아파트");
  const dong    = pickStr(item, "umdNm", "법정동");
  const sqm     = pickFloat(item, "excluUseAr", "전용면적");
  const amount  = pickInt(item, "dealAmount", "거래금액");
  const year    = pickInt(item, "dealYear", "년");
  const month   = pickInt(item, "dealMonth", "월");
  if (!aptName || !dong || !sqm || !amount || !year || !month) return null;

  const cancelDateRaw = pickStr(item, "cdealDay");
  const cancelYn      = (pickStr(item, "cdealType") === "O") || !!cancelDateRaw;

  return {
    apt_name:     aptName,
    sigungu:      pickStr(item, "sggCd", "지역코드") ? "인천광역시 서구" : "인천광역시 서구",
    dong,
    jibun:        pickStr(item, "jibun", "지번"),
    road_address: pickStr(item, "roadNm") || null,
    exclu_use_ar: sqm,
    pyeong:       sqmToPyeong(sqm),
    floor_no:     pickInt(item, "floor", "층"),
    build_year:   pickInt(item, "buildYear", "건축년도"),
    deal_year:    year,
    deal_month:   month,
    deal_day:     pickInt(item, "dealDay", "일"),
    deal_amount:  amount,
    bjdong_cd:    pickStr(item, "bjdongCd", "법정동시군구코드") || GEUMDAN_BJDONG_CODES[dong] || "",
    cancel_yn:    cancelYn,
    cancel_date:  parseCancelDate(cancelDateRaw),
    raw:          item,
  };
}

function parseCancelDate(s: string): string | null {
  // MOLIT 형식: "yy.MM.dd" 또는 "YYYY-MM-DD"
  if (!s) return null;
  const m = s.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  if (!m) return null;
  let yy = parseInt(m[1], 10);
  if (yy < 100) yy += yy < 50 ? 2000 : 1900;
  return `${yy}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

interface RentalRow {
  apt_name:       string;
  sigungu:        string;
  dong:           string;
  jibun:          string;
  road_address:   string | null;
  exclu_use_ar:   number;
  pyeong:         number | null;
  floor_no:       number | null;
  build_year:     number | null;
  contract_year:  number;
  contract_month: number;
  contract_day:   number | null;
  rent_type:      "전세" | "월세";
  deposit:        number;
  monthly_rent:   number;
  bjdong_cd:      string;
  raw:            RawApiItem;
}

function mapRental(item: RawApiItem): RentalRow | null {
  const aptName = pickStr(item, "aptNm", "아파트");
  const dong    = pickStr(item, "umdNm", "법정동");
  const sqm     = pickFloat(item, "excluUseAr", "전용면적");
  const deposit = pickInt(item, "deposit", "보증금액") ?? 0;
  const monthly = pickInt(item, "monthlyRent", "월세금액") ?? 0;
  const year    = pickInt(item, "dealYear", "년");
  const month   = pickInt(item, "dealMonth", "월");
  if (!aptName || !dong || !sqm || !year || !month) return null;
  if (deposit === 0 && monthly === 0) return null;

  return {
    apt_name:       aptName,
    sigungu:        "인천광역시 서구",
    dong,
    jibun:          pickStr(item, "jibun", "지번"),
    road_address:   pickStr(item, "roadNm") || null,
    exclu_use_ar:   sqm,
    pyeong:         sqmToPyeong(sqm),
    floor_no:       pickInt(item, "floor", "층"),
    build_year:     pickInt(item, "buildYear", "건축년도"),
    contract_year:  year,
    contract_month: month,
    contract_day:   pickInt(item, "dealDay", "일"),
    rent_type:      monthly > 0 ? "월세" : "전세",
    deposit,
    monthly_rent:   monthly,
    bjdong_cd:      pickStr(item, "bjdongCd") || GEUMDAN_BJDONG_CODES[dong] || "",
    raw:            item,
  };
}

// ── PostgREST 직접 호출 (서버 환경, service_role) ───────────────
async function pgrest(
  url: string,
  key: string,
  method: "POST" | "PATCH",
  path: string,
  body: unknown,
  prefer = "return=minimal",
): Promise<void> {
  const headers: Record<string, string> = {
    "apikey":       key,
    "Content-Type": "application/json",
    "Prefer":       prefer,
  };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostgREST ${method} ${path} → ${res.status}: ${txt.slice(0, 240)}`);
  }
}

async function pgrestInsertReturning(
  url: string,
  key: string,
  path: string,
  body: unknown,
): Promise<unknown[]> {
  const headers: Record<string, string> = {
    "apikey":       key,
    "Content-Type": "application/json",
    "Prefer":       "return=representation",
  };
  if (key.startsWith("eyJ")) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PostgREST INSERT ${path} → ${res.status}: ${txt.slice(0, 240)}`);
  }
  return res.json();
}

async function upsertChunked(
  url: string,
  key: string,
  table: string,
  rows: unknown[],
  conflictCols: string[],
  chunkSize = 100,
): Promise<number> {
  if (rows.length === 0) return 0;
  const onConflict = encodeURIComponent(conflictCols.join(","));
  const path = `${table}?on_conflict=${onConflict}`;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await pgrest(url, key, "POST", path, chunk, "resolution=merge-duplicates,return=minimal");
    inserted += chunk.length;
  }
  return inserted;
}

// ── 메인 ────────────────────────────────────────────────────────
export async function runRealestateBatch(opts: BatchOptions): Promise<BatchResult> {
  const { apiKey, supabaseUrl, supabaseKey, months, yearMonths, triggerSource = "cli" } = opts;
  const targets = (yearMonths && yearMonths.length > 0)
    ? yearMonths
    : previousYearMonths(Math.max(1, Math.min(24, months)));

  // 로그 행 INSERT (running)
  let logId: number | undefined;
  try {
    const inserted = await pgrestInsertReturning(supabaseUrl, supabaseKey, "realestate_batch_log", [{
      status:         "running",
      trigger_source: triggerSource,
      target_months:  targets,
      trades_count:   0,
      rentals_count:  0,
    }]) as { id: number }[];
    logId = inserted[0]?.id;
  } catch (e) {
    console.warn("batch_log insert failed:", e);
  }

  const details: MonthDetail[] = [];
  let totalTrades = 0;
  let totalRentals = 0;
  let hadError = false;

  for (const ym of targets) {
    const detail: MonthDetail = {
      yearMonth: ym, tradesAll: 0, tradesKept: 0, rentalsAll: 0, rentalsKept: 0,
    };
    try {
      // ── 매매 ──
      const tradeItems  = await fetchAll(TRADE_API, apiKey, LAWD_CD_SEOGU, ym);
      detail.tradesAll  = tradeItems.length;
      const tradeRows: TradeRow[] = [];
      for (const it of tradeItems) {
        const dong = pickStr(it, "umdNm", "법정동");
        if (!isGeumdanDong(dong)) continue;
        const row = mapTrade(it);
        if (row) tradeRows.push(row);
      }
      detail.tradesKept = tradeRows.length;
      if (tradeRows.length > 0) {
        const ins = await upsertChunked(
          supabaseUrl, supabaseKey, "apartment_trades", tradeRows,
          ["apt_name", "dong", "jibun", "exclu_use_ar", "floor_no", "deal_year", "deal_month", "deal_day", "deal_amount"],
        );
        totalTrades += ins;
      }

      // 과부하 방지
      await new Promise(r => setTimeout(r, 200));

      // ── 전월세 ──
      const rentalItems = await fetchAll(RENTAL_API, apiKey, LAWD_CD_SEOGU, ym);
      detail.rentalsAll = rentalItems.length;
      const rentalRows: RentalRow[] = [];
      for (const it of rentalItems) {
        const dong = pickStr(it, "umdNm", "법정동");
        if (!isGeumdanDong(dong)) continue;
        const row = mapRental(it);
        if (row) rentalRows.push(row);
      }
      detail.rentalsKept = rentalRows.length;
      if (rentalRows.length > 0) {
        const ins = await upsertChunked(
          supabaseUrl, supabaseKey, "apartment_rentals", rentalRows,
          ["apt_name", "dong", "jibun", "exclu_use_ar", "floor_no", "contract_year", "contract_month", "contract_day", "deposit", "monthly_rent"],
        );
        totalRentals += ins;
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      hadError = true;
      detail.error = err instanceof Error ? err.message : String(err);
      console.error(`[realestate-batch] ${ym} 실패:`, err);
    }
    details.push(detail);
  }

  const status: BatchResult["status"] =
    hadError ? (totalTrades + totalRentals > 0 ? "partial" : "failed") : "success";

  // 로그 업데이트
  if (logId != null) {
    try {
      await pgrest(
        supabaseUrl, supabaseKey, "PATCH",
        `realestate_batch_log?id=eq.${logId}`,
        {
          finished_at:    new Date().toISOString(),
          status,
          trades_count:   totalTrades,
          rentals_count:  totalRentals,
          detail:         { months: details },
          error_message:  hadError ? details.find(d => d.error)?.error ?? null : null,
        },
      );
    } catch (e) {
      console.warn("batch_log update failed:", e);
    }
  }

  return {
    status,
    tradesCount:  totalTrades,
    rentalsCount: totalRentals,
    details,
    logId,
  };
}
