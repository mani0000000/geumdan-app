"use client";
import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, Image as ImageIcon, ChevronDown,
  X, Loader2, Play,
} from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { fetchDBPost, updatePost } from "@/lib/db/posts";
import { authenticatedHeaders, requireAccessToken } from "@/lib/auth-session";

const categories: CommunityCategory[] = [
  "맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임",
];

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://plwpfnbhyzblgvliiole.supabase.co";

function storageKeyFromUrl(url: string): string | null {
  // URL 패턴: .../storage/v1/object/public/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (!m) return null;
  return m[1] + "/" + m[2]; // "bucket/path"
}

async function deleteFromStorage(url: string): Promise<void> {
  try {
    const key = storageKeyFromUrl(url);
    if (!key) return; // data URL 등 storage 파일 아님
    const [bucket, ...pathParts] = key.split("/");
    const path = pathParts.join("/");
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey) return;
    const accessToken = await requireAccessToken();
    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        method: "DELETE",
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch {
    // storage 삭제 실패는 무시 (DB 업데이트가 우선)
  }
}

function EditPageContent() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 기존 이미지/영상
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  // 삭제 예약된 URL (저장 시 storage에서 실제 삭제)
  const [toDelete, setToDelete] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // 포스트 로드
  useEffect(() => {
    if (!postId) return;
    fetchDBPost(postId).then((post) => {
      if (!post) {
        router.replace("/community/");
        return;
      }
      setCategory(post.category);
      setTitle(post.title);
      setContent(post.content);
      setNickname(post.author);
      setImages(post.images ?? []);
      setVideos(post.videos ?? []);
      setLoading(false);
    });
  }, [postId, router]);

  const canSubmit =
    category !== "" &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !uploading;

  const removeImage = (idx: number) => {
    const url = images[idx];
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setToDelete((prev) => [...prev, url]);
  };

  const removeVideo = (idx: number) => {
    const url = videos[idx];
    setVideos((prev) => prev.filter((_, i) => i !== idx));
    setToDelete((prev) => [...prev, url]);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "community");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: await authenticatedHeaders(),
          body: form,
        });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "업로드 실패");
        }
        if (file.type.startsWith("video/")) {
          setVideos((prev) => [...prev, json.url!]);
        } else {
          setImages((prev) => [...prev, json.url!]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      // 삭제 예약된 파일을 storage에서 실제 삭제
      await Promise.all(toDelete.map(deleteFromStorage));

      const updated = await updatePost(postId, {
        category: category as CommunityCategory,
        title: title.trim(),
        content: content.trim(),
        images,
        videos,
      });
      if (updated) {
        router.push(`/community/detail/?id=${postId}`);
      } else {
        setError("수정에 실패했습니다. 다시 시도해주세요.");
        setSubmitting(false);
      }
    } catch {
      setError("수정에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <Loader2 size={28} className="text-[#0071e3] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#f5f5f7] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f]">글 수정</h1>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#0058b0] transition-colors"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Category picker */}
      <button
        onClick={() => setShowCatPicker(!showCatPicker)}
        className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5f7] active:bg-[#F9FAFB] transition-colors"
      >
        <span
          className={`text-[16px] font-medium ${
            category ? "text-[#1d1d1f]" : "text-[#86868b]"
          }`}
        >
          {category || "카테고리 선택"}
        </span>
        <ChevronDown
          size={18}
          className={`text-[#86868b] transition-transform ${
            showCatPicker ? "rotate-180" : ""
          }`}
        />
      </button>
      {showCatPicker && (
        <div className="border-b border-[#f5f5f7] bg-[#F9FAFB]">
          <div className="flex flex-wrap gap-2 p-4">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setShowCatPicker(false);
                }}
                className={`h-8 px-4 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
                  category === c
                    ? "bg-[#0071e3] text-white"
                    : "bg-white text-[#424245] border border-[#d2d2d7]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Title */}
        <div className="border-b border-[#f5f5f7]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요"
            maxLength={50}
            className="w-full px-5 py-4 text-[18px] font-medium text-[#1d1d1f] placeholder:text-[#86868b] outline-none"
            style={{ outline: "none" }}
          />
          <div className="px-5 pb-2 text-right">
            <span className="text-[13px] text-[#86868b]">{title.length}/50</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 border-b border-[#f5f5f7]">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력해주세요"
            className="w-full h-full min-h-[200px] px-5 py-4 text-[16px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none resize-none leading-relaxed"
            style={{ outline: "none" }}
          />
        </div>

        {/* Media previews */}
        {(images.length > 0 || videos.length > 0 || uploading) && (
          <div className="px-4 py-3 border-t border-[#f5f5f7] flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div
                key={`img-${i}`}
                className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f5f5f7]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center active:opacity-70"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {videos.map((src, i) => (
              <div
                key={`vid-${i}`}
                className="relative w-20 h-20 rounded-xl overflow-hidden bg-black"
              >
                <video
                  src={`${src}#t=0.1`}
                  preload="metadata"
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play size={20} className="text-white fill-white/80" />
                </div>
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center active:opacity-70"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {uploading && (
              <div className="w-20 h-20 rounded-xl bg-[#f5f5f7] flex items-center justify-center">
                <Loader2 size={20} className="text-[#0071e3] animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="px-4 py-3 flex items-center gap-3 border-t border-[#f5f5f7]">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={18} className="text-[#6e6e73] animate-spin" />
            ) : (
              <ImageIcon size={18} className="text-[#6e6e73]" />
            )}
          </button>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="닉네임"
            maxLength={12}
            className="h-9 px-3 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] outline-none w-28"
            style={{ outline: "none" }}
          />
        </div>

        {error && (
          <p className="mx-4 mb-2 text-[13px] text-[#F04452] text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense>
      <EditPageContent />
    </Suspense>
  );
}
