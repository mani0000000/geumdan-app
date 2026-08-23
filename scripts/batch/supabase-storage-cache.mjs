import { createClient } from '@supabase/supabase-js';

export const BATCH_CACHE_BUCKET = process.env.SUPABASE_BATCH_CACHE_BUCKET ?? 'batch-cache';

export function publicBatchCacheUrl(path, supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') {
  if (!supabaseUrl) return '';
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BATCH_CACHE_BUCKET}/${path}`;
}

export async function uploadJsonCache(path, payload, options = {}) {
  const supabaseUrl = options.supabaseUrl ?? process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceKey = options.serviceKey ?? process.env.SUPABASE_SERVICE_KEY ?? '';
  const bucket = options.bucket ?? BATCH_CACHE_BUCKET;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Supabase Storage 캐시 업로드 환경변수가 없습니다.');
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const body = Buffer.from(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  const { error } = await client.storage.from(bucket).upload(path, body, {
    contentType: 'application/json',
    cacheControl: '300',
    upsert: true,
  });

  if (error) throw new Error(`Supabase Storage 업로드 실패 (${path}): ${error.message}`);
  console.log(`  ✓ Storage 복구 캐시 저장: ${bucket}/${path} (${body.byteLength} bytes)`);
  return publicBatchCacheUrl(path, supabaseUrl);
}
