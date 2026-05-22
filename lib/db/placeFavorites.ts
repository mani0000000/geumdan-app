/**
 * lib/db/placeFavorites.ts
 * 가볼만한곳 즐겨찾기 — localStorage 기반
 */

const LS_KEY = "geumdan_fav_places";

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function lsSet(key: string, val: string) {
  if (typeof window !== "undefined") localStorage.setItem(key, val);
}

export interface FavoritePlace {
  id: string;
  place_id: string;
  place_name: string;
  place_category: string;
  place_area: string;
  place_image_url: string | null;
  place_address: string;
}

export async function getFavoritePlaces(): Promise<FavoritePlace[]> {
  const cached = lsGet(LS_KEY);
  if (!cached) return [];
  try {
    const list = JSON.parse(cached) as FavoritePlace[];
    // 구 버전 필드명 마이그레이션 (thumbnail_url → place_image_url, category → place_category)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return list.map((p: any) => ({
      id: p.id ?? crypto.randomUUID(),
      place_id: p.place_id,
      place_name: p.place_name,
      place_image_url: p.place_image_url ?? p.thumbnail_url ?? null,
      place_category: p.place_category ?? p.category ?? "",
      place_area: p.place_area ?? "",
      place_address: p.place_address ?? "",
    }));
  } catch { return []; }
}

export async function addFavoritePlace(
  place: Omit<FavoritePlace, "id">
): Promise<void> {
  const prev = await getFavoritePlaces();
  if (prev.find((p) => p.place_id === place.place_id)) return;
  lsSet(LS_KEY, JSON.stringify([{ id: crypto.randomUUID(), ...place }, ...prev]));
}

export async function removeFavoritePlace(placeId: string): Promise<void> {
  const prev = await getFavoritePlaces();
  lsSet(LS_KEY, JSON.stringify(prev.filter((p) => p.place_id !== placeId)));
}

export async function isFavoritePlace(placeId: string): Promise<boolean> {
  const list = await getFavoritePlaces();
  return list.some((p) => p.place_id === placeId);
}
