import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://plwpfnbhyzblgvliiole.supabase.co";
const FALLBACK_KEY = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
const rawKey = process.env.NEXT_PUBLIC_ADMIN_DB_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;
const adminKey = (rawKey.startsWith("sb_publishable_") || rawKey.startsWith("sb_secret_"))
  ? rawKey
  : FALLBACK_KEY;

// PostgREST (/rest/v1/) rejects sb_* keys as Bearer ("Invalid Compact JWS").
// Storage (/storage/v1/) requires Authorization: Bearer even for sb_* keys.
// Strip Bearer only for PostgREST requests; keep it for Storage and auth endpoints.
function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : (input as Request).url;
    const isPostgrest = url.includes("/rest/v1/");
    if (!isPostgrest) return fetch(input as RequestInfo, init);
    const headers = new Headers(init?.headers);
    const bearer = headers.get("Authorization")?.slice(7) ?? "";
    if (bearer === key) headers.delete("Authorization");
    return fetch(input as RequestInfo, { ...init, headers });
  };
}

export const supabaseAdmin = createClient(url, adminKey, {
  global: { fetch: makeFetch(adminKey) },
  auth: { autoRefreshToken: false, persistSession: false },
});
