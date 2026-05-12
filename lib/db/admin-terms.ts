import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";
import type { Term } from "@/lib/db/terms";

export async function adminFetchAllTerms(): Promise<Term[]> {
  return adminApiGet<Term>("terms", { order: "type" });
}

export async function adminFetchTerm(type: Term["type"]): Promise<Term | null> {
  const rows = await adminApiGet<Term>("terms", { eq: `type=eq.${type}` });
  return rows[0] ?? null;
}

export async function adminSaveTerm(
  type: Term["type"],
  fields: Pick<Term, "title" | "content" | "version" | "effective_date" | "is_active">
): Promise<void> {
  await adminApiPost("terms", "PATCH", { ...fields, updated_at: new Date().toISOString() }, {
    eq: `type=eq.${type}`,
  });
}
