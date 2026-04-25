import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
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
  return adminApiGet<AdminBuilding>("buildings", { order: "name" });
}

export async function adminCreateBuilding(b: Omit<AdminBuilding, "id">): Promise<string> {
  const id = "b_" + Date.now().toString(36);
  await adminApiPost("buildings", "POST", [{ ...b, id }]);
  return id;
}

export async function adminUpdateBuilding(id: string, b: Partial<AdminBuilding>): Promise<void> {
  await adminApiPost("buildings", "PATCH", b, { eq: `id=eq.${id}` });
}

export async function adminDeleteBuilding(id: string): Promise<void> {
  await adminApiPost("buildings", "DELETE", null, { eq: `id=eq.${id}` });
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

export async function adminFetchFloors(buildingId: string): Promise<AdminFloor[]> {
  return adminApiGet<AdminFloor>("floors", { order: "sort_order", eq: `building_id=eq.${buildingId}` });
}

export async function adminCreateFloor(f: Omit<AdminFloor, "id">): Promise<void> {
  await adminApiPost("floors", "POST", [f]);
}

export async function adminUpdateFloor(id: string, f: Partial<AdminFloor>): Promise<void> {
  await adminApiPost("floors", "PATCH", f, { eq: `id=eq.${id}` });
}

export async function adminDeleteFloor(id: string): Promise<void> {
  await adminApiPost("floors", "DELETE", null, { eq: `id=eq.${id}` });
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
  open_date: string | null;
  logo_url: string | null;
  description: string | null;
  promo_text: string | null;
  emoji: string;
  show_in_openings: boolean | null;
  open_benefit: { summary: string; details: string[]; validUntil?: string } | null;
  extra_info: Record<string, unknown> | null;
}

export async function adminFetchStores(buildingId: string): Promise<AdminStore[]> {
  return adminApiGet<AdminStore>("stores", { order: "floor_label", eq: `building_id=eq.${buildingId}` });
}

export async function adminCreateStore(s: Omit<AdminStore, "id">): Promise<string> {
  const id = "s_" + Date.now().toString(36);
  await adminApiPost("stores", "POST", [{ ...s, id }]);
  return id;
}

export async function adminUpdateStore(id: string, s: Partial<AdminStore>): Promise<void> {
  await adminApiPost("stores", "PATCH", s, { eq: `id=eq.${id}` });
}

export async function adminDeleteStore(id: string): Promise<void> {
  await adminApiPost("stores", "DELETE", null, { eq: `id=eq.${id}` });
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
  return adminApiGet<AdminCoupon>("store_coupons", { order: "expiry" });
}

export async function adminUpsertCoupon(c: AdminCoupon): Promise<void> {
  await adminApiPost("store_coupons", "POST", [c], { onConflict: "id" });
}

export async function adminDeleteCoupon(id: string): Promise<void> {
  await adminApiPost("store_coupons", "DELETE", null, { eq: `id=eq.${id}` });
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
  open_benefit: { summary: string; details: string[]; validUntil?: string } | null;
  active: boolean;
}

export async function adminFetchOpenings(): Promise<AdminOpening[]> {
  return adminApiGet<AdminOpening>("store_openings", { order: "open_date.desc" });
}

export async function adminUpsertOpening(o: AdminOpening): Promise<void> {
  await adminApiPost("store_openings", "POST", [o], { onConflict: "id" });
}

export async function adminDeleteOpening(id: string): Promise<void> {
  await adminApiPost("store_openings", "DELETE", null, { eq: `id=eq.${id}` });
}
