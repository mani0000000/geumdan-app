#!/usr/bin/env node
/**
 * backfill-og-images.mjs
 * One-shot: for every news_articles row with thumbnail IS NULL,
 * fetch og:image (or twitter:image) from the article URL and update the row.
 *
 * Usage:
 *   node --env-file=.env.local scripts/batch/backfill-og-images.mjs
 *   # or
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/batch/backfill-og-images.mjs
 *
 * Options (env):
 *   CONCURRENCY=4          parallel fetches
 *   PAGE_SIZE=500          rows fetched per Supabase page
 *   FETCH_TIMEOUT_MS=6000  per-URL timeout
 *   DRY_RUN=1              skip Supabase updates, just count would-update
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('   Provide them via .env.local + `node --env-file=.env.local ...`');
  process.exit(1);
}

const CONCURRENCY      = Number(process.env.CONCURRENCY      ?? 4);
const PAGE_SIZE        = Number(process.env.PAGE_SIZE        ?? 500);
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS ?? 6000);
const DRY_RUN          = process.env.DRY_RUN === '1';

// sb_* keys are not JWTs — strip Authorization: Bearer for PostgREST.
function makeFetch(key) {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes('/rest/v1/')) return fetch(input, init);
    const headers = new Headers(init?.headers);
    if (headers.get('Authorization')?.slice(7) === key) headers.delete('Authorization');
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  global: { fetch: makeFetch(SUPABASE_SERVICE_KEY) },
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchOgImage(url) {
  if (!url) return null;
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GeumdanNewsBot/1.0; +https://geumdan.app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 64_000);
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i) ||
      html.match(/<meta[^>]+name=["']og:image["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
    if (!m) return null;
    try {
      return new URL(m[1], url).href;
    } catch {
      return null;
    }
  } catch {
    return null;
  } finally {
    clearTimeout(tid);
  }
}

async function fetchAllNullThumbnailRows() {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('news_articles')
      .select('id, url')
      .is('thumbnail', null)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Supabase select failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows.filter(r => r.url && typeof r.url === 'string');
}

async function runWorkers(rows) {
  let cursor = 0;
  let hits = 0;
  let misses = 0;
  let updateErrors = 0;
  let processed = 0;
  const total = rows.length;

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= total) return;
      const row = rows[i];
      const og = await fetchOgImage(row.url);
      processed++;

      if (og) {
        if (!DRY_RUN) {
          const { error } = await supabase
            .from('news_articles')
            .update({ thumbnail: og })
            .eq('id', row.id);
          if (error) {
            updateErrors++;
            console.warn(`  ⚠️  update failed for id=${row.id}: ${error.message}`);
          } else {
            hits++;
          }
        } else {
          hits++;
        }
      } else {
        misses++;
      }

      if (processed % 25 === 0 || processed === total) {
        console.log(`  ${processed}/${total} processed — ${hits} updated, ${misses} no-og`);
      }
    }
  });

  await Promise.all(workers);
  return { hits, misses, updateErrors };
}

console.log('🖼️  og:image backfill starting...');
console.log(`   Supabase: ${SUPABASE_URL}`);
console.log(`   Concurrency: ${CONCURRENCY}   Timeout: ${FETCH_TIMEOUT_MS}ms   Dry run: ${DRY_RUN}`);

try {
  const rows = await fetchAllNullThumbnailRows();
  console.log(`\n📋 Rows with thumbnail IS NULL: ${rows.length}`);
  if (rows.length === 0) {
    console.log('✅ Nothing to backfill.');
    process.exit(0);
  }

  const { hits, misses, updateErrors } = await runWorkers(rows);

  console.log('\n────────────────────────────────────');
  console.log(`✅ Done. ${hits} rows updated${DRY_RUN ? ' (DRY RUN — no writes)' : ''}.`);
  console.log(`   No og:image found: ${misses}`);
  if (updateErrors) console.log(`   Update errors: ${updateErrors}`);
} catch (err) {
  console.error('\n❌ Backfill failed:', err.message);
  process.exit(1);
}
