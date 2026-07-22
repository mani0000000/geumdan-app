import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface BrandPromotionSource {
  id: string;
  brand_name: string;
  homepage_url: string;
  event_url: string;
  logo_url?: string | null;
  brand_color: string;
  category: string;
  include_patterns: string[];
  exclude_patterns: string[];
  max_items: number;
  priority: number;
  active: boolean;
  last_crawled_at?: string | null;
  last_status?: string | null;
  last_error?: string | null;
}

export interface BrandPromotion {
  id: string;
  source_id: string;
  brand_name: string;
  title: string;
  summary?: string | null;
  image_url?: string | null;
  source_url: string;
  benefit_type: string;
  category: string;
  terms_text?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
  fetched_at: string;
}

export interface BrandPromotionRun {
  id: number;
  started_at: string;
  finished_at?: string | null;
  status: string;
  sources_checked: number;
  items_found: number;
  items_saved: number;
  errors: Array<{ source: string; message: string }>;
  trigger_type: string;
}

export async function fetchActiveBrandPromotions(limit = 24): Promise<BrandPromotion[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brand_promotions")
    .select("id,source_id,brand_name,title,summary,image_url,source_url,benefit_type,category,terms_text,starts_at,ends_at,featured,active,sort_order,fetched_at")
    .eq("active", true)
    .not("image_url", "is", null)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("fetched_at", { ascending: false })
    .limit(80);
  let rows = (data ?? []) as BrandPromotion[];
  if (error || rows.length === 0) {
    try {
      const endpoint = new URL("https://plwpfnbhyzblgvliiole.supabase.co/rest/v1/brand_promotions");
      endpoint.searchParams.set("select", "id,source_id,brand_name,title,summary,image_url,source_url,benefit_type,category,terms_text,starts_at,ends_at,featured,active,sort_order,fetched_at");
      endpoint.searchParams.set("active", "eq.true");
      endpoint.searchParams.set("image_url", "not.is.null");
      endpoint.searchParams.set("order", "featured.desc,sort_order.asc,fetched_at.desc");
      endpoint.searchParams.set("limit", "80");
      const response = await fetch(endpoint, { headers: { apikey: "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk" }, cache: "no-store" });
      if (response.ok) rows = await response.json() as BrandPromotion[];
    } catch { /* 기본 조회 결과를 유지합니다. */ }
  }
  const counts = new Map<string, number>();
  return rows.filter((item) => {
    if (item.ends_at && new Date(item.ends_at).getTime() < Date.now()) return false;
    if (item.benefit_type !== "할인" && !/할인|특가|세일|sale/i.test(item.title)) return false;
    const compactTitle = item.title.replace(/^\[[^\]]+\]\s*/, "").trim().toLowerCase();
    if (/^(이벤트|공식 이벤트|진행중(?:인)? 이벤트.*|종료이벤트.*|지난 프로모션|payment|what'?s new|starbucks|메가mgc커피)$/.test(compactTitle)) return false;
    const titleMonth = Number(item.title.match(/(?:^|\D)(1[0-2]|[1-9])월(?:\D|$)/)?.[1] ?? 0);
    const currentMonth = new Date().getMonth() + 1;
    if (titleMonth && titleMonth !== currentMonth && titleMonth !== (currentMonth === 1 ? 12 : currentMonth - 1)) return false;
    const count = counts.get(item.brand_name) ?? 0;
    if (count >= 5) return false;
    counts.set(item.brand_name, count + 1);
    return true;
  }).slice(0, limit);
}

export const adminFetchPromotionSources = () =>
  adminApiGet<BrandPromotionSource>("brand_promotion_sources", { order: "priority" });

export const adminFetchPromotions = () =>
  adminApiGet<BrandPromotion>("brand_promotions", { order: "fetched_at.desc", limit: 200 });

export const adminFetchPromotionRuns = () =>
  adminApiGet<BrandPromotionRun>("brand_promotion_runs", { order: "started_at.desc", limit: 20 });

export async function adminUpdatePromotion(id: string, data: Partial<BrandPromotion>) {
  await adminApiPost("brand_promotions", "PATCH", data, { eq: `id=eq.${id}` });
}

export async function adminUpdatePromotionSource(id: string, data: Partial<BrandPromotionSource>) {
  await adminApiPost("brand_promotion_sources", "PATCH", data, { eq: `id=eq.${id}` });
}
