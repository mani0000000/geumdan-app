"use client";
import { useState, useEffect } from "react";
import { FileText, Save, RefreshCw, Check } from "lucide-react";
import { adminFetchAllTerms, adminSaveTerm } from "@/lib/db/admin-terms";
import type { Term } from "@/lib/db/terms";

const TERM_TABS: { type: Term["type"]; label: string }[] = [
  { type: "service",   label: "이용약관" },
  { type: "privacy",   label: "개인정보처리방침" },
  { type: "location",  label: "위치기반 서비스" },
  { type: "marketing", label: "마케팅 수신 동의" },
];

export default function AdminTermsPage() {
  const [terms, setTerms] = useState<Record<string, Term>>({});
  const [activeType, setActiveType] = useState<Term["type"]>("service");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  const [draftContent, setDraftContent] = useState("");
  const [draftVersion, setDraftVersion] = useState("");
  const [draftEffective, setDraftEffective] = useState("");
  const [draftActive, setDraftActive] = useState(true);

  useEffect(() => {
    adminFetchAllTerms().then(rows => {
      const map: Record<string, Term> = {};
      rows.forEach(r => { map[r.type] = r; });
      setTerms(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = terms[activeType];
    setDraftContent(t?.content ?? "");
    setDraftVersion(t?.version ?? "1.0");
    setDraftEffective(t?.effective_date ?? new Date().toISOString().slice(0, 10));
    setDraftActive(t?.is_active ?? true);
    setSaved(false);
    setErr("");
  }, [activeType, terms]);

  async function handleSave() {
    setSaving(true); setErr(""); setSaved(false);
    try {
      const title = TERM_TABS.find(t => t.type === activeType)?.label ?? activeType;
      await adminSaveTerm(activeType, {
        title,
        content: draftContent,
        version: draftVersion,
        effective_date: draftEffective,
        is_active: draftActive,
      });
      setTerms(prev => ({
        ...prev,
        [activeType]: {
          ...(prev[activeType] ?? {} as Term),
          content: draftContent,
          version: draftVersion,
          effective_date: draftEffective,
          is_active: draftActive,
        },
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(String(e));
    }
    setSaving(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28] flex items-center gap-2">
          <FileText size={20} className="text-[#3182F6]" /> 약관 관리
        </h1>
        <p className="text-[13px] text-[#8B95A1] mt-0.5">이용약관, 개인정보처리방침 등 앱 약관을 관리합니다</p>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {TERM_TABS.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
              activeType === type
                ? "bg-[#3182F6] text-white shadow-sm"
                : "bg-white text-[#6B7280] border border-[#E5E8EB] hover:bg-[#F9FAFB]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 bg-[#F2F4F6] rounded-xl w-1/3" />
          <div className="h-64 bg-[#F2F4F6] rounded-2xl" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E8EB] p-5 space-y-4">
          {/* 메타 필드 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[12px] font-bold text-[#6B7280] mb-1 block">버전</label>
              <input
                value={draftVersion}
                onChange={e => setDraftVersion(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E8EB] text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
              />
            </div>
            <div>
              <label className="text-[12px] font-bold text-[#6B7280] mb-1 block">시행일</label>
              <input
                type="date"
                value={draftEffective}
                onChange={e => setDraftEffective(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-[#E5E8EB] text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setDraftActive(v => !v)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${draftActive ? "bg-[#3182F6]" : "bg-[#D1D5DB]"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${draftActive ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <span className="text-[13px] font-semibold text-[#374151]">활성화</span>
              </label>
            </div>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-[12px] font-bold text-[#6B7280] mb-1 block">
              약관 내용 <span className="font-normal text-[#9CA3AF]">(## 제목, • 목록 형식 지원)</span>
            </label>
            <textarea
              value={draftContent}
              onChange={e => setDraftContent(e.target.value)}
              rows={22}
              className="w-full px-3 py-3 rounded-xl border border-[#E5E8EB] text-[13px] leading-relaxed outline-none focus:ring-2 focus:ring-[#3182F6] font-mono resize-y"
              placeholder="약관 내용을 입력하세요..."
            />
          </div>

          {err && <p className="text-[12px] text-[#F04452]">{err}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !draftContent.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold disabled:opacity-50 hover:bg-[#2563EB] transition-colors"
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
              {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
            </button>
            <a
              href={`/terms/${activeType}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] text-[#3182F6] font-semibold hover:underline"
            >
              미리보기 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
