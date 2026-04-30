"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Image as ImageIcon, ChevronDown, X } from "lucide-react";
import type { CommunityCategory } from "@/lib/types";
import { createPost } from "@/lib/db/posts";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

function saveMyPostId(id: string) {
  try {
    const stored = JSON.parse(localStorage.getItem("myPostIds") ?? "[]") as string[];
    localStorage.setItem("myPostIds", JSON.stringify([...stored, id]));
  } catch { /* ignore */ }
}

async function compressToBase64(file: File, maxSize = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function WritePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [nickname, setNickname] = useState("검단주민");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = category !== "" && title.trim().length > 0 && content.trim().length > 0;

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 5 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const compressed = await Promise.all(toProcess.map(f => compressToBase64(f)));
    setImages(prev => [...prev, ...compressed]);
  }

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const post = await createPost({
        category: category as CommunityCategory,
        title: title.trim(),
        content: content.trim(),
        author: nickname.trim() || "검단주민",
        authorDong: "검단",
        isAnonymous: anonymous,
        images,
      });
      if (post) {
        saveMyPostId(post.id);
        router.push(`/community/detail/?id=${post.id}`);
      } else {
        setError("글 등록에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setSubmitting(false);
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

        {/* Image preview strip */}
        {images.length > 0 && (
          <div className="flex gap-2 px-4 py-3 border-b border-[#f5f5f7] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {images.map((src, i) => (
              <div key={i} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden border border-[#d2d2d7]">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-[#d2d2d7] flex flex-col items-center justify-center gap-1 active:opacity-60"
              >
                <ImageIcon size={16} className="text-[#86868b]" />
                <span className="text-[10px] text-[#86868b]">{images.length}/5</span>
              </button>
            )}
          </div>
        )}

        {/* Bottom toolbar */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#f5f5f7]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60"
            >
              <ImageIcon size={18} className={images.length > 0 ? "text-[#0071e3]" : "text-[#6e6e73]"} />
            </button>
            {images.length > 0 && (
              <span className="text-[12px] text-[#0071e3] font-medium">{images.length}장</span>
            )}
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
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
        onClick={e => { (e.target as HTMLInputElement).value = ""; }}
      />
    </div>
  );
}
