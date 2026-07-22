import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import { fetchActiveBrandPromotions, type BrandPromotion } from "@/lib/db/brand-promotions";

export interface Banner {
  id: string;
  sort_order: number;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  link_label: string;
  bg_from: string;
  bg_to: string;
  badge?: string | null;
  badge_color: string;
  starts_at: string;
  ends_at: string;
  active: boolean;
  created_at: string;
  page_type?: 'home' | 'stores' | 'all';
  promotion?: BrandPromotion;
}

function withoutEmbeddedImage<T extends { image_url?: string | null }>(banner: T): T {
  if (!banner.image_url?.startsWith("data:image/")) return banner;
  return { ...banner, image_url: null };
}

export async function fetchActiveBanners(pageType?: 'home' | 'stores'): Promise<Banner[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("sort_order");
  if (pageType) {
    query = query.or(`page_type.eq.all,page_type.eq.${pageType}`);
  }
  const [{ data }, promotions] = await Promise.all([
    query,
    fetchActiveBrandPromotions(24),
  ]);
  const manual = ((data ?? []) as Banner[]).map(withoutEmbeddedImage);
  const promotionBanners = promotions.map((promotion, index): Banner => {
    const start = promotion.starts_at ?? promotion.fetched_at;
    const end = promotion.ends_at ?? new Date(+new Date(start) + 31 * 86400000).toISOString();
    return {
      id: `brand_${promotion.id}`,
      sort_order: promotion.featured ? index - 100 : index + 1,
      title: promotion.title,
      subtitle: null,
      image_url: `/api/promotions/image?id=${encodeURIComponent(promotion.id)}`,
      link_url: `/api/promotions/reader?id=${encodeURIComponent(promotion.id)}`,
      link_label: "행사 자세히",
      bg_from: "#172033",
      bg_to: "#334155",
      badge: promotion.benefit_type || "EVENT",
      badge_color: "#FDE68A",
      starts_at: start,
      ends_at: end,
      active: promotion.active,
      created_at: promotion.fetched_at,
      page_type: "all",
      promotion,
    };
  });
  const discountManual = manual.filter((banner) => /할인|특가|세일|sale/i.test(`${banner.badge ?? ""} ${banner.title} ${banner.subtitle ?? ""}`));
  return [...promotionBanners, ...(promotionBanners.length ? [] : discountManual)]
    .sort((a, b) => a.sort_order - b.sort_order)
    .slice(0, 16);
}

// ── Admin ───────────────────────────────────────────────────────

export async function adminFetchBanners(): Promise<Banner[]> {
  const banners = await adminApiGet<Banner>("banners", { order: "sort_order" });
  return banners.map(withoutEmbeddedImage);
}

export async function adminCreateBanner(
  b: Omit<Banner, "id" | "created_at">
): Promise<void> {
  const id = "bnr_" + Date.now().toString(36);
  await adminApiPost("banners", "POST", [{ ...withoutEmbeddedImage(b), id }]);
}

export async function adminUpdateBanner(
  id: string,
  data: Partial<Omit<Banner, "id" | "created_at">>
): Promise<void> {
  await adminApiPost("banners", "PATCH", withoutEmbeddedImage(data), { eq: `id=eq.${id}` });
}

export async function adminDeleteBanner(id: string): Promise<void> {
  await adminApiPost("banners", "DELETE", null, { eq: `id=eq.${id}` });
}
