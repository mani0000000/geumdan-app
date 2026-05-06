import StorePageClient from "./StorePageClient";
import { supabase } from "@/lib/supabase";

export async function generateStaticParams() {
  try {
    const { data } = await supabase.from("stores").select("id");
    if (data && data.length > 0) {
      return data.map((s: { id: string }) => ({ id: String(s.id) }));
    }
  } catch {
    // fall through
  }
  return [{ id: "preview" }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StorePageClient params={params} />;
}
