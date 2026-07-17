/**
 * Client-side helper that calls the server-side /api/admin/db route.
 * All admin data reads go through the server to use SUPABASE_SERVICE_KEY safely.
 */

export type AdminApiErrorCode = "SERVICE_RESTRICTED" | "UPSTREAM_ERROR" | "REQUEST_FAILED";

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly code: AdminApiErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

type AdminErrorPayload = { error?: string; code?: AdminApiErrorCode };

export function isAdminServiceRestricted(error: unknown): boolean {
  return error instanceof AdminApiError && error.code === "SERVICE_RESTRICTED";
}

export function adminErrorMessage(error: unknown, fallback: string): string {
  if (isAdminServiceRestricted(error)) {
    return "현재 데이터 저장소 점검 중이에요. 연결이 복구되면 다시 시도해 주세요.";
  }
  return error instanceof Error ? error.message : fallback;
}

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
  const json = await res.json() as { data?: T[] } & AdminErrorPayload;
  if (!res.ok) {
    throw new AdminApiError(
      json.error ?? `데이터를 불러오지 못했습니다 (${res.status})`,
      json.code ?? "REQUEST_FAILED",
      res.status,
    );
  }
  return json.data ?? [];
}

export async function adminApiPost(
  table: string,
  method: "POST" | "PATCH" | "DELETE",
  rows: unknown,
  opts: { onConflict?: string; eq?: string } = {}
): Promise<{ logoSkipped?: boolean }> {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, method, rows, ...opts }),
  });
  const json = await res.json() as { logoSkipped?: boolean } & AdminErrorPayload;
  if (!res.ok) {
    throw new AdminApiError(
      json.error ?? `변경 내용을 저장하지 못했습니다 (${res.status})`,
      json.code ?? "REQUEST_FAILED",
      res.status,
    );
  }
  return { logoSkipped: json.logoSkipped };
}
