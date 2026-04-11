// 국토교통부 아파트매매 실거래가 API
// 환경변수: NEXT_PUBLIC_MOLIT_API_KEY
// 인천 서구 법정동코드(LAWD_CD): 28260

const API_KEY = process.env.NEXT_PUBLIC_MOLIT_API_KEY ?? "";
const BASE = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

// 검단신도시(신도심) 법정동만 포함 — 구도심(검단동·오류동·금곡동) 제외
const GEUMDAN_SINDOSI_DONGS = ["당하", "불로", "마전", "왕길", "대곡"];

export interface AptTransaction {
  aptName: string;
  dong: string;
  floor: number;
  area: number;   // 전용면적 m²
  pyeong: number;
  price: number;  // 만원
  dealDate: string; // YYYY-MM
  buildYear: number;
}

function parseItems(json: unknown): Record<string, string>[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = (json as any)?.response?.body?.items?.item;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

// 법정동 기준으로만 필터링 (신도심 전용)
// aptName의 "검단" 여부는 구도심도 포함되므로 사용하지 않음
function isGeumdanSindosi(item: Record<string, string>): boolean {
  const dong = String(item["법정동"] ?? item.umdNm ?? "");
  return GEUMDAN_SINDOSI_DONGS.some((d) => dong.includes(d));
}

function rowToTransaction(item: Record<string, string>): AptTransaction {
  const priceStr = String(item["거래금액"] ?? item.dealAmount ?? "0").replace(/,/g, "").trim();
  const area = parseFloat(String(item["전용면적"] ?? item.excluUseAr ?? "0"));
  const year = String(item["년"] ?? item.dealYear ?? "");
  const month = String(item["월"] ?? item.dealMonth ?? "").padStart(2, "0");
  return {
    aptName: String(item["아파트"] ?? item.aptNm ?? ""),
    dong: String(item["법정동"] ?? item.umdNm ?? ""),
    floor: parseInt(String(item["층"] ?? item.floor ?? "0"), 10),
    area,
    pyeong: Math.round(area / 3.305785),
    price: parseInt(priceStr, 10) || 0,
    dealDate: `${year}-${month}`,
    buildYear: parseInt(String(item["건축년도"] ?? item.buildYear ?? "0"), 10),
  };
}

// CORS 3-way 레이스 (직접 + 2개 프록시)
async function apiFetch(dealYmd: string): Promise<Record<string, string>[]> {
  if (!API_KEY) return [];

  const params = new URLSearchParams({
    serviceKey: API_KEY,
    LAWD_CD: "28260",   // 인천 서구
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "100",
    _type: "json",
  });
  const targetUrl = `${BASE}?${params}`;

  try {
    return await Promise.any([
      // 1. 직접 (CORS 허용 환경, 1.5s 타임아웃)
      (async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 1500);
        try {
          const res = await fetch(targetUrl, { signal: ctrl.signal });
          clearTimeout(tid);
          if (!res.ok) throw new Error("direct not ok");
          return parseItems(await res.json());
        } catch { clearTimeout(tid); throw new Error("direct failed"); }
      })(),
      // 2. allorigins 프록시
      (async () => {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`allorigins ${res.status}`);
        const j = await res.json();
        return parseItems(JSON.parse(j.contents as string));
      })(),
      // 3. corsproxy.io 프록시
      (async () => {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`);
        if (!res.ok) throw new Error(`corsproxy ${res.status}`);
        return parseItems(await res.json());
      })(),
    ]);
  } catch { return []; }
}

export async function fetchRecentTransactions(yyyyMM?: string): Promise<AptTransaction[]> {
  if (!API_KEY) return [];
  const now = new Date();
  const dealYmd =
    yyyyMM ??
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  try {
    const items = await apiFetch(dealYmd);
    return items
      .filter((item) => isGeumdanSindosi(item) && parseInt(String(item["거래금액"] ?? "0").replace(/,/g, ""), 10) > 0)
      .map(rowToTransaction)
      .sort((a, b) => b.dealDate.localeCompare(a.dealDate))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export const hasMolitApiKey = () => Boolean(API_KEY);
