import { supabase } from "@/lib/supabase";

export type PlaceCategory = "kids" | "nature" | "culture" | "travel" | "food";
export type PlaceArea =
  | "강화도" | "파주" | "영종도" | "일산" | "고양"
  | "부천" | "청라" | "인천" | "검단" | "기타";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  area: PlaceArea;
  short_desc: string;
  description: string;
  address: string;
  thumbnail_url: string | null;
  tags: string[];
  distance_km: number | null;
  drive_min: number | null;
  operating_hours: string | null;
  admission_fee: string | null;
  phone: string | null;
  website: string | null;
  published: boolean;
  sort_order: number;
  created_at: string;
  lat: number | null;
  lng: number | null;
}

export const CATEGORY_META: Record<PlaceCategory, { label: string; color: string; bg: string }> = {
  kids:    { label: "아이와 함께", color: "#0071e3", bg: "#e8f1fd" },
  nature:  { label: "자연·힐링",   color: "#2E7D32", bg: "#E8F5E9" },
  culture: { label: "문화·역사",   color: "#6B21A8", bg: "#F3E8FF" },
  travel:  { label: "당일여행",     color: "#C2410C", bg: "#FFF7ED" },
  food:    { label: "맛집·카페",   color: "#9D5C00", bg: "#FFF3E0" },
};

export const AREAS: PlaceArea[] = [
  "강화도", "파주", "영종도", "일산", "고양", "부천", "청라", "인천", "검단", "기타",
];

export async function fetchPublishedPlaces(): Promise<Place[]> {
  const { data, error } = await supabase
    .from("places")
    .select("*")
    .eq("published", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Place[];
}
