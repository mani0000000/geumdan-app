"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Check, X } from "lucide-react";
import {
  adminFetchKeywords, adminCreateKeyword,
  adminUpdateKeyword, adminDeleteKeyword,
  fetchPopularKeywords,
  type SearchKeyword,
} from "@/lib/db/search-keywords";

export default function AdminKeywordsPage() {
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [popular, setPopular] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKw, setNewKw] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [kws, pop] = await Promise.all([adminFetchKeywords(), fetchPopularKeywords()]);
    setKeywords(kws);
    setPopular(pop);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newKw.trim()) return;
    setSaving(true);
    try {
      const maxOrder = keywords.reduce((m, k) => Math.max(m, k.sort_order), 0);
      await adminCreateKeyword(newKw.trim(), maxOrder + 10);
      setNewKw("");
      await load();
    } finally { setSaving(false); }
  }

  async function handleToggle(kw: SearchKeyword) {
    await adminUpdateKeyword(kw.id, { active: !kw.active });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteKeyword(id);
    await load();
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-4 max-w-2xl mx-auto">
      <h1 className="text-[22px] font-black text-[#1d1d1f] mb-6">검색어 관리</h1>

      {/* 추가 */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <p className="text-[13px] font-bold text-[#424245] mb-2">추천 검색어 추가</p>
        <div className="flex gap-2">
          <input
            value={newKw}
            onChange={e => setNewKw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="검색어 입력"
            className="flex-1 border border-[#d2d2d7] rounded-xl px-3 py-2 text-[14px] outline-none focus:border-[#0071e3]"
          />
          <button onClick={handleAdd} disabled={saving || !newKw.trim()}
            className="h-10 px-5 bg-[#0071e3] text-white rounded-xl text-[14px] font-bold disabled:opacity-40 flex items-center gap-1.5 active:opacity-80">
            <Plus size={15} /> 추가
          </button>
        </div>
      </div>

      {/* 추천 검색어 목록 */}
      <div className="bg-white rounded-2xl p-4 mb-4">
        <p className="text-[13px] font-bold text-[#424245] mb-3">추천 검색어 ({keywords.length}개)</p>
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-[#f5f5f7] rounded-xl animate-pulse" />)}
          </div>
        ) : keywords.length === 0 ? (
          <p className="text-[13px] text-[#86868b] py-4 text-center">등록된 검색어가 없습니다</p>
        ) : (
          <div className="space-y-1.5">
            {keywords.map((kw, i) => (
              <div key={kw.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${kw.active ? "bg-[#f5f5f7]" : "bg-[#fafafa] opacity-50"}`}>
                <span className="text-[11px] font-black text-[#86868b] w-5 text-center">{i + 1}</span>
                <span className="flex-1 text-[14px] font-medium text-[#1d1d1f]">{kw.keyword}</span>
                <button onClick={() => handleToggle(kw)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center active:opacity-60 ${kw.active ? "bg-[#D1FAE5]" : "bg-[#F3F4F6]"}`}>
                  {kw.active ? <Check size={13} className="text-[#065F46]" /> : <X size={13} className="text-[#9CA3AF]" />}
                </button>
                <button onClick={() => handleDelete(kw.id)}
                  className="w-7 h-7 rounded-full bg-[#FEE2E2] flex items-center justify-center active:opacity-60">
                  <Trash2 size={13} className="text-[#F04452]" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 실시간 인기 검색어 */}
      <div className="bg-white rounded-2xl p-4">
        <p className="text-[13px] font-bold text-[#424245] mb-3">실시간 인기 검색어 (최근 7일)</p>
        {popular.length === 0 ? (
          <p className="text-[13px] text-[#86868b] py-4 text-center">아직 검색 데이터가 없습니다</p>
        ) : (
          <div className="space-y-1.5">
            {popular.map((kw, i) => (
              <div key={kw} className="flex items-center gap-3 px-3 py-2.5 bg-[#f5f5f7] rounded-xl">
                <span className={`text-[13px] font-black w-5 text-center ${i < 3 ? "text-[#F04452]" : "text-[#86868b]"}`}>{i + 1}</span>
                <span className="flex-1 text-[14px] text-[#1d1d1f]">{kw}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
