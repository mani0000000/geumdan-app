import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface SearchKeyword {
  id: string;
  keyword: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export async function fetchRecommendedKeywords(): Promise<string[]> {
  const { data, error } = await supabase
    .from("search_keywords")
    .select("keyword")
    .eq("active", true)
    .order("sort_order");
  if (error) return [];
  return (data ?? []).map((r: { keyword: string }) => r.keyword);
}

export async function fetchPopularKeywords(): Promise<string[]> {
  const { data, error } = await supabase
    .from("popular_search_keywords")
    .select("keyword");
  if (error) return [];
  return (data ?? []).map((r: { keyword: string }) => r.keyword);
}

export async function logSearch(keyword: string): Promise<void> {
  const k = keyword.trim();
  if (k.length < 2) return;
  await supabase.from("search_logs").insert({ keyword: k });
}

// ── Admin ──────────────────────────────────────────────────────
export async function adminFetchKeywords(): Promise<SearchKeyword[]> {
  const { data, error } = await supabaseAdmin
    .from("search_keywords")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchKeyword[];
}

export async function adminCreateKeyword(keyword: string, sort_order: number): Promise<void> {
  const id = "skw_" + Date.now().toString(36);
  const { error } = await supabaseAdmin.from("search_keywords").insert({ id, keyword, sort_order });
  if (error) throw new Error(error.message);
}

export async function adminUpdateKeyword(id: string, data: Partial<Omit<SearchKeyword, "id" | "created_at">>): Promise<void> {
  const { error } = await supabaseAdmin.from("search_keywords").update(data).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteKeyword(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("search_keywords").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
