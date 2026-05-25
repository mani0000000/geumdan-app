/**
 * lib/db/userdata.ts
 * 사용자 계정 단위 CRUD — 익명 UUID 기반 (localStorage geumdan_uid)
 * Supabase 미설정 시 localStorage 전용 폴백
 */
import { supabase } from "@/lib/supabase";

// ── 타입 ────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  nickname: string;
  dong: string;
  intro: string;
  level: "새싹" | "주민" | "이웃" | "터줏대감";
  post_count: number;
  comment_count: number;
  like_count: number;
  joined_at: string;
  points: number;
  weekly_likes: number;
  weekly_posts: number;
  monthly_points: number;
}

export interface UserGameStats {
  points: number;
  weeklyLikes: number;
  weeklyPosts: number;
  monthlyPoints: number;
  completedMissions: string[];
  redeemedRewards: string[];
  pointHistory: Array<{ date: string; desc: string; points: number }>;
}

export interface FavoriteBus {
  id: string;
  route_id: string;
  route_name: string;
  stop_id?: string;
  stop_name?: string;
}

export interface FavoriteStore {
  id: string;
  store_id: string;
  store_name: string;
  building_id?: string;
  building_name?: string;
}

export interface FavoriteApt {
  id: string;
  apt_id: string;
  apt_name: string;
  dong?: string;
}

export interface DownloadedCoupon {
  id: string;
  coupon_id: string;
  store_name: string;
  title: string;
  discount: string;
  expiry: string;
  downloaded_at: string;
}

export interface UserSettings {
  push_all: boolean;
  push_comment: boolean;
  push_like: boolean;
  push_notice: boolean;
  push_marketing: boolean;
  location_on: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  push_all: true,
  push_comment: true,
  push_like: false,
  push_notice: true,
  push_marketing: false,
  location_on: true,
};

const DEFAULT_PROFILE: Omit<UserProfile, "id"> = {
  nickname: "검단주민",
  dong: "당하동",
  intro: "",
  level: "새싹",
  post_count: 0,
  comment_count: 0,
  like_count: 0,
  joined_at: new Date().toISOString().slice(0, 10),
  points: 0,
  weekly_likes: 0,
  weekly_posts: 0,
  monthly_points: 0,
};

// ── 헬퍼 ────────────────────────────────────────────────────────────
function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}
function lsSet(key: string, val: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, val);
}

function weekStartDate(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(new Date(d).setDate(diff)).toISOString().slice(0, 10);
}

// ── 사용자 ID 관리 ───────────────────────────────────────────────────
export function getLocalUserId(): string | null {
  return lsGet("geumdan_uid");
}

export async function getOrCreateUserId(): Promise<string> {
  let uid = lsGet("geumdan_uid");
  if (uid) return uid;

  uid = crypto.randomUUID();

  if (isConfigured()) {
    const { error } = await supabase.from("users").insert({ id: uid });
    if (error) console.warn("[userdata] insert user:", error.message);
  }

  lsSet("geumdan_uid", uid);
  return uid;
}

// ── 프로필 ───────────────────────────────────────────────────────────
const PROFILE_KEY = "geumdan_profile";

export async function getUserProfile(): Promise<UserProfile> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("users")
        .select("id,nickname,dong,intro,level,post_count,comment_count,like_count,joined_at,points,weekly_likes,weekly_posts,monthly_points")
        .eq("id", uid)
        .single();
      if (data) {
        const profile: UserProfile = {
          ...DEFAULT_PROFILE,
          ...data,
          id: uid,
        };
        lsSet(PROFILE_KEY, JSON.stringify(profile));
        return profile;
      }
    } catch {}
  }

  const cached = lsGet(PROFILE_KEY);
  if (cached) return JSON.parse(cached) as UserProfile;
  const defaults: UserProfile = { id: uid, ...DEFAULT_PROFILE };
  lsSet(PROFILE_KEY, JSON.stringify(defaults));
  return defaults;
}

export async function updateUserProfile(
  patch: Partial<Pick<UserProfile, "nickname" | "dong" | "intro">>
): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase
      .from("users")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", uid);
  }

  const cached = lsGet(PROFILE_KEY);
  const prev = cached ? (JSON.parse(cached) as UserProfile) : { id: uid, ...DEFAULT_PROFILE };
  lsSet(PROFILE_KEY, JSON.stringify({ ...prev, ...patch }));
}

