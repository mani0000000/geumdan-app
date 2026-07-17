import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

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
  page_type: "home" | "stores" | "all";
  created_at: string;
}

function withoutEmbeddedImage<T extends { image_url?: string | null }>(banner: T): T {
  if (!banner.image_url?.startsWith("data:image/")) return banner;
  return { ...banner, image_url: null };
}

export async function fetchActiveBanners(
  pageType?: "home" | "stores"
): Promise<Banner[]> {
  const now = new Date().toISOString();
  let query = supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("sort_order");
  if (pageType) {
    query = query.in("page_type", [pageType, "all"]);
  }
  const { data, error } = await query;
  if (error) return [];
  return ((data ?? []) as Banner[]).map(withoutEmbeddedImage);
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
