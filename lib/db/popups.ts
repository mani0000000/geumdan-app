import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface Popup {
  id: string;
  title: string;
  body: string;
  image_url?: string | null;
  link_url?: string | null;
  link_label?: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const MAX_ACTIVE_POPUPS = 3;

export async function fetchActivePopups(): Promise<Popup[]> {
  const { data, error } = await supabase
    .from("popups")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .limit(MAX_ACTIVE_POPUPS);
  if (error) return [];
  return (data ?? []) as Popup[];
}

// ── Admin ───────────────────────────────────────────────────────

export async function adminFetchPopups(): Promise<Popup[]> {
  return adminApiGet<Popup>("popups", { order: "sort_order" });
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "pop_" + Date.now().toString(36);
}

export async function adminCreatePopup(
  p: Omit<Popup, "id" | "created_at" | "updated_at">
): Promise<void> {
  const now = new Date().toISOString();
  await adminApiPost("popups", "POST", [
    { ...p, id: newId(), created_at: now, updated_at: now },
  ]);
}

export async function adminUpdatePopup(
  id: string,
  data: Partial<Omit<Popup, "id" | "created_at" | "updated_at">>
): Promise<void> {
  await adminApiPost(
    "popups",
    "PATCH",
    { ...data, updated_at: new Date().toISOString() },
    { eq: `id=eq.${id}` }
  );
}

export async function adminDeletePopup(id: string): Promise<void> {
  await adminApiPost("popups", "DELETE", null, { eq: `id=eq.${id}` });
}
