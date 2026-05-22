import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface GasStationRow {
  id: number;
  name: string;
  brand_code: string;
  brand_name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  opinet_id: string | null;
  is_self: boolean;
  is_alttul: boolean;
  sort_order: number;
}

function client() {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function fetchGasStations(): Promise<GasStationRow[]> {
  const sb = client();
  const { data, error } = await sb
    .from("gas_stations")
    .select("id,name,brand_code,brand_name,area,address,lat,lng,opinet_id,is_self,is_alttul,sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[gas-stations] fetch error:", error.message);
    return [];
  }
  return (data ?? []) as GasStationRow[];
}

/** opinet_id 를 자동 저장 (서버사이드 전용 — service key 필요) */
export async function saveOpinetId(id: number, opinet_id: string): Promise<void> {
  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!serviceKey) return;
  const sb = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await sb.from("gas_stations").update({ opinet_id }).eq("id", id);
}
