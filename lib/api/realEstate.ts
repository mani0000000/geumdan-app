// 국토교통부 아파트매매 실거래가 상세 자료 API
// API 키 발급: https://www.data.go.kr/data/15057511/openapi.do
// 환경변수: NEXT_PUBLIC_MOLIT_API_KEY
//
// 인천 서구 지역코드(LAWD_CD): 28140

const API_KEY = process.env.NEXT_PUBLIC_MOLIT_API_KEY ?? "";

export interface AptTransaction {
  aptName: string;
  dong: string;
  floor: number;
  area: number; // 전용면적 m²
  pyeong: number;
  price: number; // 만원
  dealDate: string; // YYYY-MM-DD
  buildYear: number;
}

export async function fetchRecentTransactions(yyyyMM?: string): Promise<AptTransaction[]> {
  if (!API_KEY) return [];
  const now = new Date();
  const dealYmd =
    yyyyMM ??
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      LAWD_CD: "28140", // 인천 서구
      DEAL_YMD: dealYmd,
      pageNo: "1",
      numOfRows: "50",
    });
    const res = await fetch(
      `https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev?${params}`
    );
    if (!res.ok) return [];
    const text = await res.text();
    // XML parsing (API returns XML)
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    const tag = (xml: string, name: string) => {
      const m = xml.match(new RegExp(`<${name}[^>]*>([^<]*)<\/${name}>`));
      return m ? m[1].trim() : "";
    };
    return items
      .map((m) => {
        const xml = m[1];
        const area = parseFloat(tag(xml, "전용면적")) || 0;
        const pyeong = Math.round(area / 3.305785);
        const priceStr = tag(xml, "거래금액").replace(/,/g, "").trim();
        const price = parseInt(priceStr) || 0;
        const year = tag(xml, "년");
        const month = tag(xml, "월").padStart(2, "0");
        const day = tag(xml, "일").padStart(2, "0");
        return {
          aptName: tag(xml, "아파트"),
          dong: tag(xml, "법정동"),
          floor: parseInt(tag(xml, "층")) || 0,
          area,
          pyeong,
          price,
          dealDate: `${year}-${month}-${day}`,
          buildYear: parseInt(tag(xml, "건축년도")) || 0,
        };
      })
      .filter(
        (t) =>
          t.aptName.includes("검단") &&
          t.price > 0
      )
      .sort((a, b) => b.dealDate.localeCompare(a.dealDate))
      .slice(0, 20);
  } catch {
    return [];
  }
}

export const hasMolitApiKey = () => Boolean(API_KEY);
