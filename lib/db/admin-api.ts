/**
 * Client-side helper that calls the server-side /api/admin/db route.
 * All admin data reads go through the server to use SUPABASE_SERVICE_KEY safely.
 */

export async function adminApiGet<T>(
  table: string,
  opts: { select?: string; order?: string; eq?: string; limit?: number } = {}
): Promise<T[]> {
  const params = new URLSearchParams({ table });
  if (opts.select) params.set("select", opts.select);
  if (opts.order) params.set("order", opts.order);
  if (opts.eq) params.set("eq", opts.eq);
  if (opts.limit != null) params.set("limit", String(opts.limit));

  const res = await fetch(`/api/admin/db?${params.toString()}`);
  const json = await res.json() as { data?: T[]; error?: string };
  if (!res.ok) throw new Error(json.error ?? `DB 오류 (${res.status})`);
  return json.data ?? [];
}

export async function adminApiPost(
  table: string,
  method: "POST" | "PATCH" | "DELETE",
  rows: unknown,
  opts: { onConflict?: string; eq?: string } = {}
): Promise<void> {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, method, rows, ...opts }),
  });
  const json = await res.json() as { error?: string };
  if (!res.ok) throw new Error(json.error ?? `DB 오류 (${res.status})`);
}
