"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera } from "lucide-react";
import { currentUser } from "@/lib/mockData";

const dongs = ["당하동", "불로동", "마전동", "왕길동", "원당동", "대곡동"];

export default function EditProfilePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState(currentUser.nickname);
  const [dong, setDong] = useState(currentUser.dong);
  const [intro, setIntro] = useState("검단에서 살고 있는 주민이에요 🏡");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    router.back();
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#F2F4F6] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#191F28]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#191F28]">프로필 수정</h1>
        <button
          onClick={save}
          disabled={saving || !nickname.trim()}
          className="h-9 px-4 rounded-xl bg-[#3182F6] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#1B64DA] transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="flex-1 px-6 pt-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#EBF3FE] flex items-center justify-center text-4xl">👤</div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#3182F6] rounded-full flex items-center justify-center active:opacity-80">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <p className="text-[13px] text-[#8B95A1] mt-2">프로필 사진 변경</p>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {/* Nickname */}
          <div>
            <label className="text-[14px] font-bold text-[#4E5968] mb-2 block">닉네임</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="w-full h-[52px] px-4 rounded-xl bg-[#F2F4F6] text-[16px] text-[#191F28] outline-none focus:ring-2 focus:ring-[#3182F6] placeholder:text-[#B0B8C1]"
            />
            <p className="text-right text-[13px] text-[#B0B8C1] mt-1">{nickname.length}/12</p>
          </div>

          {/* Dong */}
          <div>
            <label className="text-[14px] font-bold text-[#4E5968] mb-2 block">우리 동네</label>
            <div className="flex flex-wrap gap-2">
              {dongs.map(d => (
                <button
                  key={d}
                  onClick={() => setDong(d)}
                  className={`h-9 px-4 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
                    dong === d ? "bg-[#3182F6] text-white" : "bg-[#F2F4F6] text-[#4E5968]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Intro */}
          <div>
            <label className="text-[14px] font-bold text-[#4E5968] mb-2 block">한줄 소개</label>
            <textarea
              value={intro}
              onChange={e => setIntro(e.target.value)}
              maxLength={60}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#F2F4F6] text-[16px] text-[#191F28] outline-none focus:ring-2 focus:ring-[#3182F6] placeholder:text-[#B0B8C1] resize-none leading-relaxed"
              placeholder="나를 소개해주세요"
            />
            <p className="text-right text-[13px] text-[#B0B8C1] mt-1">{intro.length}/60</p>
          </div>

          {/* Level info */}
          <div className="bg-[#EBF3FE] rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-bold text-[#3182F6]">현재 레벨</p>
              <span className="text-[13px] font-bold bg-[#3182F6] text-white px-2.5 py-0.5 rounded-full">{currentUser.level}</span>
            </div>
            <p className="text-[13px] text-[#3182F6]/80 leading-relaxed">
              글 작성, 댓글, 좋아요 활동으로 레벨이 올라가요.
              <br />다음 레벨인 <strong>터줏대감</strong>까지 글 15개 더 작성하세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