// ── 포인트 추가 (내역 기록 포함) ──────────────────────────────────────
const HISTORY_KEY = "geumdan_point_history";

export async function addPoints(pts: number, desc: string): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    const { data } = await supabase
      .from("users")
      .select("points,monthly_points")
      .eq("id", uid)
      .single();
    await Promise.all([
      supabase.from("users").update({
        points: (data?.points ?? 0) + pts,
        monthly_points: (data?.monthly_points ?? 0) + pts,
        updated_at: new Date().toISOString(),
      }).eq("id", uid),
      supabase.from("user_point_history").insert({
        user_id: uid, points: pts, desc_text: desc,
      }),
    ]);
  }

  // localStorage 동기화
  const cached = lsGet(PROFILE_KEY);
  const prev = cached ? JSON.parse(cached) : { id: uid, ...DEFAULT_PROFILE };
  lsSet(PROFILE_KEY, JSON.stringify({
    ...prev,
    points: (prev.points ?? 0) + pts,
    monthly_points: (prev.monthly_points ?? 0) + pts,
  }));

  const history = lsGet(HISTORY_KEY);
  const prevHist = history ? JSON.parse(history) : [];
  lsSet(HISTORY_KEY, JSON.stringify([
    { date: new Date().toISOString().slice(0, 10), desc, points: pts },
    ...prevHist.slice(0, 19),
  ]));
}

// ── 게임 통계 조회 ─────────────────────────────────────────────────────
const MISSIONS_KEY  = "geumdan_missions";
const REDEEMED_KEY  = "geumdan_redeemed";

export async function getUserGameStats(): Promise<UserGameStats> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return {
    points: 0, weeklyLikes: 0, weeklyPosts: 0, monthlyPoints: 0,
    completedMissions: [], redeemedRewards: [], pointHistory: [],
  };

  if (isConfigured()) {
    try {
      const weekStart = weekStartDate();
      const [profileRes, missionsRes, rewardsRes, historyRes] = await Promise.all([
        supabase.from("users")
          .select("points,weekly_likes,weekly_posts,monthly_points")
          .eq("id", uid).single(),
        supabase.from("user_mission_completions")
          .select("mission_id").eq("user_id", uid).eq("week_start", weekStart),
        supabase.from("user_reward_redemptions")
          .select("reward_id").eq("user_id", uid),
        supabase.from("user_point_history")
          .select("points,desc_text,created_at").eq("user_id", uid)
          .order("created_at", { ascending: false }).limit(20),
      ]);
      const p = profileRes.data;
      return {
        points: p?.points ?? 0,
        weeklyLikes: p?.weekly_likes ?? 0,
        weeklyPosts: p?.weekly_posts ?? 0,
        monthlyPoints: p?.monthly_points ?? 0,
        completedMissions: (missionsRes.data ?? []).map(m => m.mission_id),
        redeemedRewards: (rewardsRes.data ?? []).map(r => r.reward_id),
        pointHistory: (historyRes.data ?? []).map(h => ({
          date: h.created_at.slice(0, 10),
          desc: h.desc_text,
          points: h.points,
        })),
      };
    } catch {}
  }

  // localStorage 폴백
  const cached = lsGet(PROFILE_KEY);
  const profile = cached ? JSON.parse(cached) : { ...DEFAULT_PROFILE };
  const history = lsGet(HISTORY_KEY);
  return {
    points: profile.points ?? 0,
    weeklyLikes: profile.weekly_likes ?? 0,
    weeklyPosts: profile.weekly_posts ?? 0,
    monthlyPoints: profile.monthly_points ?? 0,
    completedMissions: JSON.parse(lsGet(MISSIONS_KEY) ?? "[]"),
    redeemedRewards:   JSON.parse(lsGet(REDEEMED_KEY) ?? "[]"),
    pointHistory:      JSON.parse(history ?? "[]"),
  };
}

// ── 미션 완료 ──────────────────────────────────────────────────────────
export async function completeMission(
  missionId: string, reward: number, desc: string
): Promise<void> {
  const uid = await getOrCreateUserId();
  const weekStart = weekStartDate();

  if (isConfigured()) {
    const { error } = await supabase.from("user_mission_completions").upsert(
      { user_id: uid, mission_id: missionId, week_start: weekStart },
      { onConflict: "user_id,mission_id,week_start", ignoreDuplicates: true }
    );
    if (!error) await addPoints(reward, desc);
    return;
  }

  const prev: string[] = JSON.parse(lsGet(MISSIONS_KEY) ?? "[]");
  if (!prev.includes(missionId)) {
    lsSet(MISSIONS_KEY, JSON.stringify([...prev, missionId]));
    await addPoints(reward, desc);
  }
}

