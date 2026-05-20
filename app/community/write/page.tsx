"use client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Image as ImageIcon, ChevronDown, X, Loader2 } from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { createPost } from "@/lib/db/posts";
import { getUserProfile, getOrCreateUserId } from "@/lib/db/userdata";
import VideoUpload from "@/components/ui/VideoUpload";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

// 내가 작성한 글 ID를 localStorage에 저장 (수정/삭제 권한 판단)
function saveMyPostId(id: string) {
  try {
    const stored = JSON.parse(localStorage.getItem("myPostIds") ?? "[]") as string[];
    localStorage.setItem("myPostIds", JSON.stringify([...stored, id]));
  } catch { /* ignore */ }
}

export default function WritePage() {
  const router = useRouter();
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [nickname, setNickname] = useState("검단주민");
  const [authorDong, setAuthorDong] = useState("검단");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getUserProfile().then(p => {
      setNickname(p.nickname);
      setAuthorDong(p.dong);
      setAvatarUrl(p.avatar_url ?? null);
    });
  }, []);

  const canSubmit =
    category !== "" && title.trim().length > 0 && content.trim().length > 0 && !uploading;

  // 이미지는 /api/upload 로 보낸다 (압축된 base64 폴백 가능).
  // 영상은 Vercel 4.5MB 본문 한도를 우회하기 위해 VideoUpload 컴포넌트가
  // Supabase Storage 로 직접 올린다 — 여기서는 처리하지 않는다.
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const form = new FormData();
        form.append("file", file);
        form.append("folder", "community");
        const res = await fetch("/api/upload", { method: "POST", body: form });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "업로드 실패");
        }
        setImages(prev => [...prev, json.url!]);
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
      const uid = await getOrCreateUserId();
      const result = await createPost({
        category: category as CommunityCategory,
        title: title.trim(),
        content: content.trim(),
        author: nickname.trim() || "검단주민",
        authorDong,
        authorAvatarUrl: avatarUrl,
        userId: uid,
        isAnonymous: anonymous,
        images,
        videos,
      });
      if (result?.post) {
        saveMyPostId(result.post.id);
        if (result.imagesDropped && (images.length > 0 || videos.length > 0)) {
          alert("사진·영상 저장 기능이 아직 준비 중이라 글만 등록되었어요.");
        }
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
        <div className="flex-1 border-b border-[#f5f5f7]">
          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder={`내용을 자유롭게 작성해주세요.\n\n• 검단 주민만 알 수 있는 정보\n• 이웃에게 도움이 되는 이야기\n• 따뜻한 소통 환경 만들기`}
            className="w-full h-full min-h-[200px] px-5 py-4 text-[16px] text-[#1d1d1f] placeholder:text-[#86868b] outline-none resize-none leading-relaxed" />
        </div>

        {/* Image previews */}
        {(images.length > 0 || uploading) && (
          <div className="px-4 py-3 border-t border-[#f5f5f7] flex flex-wrap gap-2">
            {images.map((src, i) => (
              <div key={`img-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden bg-[#f5f5f7]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
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

        {/* Video upload — Supabase Storage 직접 업로드(Vercel 4.5MB 한도 우회) */}
        <div className="border-t border-[#f5f5f7] px-5 py-4 space-y-2">
          <p className="text-[13px] font-semibold text-[#424245]">영상 첨부</p>
          <VideoUpload value={videos} onChange={setVideos} disabled={submitting} />
        </div>

        {/* Bottom toolbar */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#f5f5f7]">
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
            광고·홍보 목적 게시글, 타인 비방·협오 표현, 개인정보 노출, 불법 정보 공유
          </p>
        </div>
      </div>
    </div>
  );
}
