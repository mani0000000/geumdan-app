import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import type { Place, PlaceCategory, PlaceArea } from "./places";

export type { Place, PlaceCategory, PlaceArea };

export interface AdminPlace extends Place {}

export async function adminFetchPlaces(): Promise<AdminPlace[]> {
  return adminApiGet<AdminPlace>("places", { order: "sort_order,created_at" });
}

export async function adminCreatePlace(p: Omit<AdminPlace, "id" | "created_at">): Promise<string> {
  const id = "place_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await adminApiPost("places", "POST", [{ ...p, id }]);
  return id;
}

export async function adminUpdatePlace(id: string, p: Partial<Omit<AdminPlace, "id" | "created_at">>): Promise<void> {
  await adminApiPost("places", "PATCH", p, { eq: `id=eq.${id}` });
}

export async function adminDeletePlace(id: string): Promise<void> {
  await adminApiPost("places", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminTogglePublished(id: string, published: boolean): Promise<void> {
  await adminApiPost("places", "PATCH", { published }, { eq: `id=eq.${id}` });
}
