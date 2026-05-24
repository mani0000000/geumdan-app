import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface Popup {
  id: string;
  title: string;
  body?: string;
  image_url?: string;
  link_url?: string;
  button_text?: string;
  starts_at?: string;
  ends_at?: string;
  priority: number;
  active?: boolean;
  sort_order?: number;
}

// ─── 공개 (프론트용) ─────────────────────────────────────────
export async function fetchActivePopups(): Promise<Popup[]> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("popups")
      .select("id,title,body,image_url,link_url,button_text,starts_at,ends_at,priority")
      .eq("active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("priority", { ascending: false });

    if (error || !data?.length) return [];
    return data as Popup[];
  } catch {
    return [];
  }
}

// ─── 어드민 CRUD ─────────────────────────────────────────────
export async function adminFetchPopups(): Promise<Popup[]> {
  return adminApiGet<Popup>("popups", {
    select: "id,title,body,image_url,link_url,button_text,starts_at,ends_at,priority,active,sort_order",
    order: "sort_order.asc,priority.desc",
    limit: 100,
  });
}

export async function adminCreatePopup(popup: Omit<Popup, "id">): Promise<void> {
  await adminApiPost("popups", "POST", [popup]);
}

export async function adminUpdatePopup(id: string, popup: Partial<Popup>): Promise<void> {
  await adminApiPost("popups", "PATCH", popup, { eq: `id=eq.${id}` });
}

export async function adminDeletePopup(id: string): Promise<void> {
  await adminApiPost("popups", "DELETE", null, { eq: `id=eq.${id}` });
}
