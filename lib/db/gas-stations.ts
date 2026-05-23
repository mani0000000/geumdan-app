import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ── 브랜드 메타 ────────────────────────────────────────────────
const BRAND_META: Record<string, { brandColor: string; brandBg: string; brandShort: string }> = {
  SKE: { brandColor: "#EF4444", brandBg: "#FEF2F2", brandShort: "SK"   },
  GSC: { brandColor: "#0058B0", brandBg: "#EFF6FF", brandShort: "GS"   },
  HDO: { brandColor: "#16A34A", brandBg: "#F0FDF4", brandShort: "현대" },
  SOL: { brandColor: "#F59E0B", brandBg: "#FFFBEB", brandShort: "SOIL" },
  RTO: { brandColor: "#6366F1", brandBg: "#EEF2FF", brandShort: "알뜰" },
  RTX: { brandColor: "#6366F1", brandBg: "#EEF2FF", brandShort: "알뜰" },
  NHO: { brandColor: "#059669", brandBg: "#ECFDF5", brandShort: "NH"   },
  ETC: { brandColor: "#6B7280", brandBg: "#F3F4F6", brandShort: "일반" },
};
function metaFor(code: string) { return BRAND_META[code] ?? BRAND_META["ETC"]; }

// ── 지도 오버레이용 타입 ───────────────────────────────────────
export interface BasicGasStation {
  id: string;
  name: string;
  brandCode: string;
  brandColor: string;
  brandBg: string;
  brandShort: string;
  lat: number;
  lng: number;
  area: string;
  address: string;
  isSelf: boolean;
  isAlttul: boolean;
}

const FALLBACK_BASIC: BasicGasStation[] = [
  { id:"1",  name:"검단농협주유소",    brandCode:"NHO", ...metaFor("NHO"), lat:37.5445, lng:126.6715, area:"당하동", address:"인천 서구 완정로 38",        isSelf:false, isAlttul:true  },
  { id:"2",  name:"신도시주유소",      brandCode:"ETC", ...metaFor("ETC"), lat:37.5505, lng:126.6775, area:"당하동", address:"인천 서구 고산후로 102",      isSelf:false, isAlttul:false },
  { id:"3",  name:"창신주유소",        brandCode:"ETC", ...metaFor("ETC"), lat:37.5490, lng:126.6840, area:"원당동", address:"인천 서구 원당대로 802",      isSelf:false, isAlttul:false },
  { id:"4",  name:"검단원당주유소",    brandCode:"SOL", ...metaFor("SOL"), lat:37.5495, lng:126.6850, area:"원당동", address:"인천 서구 원당대로 834",      isSelf:false, isAlttul:false },
  { id:"5",  name:"검단주유소",        brandCode:"HDO", ...metaFor("HDO"), lat:37.5565, lng:126.6745, area:"마전동", address:"인천 서구 완정로 183",        isSelf:false, isAlttul:false },
  { id:"6",  name:"마전주유소",        brandCode:"RTO", ...metaFor("RTO"), lat:37.5580, lng:126.6745, area:"마전동", address:"인천 서구 완정로 223",        isSelf:false, isAlttul:true  },
  { id:"7",  name:"검단대로주유소",    brandCode:"GSC", ...metaFor("GSC"), lat:37.5555, lng:126.6810, area:"마전동", address:"인천 서구 검단로 502",        isSelf:false, isAlttul:false },
  { id:"8",  name:"차오름에너지주유소",brandCode:"SKE", ...metaFor("SKE"), lat:37.5615, lng:126.6675, area:"왕길동", address:"인천 서구 단봉로 78",         isSelf:false, isAlttul:false },
  { id:"9",  name:"미소주유소",        brandCode:"SKE", ...metaFor("SKE"), lat:37.5630, lng:126.6680, area:"왕길동", address:"인천 서구 단봉로 118",        isSelf:false, isAlttul:false },
  { id:"10", name:"오일드림주유소",    brandCode:"HDO", ...metaFor("HDO"), lat:37.5610, lng:126.6650, area:"왕길동", address:"인천 서구 거남로 22",         isSelf:false, isAlttul:false },
  { id:"11", name:"구도일주유소",      brandCode:"SOL", ...metaFor("SOL"), lat:37.5608, lng:126.6668, area:"왕길동", address:"인천 서구 단봉로 30",         isSelf:false, isAlttul:false },
  { id:"12", name:"단봉주유소",        brandCode:"ETC", ...metaFor("ETC"), lat:37.5640, lng:126.6700, area:"왕길동", address:"인천 서구 검단로 123",        isSelf:false, isAlttul:false },
  { id:"13", name:"왕길셀프주유소",    brandCode:"ETC", ...metaFor("ETC"), lat:37.5650, lng:126.6635, area:"왕길동", address:"인천 서구 사곶로 25",         isSelf:true,  isAlttul:false },
  { id:"14", name:"금곡주유소",        brandCode:"HDO", ...metaFor("HDO"), lat:37.5525, lng:126.6565, area:"금곡동", address:"인천 서구 검단로 732",        isSelf:false, isAlttul:false },
  { id:"15", name:"검단스타주유소",    brandCode:"GSC", ...metaFor("GSC"), lat:37.5515, lng:126.6605, area:"금곡동", address:"인천 서구 검단로 669",        isSelf:false, isAlttul:false },
  { id:"16", name:"인천랍스터주유소",  brandCode:"HDO", ...metaFor("HDO"), lat:37.5520, lng:126.6595, area:"금곡동", address:"인천 서구 검단로 694",        isSelf:false, isAlttul:false },
  { id:"17", name:"오류공단주유소",    brandCode:"ETC", ...metaFor("ETC"), lat:37.5460, lng:126.6495, area:"오류동", address:"인천 서구 검단로 45번길 12",  isSelf:false, isAlttul:false },
  { id:"18", name:"오류셀프주유소",    brandCode:"HDO", ...metaFor("HDO"), lat:37.5470, lng:126.6510, area:"오류동", address:"인천 서구 드림로 112",        isSelf:true,  isAlttul:false },
  { id:"19", name:"불로주유소",        brandCode:"ETC", ...metaFor("ETC"), lat:37.5395, lng:126.6650, area:"불로동", address:"인천 서구 검단로 798",        isSelf:false, isAlttul:false },
  { id:"20", name:"대곡주유소",        brandCode:"ETC", ...metaFor("ETC"), lat:37.5350, lng:126.6800, area:"대곡동", address:"인천 서구 대곡로 214",        isSelf:false, isAlttul:false },
  { id:"21", name:"대곡대로주유소",    brandCode:"ETC", ...metaFor("ETC"), lat:37.5360, lng:126.6820, area:"대곡동", address:"인천 서구 대곡로 351",        isSelf:false, isAlttul:false },
];

export async function fetchBasicGasStations(): Promise<BasicGasStation[]> {
  try {
    const sb = client();
    const { data, error } = await sb
      .from("gas_stations")
      .select("id,name,brand_code,lat,lng,area,address,is_self,is_alttul")
      .eq("active", true)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) return FALLBACK_BASIC;

    return data.map(row => {
      const meta = metaFor(row.brand_code as string);
      return {
        id: String(row.id),
        name: row.name as string,
        brandCode: row.brand_code as string,
        brandColor: meta.brandColor,
        brandBg: meta.brandBg,
        brandShort: meta.brandShort,
        lat: row.lat as number,
        lng: row.lng as number,
        area: row.area as string,
        address: row.address as string,
        isSelf: row.is_self as boolean,
        isAlttul: row.is_alttul as boolean,
      };
    });
  } catch {
    return FALLBACK_BASIC;
  }
}

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
