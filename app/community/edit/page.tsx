"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, Image as ImageIcon, ChevronDown, X, Loader2, Play,
} from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { fetchDBPost, updatePost, isMockPostId } from "@/lib/db/posts";
import { deleteUploadedFiles, uploadFile } from "@/lib/uploadClient";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

function getMyPostIds(): string[] {
  try { return JSON.parse(localStorage.getItem("myPostIds") ?? "[]"); } catch { return []; }
}

function EditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("id") ?? "";

  const [loading, setLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  // 처음 로드 시점의 미디어 URL — 저장 시 비교해서 빠진 것은 Storage에서도 삭제
  const initialMediaRef = useRef<{ images: string[]; videos: string[] }>({ images: [], videos: [] });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!postId || isMockPostId(postId)) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      const owned = getMyPostIds().includes(postId);
      if (!owned) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      const post = await fetchDBPost(postId);
      if (!post) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }
      setCategory(post.category);
      setTitle(post.title);
      setContent(post.content);
      setImages(post.images ?? []);
      setVideos(post.videos ?? []);
      initialMediaRef.current = {
        images: [...(post.images ?? [])],
        videos: [...(post.videos ?? [])],
      };
      setLoading(false);
    }
    load();
  }, [postId]);

  const canSubmit =
    category !== "" && title.trim().length > 0 && content.trim().length > 0 && !uploading;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadFile(file, "community");
        if (file.type.startsWith("video/")) {
          setVideos(prev => [...prev, url]);
        } else {
          setImages(prev => [...prev, url]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 새로 업로드한 미디어(초기 상태에 없던 URL)는 X 누를 때 즉시 Storage에서 삭제.
  // 기존 미디어는 저장 직전에 일괄 삭제 (저장 실패시 복구 가능하도록).
  const removeImage = (idx: number) => {
    const url = images[idx];
    setImages(prev => prev.filter((_, i) => i !== idx));
    if (url && !initialMediaRef.current.images.includes(url)) {
      void deleteUploadedFiles([url]);
    }
  };
  const removeVideo = (idx: number) => {
    const url = videos[idx];
    setVideos(prev => prev.filter((_, i) => i !== idx));
    if (url && !initialMediaRef.current.videos.includes(url)) {
      void deleteUploadedFiles([url]);
    }
  };

  const submit = async () => {
    if (!canSubmit || !postId) return;
    setSubmitting(true);
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
        setSubmitting(false);
        return;
      }
      // 저장 성공 후, 기존 미디어 중 빠진 것은 Storage에서도 정리
      const removed: string[] = [];
      for (const u of initialMediaRef.current.images) if (!images.includes(u)) removed.push(u);
      for (const u of initialMediaRef.current.videos) if (!videos.includes(u)) removed.push(u);
      if (removed.length > 0) void deleteUploadedFiles(removed);
      router.push(`/community/detail/?id=${postId}`);
    } catch {
      setError("글 수정에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <Loader2 size={22} className="text-[#0071e3] animate-spin" />
      </div>
    );
  }

  if (notAllowed) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-[16px] text-[#1d1d1f] font-semibold">수정할 수 없는 글이에요</p>
        <p className="text-[13px] text-[#6e6e73]">본인이 작성한 글만 수정할 수 있어요.</p>
        <button onClick={() => router.replace("/community/")}
          className="mt-2 h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[14px] font-bold active:opacity-80">
          커뮤니티로
        </button>
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
            placeholder={`내용을 자유롭게 작성해주세요.\n\n• 검단 주민만 알 수 있는 정보\n• 이웃에게 도움이 되는 이야기\n• 따뜻한 소통 환경 만들기`}
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
          <p className="text-[12px] text-[#86868b]">사진·영상은 X 버튼으로 삭제할 수 있어요</p>
        </div>

        {error && (
          <p className="mx-4 mb-2 text-[13px] text-[#F04452] text-center">{error}</p>
        )}
      </div>
    </div>
  );
}

export default function EditPage() {
  return <Suspense><EditContent /></Suspense>;
}
