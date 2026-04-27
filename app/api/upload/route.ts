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

// Storage는 PostgREST와 달리 모든 키 형식에 항상 Bearer 필요
function storageHeaders(key: string, contentType: string): Record<string, string> {
  return {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": contentType,
    "x-upsert": "false",
  };
}

async function tryCreateBucket(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: "POST",
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
    });
    return res.ok || res.status === 409; // 409 = already exists
  } catch {
    return false;
  }
}

async function tryUpload(
  key: string, path: string, bytes: ArrayBuffer, contentType: string,
): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    { method: "POST", headers: storageHeaders(key, contentType), body: bytes },
  );

  if (res.ok) {
    return { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` };
  }

  const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
  const error = body.error ?? body.message ?? `Storage ${res.status}`;
  return { ok: false, status: res.status, error };
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
    if (!["jpg","jpeg","png","gif","webp","avif","svg"].includes(ext)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다" }, { status: 400 });
    }

    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";
    const keys = candidateKeys();

    let lastError = "업로드 실패";
    let bucketCreated = false;

    for (const key of keys) {
      const result = await tryUpload(key, path, bytes, contentType);

      if (result.ok) return NextResponse.json({ url: result.url });

      lastError = result.error;
      console.warn("[upload] 키 실패:", key.slice(0, 20), result.status, lastError);

      // 버킷 없음(404) → 생성 후 재시도
      if (result.status === 404 && !bucketCreated) {
        bucketCreated = await tryCreateBucket(key);
        if (bucketCreated) {
          const retry = await tryUpload(key, path, bytes, contentType);
          if (retry.ok) return NextResponse.json({ url: retry.url });
          lastError = retry.ok ? "" : retry.error;
        }
      }

      // 인증 오류가 아니면 다른 키로 재시도할 필요 없음
      if (result.status !== 401 && result.status !== 403) break;
    }

    // 모든 키 실패 시 안내 메시지 반환
    const isAuthError = lastError.toLowerCase().includes("unauthorized") ||
                        lastError.toLowerCase().includes("invalid") ||
                        lastError === "Error";
    const msg = isAuthError
      ? "이미지 업로드 권한이 없습니다. Vercel 환경변수에 SUPABASE_SERVICE_KEY를 설정해 주세요."
      : lastError;

    return NextResponse.json({ error: msg }, { status: 500 });
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
