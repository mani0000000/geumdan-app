"use client";
import { useEffect, useRef, useState } from "react";
import { Film, Loader2, Plus, X, AlertCircle } from "lucide-react";
import { requireAccessToken } from "@/lib/auth-session";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://plwpfnbhyzblgvliiole.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const BUCKET = "community-videos";
const MAX_FILES = 3;
const MAX_BYTES = 100 * 1024 * 1024; // 100MB
const ACCEPTED_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/x-msvideo",
  "video/x-matroska",
  "video/3gpp",
  "video/3gpp2",
];

type Status = "uploading" | "done" | "error";

interface UploadItem {
  id: string;
  file: File;
  status: Status;
  progress: number; // 0..1
  path?: string;
  url?: string;
  error?: string;
  xhr?: XMLHttpRequest;
}

interface VideoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildPath(userId: string, file: File): string {
  const ext = (file.name.split(".").pop() ?? "mp4").toLowerCase();
  const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "mp4";
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
}

function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function uploadToStorage(
  file: File,
  path: string,
  accessToken: string,
  onProgress: (p: number) => void,
): { promise: Promise<void>; xhr: XMLHttpRequest } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<void>((resolve, reject) => {
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1);
        resolve();
      } else {
        let msg = `Storage ${xhr.status}`;
        try {
          const body = JSON.parse(xhr.responseText) as {
            error?: string;
            message?: string;
          };
          msg = body.error ?? body.message ?? msg;
        } catch {
          /* ignore */
        }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드에 실패했어요"));
    xhr.onabort = () => reject(new Error("업로드가 취소되었어요"));
    xhr.send(file);
  });
  return { promise, xhr };
}

async function deleteFromStorage(path: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "DELETE",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export default function VideoUpload({
  value,
  onChange,
  disabled,
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);

  // 부모로 완료된 URL 동기화
  useEffect(() => {
    const urls = items
      .filter((it) => it.status === "done" && it.url)
      .map((it) => it.url as string);
    if (
      urls.length !== value.length ||
      urls.some((u, i) => u !== value[i])
    ) {
      onChange(urls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const remaining = MAX_FILES - items.length;

  function pickFiles() {
    if (disabled || remaining <= 0) return;
    inputRef.current?.click();
  }

  function validate(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "지원하지 않는 영상 형식이에요 (mp4, mov, webm 등)";
    }
    if (file.size > MAX_BYTES) {
      return `파일이 너무 커요 (${formatSize(file.size)}). 최대 100MB`;
    }
    return null;
  }

  async function startUpload(file: File) {
    const id = newId();
    const errMsg = validate(file);
    if (errMsg) {
      setItems((prev) => [
        ...prev,
        { id, file, status: "error", progress: 0, error: errMsg },
      ]);
      return;
    }

    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      setItems((prev) => [
        ...prev,
        { id, file, status: "error", progress: 0, error: "로그인이 필요합니다." },
      ]);
      return;
    }
    let accessToken: string;
    try {
      accessToken = await requireAccessToken();
    } catch (authError) {
      setItems((prev) => [
        ...prev,
        {
          id,
          file,
          status: "error",
          progress: 0,
          error: authError instanceof Error ? authError.message : "로그인이 필요합니다.",
        },
      ]);
      return;
    }
    const path = buildPath(data.user.id, file);

    const { promise, xhr } = uploadToStorage(file, path, accessToken, (p) => {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, progress: p } : it)),
      );
    });

    setItems((prev) => [
      ...prev,
      { id, file, status: "uploading", progress: 0, path, xhr },
    ]);

    promise
      .then(() => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? {
                  ...it,
                  status: "done",
                  progress: 1,
                  url: publicUrl(path),
                  xhr: undefined,
                }
              : it,
          ),
        );
      })
      .catch((e: Error) => {
        setItems((prev) =>
          prev.map((it) =>
            it.id === id
              ? { ...it, status: "error", error: e.message, xhr: undefined }
              : it,
          ),
        );
      });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const slots = MAX_FILES - items.length;
    files.slice(0, slots).forEach((file) => void startUpload(file));
  }

  function removeItem(id: string) {
    const target = items.find((it) => it.id === id);
    if (!target) return;
    if (target.status === "uploading" && target.xhr) {
      target.xhr.abort();
    }
    if (target.status === "done" && target.path) {
      // 글 등록 전 취소이므로 Storage 객체도 정리
      void deleteFromStorage(target.path);
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded-xl border border-[#e5e5ea] bg-white px-3 py-2.5"
            >
              <div className="w-10 h-10 rounded-lg bg-[#f5f5f7] flex items-center justify-center shrink-0">
                {it.status === "uploading" ? (
                  <Loader2 size={18} className="text-[#3182F6] animate-spin" />
                ) : it.status === "error" ? (
                  <AlertCircle size={18} className="text-[#F04452]" />
                ) : (
                  <Film size={18} className="text-[#3182F6]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                  {it.file.name}
                </p>
                {it.status === "uploading" && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-[#f0f0f3] overflow-hidden">
                      <div
                        className="h-full bg-[#3182F6] transition-[width] duration-150"
                        style={{ width: `${Math.round(it.progress * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-[#86868b] tabular-nums shrink-0">
                      {Math.round(it.progress * 100)}%
                    </span>
                  </div>
                )}
                {it.status === "done" && (
                  <p className="text-[11px] text-[#34a853] mt-0.5">
                    업로드 완료 · {formatSize(it.file.size)}
                  </p>
                )}
                {it.status === "error" && (
                  <p className="text-[11px] text-[#F04452] mt-0.5">
                    {it.error ?? "업로드 실패"}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center active:opacity-60 shrink-0"
                aria-label="삭제"
              >
                <X size={14} className="text-[#6e6e73]" />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={pickFiles}
        disabled={disabled || remaining <= 0}
        className="flex items-center gap-2 h-9 px-3 rounded-xl bg-[#f5f5f7] text-[13px] font-medium text-[#424245] active:opacity-70 disabled:opacity-40"
      >
        <Plus size={14} />
        영상 추가{" "}
        <span className="text-[12px] text-[#86868b]">
          ({items.length}/{MAX_FILES})
        </span>
      </button>
      <p className="text-[11px] text-[#86868b]">
        mp4 · mov · webm 최대 100MB
      </p>
    </div>
  );
}
