import { supabase } from "@/lib/supabase";

export interface PriceIndexRow {
  source: string;          // 'kb' | 'reb'
  region: string;
  period: string;          // YYYYMM
  index_value: number | null;
  change_rate: number | null;
  trade_count: number | null;
}

/**
 * Supabase apt_price_index 테이블에서 최신 레코드 조회
 * 테이블이 없거나 오류 시 null 반환
 */
export async function fetchLatestPriceIndex(
  source?: "kb" | "reb"
): Promise<PriceIndexRow | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from("apt_price_index")
      .select("source,region,period,index_value,change_rate,trade_count")
      .order("period", { ascending: false })
      .limit(1);

    if (source) query = query.eq("source", source);

    const { data, error } = await query;
    if (error || !data?.length) return null;
    return data[0] as PriceIndexRow;
  } catch {
    return null;
  }
}

/**
 * 최근 N개월 시세 지수 목록 조회 (차트용)
 */
export async function fetchPriceIndexHistory(
  source: "kb" | "reb" = "kb",
  months = 12
): Promise<PriceIndexRow[]> {
  try {
    const { data, error } = await supabase
      .from("apt_price_index")
      .select("source,region,period,index_value,change_rate,trade_count")
      .eq("source", source)
      .order("period", { ascending: true })
      .limit(months);

    if (error || !data) return [];
    return data as PriceIndexRow[];
  } catch {
    return [];
  }
}
