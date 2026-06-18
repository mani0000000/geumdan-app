import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST /api/stores/suggestions
export async function POST(req: NextRequest) {
  let body: {
    suggestion_type: string;
    store_id?: string;
    category?: string;
    sub_category?: string;
    store_name?: string;
    building_name?: string;
    floor?: string;
    phone?: string;
    hours?: string;
    description?: string;
    contact?: string;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const VALID_TYPES = ["new_store", "closed", "name_change", "hours_change", "phone_change", "category_change", "other"];
  if (!VALID_TYPES.includes(body.suggestion_type)) {
    return NextResponse.json({ error: "invalid suggestion_type" }, { status: 400 });
  }

  const type = body.store_id ? "detail" : "simple";

  const { error } = await supabase.from("store_suggestions").insert({
    type,
    suggestion_type: body.suggestion_type,
    store_id: body.store_id ?? null,
    category: body.category ?? null,
    sub_category: body.sub_category ?? null,
    store_name: body.store_name?.trim() ?? null,
    building_name: body.building_name?.trim() ?? null,
    floor: body.floor?.trim() ?? null,
    phone: body.phone?.trim() ?? null,
    hours: body.hours?.trim() ?? null,
    description: body.description?.trim().slice(0, 500) ?? null,
    contact: body.contact?.trim().slice(0, 100) ?? null,
    message: body.message?.trim().slice(0, 500) ?? null,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
