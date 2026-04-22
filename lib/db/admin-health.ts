import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── 약국 (Pharmacies) ────────────────────────────────────────

export interface AdminPharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  weekday_hours: string | null;
  weekend_hours: string | null;
  night_hours: string | null;
  is_night_pharmacy: boolean;
  is_weekend_pharmacy: boolean;
  distance_km: number | null;
  sort_order: number | null;
}

export async function adminFetchPharmacies(): Promise<AdminPharmacy[]> {
  const { data, error } = await supabaseAdmin
    .from("pharmacies")
    .select("*")
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPharmacy[];
}

export async function adminUpsertPharmacy(p: AdminPharmacy): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pharmacies")
    .upsert(p, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function adminDeletePharmacy(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pharmacies")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 응급실 (Emergency Rooms) ─────────────────────────────────

export interface AdminEmergencyRoom {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance_km: number | null;
  is_pediatric: boolean;
  level: string;
  sort_order: number | null;
}

export async function adminFetchEmergencyRooms(): Promise<AdminEmergencyRoom[]> {
  const { data, error } = await supabaseAdmin
    .from("emergency_rooms")
    .select("*")
    .order("distance_km", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminEmergencyRoom[];
}

export async function adminUpsertEmergencyRoom(
  r: AdminEmergencyRoom
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("emergency_rooms")
    .upsert(r, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function adminDeleteEmergencyRoom(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("emergency_rooms")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 초기 데이터 (Seed) ───────────────────────────────────────

const SEED_PHARMACIES: AdminPharmacy[] = [
  {
    id: "ph1",
    name: "가온약국",
    address: "인천 서구 봉오재 3로 90 (검단동)",
    phone: "032-567-0879",
    weekday_hours: "09:00~21:00",
    weekend_hours: "토·일 10:00~18:00",
    night_hours: "매일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: true,
    distance_km: 0.65,
    sort_order: 1,
  },
  {
    id: "ph2",
    name: "검단아라태평양약국",
    address: "인천 서구 이음대로 378 (원당동)",
    phone: "032-561-7768",
    weekday_hours: "09:00~21:00",
    weekend_hours: "토·일 10:00~18:00",
    night_hours: "매일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: true,
    distance_km: 1.0,
    sort_order: 2,
  },
  {
    id: "ph3",
    name: "레몬약국",
    address: "인천 서구 검단로 480 (왕길동)",
    phone: "032-562-1088",
    weekday_hours: "09:00~21:00",
    weekend_hours: "토·일 10:00~18:00",
    night_hours: "매일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: true,
    distance_km: 1.4,
    sort_order: 3,
  },
  {
    id: "ph4",
    name: "루원봄약국",
    address: "인천 서구 봉오대로 255 (가정동)",
    phone: "032-563-1486",
    weekday_hours: "09:00~20:00",
    weekend_hours: null,
    night_hours: "평일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: false,
    distance_km: 3.1,
    sort_order: 4,
  },
  {
    id: "ph5",
    name: "메디피아약국",
    address: "인천 서구 완정로 172 (마전동)",
    phone: "032-562-0258",
    weekday_hours: "09:00~21:00",
    weekend_hours: "토·일 10:00~18:00",
    night_hours: "매일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: true,
    distance_km: 1.8,
    sort_order: 5,
  },
  {
    id: "ph6",
    name: "옥신온누리약국",
    address: "인천 서구 고래울로 29 (가좌동)",
    phone: "032-578-1329",
    weekday_hours: "09:00~21:00",
    weekend_hours: "토·일 10:00~18:00",
    night_hours: "매일 22:00~01:00",
    is_night_pharmacy: true,
    is_weekend_pharmacy: true,
    distance_km: 4.2,
    sort_order: 6,
  },
];

const SEED_EMERGENCY_ROOMS: AdminEmergencyRoom[] = [
  {
    id: "er1",
    name: "검단탑병원",
    address: "인천 서구 청마로 19번길 5 (당하동)",
    phone: "032-590-0114",
    distance_km: 1.5,
    is_pediatric: false,
    level: "지역응급의료기관",
    sort_order: 1,
  },
  {
    id: "er2",
    name: "인천검단 온누리병원",
    address: "인천 서구 완정로 199 (왕길동)",
    phone: "032-568-9111",
    distance_km: 2.2,
    is_pediatric: false,
    level: "지역응급의료기관",
    sort_order: 2,
  },
  {
    id: "er3",
    name: "가톨릭대학교 인천성모병원",
    address: "인천 부평구 동수로 56 (부평동)",
    phone: "1544-9004",
    distance_km: 8.5,
    is_pediatric: true,
    level: "권역응급의료센터",
    sort_order: 3,
  },
  {
    id: "er4",
    name: "가천대 길병원",
    address: "인천 남동구 남동대로 774번길 21 (구월동)",
    phone: "1577-2299",
    distance_km: 13.5,
    is_pediatric: true,
    level: "권역응급의료센터",
    sort_order: 4,
  },
  {
    id: "er5",
    name: "인하대학교병원",
    address: "인천 중구 인항로 27 (신흥동)",
    phone: "032-890-2300",
    distance_km: 16.0,
    is_pediatric: true,
    level: "권역응급의료센터",
    sort_order: 5,
  },
];

export async function seedPharmacies(): Promise<void> {
  const { error } = await supabaseAdmin
    .from("pharmacies")
    .upsert(SEED_PHARMACIES, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function seedEmergencyRooms(): Promise<void> {
  const { error } = await supabaseAdmin
    .from("emergency_rooms")
    .upsert(SEED_EMERGENCY_ROOMS, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
