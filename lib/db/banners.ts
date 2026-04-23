import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  const { data, error } = await supabaseAdmin
    .from("banners")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Banner[];
}

export async function adminCreateBanner(
  b: Omit<Banner, "id" | "created_at">
): Promise<void> {
  const id = "bnr_" + Date.now().toString(36);
  const { error } = await supabaseAdmin.from("banners").insert({ ...b, id });
  if (error) throw new Error(error.message);
}

export async function adminUpdateBanner(
  id: string,
  data: Partial<Omit<Banner, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabaseAdmin.from("banners").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteBanner(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("banners").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