// ── 포인트 교환 ────────────────────────────────────────────────────────
export async function redeemReward(
  rewardId: string, cost: number, title: string
): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_reward_redemptions").insert({
      user_id: uid, reward_id: rewardId, cost,
    });
    await addPoints(-cost, `포인트 교환: ${title}`);
    return;
  }

  const prev: string[] = JSON.parse(lsGet(REDEEMED_KEY) ?? "[]");
  lsSet(REDEEMED_KEY, JSON.stringify([...prev, rewardId]));
  await addPoints(-cost, `포인트 교환: ${title}`);
}

// ── 글 / 댓글 수 ─────────────────────────────────────────────────────
export async function getMyPostCount(): Promise<number> {
  const uid = lsGet("geumdan_uid");
  if (!uid || !isConfigured()) return 0;
  const { count } = await supabase
    .from("community_posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);
  return count ?? 0;
}

export async function getMyCommentCount(): Promise<number> {
  const uid = lsGet("geumdan_uid");
  if (!uid || !isConfigured()) return 0;
  const { count } = await supabase
    .from("community_comments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", uid);
  return count ?? 0;
}

// ── 쿠폰 ─────────────────────────────────────────────────────────────
const COUPONS_KEY = "geumdan_coupons";

export async function getDownloadedCoupons(): Promise<DownloadedCoupon[]> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_coupons").select("*").eq("user_id", uid)
        .order("downloaded_at", { ascending: false });
      if (data) return data as DownloadedCoupon[];
    } catch {}
  }

  const cached = lsGet(COUPONS_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function addDownloadedCoupon(
  coupon: Omit<DownloadedCoupon, "id" | "downloaded_at">
): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_coupons").upsert(
      { user_id: uid, ...coupon },
      { onConflict: "user_id,coupon_id" }
    );
  }

  const cached = lsGet(COUPONS_KEY);
  const prev: DownloadedCoupon[] = cached ? JSON.parse(cached) : [];
  if (!prev.find(c => c.coupon_id === coupon.coupon_id)) {
    lsSet(COUPONS_KEY, JSON.stringify([
      { id: crypto.randomUUID(), downloaded_at: new Date().toISOString(), ...coupon },
      ...prev,
    ]));
  }
}

export async function removeDownloadedCoupon(couponId: string): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase.from("user_coupons").delete()
      .eq("user_id", uid).eq("coupon_id", couponId);
  }

  const cached = lsGet(COUPONS_KEY);
  const prev: DownloadedCoupon[] = cached ? JSON.parse(cached) : [];
  lsSet(COUPONS_KEY, JSON.stringify(prev.filter(c => c.coupon_id !== couponId)));
}

// ── 즐겨찾는 버스 ─────────────────────────────────────────────────────
const FAV_BUSES_KEY = "geumdan_fav_buses";

export async function getFavoriteBuses(): Promise<FavoriteBus[]> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_favorite_buses")
        .select("id,route_id,route_name,stop_id,stop_name")
        .eq("user_id", uid).order("created_at", { ascending: false });
      if (data) return data as FavoriteBus[];
    } catch {}
  }

  const cached = lsGet(FAV_BUSES_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function addFavoriteBus(bus: Omit<FavoriteBus, "id">): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_favorite_buses").upsert(
      { user_id: uid, ...bus }, { onConflict: "user_id,route_id" }
    );
  }

  const cached = lsGet(FAV_BUSES_KEY);
  const prev: FavoriteBus[] = cached ? JSON.parse(cached) : [];
  if (!prev.find(b => b.route_id === bus.route_id)) {
    lsSet(FAV_BUSES_KEY, JSON.stringify([{ id: crypto.randomUUID(), ...bus }, ...prev]));
  }
}

export async function removeFavoriteBus(routeId: string): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase.from("user_favorite_buses").delete()
      .eq("user_id", uid).eq("route_id", routeId);
  }

  const cached = lsGet(FAV_BUSES_KEY);
  const prev: FavoriteBus[] = cached ? JSON.parse(cached) : [];
  lsSet(FAV_BUSES_KEY, JSON.stringify(prev.filter(b => b.route_id !== routeId)));
}

