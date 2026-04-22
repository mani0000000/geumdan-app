import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Place, PlaceCategory, PlaceArea } from "./places";

export type { Place, PlaceCategory, PlaceArea };

export interface AdminPlace extends Place {}

export async function adminFetchPlaces(): Promise<AdminPlace[]> {
  const { data, error } = await supabaseAdmin
    .from("places")
    .select("*")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPlace[];
}

export async function adminCreatePlace(p: Omit<AdminPlace, "id" | "created_at">): Promise<string> {
  const id = "place_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const { error } = await supabaseAdmin.from("places").insert({ ...p, id });
  if (error) throw new Error(error.message);
  return id;
}

export async function adminUpdatePlace(id: string, p: Partial<Omit<AdminPlace, "id" | "created_at">>): Promise<void> {
  const { error } = await supabaseAdmin.from("places").update(p).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeletePlace(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("places").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminTogglePublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabaseAdmin.from("places").update({ published }).eq("id", id);
  if (error) throw new Error(error.message);
}
