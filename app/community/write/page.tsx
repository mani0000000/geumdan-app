"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Image as ImageIcon, X, ChevronDown } from "lucide-react";
import type { CommunityCategory } from "@/lib/types";

const categories: CommunityCategory[] = ["맘카페","맛집","부동산","중고거래","분실/목격","동네질문","소모임"];

export default function WritePage() {
  const router = useRouter();
  const [category, setCategory] = useState<CommunityCategory | "">("");
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = category !== "" && title.trim().length > 0 && content.trim().length > 0;

  const submit = async () => {
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    router.push("/community/");
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#F2F4F6] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#191F28]">글쓰기</h1>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="h-9 px-4 rounded-xl bg-[#3182F6] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#1B64DA] transition-colors"
        >
          {submitting ? "등록 중..." : "등록"}
        </button>
      </div>

      {/* Category picker */}
      <button
        onClick={() => setShowCatPicker(!showCatPicker)}
        className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F6] active:bg-[#F9FAFB] transition-colors"
      >
        <span className={`text-[16px] font-medium ${category ? "text-[#191F28]" : "text-[#B0B8C1]"}`}>
          {category || "카테고리 선택"}
        </span>
        <ChevronDown size={18} className={`text-[#B0B8C1] transition-transform ${showCatPicker ? "rotate-180" : ""}`} />
      </button>

      {showCatPicker && (
        <div className="border-b border-[#F2F4F6] bg-[#F9FAFB]">
          <div className="flex flex-wrap gap-2 p-4">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => { setCategory(c); setShowCatPicker(false); }}
                className={`h-8 px-4 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
                  category === c ? "bg-[#3182F6] text-white" : "bg-white text-[#4E5968] border border-[#E5E8EB]"
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
        <div className="border-b border-[#F2F4F6]">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="제목을 입력해주세요"
            maxLength={50}
            className="w-full px-5 py-4 text-[18px] font-medium text-[#191F28] placeholder:text-[#B0B8C1] outline-none"
          />
          <div className="px-5 pb-2 text-right">
            <span className="text-[13px] text-[#B0B8C1]">{title.length}/50</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 border-b border-[#F2F4F6]">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={`내용을 자유롭게 작성해주세요.\n\n• 검단 주민만 알 수 있는 정보\n• 이웃에게 도움이 되는 이야기\n• 따뜻한 소통 환경 만들기`}
            className="w-full h-full min-h-[200px] px-5 py-4 text-[16px] text-[#191F28] placeholder:text-[#B0B8C1] outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Bottom toolbar */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-[#F2F4F6]">
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-xl bg-[#F2F4F6] flex items-center justify-center active:opacity-60">
              <ImageIcon size={18} className="text-[#8B95A1]" />
            </button>
            <span className="text-[13px] text-[#B0B8C1]">사진 첨부</span>
          </div>
          <button
            onClick={() => setAnonymous(!anonymous)}
            className={`flex items-center gap-2 h-8 px-3 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
              anonymous ? "bg-[#191F28] text-white" : "bg-[#F2F4F6] text-[#4E5968]"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${anonymous ? "border-white" : "border-[#B0B8C1]"}`}>
              {anonymous && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>
            익명
          </button>
        </div>

        {/* Tips */}
        <div className="mx-4 mb-4 bg-[#EBF3FE] rounded-xl px-4 py-3">
          <p className="text-[13px] font-bold text-[#3182F6] mb-1">💡 이런 글은 삭제될 수 있어요</p>
          <p className="text-[13px] text-[#3182F6]/80 leading-relaxed">
            광고·홍보 목적 게시글, 타인 비방·혐오 표현,
            개인정보 노출, 불법 정보 공유
          </p>
        </div>
      </div>
    </div>
  );
}
