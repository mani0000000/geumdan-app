import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface Popup {
  id: string;
  sort_order: number;
  title: string;
  image_url?: string | null;
  link_url?: string | null;
  link_label: string;
  start_at?: string | null;
  end_at?: string | null;
  active: boolean;
  created_at: string;
}

// 노출 조건: active=true, (start_at NULL 또는 <= now), (end_at NULL 또는 >= now)
export async function fetchActivePopups(): Promise<Popup[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .eq("active", true)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order("sort_order");
  if (error) return [];
  return (data ?? []) as Popup[];
}

// ── Admin ───────────────────────────────────────────────────────

export async function adminFetchPopups(): Promise<Popup[]> {
  return adminApiGet<Popup>("popups", { order: "sort_order" });
}

export async function adminCreatePopup(
  p: Omit<Popup, "id" | "created_at">
): Promise<void> {
  const id = "pop_" + Date.now().toString(36);
  await adminApiPost("popups", "POST", [{ ...p, id }]);
}

export async function adminUpdatePopup(
  id: string,
  data: Partial<Omit<Popup, "id" | "created_at">>
): Promise<void> {
  await adminApiPost("popups", "PATCH", data, { eq: `id=eq.${id}` });
}

export async function adminDeletePopup(id: string): Promise<void> {
  await adminApiPost("popups", "DELETE", null, { eq: `id=eq.${id}` });
}
