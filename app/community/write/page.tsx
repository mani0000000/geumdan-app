"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Image as ImageIcon, ChevronDown, Video, X, Loader2,
} from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { createPost } from "@/lib/db/posts";
import VideoUpload from "@/components/ui/VideoUpload";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

// 동영상 제한: 1분, 100MB
const VIDEO_MAX_DURATION_SEC = 60;
const VIDEO_MAX_BYTES = 100 * 1024 * 1024;
const IMAGE_MAX_COUNT = 4;

// 내가 작성한 글 ID를 localStorage에 저장 (수정/삭제 권한 판단)
function saveMyPostId(id: string) {
  try {
    const stored = JSON.parse(localStorage.getItem("myPostIds") ?? "[]") as string[];
    localStorage.setItem("myPostIds", JSON.stringify([...stored, id]));
  } catch { /* ignore */ }
}

// 동영상 메타데이터 로드 — 길이가 60초 이내인지 검증
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("동영상을 읽을 수 없어요"));
    };
    v.src = url;
  });
}

async function uploadFile(file: File, folder: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const j = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(j.error ?? "업로드에 실패했어요");
  }
  const j = await res.json() as { url: string };
  return j.url;
}

export default function WritePage() {
  const router = useRouter();
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [nickname, setNickname] = useState("검단주민");
  const [videos, setVideos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getUserProfile().then(p => {
      setNickname(p.nickname);
      setAuthorDong(p.dong);
      setAvatarUrl(p.avatar_url);
    });
  }, []);

  const canSubmit = category !== "" && title.trim().length > 0 && content.trim().length > 0 && !uploading;

  const handlePickImage = () => {
    if (uploading || images.length >= IMAGE_MAX_COUNT) return;
    imgInputRef.current?.click();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError("");

    const slots = IMAGE_MAX_COUNT - images.length;
    const queue = Array.from(files).slice(0, slots);
    if (files.length > slots) {
      setError(`이미지는 최대 ${IMAGE_MAX_COUNT}장까지 첨부할 수 있어요`);
    }

    setUploading("image");
    setUploadProgress(0);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < queue.length; i++) {
        const url = await uploadFile(queue[i], "community");
        uploaded.push(url);
        setUploadProgress(Math.round(((i + 1) / queue.length) * 100));
      }
      setImages(prev => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 업로드 실패");
    } finally {
      setUploading(null);
      setUploadProgress(0);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  };

  const handlePickVideo = () => {
    if (uploading || videoUrl) return;
    videoInputRef.current?.click();
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (file.size > VIDEO_MAX_BYTES) {
      setError(`동영상은 최대 ${VIDEO_MAX_BYTES / 1024 / 1024}MB까지 가능해요`);
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    // 클라이언트 길이 검증
    try {
      const duration = await readVideoDuration(file);
      if (duration > VIDEO_MAX_DURATION_SEC) {
        setError(`동영상은 ${VIDEO_MAX_DURATION_SEC}초 이내여야 해요 (현재 ${Math.round(duration)}초)`);
        if (videoInputRef.current) videoInputRef.current.value = "";
        return;
      }
    } catch {
      setError("동영상 파일을 확인할 수 없어요");
      if (videoInputRef.current) videoInputRef.current.value = "";
      return;
    }

    setUploading("video");
    setUploadProgress(0);
    try {
      const url = await uploadFile(file, "community/videos");
      setVideoUrl(url);
      setUploadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "동영상 업로드 실패");
    } finally {
      setUploading(null);
      setUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removeVideo = () => setVideoUrl(null);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const uid = await getOrCreateUserId();
      const result = await createPost({
        category: category as CommunityCategory,
        title: title.trim(),
        content: content.trim(),
        author: nickname.trim() || "검단주민",
        authorDong: "검단",
        isAnonymous: anonymous,
        videos,
      });
      if (result?.post) {
        saveMyPostId(result.post.id);
        router.push(`/community/detail/?id=${result.post.id}`);
      } else {
        router.push("/community/");
      }
    } catch {
      setError("글 등록에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#f5f5f7] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f]">글쓰기</h1>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#0058b0] transition-colors"
        >
          {submitting ? "등록 중..." : "등록"}
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
        <div className="border-b border-[#f5f5f7]">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={`내용을 자유롭게 작성해주세요.\n\n• 검단 주민만 알 수 있는 정보\n• 이웃에게 도움이 되는 이야기\n• 따뜻한 소통 환경 만들기`}
            className="w-full min-h-[200px] px-5 py-4 text-[16px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none resize-none leading-relaxed" />
        </div>

        {/* Video upload */}
        <div className="border-b border-[#f5f5f7] px-5 py-4 space-y-2">
          <p className="text-[13px] font-semibold text-[#424245]">영상 첨부</p>
          <VideoUpload value={videos} onChange={setVideos} disabled={submitting} />
        </div>

        <div className="flex-1" />

        {/* Bottom toolbar */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#f5f5f7]">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePickImage}
              disabled={!!uploading || images.length >= IMAGE_MAX_COUNT}
              aria-label="이미지 첨부"
              className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-40"
            >
              <ImageIcon size={18} className="text-[#6e6e73]" />
            </button>
            <button
              onClick={handlePickVideo}
              disabled={!!uploading || !!videoUrl}
              aria-label="동영상 첨부"
              className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60 disabled:opacity-40"
            >
              <Video size={18} className="text-[#6e6e73]" />
            </button>
            <input
              ref={imgInputRef} type="file" accept="image/*" multiple hidden
              onChange={handleImageChange}
            />
            <input
              ref={videoInputRef} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" hidden
              onChange={handleVideoChange}
            />
            {!anonymous && (
              <input value={nickname} onChange={e => setNickname(e.target.value)}
                placeholder="닉네임" maxLength={12}
                className="h-9 px-3 bg-[#f5f5f7] rounded-xl text-[14px] text-[#1d1d1f] outline-none w-28" />
            )}
          </div>
          <button onClick={() => setAnonymous(!anonymous)}
            className={`flex items-center gap-2 h-8 px-3 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
              anonymous ? "bg-[#1d1d1f] text-white" : "bg-[#f5f5f7] text-[#424245]"
            }`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${anonymous ? "border-white" : "border-[#86868b]"}`}>
              {anonymous && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            익명
          </button>
        </div>

        {error && (
          <p className="mx-4 mb-2 text-[13px] text-[#F04452] text-center">{error}</p>
        )}

        {/* Tips */}
        <div className="mx-4 mb-4 bg-[#e8f1fd] rounded-xl px-4 py-3">
          <p className="text-[13px] font-bold text-[#0071e3] mb-1">💡 이런 글은 삭제될 수 있어요</p>
          <p className="text-[13px] text-[#0071e3]/80 leading-relaxed">
            광고·홍보 목적 게시글, 타인 비방·혐오 표현, 개인정보 노출, 불법 정보 공유
          </p>
          <p className="text-[12px] text-[#0071e3]/70 mt-2 leading-relaxed">
            동영상은 최대 1분 · {VIDEO_MAX_BYTES / 1024 / 1024}MB까지 첨부할 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
