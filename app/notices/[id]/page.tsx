import { supabase } from "@/lib/supabase";
import NoticesPageClient from "./NoticesPageClient";

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("notices").select("id");
    if (data && data.length > 0) return data.map((n: { id: string }) => ({ id: String(n.id) }));
  } catch { /* fallback */ }
  return [{ id: "placeholder" }];
}

export default function NoticePage() {
  return <NoticesPageClient />;
}
