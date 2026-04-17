import { supabaseAdmin } from "@/lib/supabase-admin";

// ─── 아파트 단지 ─────────────────────────────────────────────

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
  const { data, error } = await supabaseAdmin
    .from("apartments")
    .select("*")
    .order("dong")
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminApartment[];
}

export async function adminCreateApartment(a: Omit<AdminApartment, "id">): Promise<string> {
  const id = "apt_" + Date.now().toString(36);
  const { error } = await supabaseAdmin.from("apartments").insert({ ...a, id });
  if (error) throw new Error(error.message);
  return id;
}

export async function adminUpdateApartment(id: string, a: Partial<AdminApartment>): Promise<void> {
  const { error } = await supabaseAdmin.from("apartments").update(a).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteApartment(id: string): Promise<void> {
  await supabaseAdmin.from("apartment_sizes").delete().eq("apt_id", id);
  await supabaseAdmin.from("apartment_price_history").delete().eq("apt_id", id);
  const { error } = await supabaseAdmin.from("apartments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 평형별 시세 ─────────────────────────────────────────────

export async function adminFetchSizes(aptId: string): Promise<AdminApartmentSize[]> {
  const { data, error } = await supabaseAdmin
    .from("apartment_sizes")
    .select("*")
    .eq("apt_id", aptId)
    .order("pyeong");
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminApartmentSize[];
}

export async function adminUpsertSize(s: AdminApartmentSize): Promise<void> {
  const { error } = await supabaseAdmin
    .from("apartment_sizes")
    .upsert(s, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function adminDeleteSize(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("apartment_sizes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 실거래 내역 ─────────────────────────────────────────────

export interface AdminDeal {
  id: string;
  apt_id: string;
  apt_name?: string;
  pyeong: number;
  price: number;
  deal_date: string;
  floor: number | null;
}

export async function adminFetchDeals(opts?: {
  aptId?: string;
  limit?: number;
}): Promise<AdminDeal[]> {
  let q = supabaseAdmin
    .from("apartment_price_history")
    .select("*, apartments(name)")
    .order("deal_date", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.aptId) q = q.eq("apt_id", opts.aptId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    apt_id: row.apt_id as string,
    apt_name: (row.apartments as { name?: string } | null)?.name,
    pyeong: row.pyeong as number,
    price: row.price as number,
    deal_date: row.deal_date as string,
    floor: row.floor as number | null,
  }));
}

export async function adminCreateDeal(d: Omit<AdminDeal, "id" | "apt_name">): Promise<void> {
  const { error } = await supabaseAdmin.from("apartment_price_history").insert(d);
  if (error) throw new Error(error.message);
}

export async function adminDeleteDeal(id: string): Promise<void> {
  const { error } = await supabaseAdmin.from("apartment_price_history").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 가격 지수 ───────────────────────────────────────────────

export interface AdminPriceIndex {
  id?: number;
  source: "kb" | "reb";
  region: string;
  period: string;
  index_value: number | null;
  change_rate: number | null;
  trade_count: number | null;
}

export async function adminFetchPriceIndex(opts?: {
  source?: "kb" | "reb";
  limit?: number;
}): Promise<AdminPriceIndex[]> {
  let q = supabaseAdmin
    .from("apt_price_index")
    .select("*")
    .order("period", { ascending: false })
    .limit(opts?.limit ?? 60);
  if (opts?.source) q = q.eq("source", opts.source);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPriceIndex[];
}

export async function adminUpsertPriceIndex(p: AdminPriceIndex): Promise<void> {
  const payload = { ...p };
  delete payload.id;
  const { error } = await supabaseAdmin
    .from("apt_price_index")
    .upsert(payload, { onConflict: "source,region,period" });
  if (error) throw new Error(error.message);
}

export async function adminDeletePriceIndex(id: number): Promise<void> {
  const { error } = await supabaseAdmin.from("apt_price_index").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── 통계 ─────────────────────────────────────────────────────

export async function adminFetchRealEstateStats(): Promise<{
  totalApts: number;
  totalDeals: number;
  latestDealDate: string | null;
  latestKbPeriod: string | null;
  latestRebPeriod: string | null;
}> {
  const [apts, deals, kb, reb] = await Promise.all([
    supabaseAdmin.from("apartments").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("apartment_price_history").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("apt_price_index").select("period").eq("source", "kb").order("period", { ascending: false }).limit(1),
    supabaseAdmin.from("apt_price_index").select("period").eq("source", "reb").order("period", { ascending: false }).limit(1),
  ]);
  const latestDeal = await supabaseAdmin
    .from("apartment_price_history")
    .select("deal_date")
    .order("deal_date", { ascending: false })
    .limit(1);

  return {
    totalApts: apts.count ?? 0,
    totalDeals: deals.count ?? 0,
    latestDealDate: latestDeal.data?.[0]?.deal_date ?? null,
    latestKbPeriod: kb.data?.[0]?.period ?? null,
    latestRebPeriod: reb.data?.[0]?.period ?? null,
  };
}
