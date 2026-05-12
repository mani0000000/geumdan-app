/**
 * lib/db/placeFavorites.ts
 * 가볼만한 곳 즐겨찾기 — 회원(익명 UUID)별 추가/해제/조회
 * Supabase 미설정 시 localStorage 전용 폴백
 */
import { supabase } from "@/lib/supabase";
import { getOrCreateUserId, getLocalUserId } from "@/lib/db/userdata";

export interface FavoritePlace {
  id: string;
  place_id: string;
  place_name: string;
  place_category: string | null;
  place_area: string | null;
  place_image_url: string | null;
  place_address: string | null;
}

export interface FavoritePlaceInput {
  place_id: string;
  place_name: string;
  place_category?: string | null;
  place_area?: string | null;
  place_image_url?: string | null;
  place_address?: string | null;
}

const FAV_PLACES_KEY = "geumdan_fav_places";

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

export async function getFavoritePlaces(): Promise<FavoritePlace[]> {
  const uid = getLocalUserId();
  if (!uid) return [];

  if (isConfigured()) {
    try {
      const { data } = await supabase
        .from("user_favorite_places")
        .select("id,place_id,place_name,place_category,place_area,place_image_url,place_address")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (data) return data as FavoritePlace[];
    } catch {}
  }

  const cached = lsGet(FAV_PLACES_KEY);
  return cached ? JSON.parse(cached) : [];
}

export async function addFavoritePlace(place: FavoritePlaceInput): Promise<void> {
  const uid = await getOrCreateUserId();

  if (isConfigured()) {
    await supabase.from("user_favorite_places").upsert(
      {
        user_id: uid,
        place_id: place.place_id,
        place_name: place.place_name,
        place_category: place.place_category ?? null,
        place_area: place.place_area ?? null,
        place_image_url: place.place_image_url ?? null,
        place_address: place.place_address ?? null,
      },
      { onConflict: "user_id,place_id" }
    );
  }

  const cached = lsGet(FAV_PLACES_KEY);
  const prev: FavoritePlace[] = cached ? JSON.parse(cached) : [];
  if (!prev.find(p => p.place_id === place.place_id)) {
    lsSet(
      FAV_PLACES_KEY,
      JSON.stringify([
        {
          id: crypto.randomUUID(),
          place_id: place.place_id,
          place_name: place.place_name,
          place_category: place.place_category ?? null,
          place_area: place.place_area ?? null,
          place_image_url: place.place_image_url ?? null,
          place_address: place.place_address ?? null,
        },
        ...prev,
      ])
    );
  }
}

export async function removeFavoritePlace(placeId: string): Promise<void> {
  const uid = getLocalUserId();
  if (!uid) return;

  if (isConfigured()) {
    await supabase
      .from("user_favorite_places")
      .delete()
      .eq("user_id", uid)
      .eq("place_id", placeId);
  }

  const cached = lsGet(FAV_PLACES_KEY);
  const prev: FavoritePlace[] = cached ? JSON.parse(cached) : [];
  lsSet(FAV_PLACES_KEY, JSON.stringify(prev.filter(p => p.place_id !== placeId)));
}

export async function isFavoritePlace(placeId: string): Promise<boolean> {
  const list = await getFavoritePlaces();
  return list.some(p => p.place_id === placeId);
}
