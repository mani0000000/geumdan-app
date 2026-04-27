import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "admin-images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_ANON  = "sb_publishable_yusGAVx2uI09v0mL145WUQ_hE_C-Ulk";
const MAX_BASE64_BYTES = 8 * 1024 * 1024; // 8MB — data URL 폴백 허용 상한

function candidateKeys(): string[] {
  return [
    process.env.SUPABASE_SERVICE_KEY,
    process.env.NEXT_PUBLIC_ADMIN_DB_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    DEFAULT_ANON,
  ].filter((k): k is string => typeof k === "string" && k.length > 10);
}

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
    return res.ok || res.status === 409;
  } catch { return false; }
}

async function tryStorageUpload(
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
  return { ok: false, status: res.status, error: body.error ?? body.message ?? `Storage ${res.status}` };
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

    const bytes = await file.arrayBuffer();
    const contentType = file.type || "application/octet-stream";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const keys = candidateKeys();
    let bucketCreated = false;

    // ── 1. Supabase Storage 업로드 시도 ──────────────────────
    for (const key of keys) {
      const result = await tryStorageUpload(key, path, bytes, contentType);
      if (result.ok) return NextResponse.json({ url: result.url });

      console.warn("[upload] Storage 실패:", key.slice(0, 20), result.status, result.error);

      // 버킷 없음(404) → 생성 후 재시도
      if (result.status === 404 && !bucketCreated) {
        bucketCreated = await tryCreateBucket(key);
        if (bucketCreated) {
          const retry = await tryStorageUpload(key, path, bytes, contentType);
          if (retry.ok) return NextResponse.json({ url: retry.url });
        }
      }

      if (result.status !== 401 && result.status !== 403) break;
    }

    // ── 2. Storage 실패 → base64 data URL 폴백 ───────────────
    // <img src="data:..."> 는 일반 URL과 동일하게 작동
    if (bytes.byteLength <= MAX_BASE64_BYTES) {
      const base64 = Buffer.from(bytes).toString("base64");
      const dataUrl = `data:${contentType};base64,${base64}`;
      console.log("[upload] base64 폴백 사용:", file.name, bytes.byteLength, "bytes");
      return NextResponse.json({ url: dataUrl });
    }

    // 파일이 너무 커서 폴백도 불가
    return NextResponse.json(
      { error: `파일이 너무 큽니다 (${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB). Storage 설정을 확인해 주세요.` },
      { status: 500 },
    );
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
