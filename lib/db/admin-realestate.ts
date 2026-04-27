import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface AdminApartment {
  id: string;
  name: string;
  dong: string;
  households: number;
  built_year: number;
  lat: number | null;
  lng: number | null;
}

export interface AdminApartmentSize {
  id: string;
  apt_id: string;
  pyeong: number;
  sqm: number;
  avg_price: number;
}

export async function adminFetchApartments(): Promise<AdminApartment[]> {
  return adminApiGet<AdminApartment>("apartments", { order: "dong,name" });
}

export async function adminCreateApartment(a: Omit<AdminApartment, "id">): Promise<string> {
  const id = "apt_" + Date.now().toString(36);
  await adminApiPost("apartments", "POST", [{ ...a, id }]);
  return id;
}

export async function adminUpdateApartment(id: string, a: Partial<AdminApartment>): Promise<void> {
  await adminApiPost("apartments", "PATCH", a, { eq: `id=eq.${id}` });
}

export async function adminDeleteApartment(id: string): Promise<void> {
  await adminApiPost("apartment_sizes", "DELETE", null, { eq: `apt_id=eq.${id}` });
  await adminApiPost("apartment_price_history", "DELETE", null, { eq: `apt_id=eq.${id}` });
  await adminApiPost("apartments", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminFetchSizes(aptId: string): Promise<AdminApartmentSize[]> {
  return adminApiGet<AdminApartmentSize>("apartment_sizes", { order: "pyeong", eq: `apt_id=eq.${aptId}` });
}

export async function adminUpsertSize(s: AdminApartmentSize): Promise<void> {
  await adminApiPost("apartment_sizes", "POST", [s], { onConflict: "id" });
}

export async function adminDeleteSize(id: string): Promise<void> {
  await adminApiPost("apartment_sizes", "DELETE", null, { eq: `id=eq.${id}` });
}

export interface AdminDeal {
  id: string;
  apt_id: string;
  apt_name?: string;
  pyeong: number;
  price: number;
  deal_date: string;
  floor: number | null;
}

export async function adminFetchDeals(opts?: { aptId?: string; limit?: number }): Promise<AdminDeal[]> {
  return adminApiGet<AdminDeal>("apartment_price_history", {
    order: "deal_date.desc",
    limit: opts?.limit ?? 100,
    eq: opts?.aptId ? `apt_id=eq.${opts.aptId}` : undefined,
  });
}

export async function adminCreateDeal(d: Omit<AdminDeal, "id" | "apt_name">): Promise<void> {
  await adminApiPost("apartment_price_history", "POST", [d]);
}

export async function adminDeleteDeal(id: string): Promise<void> {
  await adminApiPost("apartment_price_history", "DELETE", null, { eq: `id=eq.${id}` });
}

export interface AdminPriceIndex {
  id?: number;
  source: "kb" | "reb";
  region: string;
  period: string;
  index_value: number | null;
  change_rate: number | null;
  trade_count: number | null;
}

export async function adminFetchPriceIndex(opts?: { source?: "kb" | "reb"; limit?: number }): Promise<AdminPriceIndex[]> {
  return adminApiGet<AdminPriceIndex>("apt_price_index", {
    order: "period.desc",
    limit: opts?.limit ?? 60,
    eq: opts?.source ? `source=eq.${opts.source}` : undefined,
  });
}

export async function adminUpsertPriceIndex(p: AdminPriceIndex): Promise<void> {
  const payload = { ...p };
  delete payload.id;
  await adminApiPost("apt_price_index", "POST", [payload], { onConflict: "source,region,period" });
}

export async function adminDeletePriceIndex(id: number): Promise<void> {
  await adminApiPost("apt_price_index", "DELETE", null, { eq: `id=eq.${id}` });
}

export async function adminFetchRealEstateStats(): Promise<{
  totalApts: number;
  totalDeals: number;
  latestDealDate: string | null;
  latestKbPeriod: string | null;
  latestRebPeriod: string | null;
}> {
  const [apts, deals, kbIdx, rebIdx] = await Promise.all([
    adminApiGet<{ id: string }>("apartments", { select: "id" }),
    adminApiGet<{ deal_date: string }>("apartment_price_history", { select: "deal_date", order: "deal_date.desc", limit: 1 }),
    adminApiGet<{ period: string }>("apt_price_index", { select: "period", order: "period.desc", eq: "source=eq.kb", limit: 1 }),
    adminApiGet<{ period: string }>("apt_price_index", { select: "period", order: "period.desc", eq: "source=eq.reb", limit: 1 }),
  ]);
  return {
    totalApts: apts.length,
    totalDeals: 0,
    latestDealDate: deals[0]?.deal_date ?? null,
    latestKbPeriod: kbIdx[0]?.period ?? null,
    latestRebPeriod: rebIdx[0]?.period ?? null,
  };
}
