import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/lib/admin-auth";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET /api/admin/suggestions?status=pending
export async function GET(req: NextRequest) {
  if (!validateAdminCookie(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = req.nextUrl.searchParams.get("status");
  let query = supabase
    .from("store_suggestions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH /api/admin/suggestions/:id
export async function PATCH(req: NextRequest) {
  if (!validateAdminCookie(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { id: number; status: string; admin_note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const VALID_STATUSES = ["pending", "reviewing", "approved", "rejected"];
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const { error } = await supabase
    .from("store_suggestions")
    .update({
      status: body.status,
      admin_note: body.admin_note ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
