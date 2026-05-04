"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getUserProfile, updateUserProfile } from "@/lib/db/userdata";

import { DONG_SELECT_OPTIONS } from "@/lib/geumdan";
const dongs = DONG_SELECT_OPTIONS;

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState("검단주민");
  const [dong, setDong] = useState("당하동");
  const [intro, setIntro] = useState("");
  const [level, setLevel] = useState("새싹");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile().then(p => {
      setNickname(p.nickname);
      setDong(p.dong);
      setIntro(p.intro || "");
      setLevel(p.level);
      setAvatarUrl(p.avatar_url);
    });
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "업로드 실패");
      // 업로드 즉시 DB 반영 → 다른 화면에서도 바로 보이도록
      await updateUserProfile({ avatar_url: json.url });
      setAvatarUrl(json.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      await updateUserProfile({ avatar_url: null });
      setAvatarUrl(null);
    } finally {
      setUploading(false);
    }
  };

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
            <Avatar src={avatarUrl} size={96} alt={nickname} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-[#0071e3] rounded-full flex items-center justify-center active:opacity-80 disabled:opacity-50 shadow"
            >
              {uploading
                ? <Loader2 size={14} className="text-white animate-spin" />
                : <Camera size={14} className="text-white" />}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[13px] text-[#0071e3] mt-2 font-medium active:opacity-60"
          >
            프로필 사진 {avatarUrl ? "변경" : "추가"}
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              className="text-[12px] text-[#86868b] mt-1 active:opacity-60"
            >
              사진 제거
            </button>
          )}
          {uploadError && (
            <p className="text-[12px] text-[#F04452] mt-2">{uploadError}</p>
          )}
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
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
