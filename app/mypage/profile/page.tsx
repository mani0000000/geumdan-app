"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, Loader2, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getUserProfile, updateUserProfile } from "@/lib/db/userdata";
import { DONG_SELECT_OPTIONS } from "@/lib/geumdan";

const dongs = DONG_SELECT_OPTIONS;

export default function ProfileEditPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState("");
  const [dong, setDong] = useState("당하동");
  const [intro, setIntro] = useState("");
  const [level, setLevel] = useState<"새싹" | "주민" | "이웃" | "터줏대감">("새싹");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getUserProfile().then(p => {
      setNickname(p.nickname);
      setDong(p.dong || "당하동");
      setIntro(p.intro ?? "");
      setLevel(p.level);
      setAvatarUrl(p.avatar_url ?? null);
    });
  }, []);

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("folder", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "업로드 실패");
      await updateUserProfile({ avatar_url: json.url });
      setAvatarUrl(json.url);
    } catch (uerr) {
      setErr(uerr instanceof Error ? uerr.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
    if (!nickname.trim()) { setErr("닉네임을 입력하세요."); return; }
    setSaving(true); setErr("");
    try {
      await updateUserProfile({
        nickname: nickname.trim(),
        dong,
        intro: intro.trim(),
      });
      router.push("/mypage/");
    } catch {
      setErr("저장에 실패했습니다.");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-black/5">
        <div className="flex items-center justify-between px-4 h-[52px]">
          <button onClick={() => router.back()} aria-label="뒤로" className="active:opacity-60">
            <ChevronLeft size={24} className="text-[#1d1d1f]" />
          </button>
          <h1 className="text-[18px] font-bold text-[#1d1d1f]">프로필 수정</h1>
          <button
            onClick={save}
            disabled={saving || !nickname.trim()}
            className="h-9 px-4 rounded-xl bg-[#2563EB] text-white text-[14px] font-bold disabled:opacity-40 active:opacity-80 transition-opacity"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </header>

      <div className="flex-1 px-6 pt-6">
        {/* 아바타 */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative">
            <Avatar src={avatarUrl} size={96} alt={nickname} />
            <button
              onClick={onPickFile}
              disabled={uploading}
              aria-label="사진 변경"
              className="absolute bottom-0 right-0 w-9 h-9 bg-[#2563EB] rounded-full flex items-center justify-center active:opacity-80 disabled:opacity-50 shadow-md"
            >
              {uploading
                ? <Loader2 size={16} className="text-white animate-spin" />
                : <Camera size={16} className="text-white" />}
            </button>
            {avatarUrl && !uploading && (
              <button
                onClick={removeAvatar}
                aria-label="사진 삭제"
                className="absolute top-0 right-0 w-7 h-7 bg-white rounded-full border border-black/10 flex items-center justify-center active:bg-[#f5f5f7] shadow-sm"
              >
                <X size={13} className="text-[#6e6e73]" />
              </button>
            )}
          </div>
          <button
            onClick={onPickFile}
            disabled={uploading}
            className="mt-3 text-[13px] text-[#2563EB] font-semibold active:opacity-60 disabled:opacity-50"
          >
            프로필 사진 {avatarUrl ? "변경" : "등록"}
          </button>
          <input
            ref={fileRef} type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onFileChange}
            className="hidden"
          />
        </div>

        <div className="space-y-5">
          {/* 닉네임 */}
          <div>
            <label className="text-[13px] font-bold text-[#424245] mb-2 block">닉네임</label>
            <input
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={12}
              className="w-full h-[52px] px-4 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#2563EB]"
              placeholder="닉네임을 입력하세요"
            />
            <p className="text-right text-[12px] text-[#86868b] mt-1">{nickname.length}/12</p>
          </div>

          {/* 동네 */}
          <div>
            <label className="text-[13px] font-bold text-[#424245] mb-2 block">우리 동네</label>
            <div className="flex flex-wrap gap-2">
              {dongs.map(d => (
                <button
                  key={d}
                  onClick={() => setDong(d)}
                  className={`h-9 px-4 rounded-full text-[13px] font-medium transition-colors active:opacity-70 ${
                    dong === d ? "bg-[#2563EB] text-white" : "bg-[#f5f5f7] text-[#424245]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* 한줄소개 */}
          <div>
            <label className="text-[13px] font-bold text-[#424245] mb-2 block">한줄 소개</label>
            <textarea
              value={intro}
              onChange={e => setIntro(e.target.value)}
              maxLength={60}
              rows={3}
              placeholder="나를 소개해 보세요"
              className="w-full px-4 py-3 rounded-xl bg-[#f5f5f7] text-[16px] text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#2563EB] resize-none leading-relaxed"
            />
            <p className="text-right text-[12px] text-[#86868b] mt-1">{intro.length}/60</p>
          </div>

          {/* 레벨 안내 */}
          <div className="bg-[#e8f1fd] rounded-2xl px-4 py-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[13px] font-bold text-[#2563EB]">활동 레벨</p>
              <span className="text-[12px] font-bold bg-[#2563EB] text-white px-2.5 py-0.5 rounded-full">{level}</span>
            </div>
            <p className="text-[12px] text-[#2563EB]/85 leading-relaxed">
              글 작성, 댓글, 좋아요 활동으로 레벨이 올라가요.
            </p>
          </div>

          {err && <p className="text-[13px] text-[#EF4444] font-semibold">{err}</p>}
        </div>
      </div>
    </div>
  );
}
