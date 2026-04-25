import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://plwpfnbhyzblgvliiole.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk';

// New sb_* key format is not a JWT — strip Authorization: Bearer when it equals
// the apikey to prevent "Invalid Compact JWS" from the Supabase gateway
function makeFetch(key: string): typeof fetch {
  return (input, init) => {
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
