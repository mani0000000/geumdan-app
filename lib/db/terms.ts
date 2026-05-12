import { supabase } from "@/lib/supabase";

export interface Term {
  id: string;
  type: "service" | "privacy" | "location" | "marketing";
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
}

export async function fetchTerm(type: Term["type"]): Promise<Term | null> {
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("type", type)
    .eq("is_active", true)
    .single();
  if (error) {
    console.error("[terms] fetch error", error);
    return null;
  }
  return data as Term;
}

export async function fetchAllTerms(): Promise<Term[]> {
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .order("type");
  if (error) {
    console.error("[terms] fetchAll error", error);
    return [];
  }
  return (data ?? []) as Term[];
}
