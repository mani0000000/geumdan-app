/**
 * 매장 브랜드 페이지 + 매장 어드민 데이터 레이어.
 * - 공개 읽기는 supabase 클라이언트 직접 (anon)
 * - 어드민 쓰기는 /api/admin/db 경유 (서버에서 키 처리)
 */
import { supabase } from "@/lib/supabase";
import { adminApiPost } from "@/lib/db/admin-api";

// ─── 공통 ID 생성 ───────────────────────────────────────────────
export function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ─── 타입 ────────────────────────────────────────────────────
export interface StoreBrand {
  id: string;
  name: string;
  building_id: string;
  floor_label: string;
  category: string;
  phone: string | null;
  hours: string | null;
  description: string | null;
  short_description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  thumbnail_url: string | null;
  emoji: string;
  website: string | null;
  sns_instagram: string | null;
  sns_kakao: string | null;
  parking_info: string | null;
  is_published: boolean;
  page_modules: string[];
  is_open: boolean;
  is_premium: boolean;
}

export interface StoreMenu {
  id: string;
  store_id: string;
  category: string | null;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_signature: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface StoreHour {
  id: string;
  store_id: string;
  day_of_week: number; // 0=일 ~ 6=토
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_closed: boolean;
}

export interface StoreEvent {
  id: string;
  store_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
}

export interface StoreCouponDetail {
  id: string;
  store_id: string;
  store_name: string;
  building_name: string;
  title: string;
  description: string | null;
  discount: string;
  discount_type: "rate" | "amount";
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  code: string | null;
  start_date: string | null;
  end_date: string | null;
  expiry: string;
  usage_limit: number | null;
  used_count: number;
  category: string;
  color: string;
  active: boolean;
}

export interface StoreReservation {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
  note: string | null;
  created_at: string;
}

export interface StoreWaiting {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string | null;
  party_size: number;
  status: "waiting" | "called" | "seated" | "cancelled" | "no_show";
  queue_number: number | null;
  note: string | null;
  created_at: string;
}

export interface StoreReview {
  id: string;
  store_id: string;
  author_nickname: string;
  rating: number;
  content: string | null;
  images: string[];
  is_hidden: boolean;
  owner_reply: string | null;
  created_at: string;
}

// ─── 공개 읽기 ──────────────────────────────────────────────
export async function fetchStoreById(id: string): Promise<StoreBrand | null> {
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return normalizeStore(data);
}

function normalizeStore(d: Record<string, unknown>): StoreBrand {
  const modules = d.page_modules;
  const fallback = ["hero", "info", "menu", "hours", "events", "coupons", "reviews", "map"];
  return {
    id: String(d.id),
    name: String(d.name ?? ""),
    building_id: String(d.building_id ?? ""),
    floor_label: String(d.floor_label ?? ""),
    category: String(d.category ?? "기타"),
    phone: (d.phone as string) ?? null,
    hours: (d.hours as string) ?? null,
    description: (d.description as string) ?? null,
    short_description: (d.short_description as string) ?? null,
    logo_url: (d.logo_url as string) ?? null,
    cover_image_url: (d.cover_image_url as string) ?? null,
    thumbnail_url: (d.thumbnail_url as string) ?? null,
    emoji: String(d.emoji ?? "🏪"),
    website: (d.website as string) ?? null,
    sns_instagram: (d.sns_instagram as string) ?? null,
    sns_kakao: (d.sns_kakao as string) ?? null,
    parking_info: (d.parking_info as string) ?? null,
    is_published: d.is_published !== false,
    page_modules: Array.isArray(modules) && modules.length > 0
      ? (modules as string[])
      : fallback,
    is_open: d.is_open !== false,
    is_premium: d.is_premium === true,
  };
}

export async function fetchStoreBrandBundle(storeId: string) {
  const [
    store,
    menusRes,
    hoursRes,
    eventsRes,
    couponsRes,
    reviewsRes,
  ] = await Promise.all([
    fetchStoreById(storeId),
    supabase.from("store_menus").select("*").eq("store_id", storeId).order("sort_order"),
    supabase.from("store_hours").select("*").eq("store_id", storeId).order("day_of_week"),
    supabase.from("store_events").select("*").eq("store_id", storeId).eq("is_active", true).order("created_at", { ascending: false }),
    supabase.from("store_coupons").select("*").eq("store_id", storeId).eq("active", true).order("expiry"),
    supabase.from("store_reviews").select("*").eq("store_id", storeId).eq("is_hidden", false).order("created_at", { ascending: false }),
  ]);
  return {
    store,
    menus: (menusRes.data as StoreMenu[] | null) ?? [],
    hours: (hoursRes.data as StoreHour[] | null) ?? [],
    events: (eventsRes.data as StoreEvent[] | null) ?? [],
    coupons: (couponsRes.data as StoreCouponDetail[] | null) ?? [],
    reviews: (reviewsRes.data as StoreReview[] | null) ?? [],
  };
}

export async function fetchBuildingById(buildingId: string) {
  const { data } = await supabase
    .from("buildings")
    .select("id,name,address,parking_info,open_time,lat,lng")
    .eq("id", buildingId)
    .maybeSingle();
  return data;
}

// ─── 매장 어드민 쓰기 (admin-api 경유) ─────────────────────
export async function adminUpdateStorePage(
  storeId: string,
  patch: Partial<StoreBrand>,
): Promise<void> {
  await adminApiPost("stores", "PATCH", patch, { eq: `id=eq.${storeId}` });
}

// 메뉴 ─────────────────────────────────────────────────────
export async function adminUpsertMenu(m: StoreMenu): Promise<void> {
  await adminApiPost("store_menus", "POST", [m], { onConflict: "id" });
}
export async function adminDeleteMenu(id: string): Promise<void> {
  await adminApiPost("store_menus", "DELETE", null, { eq: `id=eq.${id}` });
}

// 영업시간 ───────────────────────────────────────────────────
export async function adminUpsertHour(h: StoreHour): Promise<void> {
  await adminApiPost("store_hours", "POST", [h], { onConflict: "id" });
}

// 이벤트 ─────────────────────────────────────────────────────
export async function adminUpsertEvent(e: StoreEvent): Promise<void> {
  await adminApiPost("store_events", "POST", [e], { onConflict: "id" });
}
export async function adminDeleteEvent(id: string): Promise<void> {
  await adminApiPost("store_events", "DELETE", null, { eq: `id=eq.${id}` });
}

// 쿠폰 (확장 필드) ───────────────────────────────────────────
export async function adminUpsertStoreCoupon(c: StoreCouponDetail): Promise<void> {
  await adminApiPost("store_coupons", "POST", [c], { onConflict: "id" });
}
export async function adminDeleteStoreCoupon(id: string): Promise<void> {
  await adminApiPost("store_coupons", "DELETE", null, { eq: `id=eq.${id}` });
}

// 예약 ───────────────────────────────────────────────────────
export async function adminUpdateReservation(id: string, patch: Partial<StoreReservation>): Promise<void> {
  await adminApiPost("store_reservations", "PATCH", patch, { eq: `id=eq.${id}` });
}
export async function adminDeleteReservation(id: string): Promise<void> {
  await adminApiPost("store_reservations", "DELETE", null, { eq: `id=eq.${id}` });
}

// 웨이팅 ─────────────────────────────────────────────────────
export async function adminUpdateWaiting(id: string, patch: Partial<StoreWaiting>): Promise<void> {
  await adminApiPost("store_waitings", "PATCH", patch, { eq: `id=eq.${id}` });
}
export async function adminDeleteWaiting(id: string): Promise<void> {
  await adminApiPost("store_waitings", "DELETE", null, { eq: `id=eq.${id}` });
}

// 리뷰 (사장님 답글, 숨김 처리) ─────────────────────────────
export async function adminUpdateReview(id: string, patch: Partial<StoreReview>): Promise<void> {
  await adminApiPost("store_reviews", "PATCH", patch, { eq: `id=eq.${id}` });
}
export async function adminDeleteReview(id: string): Promise<void> {
  await adminApiPost("store_reviews", "DELETE", null, { eq: `id=eq.${id}` });
}

// ─── 일반 사용자 쓰기 (공개) ────────────────────────────────
export async function publicCreateReservation(r: Omit<StoreReservation, "id" | "created_at">): Promise<{ id: string }> {
  const id = genId("rsv");
  const { error } = await supabase.from("store_reservations").insert({ ...r, id });
  if (error) throw new Error(error.message);
  return { id };
}

export async function publicCreateWaiting(w: Omit<StoreWaiting, "id" | "created_at" | "queue_number">): Promise<{ id: string; queue_number: number }> {
  const id = genId("wt");
  // 같은 매장의 대기 중 인원 수 + 1 = 큐 번호
  const { count } = await supabase
    .from("store_waitings")
    .select("id", { count: "exact", head: true })
    .eq("store_id", w.store_id)
    .in("status", ["waiting", "called"]);
  const queue_number = (count ?? 0) + 1;
  const { error } = await supabase.from("store_waitings").insert({ ...w, id, queue_number });
  if (error) throw new Error(error.message);
  return { id, queue_number };
}

export async function publicCreateReview(r: Omit<StoreReview, "id" | "created_at" | "is_hidden" | "owner_reply">): Promise<void> {
  const id = genId("rv");
  const { error } = await supabase.from("store_reviews").insert({
    ...r, id, is_hidden: false, owner_reply: null,
  });
  if (error) throw new Error(error.message);
}

export async function publicUseCoupon(couponId: string, userNickname: string | null): Promise<void> {
  const id = genId("cu");
  await supabase.from("coupon_uses").insert({ id, coupon_id: couponId, user_nickname: userNickname });
}

// ─── 어드민용 (전체 조회) ──────────────────────────────────
export async function fetchReservationsByStore(storeId: string): Promise<StoreReservation[]> {
  const { data } = await supabase
    .from("store_reservations")
    .select("*")
    .eq("store_id", storeId)
    .order("reservation_date", { ascending: false })
    .order("reservation_time");
  return (data as StoreReservation[] | null) ?? [];
}

export async function fetchWaitingsByStore(storeId: string): Promise<StoreWaiting[]> {
  const { data } = await supabase
    .from("store_waitings")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  return (data as StoreWaiting[] | null) ?? [];
}

export async function fetchReviewsByStoreIncludingHidden(storeId: string): Promise<StoreReview[]> {
  const { data } = await supabase
    .from("store_reviews")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });
  return (data as StoreReview[] | null) ?? [];
}
