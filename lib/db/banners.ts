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
  created_at: string;
}

export async function fetchActiveBanners(): Promise<Banner[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("active", true)
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as Banner[];
}

// ── Admin ───────────────────────────────────────────────────────

export async function adminFetchBanners(): Promise<Banner[]> {
  return adminApiGet<Banner>("banners", { order: "sort_order" });
}

export async function adminCreateBanner(
  b: Omit<Banner, "id" | "created_at">
): Promise<void> {
  const id = "bnr_" + Date.now().toString(36);
  await adminApiPost("banners", "POST", [{ ...b, id }]);
}

export async function adminUpdateBanner(
  id: string,
  data: Partial<Omit<Banner, "id" | "created_at">>
): Promise<void> {
  await adminApiPost("banners", "PATCH", data, { eq: `id=eq.${id}` });
}

export async function adminDeleteBanner(id: string): Promise<void> {
  await adminApiPost("banners", "DELETE", null, { eq: `id=eq.${id}` });
}

