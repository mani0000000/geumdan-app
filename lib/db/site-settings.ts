import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

export async function adminSaveSiteSetting(key: string, value: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
