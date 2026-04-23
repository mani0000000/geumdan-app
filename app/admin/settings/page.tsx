"use client";
import { useState, useEffect } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import { fetchSiteSetting, adminSaveSiteSetting } from "@/lib/db/site-settings";

export default function AdminSettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchSiteSetting("logo_url").then(url => {
      setLogoUrl(url);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!logoUrl) { setErr("로고 이미지를 업로드하세요"); return; }
    setSaving(true); setErr(""); setSaved(false);
    try {
      await adminSaveSiteSetting("logo_url", logoUrl);
      localStorage.setItem("site_logo_url", logoUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(String(e));
    }
    setSaving(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <div className="mb-6">
        <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28] flex items-center gap-2">
          <Settings size={20} className="text-[#3182F6]" /> 앱 설정
        </h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">헤더 로고 등 전체 앱 설정을 관리합니다</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 space-y-5">
        <div>
          <p className="text-[14px] font-bold text-[#191F28] mb-1">헤더 로고</p>
          <p className="text-[12px] text-[#8B95A1] mb-3">홈 화면 상단에 표시되는 로고 이미지</p>
          {loading ? (
            <div className="h-32 rounded-xl bg-[#F2F4F6] animate-pulse" />
          ) : (
            <ImageUpload
              value={logoUrl}
              onChange={url => { setLogoUrl(url); setSaved(false); }}
              folder="settings"
            />
          )}
        </div>

        {logoUrl && (
          <div>
            <p className="text-[11px] font-semibold text-[#8B95A1] mb-2">미리보기</p>
            <div className="bg-white border border-[#E5E8EB] rounded-xl p-3 flex items-center h-[52px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="로고 미리보기" className="h-8 w-auto object-contain" />
            </div>
          </div>
        )}

        {err && <p className="text-[12px] text-[#F04452]">{err}</p>}

        <button
          onClick={handleSave}
          disabled={saving || !logoUrl}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50 hover:bg-[#2563EB]"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "저장됨 ✓" : saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
