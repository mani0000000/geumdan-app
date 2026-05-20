"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera } from "lucide-react";
import { getUserProfile, updateUserProfile } from "@/lib/db/userdata";

import { DONG_SELECT_OPTIONS } from "@/lib/geumdan";
const dongs = DONG_SELECT_OPTIONS;

export default function EditProfilePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("검단주민");
  const [dong, setDong] = useState("당하동");
  const [intro, setIntro] = useState("검단에서 살고 있는 주민이에요 🏡");
  const [level, setLevel] = useState("새싹");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile().then(p => {
      setNickname(p.nickname);
      setDong(p.dong);
      setIntro(p.intro || intro);
      setLevel(p.level);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await updateUserProfile({ nickname: nickname.trim(), dong, intro });
    router.back();
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-[#f5f5f7] sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="active:opacity-60">
          <ChevronLeft size={24} className="text-[#1d1d1f]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#1d1d1f]">프로필 수정</h1>
        <button
          onClick={save}
          disabled={saving || !nickname.trim()}
          className="h-9 px-4 rounded-xl bg-[#0071e3] text-white text-[15px] font-bold disabled:opacity-40 active:bg-[#0058b0] transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      <div className="flex-1 px-6 pt-8">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-[#e8f1fd] flex items-center justify-center text-4xl">👤</div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#0071e3] rounded-full flex items-center justify-center active:opacity-80">
              <Camera size={14} className="text-white" />
            </button>
          </div>
          <p className="text-[13px] text-[#6e6e73] mt-2">프로필 사진 변경</p>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {/* Nickname */}
          <div>
            <label className="text-[14px] font-bold text-[#424245] mb-2 block">닉네임</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] placeholder:text-[#86868b]"
            />
            <p className="text-right text-[13px] text-[#86868b] mt-1">{nickname.length}/12</p>
          </div>

          {/* Dong */}
          <div>
            <label className="text-[14px] font-bold text-[#424245] mb-2 block">우리 동네</label>
            <div className="flex flex-wrap gap-2">
              {dongs.map(d => (
                <button
                  key={d}
                  onClick={() => setDong(d)}
                  className={`h-9 px-4 rounded-full text-[14px] font-medium transition-colors active:opacity-70 ${
                    dong === d ? "bg-[#0071e3] text-white" : "bg-[#f5f5f7] text-[#424245]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Intro */}
          <div>
            <label className="text-[14px] font-bold text-[#424245] mb-2 block">한줄 소개</label>
            <textarea
              value={intro}
              onChange={e => setIntro(e.target.value)}
              maxLength={60}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] placeholder:text-[#86868b] resize-none leading-relaxed"
              placeholder="나를 소개해주세요"
            />
            <p className="text-right text-[13px] text-[#86868b] mt-1">{intro.length}/60</p>
          </div>

          {/* Level info */}
          <div className="bg-[#e8f1fd] rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[14px] font-bold text-[#0071e3]">현재 레벨</p>
              <span className="text-[13px] font-bold bg-[#0071e3] text-white px-2.5 py-0.5 rounded-full">{level}</span>
            </div>
            <p className="text-[13px] text-[#0071e3]/80 leading-relaxed">
              글 작성, 댓글, 좋아요 활동으로 레벨이 올라가요.
              <br />다음 레벨인 <strong>터줏대감</strong>까지 글 15개 더 작성하세요!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
