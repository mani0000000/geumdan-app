"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, Image as ImageIcon, Loader2, Play, X } from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { deletePostMedia, fetchDBPost, updatePost } from "@/lib/db/posts";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

function getMyPostIds(): string[] {
  try { return JSON.parse(localStorage.getItem("myPostIds") ?? "[]"); } catch { return []; }
}

export default function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [notMine, setNotMine] = useState(false);
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  // 저장 시 Storage에서 함께 삭제할 미디어 URL 목록
  const [pendingDeleteUrls, setPendingDeleteUrls] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (postId === "preview") {
      setLoading(false);
      return;
    }
    async function load() {
      const post = await fetchDBPost(postId);
      if (!post) {
        router.replace("/community/");
        return;
      }
      if (!getMyPostIds().includes(postId)) {
        setNotMine(true);
        setLoading(false);
        return;
      }
      setCategory(post.category);
      setTitle(post.title);
      setContent(post.content);
      setImages(post.images ?? []);
      setVideos(post.videos ?? []);
      setLoading(false);
    }
    load();
  }, [postId, router]);

  const canSubmit =
    category !== "" &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    !uploading &&
    !saving;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "community");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) throw new Error(json.error ?? "업로드 실패");
        if (file.type.startsWith("video/")) {
          setVideos(prev => [...prev, json.url!]);
        } else {
          setImages(prev => [...prev, json.url!]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage(idx: number) {
    setImages(prev => {
      const removed = prev[idx];
      if (removed) setPendingDeleteUrls(d => [...d, removed]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function removeVideo(idx: number) {
    setVideos(prev => {
      const removed = prev[idx];
      if (removed) setPendingDeleteUrls(d => [...d, removed]);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updatePost(postId, {
        category: category as CommunityCategory,
        title: title.trim(),
        content: content.trim(),
        images,
        videos,
      });
      if (!updated) {
        setError("글 수정에 실패했습니다. 다시 시도해주세요.");
        setSaving(false);
        return;
      }
      if (pendingDeleteUrls.length > 0) {
        void deletePostMedia(pendingDeleteUrls);
      }
      router.replace(`/community/detail/?id=${postId}`);
    } catch {
      setError("글 수정에 실패했습니다. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex flex-col">
        <div className="flex items-center px-4 h-14 border-b border-[#f5f5f7]">
          <button onClick={() => router.back()} className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="text-[#0071e3] animate-spin" />
        </div>
      </div>
    );
  }

  if (notMine) {
    return (
      <div className="min-h-dvh bg-white flex flex-col">
        <div className="flex items-center px-4 h-14 border-b border-[#f5f5f7]">
          <button onClick={() => router.back()} className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="ml-2 text-[18px] font-bold text-[#1d1d1f]">글 수정</h1>
        </div>
        <div className="flex-1 flex items-center justify-center text-[15px] text-[#6e6e73] px-6 text-center">
          본인이 작성한 글만 수정할 수 있어요.
        </div>
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
          disabled={!canSubmit}
          className="h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#0058b0] transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* Category picker */}
      <button
        onClick={() => setShowCatPicker(!showCatPicker)}
        className="flex items-center justify-between px-5 py-4 border-b border-[#f5f5f7] active:bg-[#F9FAFB] transition-colors"
      >
        <span className={`text-[16px] font-medium ${category ? "text-[#1d1d1f]" : "text-[#86868b]"}`}>
          {category || "카테고리 선택"}
        </span>
        <ChevronDown size={18} className={`text-[#86868b] transition-transform ${showCatPicker ? "rotate-180" : ""}`} />
      </button>
      {showCatPicker && (
        <div className="border-b border-[#f5f5f7] bg-[#F9FAFB]">
          <div className="flex flex-wrap gap-2 p-4">
            {categories.map(c => (
              <button key={c} onClick={() => { setCategory(c); setShowCatPicker(false); }}
                className={`h-8 px-4 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
                  category === c ? "bg-[#0071e3] text-white" : "bg-white text-[#424245] border border-[#d2d2d7]"
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {/* Title */}
        <div className="border-b border-[#f5f5f7]">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요" maxLength={50}
            className="w-full px-5 py-4 text-[18px] font-medium text-[#1d1d1f] placeholder:text-[#86868b] outline-none" />
          <div className="px-5 pb-2 text-right">
            <span className="text-[13px] text-[#86868b]">{title.length}/50</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 border-b border-[#f5f5f7]">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="내용을 자유롭게 작성해주세요."
            className="w-full h-full min-h-[200px] px-5 py-4 text-[16px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none resize-none leading-relaxed" />
        </div>

        {/* Media previews */}
        {(images.length > 0 || videos.length > 0 || uploading) && (
          <div className="px-4 py-3 border-t border-[#f5f5f7] flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={`img-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f5f5f7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center active:opacity-70">
                  <X size={11} />
                </button>
              </div>
            ))}
            {videos.map((src, i) => (
              <div key={`vid-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-black">
                <video src={`${src}#t=0.1`} preload="metadata" muted playsInline
                  className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <Play size={20} className="text-white fill-white/80" />
                </div>
                <button
                  type="button"
                  onClick={() => removeVideo(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/55 text-white rounded-full flex items-center justify-center active:opacity-70">
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
            onChange={e => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-50">
            {uploading
              ? <Loader2 size={18} className="text-[#6e6e73] animate-spin" />
              : <ImageIcon size={18} className="text-[#6e6e73]" />}
          </button>
          <span className="text-[13px] text-[#86868b]">사진·영상 {images.length + videos.length}개</span>
        </div>

        {error && (
          <p className="mx-4 mb-2 text-[13px] text-[#F04452] text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
