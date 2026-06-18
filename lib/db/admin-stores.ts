import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import type { StoreCategory, StructuredHours, BreakTime, SuggestionChangeType } from "@/lib/types";

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
  parking_spaces: number | null;
  open_time: string | null;
  has_data: boolean;
  categories: string[] | null;
  image_url: string | null;
  photo_north: string | null;
  photo_south: string | null;
  photo_east: string | null;
  photo_west: string | null;
  description: string | null;
  website: string | null;
  instagram: string | null;
  kakao_place_id: string | null;
  facilities: string[] | null;
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
  restroom_location: string | null;
  restroom_gender: string | null;
  restroom_note: string | null;
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
  sub_category: string | null;
  phone: string | null;
  hours: string | null;
  structured_hours: StructuredHours | null;
  closed_days: string[] | null;
  break_time: BreakTime | null;
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
  avg_rating: number | null;
  review_count: number;
  // 매장 브랜드 페이지 / 어드민
  is_published?: boolean | null;
  admin_password?: string | null;
  admin_email?: string | null;
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
  start_date: string | null;   // 적용 시작일
  issued_date: string | null;
  expiry: string;
  quantity: number | null;     // 총 발행 수량 (null = 무제한)
  used_count: number;          // 사용 횟수
  view_count: number;          // 노출 수
  download_count: number;      // 다운로드 수
  conditions: string | null;   // 이용 조건
  max_per_user: number | null; // 1인 한도
  color: string;
  active: boolean;
  /** 값이 있으면 포인트 교환형 쿠폰 (NULL = 일반 매장 쿠폰) */
  required_points: number | null;
  /** 교환 수량 제한 (NULL = 무제한) */
  stock: number | null;
}

export async function adminFetchCoupons(): Promise<AdminCoupon[]> {
  return adminApiGet<AdminCoupon>("store_coupons", { order: "expiry" });
}

export async function adminFetchCouponsByStore(storeId: string): Promise<AdminCoupon[]> {
  return adminApiGet<AdminCoupon>("store_coupons", { order: "expiry", eq: `store_id=eq.${storeId}` });
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

// ─── 매장 리뷰 (Store Reviews) ────────────────────────────────

export interface AdminStoreReview {
  id: number;
  store_id: string;
  store_name?: string;
  user_id: string | null;
  nickname: string;
  rating: number;
  content: string | null;
  media_urls: string[] | null;
  is_visible: boolean;
  created_at: string;
}

export async function adminFetchReviews(storeId: string): Promise<AdminStoreReview[]> {
  return adminApiGet<AdminStoreReview>("store_reviews", { order: "created_at.desc", eq: `store_id=eq.${storeId}` });
}

export async function adminUpdateReview(id: number, patch: Partial<AdminStoreReview>): Promise<void> {
  await adminApiPost("store_reviews", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function adminDeleteReview(id: number): Promise<void> {
  await adminApiPost("store_reviews", "DELETE", null, { eq: `id=eq.${id}` });
}

// ─── 매장/건물 미디어 (Store Media) ──────────────────────────

export interface AdminStoreMedia {
  id: number;
  store_id: string | null;
  building_id: string | null;
  url: string;
  media_type: "image" | "video";
  caption: string | null;
  sort_order: number;
  is_primary: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export async function adminFetchMedia(storeId: string): Promise<AdminStoreMedia[]> {
  return adminApiGet<AdminStoreMedia>("store_media", { order: "sort_order", eq: `store_id=eq.${storeId}` });
}

export async function adminFetchBuildingMedia(buildingId: string): Promise<AdminStoreMedia[]> {
  return adminApiGet<AdminStoreMedia>("store_media", { order: "sort_order", eq: `building_id=eq.${buildingId}` });
}

export async function adminCreateMedia(m: Omit<AdminStoreMedia, "id" | "created_at">): Promise<void> {
  await adminApiPost("store_media", "POST", [m]);
}

export async function adminUpdateMedia(id: number, patch: Partial<AdminStoreMedia>): Promise<void> {
  await adminApiPost("store_media", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function adminDeleteMedia(id: number): Promise<void> {
  await adminApiPost("store_media", "DELETE", null, { eq: `id=eq.${id}` });
}

// ─── 정보 제안 (Store Suggestions) ───────────────────────────

export interface AdminSuggestion {
  id: number;
  type: string;
  suggestion_type: SuggestionChangeType | null;
  store_id: string | null;
  category: string | null;
  sub_category: string | null;
  store_name: string | null;
  building_name: string | null;
  floor: string | null;
  phone: string | null;
  hours: string | null;
  description: string | null;
  contact: string | null;
  message: string | null;
  status: "pending" | "reviewing" | "approved" | "rejected";
  admin_note: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function adminFetchSuggestions(status?: string): Promise<AdminSuggestion[]> {
  const eq = status ? `status=eq.${status}` : undefined;
  return adminApiGet<AdminSuggestion>("store_suggestions", { order: "created_at.desc", eq });
}

export async function adminUpdateSuggestion(id: number, patch: Partial<AdminSuggestion>): Promise<void> {
  await adminApiPost("store_suggestions", "PATCH", { ...patch, reviewed_at: new Date().toISOString() }, { eq: `id=eq.${id}` });
}

// ─── 쿠폰 통계 (Coupon Stats) ──────────────────────────────

export interface CouponDownload {
  id: number;
  coupon_id: string;
  user_id: string | null;
  device_id: string | null;
  downloaded_at: string;
  used_at: string | null;
  is_used: boolean;
}

export async function adminFetchCouponDownloads(couponId: string): Promise<CouponDownload[]> {
  return adminApiGet<CouponDownload>("coupon_downloads", { order: "downloaded_at.desc", eq: `coupon_id=eq.${couponId}` });
}
