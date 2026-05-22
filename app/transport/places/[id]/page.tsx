import { supabase } from "@/lib/supabase";
import PlacePageClient from "./PlacePageClient";

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("places").select("id").eq("is_published", true);
    if (data && data.length > 0) return data.map((p: { id: string }) => ({ id: String(p.id) }));
  } catch { /* fallback */ }
  return [{ id: "placeholder" }];
}

export default function PlacePage() {
  return <PlacePageClient />;
}
