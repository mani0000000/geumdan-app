import { supabaseAdmin } from "@/lib/supabase-admin";
import type { StoreCategory } from "@/lib/types";

// ─── 건물 (Buildings) ──────────────────────────────────────────

export interface AdminBuilding {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  floors: number | null;
  total_stores: number | null;
  parking_info: string | null;
  open_time: string | null;
  has_data: boolean;
  categories: string[] | null;
  image_url: string | null;
}

export async function adminFetchBuildings(): Promise<AdminBuilding[]> {
  const { data, error } = await supabaseAdmin
    .from("buildings")
    .select("*")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminBuilding[];
}

export async function adminCreateBuilding(
  b: Omit<AdminBuilding, "id">
): Promise<string> {
  const id = "b_" + Date.now().toString(36);
  const { error } = await supabaseAdmin
    .from("buildings")
    .insert({ ...b, id });
  if (error) throw new Error(error.message);
  return id;
}

export async function adminUpdateBuilding(
  id: string,
  b: Partial<AdminBuilding>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("buildings")
    .update(b)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteBuilding(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("buildings")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 층 (Floors) ──────────────────────────────────────────────

export interface AdminFloor {
  id: string;
  building_id: string;
  level: number;
  label: string;
  has_restroom: boolean;
  restroom_code: string | null;
  sort_order: number;
}

export async function adminFetchFloors(
  buildingId: string
): Promise<AdminFloor[]> {
  const { data, error } = await supabaseAdmin
    .from("floors")
    .select("*")
    .eq("building_id", buildingId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminFloor[];
}

export async function adminCreateFloor(
  f: Omit<AdminFloor, "id">
): Promise<void> {
  const { error } = await supabaseAdmin.from("floors").insert(f);
  if (error) throw new Error(error.message);
}

export async function adminUpdateFloor(
  id: string,
  f: Partial<AdminFloor>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("floors")
    .update(f)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteFloor(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("floors").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 매장 (Stores) ────────────────────────────────────────────

export interface AdminStore {
  id: string;
  building_id: string;
  floor_label: string;
  name: string;
  category: StoreCategory;
  phone: string | null;
  hours: string | null;
  is_open: boolean;
  is_premium: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function adminFetchStores(
  buildingId: string
): Promise<AdminStore[]> {
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("*")
    .eq("building_id", buildingId)
    .order("floor_label");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminStore[];
}

export async function adminCreateStore(
  s: Omit<AdminStore, "id">
): Promise<string> {
  const id = "s_" + Date.now().toString(36);
  const { error } = await supabaseAdmin.from("stores").insert({ ...s, id });
  if (error) throw new Error(error.message);
  return id;
}

export async function adminUpdateStore(
  id: string,
  s: Partial<AdminStore>
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("stores")
    .update(s)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteStore(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("stores").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 쿠폰 (Coupons) ───────────────────────────────────────────

export interface AdminCoupon {
  id: string;
  store_id: string;
  store_name: string;
  building_name: string;
  title: string;
  discount: string;
  discount_type: "rate" | "amount";
  category: StoreCategory;
  expiry: string;
  color: string;
  active: boolean;
}

export async function adminFetchCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabaseAdmin
    .from("store_coupons")
    .select("*")
    .order("expiry");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminCoupon[];
}

export async function adminUpsertCoupon(
  c: AdminCoupon
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("store_coupons")
    .upsert(c, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("store_coupons")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 신규 오픈 (Openings) ─────────────────────────────────────

export interface AdminOpening {
  id: string;
  store_id: string;
  store_name: string;
  category: StoreCategory;
  floor: string;
  open_date: string;
  emoji: string;
  open_benefit: {
    summary: string;
    details: string[];
    validUntil?: string;
  } | null;
  active: boolean;
}

export async function adminFetchOpenings(): Promise<AdminOpening[]> {
  const { data, error } = await supabaseAdmin
    .from("store_openings")
    .select("*")
    .order("open_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminOpening[];
}

export async function adminUpsertOpening(
  o: AdminOpening
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("store_openings")
    .upsert(o, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function adminDeleteOpening(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("store_openings")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
