import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plwpfnbhyzblgvliiole.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk';

// supabaseUrl/AnonKey have hard-coded fallbacks above, so the client is always
// usable. Modules should import this flag instead of re-checking process.env,
// which is undefined in client bundles built without env vars and would
// otherwise silently disable DB writes.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// PostgREST (/rest/v1/) rejects sb_* keys as Bearer ("Invalid Compact JWS").
// Strip Bearer only for PostgREST; Storage requires it even for sb_* keys.
function makeFetch(key: string): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    const isPostgrest = url.includes('/rest/v1/');
    if (!isPostgrest) return fetch(input as RequestInfo, init);
    const headers = new Headers(init?.headers);
    const bearer = headers.get('Authorization')?.slice(7) ?? '';
    if (bearer === key) headers.delete('Authorization');
    return fetch(input as RequestInfo, { ...init, headers });
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: makeFetch(supabaseAnonKey) },
  auth: { autoRefreshToken: false, persistSession: false },
});
