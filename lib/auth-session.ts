import { supabase } from "@/lib/supabase";

export async function requireAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error("로그인이 필요합니다.");
  }
  return token;
}

export async function authenticatedHeaders(): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await requireAccessToken()}` };
}
