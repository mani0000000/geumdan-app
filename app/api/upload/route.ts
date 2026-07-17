import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateAdminCookie } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "admin-images";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plwpfnbhyzblgvliiole.supabase.co";
const DEFAULT_ANON  = "";
const MAX_IMAGE_BYTES  = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES  = 100 * 1024 * 1024; // 100MB — 동영상 최대 크기

const IMAGE_EXTS = ["jpg","jpeg","png","gif","webp","avif"];
const VIDEO_EXTS = ["mp4","mov","m4v","webm","ogg"];
const PUBLIC_FOLDERS = new Set(["community", "avatars"]);
const ADMIN_FOLDERS = new Set([
  "banners", "buildings", "emergency", "instagram", "marts", "misc",
  "news", "pharmacies", "places", "popups", "settings", "stores",
]);

function candidateKeys(): string[] {
  const keys = [process.env.SUPABASE_SERVICE_KEY];
  return keys.filter((k): k is string => typeof k === "string" && k.length > 10);
}

function storageHeaders(apiKey: string, bearer: string, contentType: string): Record<string, string> {
  return {
    "apikey": apiKey,
    "Authorization": `Bearer ${bearer}`,
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
  apiKey: string, bearer: string, path: string, bytes: ArrayBuffer, contentType: string,
): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    { method: "POST", headers: storageHeaders(apiKey, bearer, contentType), body: bytes },
  );
  if (res.ok) {
    return { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}` };
  }
  const body = await res.json().catch(() => ({})) as { error?: string; message?: string };
  return { ok: false, status: res.status, error: body.error ?? body.message ?? `Storage ${res.status}` };
}

export async function POST(req: NextRequest) {
  try {
    const isAdminSession = validateAdminCookie(req);
    const userToken = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    let userId: string | null = null;

    if (!isAdminSession && !userToken) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    if (userToken) {
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON;
      if (!anonKey) {
        return NextResponse.json({ error: "업로드 서비스 설정이 필요합니다" }, { status: 503 });
      }
      const authClient = createClient(SUPABASE_URL, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await authClient.auth.getUser(userToken);
      if (error || !data.user) {
        return NextResponse.json({ error: "유효하지 않은 로그인입니다" }, { status: 401 });
      }
      userId = data.user.id;
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = ((formData.get("folder") as string) || "misc").trim().toLowerCase();
    const isAdminUpload = ADMIN_FOLDERS.has(folder);

    if (!isAdminUpload && !PUBLIC_FOLDERS.has(folder)) {
      return NextResponse.json({ error: "허용되지 않은 업로드 폴더입니다" }, { status: 400 });
    }
    if (isAdminUpload && !isAdminSession) {
      return NextResponse.json({ error: "관리자 인증이 필요합니다" }, { status: 401 });
    }
    if (!isAdminUpload && !userId) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    if (!file || !file.size) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    if (![...IMAGE_EXTS, ...VIDEO_EXTS].includes(ext)) {
      return NextResponse.json({ error: "지원하지 않는 파일 형식입니다" }, { status: 400 });
    }
    const isVideo = VIDEO_EXTS.includes(ext) && (file.type || "").startsWith("video/");
    const isImage = IMAGE_EXTS.includes(ext) && (file.type || "").startsWith("image/");

    if (!isVideo && !isImage) {
      return NextResponse.json({ error: "파일 형식과 MIME 타입이 일치하지 않습니다" }, { status: 400 });
    }
    if (folder === "avatars" && isVideo) {
      return NextResponse.json({ error: "프로필에는 이미지만 업로드할 수 있습니다" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    // 동영상 크기 제한 (100MB)
    if (isVideo && bytes.byteLength > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `동영상은 최대 ${MAX_VIDEO_BYTES / 1024 / 1024}MB까지 업로드할 수 있어요.` },
        { status: 400 },
      );
    }
    if (!isVideo && bytes.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `이미지는 최대 ${MAX_IMAGE_BYTES / 1024 / 1024}MB까지 업로드할 수 있어요.` },
        { status: 400 },
      );
    }

    const contentType = file.type || "application/octet-stream";
    const pathPrefix = userId ? `${folder}/${userId}` : folder;
    const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON;
    const credentials = isAdminUpload
      ? candidateKeys().map((key) => ({ apiKey: key, bearer: key }))
      : anonKey && userToken ? [{ apiKey: anonKey, bearer: userToken }] : [];
    let bucketCreated = false;
    let lastFailure: { status: number; error: string } | null = null;

    // ── 1. Supabase Storage 업로드 시도 ──────────────────────
    for (const { apiKey, bearer } of credentials) {
      const result = await tryStorageUpload(apiKey, bearer, path, bytes, contentType);
      if (result.ok) return NextResponse.json({ url: result.url });
      lastFailure = result;

      console.warn("[upload] Storage 실패:", result.status, result.error);

      // 버킷 없음(404) → 생성 후 재시도
      if (isAdminUpload && result.status === 404 && !bucketCreated) {
        bucketCreated = await tryCreateBucket(apiKey);
        if (bucketCreated) {
          const retry = await tryStorageUpload(apiKey, bearer, path, bytes, contentType);
          if (retry.ok) return NextResponse.json({ url: retry.url });
        }
      }

      if (result.status !== 401 && result.status !== 403) break;
    }

    const restricted = lastFailure?.status === 402
      || /exceed(?:ed)?_[a-z_]*quota|service.+restricted/i.test(lastFailure?.error ?? "");
    return NextResponse.json(
      {
        error: restricted
          ? "현재 이미지 저장소 사용량 제한으로 업로드할 수 없습니다. 연결 복구 후 다시 시도해 주세요."
          : "이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        code: restricted ? "SERVICE_RESTRICTED" : "UPLOAD_FAILED",
      },
      { status: restricted ? 503 : 502 },
    );
  } catch (err) {
    console.error("[upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 },
    );
  }
}
