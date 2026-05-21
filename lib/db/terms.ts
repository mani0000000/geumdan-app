/**
 * lib/db/terms.ts
 * 약관(terms) 조회
 */
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

function isConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchTerm(type: Term["type"]): Promise<Term | null> {
  if (!isConfigured()) return null;
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

export async function fetchTermById(id: string): Promise<Term | null> {
  if (!isConfigured()) return null;
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[terms] fetchById error", error);
    return null;
  }
  return data as Term;
}

export async function fetchAllTerms(): Promise<Term[]> {
  if (!isConfigured()) return FALLBACK_TERMS;
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("is_active", true)
    .order("type");
  if (error) {
    console.error("[terms] fetchAll error", error);
    return FALLBACK_TERMS;
  }
  return ((data ?? []) as Term[]).length > 0 ? (data as Term[]) : FALLBACK_TERMS;
}

// 폴백 데이터 (Supabase 미설정 환경)
export const TERMS_MENU: Array<{ type: Term["type"]; label: string }> = [
  { type: "service", label: "서비스 이용약관" },
  { type: "privacy", label: "개인정보처리방침" },
  { type: "location", label: "위치기반 서비스 이용약관" },
  { type: "marketing", label: "마케팅 정보 수신 동의" },
];

const FALLBACK_TERMS: Term[] = TERMS_MENU.map(({ type, label }) => ({
  id: type,
  type,
  title: label,
  content: `${label} 내용을 준비 중입니다.`,
  version: "1.0",
  is_active: true,
  effective_date: "2024-01-01",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}));
