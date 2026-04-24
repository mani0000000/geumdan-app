import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "admin-images";

export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_ADMIN_DB_KEY || "";

  if (!SERVICE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_KEY 환경변수를 설정해주세요" }, { status: 500 });
  }

  const adminStorage = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "misc";

    if (!file || !file.size) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const allowed = ["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다" }, { status: 400 });
    }

    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error } = await adminStorage.storage
      .from(BUCKET)
      .upload(path, Buffer.from(bytes), { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = adminStorage.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
