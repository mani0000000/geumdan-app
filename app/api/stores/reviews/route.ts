import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function createSupabase(accessToken?: string) {
  if (!supabaseUrl || !anonKey) return null;
  return createClient(supabaseUrl, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// GET /api/stores/reviews?storeId=xxx
export async function GET(req: NextRequest) {
  const storeId = req.nextUrl.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });
  const supabase = createSupabase();
  if (!supabase) return NextResponse.json({ error: "service unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("store_reviews")
    .select("id,store_id,nickname,rating,content,media_urls,created_at")
    .eq("store_id", storeId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/stores/reviews
export async function POST(req: NextRequest) {
  let body: {
    store_id: string;
    nickname: string;
    rating: number;
    content?: string;
    media_urls?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { store_id, nickname, rating } = body;
  if (!store_id || !nickname || !rating) {
    return NextResponse.json({ error: "store_id, nickname, rating required" }, { status: 400 });
  }
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return NextResponse.json({ error: "rating must be integer 1-5" }, { status: 400 });
  }

  const accessToken = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }
  const supabase = createSupabase(accessToken);
  if (!supabase) return NextResponse.json({ error: "service unavailable" }, { status: 503 });
  const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "유효하지 않은 로그인입니다" }, { status: 401 });
  }

  const { error } = await supabase.from("store_reviews").insert({
    store_id,
    nickname: nickname.trim().slice(0, 30),
    author_nickname: nickname.trim().slice(0, 30),
    rating,
    content: body.content?.trim().slice(0, 500) ?? null,
    media_urls: body.media_urls ?? null,
    images: body.media_urls ?? [],
    user_id: authData.user.id,
    is_visible: true,
    is_hidden: false,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