// ── 즐겨찾는 상가 ─────────────────────────────────────────────────────
const FAV_STORES_KEY = "geumdan_fav_stores";

export async function getFavoriteStores(): Promise<FavoriteStore[]> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_favorite_stores")
        .select("id,store_id,store_name,building_id,building_name")
        .eq("user_id", uid).order("created_at", { ascending: false });
      if (data) return data as FavoriteStore[];
    } catch {}
  }

  const cached = lsGet(FAV_STORES_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function addFavoriteStore(store: Omit<FavoriteStore, "id">): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_favorite_stores").upsert(
      { user_id: uid, ...store }, { onConflict: "user_id,store_id" }
    );
  }

  const cached = lsGet(FAV_STORES_KEY);
  const prev: FavoriteStore[] = cached ? JSON.parse(cached) : [];
  if (!prev.find(s => s.store_id === store.store_id)) {
    lsSet(FAV_STORES_KEY, JSON.stringify([{ id: crypto.randomUUID(), ...store }, ...prev]));
  }
}

export async function removeFavoriteStore(storeId: string): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase.from("user_favorite_stores").delete()
      .eq("user_id", uid).eq("store_id", storeId);
  }

  const cached = lsGet(FAV_STORES_KEY);
  const prev: FavoriteStore[] = cached ? JSON.parse(cached) : [];
  lsSet(FAV_STORES_KEY, JSON.stringify(prev.filter(s => s.store_id !== storeId)));
}

// ── 관심 아파트 ───────────────────────────────────────────────────────
const FAV_APTS_KEY = "geumdan_fav_apts";

export async function getFavoriteApts(): Promise<FavoriteApt[]> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_favorite_apts")
        .select("id,apt_id,apt_name,dong")
        .eq("user_id", uid).order("created_at", { ascending: false });
      if (data) return data as FavoriteApt[];
    } catch {}
  }

  const cached = lsGet(FAV_APTS_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function addFavoriteApt(apt: Omit<FavoriteApt, "id">): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_favorite_apts").upsert(
      { user_id: uid, ...apt }, { onConflict: "user_id,apt_id" }
    );
  }

  const cached = lsGet(FAV_APTS_KEY);
  const prev: FavoriteApt[] = cached ? JSON.parse(cached) : [];
  if (!prev.find(a => a.apt_id === apt.apt_id)) {
    lsSet(FAV_APTS_KEY, JSON.stringify([{ id: crypto.randomUUID(), ...apt }, ...prev]));
  }
}

export async function removeFavoriteApt(aptId: string): Promise<void> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return;

  if (isConfigured()) {
    await supabase.from("user_favorite_apts").delete()
      .eq("user_id", uid).eq("apt_id", aptId);
  }

  const cached = lsGet(FAV_APTS_KEY);
  const prev: FavoriteApt[] = cached ? JSON.parse(cached) : [];
  lsSet(FAV_APTS_KEY, JSON.stringify(prev.filter(a => a.apt_id !== aptId)));
}

export async function isFavoriteApt(aptId: string): Promise<boolean> {
  const list = await getFavoriteApts();
  return list.some(a => a.apt_id === aptId);
}

export async function isFavoriteStore(storeId: string): Promise<boolean> {
  const list = await getFavoriteStores();
  return list.some(s => s.store_id === storeId);
}

export async function isFavoriteBus(routeId: string): Promise<boolean> {
  const list = await getFavoriteBuses();
  return list.some(b => b.route_id === routeId);
}

// ── 설정 ─────────────────────────────────────────────────────────────
const SETTINGS_KEY = "geumdan_settings";

export async function getUserSettings(): Promise<UserSettings> {
  const uid = lsGet("geumdan_uid");
  if (!uid) return { ...DEFAULT_SETTINGS };

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("push_all,push_comment,push_like,push_notice,push_marketing,location_on")
        .eq("user_id", uid).single();
      if (data) return data as UserSettings;
    } catch {}
  }

  const cached = lsGet(SETTINGS_KEY);
  return cached ? JSON.parse(cached) : { ...DEFAULT_SETTINGS };
}

export async function updateUserSettings(patch: Partial<UserSettings>): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_settings").upsert(
      { user_id: uid, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  }

  const cached = lsGet(SETTINGS_KEY);
  const prev = cached ? JSON.parse(cached) : { ...DEFAULT_SETTINGS };
  lsSet(SETTINGS_KEY, JSON.stringify({ ...prev, ...patch }));
}
