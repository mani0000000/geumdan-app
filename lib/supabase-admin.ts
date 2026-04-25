import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://plwpfnbhyzblgvliiole.supabase.co";
const FALLBACK_KEY = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
const rawKey = process.env.NEXT_PUBLIC_ADMIN_DB_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;
const adminKey = (rawKey.startsWith("sb_publishable_") || rawKey.startsWith("sb_secret_"))
  ? rawKey
  : FALLBACK_KEY;

// The new sb_* key format is NOT a JWT. Sending it as Authorization: Bearer causes
// "Invalid Compact JWS" from the Supabase gateway's JWT validator.
// Strip the Bearer header when it equals the apikey — the gateway accepts the new
// key format via the apikey header alone and grants the appropriate role.
function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers);
    const bearer = headers.get("Authorization")?.slice(7) ?? ""; // strip "Bearer "
    if (bearer === key) headers.delete("Authorization");
    return fetch(input as RequestInfo, { ...init, headers });
  };
}

export const supabaseAdmin = createClient(url, adminKey, {
  global: { fetch: makeFetch(adminKey) },
  auth: { autoRefreshToken: false, persistSession: false },
});
