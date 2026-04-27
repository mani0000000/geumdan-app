import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "admin-images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_ANON  = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";

function candidateKeys(): string[] {
  return [
    process.env.SUPABASE_SERVICE_KEY,
    process.env.NEXT_PUBLIC_ADMIN_DB_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEFAULT_ANON,
  ].filter((k): k is string => typeof k === "string" && k.length > 10);
}

function storageHeaders(key: string, contentType: string): Record<string, string> {
  const h: Record<string, string> = {
    "apikey": key,
    "Content-Type": contentType,
    "x-upsert": "false",
  };
  // JWT 형식 키만 Authorization: Bearer 추가 (admin/db, fix-rls 라우트와 동일 패턴)
  if (key.startsWith("eyJ")) {
    h["Authorization"] = `Bearer ${key}`;
  }
  return h;
}

async function ensureBucket(key: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    method: "GET",
    headers: { "apikey": key, ...(key.startsWith("eyJ") ? { "Authorization": `Bearer ${key}` } : {}) },
  });
  if (res.status === 200) return;

  // 버킷이 없으면 생성 시도 (서비스 키가 있을 때만 성공)
  await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      "apikey": key,
      "Content-Type": "application/json",
      ...(key.startsWith("eyJ") ? { "Authorization": `Bearer ${key}` } : {}),
    },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  });
}

export async function POST(req: NextRequest) {
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
    const contentType = file.type || "application/octet-stream";

    const keys = candidateKeys();
    let lastError = "업로드 실패";

    for (const key of keys) {
      try {
        await ensureBucket(key);
      } catch {
        // 버킷 확인 실패는 무시하고 업로드 시도
      }

      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
        { method: "POST", headers: storageHeaders(key, contentType), body: bytes },
      );

      if (res.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
        return NextResponse.json({ url: publicUrl });
      }

      const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
      lastError = body.error ?? body.message ?? `Storage error ${res.status}`;
      console.warn("[upload] 키 실패:", key.slice(0, 20), res.status, lastError);

      if (res.status !== 401 && res.status !== 403) break; // 인증 외 오류는 재시도 불필요
    }

    return NextResponse.json({ error: lastError }, { status: 500 });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
