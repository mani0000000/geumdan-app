import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://plwpfnbhyzblgvliiole.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
