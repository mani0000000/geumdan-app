import EditClient from "./EditClient";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export async function generateStaticParams() {
  if (!isSupabaseConfigured) return [{ id: "preview" }];
  try {
    const { data } = await supabase.from("community_posts").select("id");
    if (data && data.length > 0) {
      return data.map((p: { id: string }) => ({ id: String(p.id) }));
    }
  } catch {
    // fall through
  }
  return [{ id: "preview" }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <EditClient params={params} />;
}
