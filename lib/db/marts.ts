import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export type MartClosingPattern = "2nd4th" | "1st3rd" | "open" | "closed";
export type MartType = "대형마트" | "중형마트" | "동네마트" | "슈퍼마트";

export interface Mart {
  id: string;
  name: string;
  brand: string;
  type: MartType;
  address: string;
  phone: string | null;
  distance: string | null;
  weekday_hours: string | null;
  saturday_hours: string | null;
  sunday_hours: string | null;
  closing_pattern: MartClosingPattern;
  notice: string | null;
  logo_url: string | null;
  lat: number | null;
  lng: number | null;
  sort_order: number;
  active: boolean;
}

export async function fetchMarts(): Promise<Mart[]> {
  const { data, error } = await supabase
    .from("marts")
    .select("*")
    .eq("active", true)
    .order("sort_order")
    .order("name");
  if (error) return [];
  return (data ?? []) as Mart[];
}

// ── Admin ──────────────────────────────────────────────────────

export async function adminFetchMarts(): Promise<Mart[]> {
  return adminApiGet<Mart>("marts", { order: "sort_order,name" });
}

export async function adminCreateMart(m: Omit<Mart, "id">): Promise<string> {
  const id = "mart_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await adminApiPost("marts", "POST", [{ ...m, id }]);
  return id;
}

export async function adminUpdateMart(id: string, m: Partial<Omit<Mart, "id">>): Promise<void> {
  await adminApiPost("marts", "PATCH", m, { eq: `id=eq.${id}` });
}

export async function adminDeleteMart(id: string): Promise<void> {
  await adminApiPost("marts", "DELETE", null, { eq: `id=eq.${id}` });
}
