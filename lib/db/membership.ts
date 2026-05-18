/**
 * lib/db/membership.ts
 * 멤버십 등급(누적 포인트 구간) + 포인트→쿠폰 교환
 * Supabase 미설정 시 localStorage 폴백 (userdata.ts와 동일 전략)
 */
import { supabase } from "@/lib/supabase";
import { getOrCreateUserId, getLocalUserId, addPoints } from "@/lib/db/userdata";

// ── 타입 ────────────────────────────────────────────────────────────
export interface MembershipGrade {
  name: string;
  required_points: number;
  benefits: string;
  sort_order: number;
}

export interface ExchangeCoupon {
  id: string;
  store_name: string;
  title: string;
  discount: string;
  category: string;
  expiry: string;
  color: string;
  required_points: number;
  stock: number | null;
}

export interface MyCoupon {
  id: string;
  coupon_id: string;
  store_name: string;
  title: string;
  discount: string;
  expiry: string;
  status: "사용가능" | "사용완료";
  downloaded_at: string;
}

// 마이그레이션 시드와 동일 — DB 미응답 시 폴백
export const DEFAULT_GRADES: MembershipGrade[] = [
  { name: "브론즈",   required_points: 0,    benefits: "기본 혜택 · 쿠폰 교환 이용 가능",                sort_order: 0 },
  { name: "실버",     required_points: 500,  benefits: "교환 쿠폰 5% 추가 적립 · 전용 쿠폰 열람",         sort_order: 1 },
  { name: "골드",     required_points: 1500, benefits: "교환 쿠폰 10% 추가 적립 · 골드 한정 쿠폰",        sort_order: 2 },
  { name: "플래티넘", required_points: 3000, benefits: "교환 쿠폰 우선권 · 플래티넘 전용 프리미엄 쿠폰",  sort_order: 3 },
];

// ── 헬퍼 ────────────────────────────────────────────────────────────
function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── 멤버십 등급 ─────────────────────────────────────────────────────
export async function getMembershipGrades(): Promise<MembershipGrade[]> {
  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("membership_grades")
        .select("name,required_points,benefits,sort_order")
        .order("sort_order", { ascending: true });
      if (data && data.length > 0) return data as MembershipGrade[];
    } catch {}
  }
  return DEFAULT_GRADES;
}

export interface GradeProgress {
  current: MembershipGrade;
  next: MembershipGrade | null;
  progressPct: number;
  remainToNext: number;
}

/** 누적 포인트 → 현재 등급 + 다음 등급까지 진행도 */
export function resolveGrade(grades: MembershipGrade[], points: number): GradeProgress {
  const sorted = [...grades].sort((a, b) => a.required_points - b.required_points);
  let idx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (points >= sorted[i].required_points) idx = i;
  }
  const current = sorted[idx];
  const next = sorted[idx + 1] ?? null;
  if (!next) {
    return { current, next: null, progressPct: 100, remainToNext: 0 };
  }
  const span = next.required_points - current.required_points;
  const gained = points - current.required_points;
  const progressPct = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
  return { current, next, progressPct, remainToNext: Math.max(0, next.required_points - points) };
}

// ── 포인트 적립 (활동 기반) ─────────────────────────────────────────
/**
 * 활동 포인트 적립/차감.
 * users.points / monthly_points / user_point_history 갱신(addPoints)에 더해
 * 신규 user_points 원장에도 기록한다.
 */
export async function grantPoints(points: number, reason: string): Promise<void> {
  await addPoints(points, reason);
  if (isConfigured()) {
    const uid = getLocalUserId();
    if (uid) {
      try {
        await supabase.from("user_points").insert({ user_id: uid, points, reason });
      } catch {}
    }
  }
}

const LAST_LOGIN_KEY = "geumdan_last_login";
const DAILY_LOGIN_POINTS = 5;

/** 하루 1회 출석 포인트. 적립되면 true */
export async function grantDailyLoginPoints(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const today = todayStr();
  if (localStorage.getItem(LAST_LOGIN_KEY) === today) return false;
  localStorage.setItem(LAST_LOGIN_KEY, today);
  await getOrCreateUserId();
  await grantPoints(DAILY_LOGIN_POINTS, "출석 체크 (로그인)");
  return true;
}

// ── 교환 가능 쿠폰 ──────────────────────────────────────────────────
export async function getExchangeableCoupons(): Promise<ExchangeCoupon[]> {
  if (!isConfigured()) return [];
  try {
    const { data } = await supabase
      .from("store_coupons")
      .select("id,store_name,title,discount,category,expiry,color,required_points,stock")
      .not("required_points", "is", null)
      .eq("active", true)
      .gte("expiry", todayStr())
      .order("required_points", { ascending: true });
    return (data ?? []) as ExchangeCoupon[];
  } catch {
    return [];
  }
}

// ── 내 쿠폰함 ───────────────────────────────────────────────────────
export async function getMyCoupons(): Promise<MyCoupon[]> {
  const uid = getLocalUserId();
  if (!uid || !isConfigured()) return [];
  try {
    const { data } = await supabase
      .from("user_coupons")
      .select("id,coupon_id,store_name,title,discount,expiry,status,downloaded_at")
      .eq("user_id", uid)
      .order("downloaded_at", { ascending: false });
    return (data ?? []) as MyCoupon[];
  } catch {
    return [];
  }
}

export interface ExchangeResult {
  ok: boolean;
  error?: string;
}

/** 포인트 차감 후 쿠폰을 내 쿠폰함에 발급 */
export async function exchangeCoupon(
  coupon: ExchangeCoupon,
  currentPoints: number
): Promise<ExchangeResult> {
  if (currentPoints < coupon.required_points) {
    return { ok: false, error: "포인트가 부족합니다." };
  }
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    try {
      const { data: existing } = await supabase
        .from("user_coupons")
        .select("id")
        .eq("user_id", uid)
        .eq("coupon_id", coupon.id)
        .maybeSingle();
      if (existing) return { ok: false, error: "이미 교환한 쿠폰입니다." };

      const { error } = await supabase.from("user_coupons").insert({
        user_id: uid,
        coupon_id: coupon.id,
        store_name: coupon.store_name,
        title: coupon.title,
        discount: coupon.discount,
        expiry: coupon.expiry,
        status: "사용가능",
      });
      if (error) return { ok: false, error: error.message };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "교환 실패" };
    }
  }

  await grantPoints(-coupon.required_points, `쿠폰 교환: ${coupon.title}`);
  return { ok: true };
}

/** 쿠폰 사용 처리 (사용가능 → 사용완료) */
export async function useMyCoupon(rowId: string): Promise<void> {
  if (!isConfigured()) return;
  try {
    await supabase
      .from("user_coupons")
      .update({ status: "사용완료" })
      .eq("id", rowId);
  } catch {}
}
