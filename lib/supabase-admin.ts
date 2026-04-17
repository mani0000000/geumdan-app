import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://plwpfnbhyzblgvliiole.supabase.co";
const FALLBACK_KEY = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
const rawKey = process.env.NEXT_PUBLIC_ADMIN_DB_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;
// 키 형식이 유효하지 않으면 폴백 사용
const adminKey = (rawKey.startsWith("sb_publishable_") || rawKey.startsWith("sb_secret_"))
  ? rawKey
  : FALLBACK_KEY;

// 서비스 키를 사용하여 RLS를 우회하는 관리자 클라이언트
// admin/** 페이지에서만 import 할 것
export const supabaseAdmin = createClient(url, adminKey);
