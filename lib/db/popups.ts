import { supabase } from "@/lib/supabase";

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
}

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
