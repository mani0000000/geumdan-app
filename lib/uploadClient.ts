/**
 * 클라이언트에서 /api/upload 호출하기 위한 헬퍼.
 */

export interface UploadResult {
  url: string;
}

export async function uploadFile(file: File, folder = "misc"): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !json.url) {
    throw new Error(json.error ?? "업로드 실패");
  }
  return { url: json.url };
}

/**
 * Supabase Storage에 올라간 파일을 삭제한다.
 * - data URL 또는 외부 URL이면 서버에서 no-op으로 처리됨
 * - 실패해도 throw하지 않음 (best effort) — 글 저장 흐름을 막지 않기 위함
 */
export async function deleteUploadedFiles(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  try {
    await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  } catch (e) {
    console.warn("[uploadClient] delete 실패", e);
  }
}
