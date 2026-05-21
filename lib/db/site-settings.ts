import { supabase } from "@/lib/supabase";

export async function fetchSiteSetting(key: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .single();
    return (data?.value as string) ?? null;
  } catch {
    return null;
  }
}

// Delegates to server-side API route to avoid sending sb_* key as JWT Bearer
export async function adminSaveSiteSetting(key: string, value: string): Promise<void> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  const json = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "저장 실패");
}
