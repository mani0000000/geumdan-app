"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, RefreshCw, Check, X, Clock, MessageSquare } from "lucide-react";
import { adminFetchSuggestions, adminUpdateSuggestion, type AdminSuggestion } from "@/lib/db/admin-stores";
import { SUGGESTION_TYPE_LABELS } from "@/lib/constants/store-categories";

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[#FEF3C7] text-[#92400E]",
  reviewing: "bg-[#E0F2FE] text-[#0369A1]",
  approved:  "bg-[#D1FAE5] text-[#065F46]",
  rejected:  "bg-[#FEE2E2] text-[#991B1B]",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "대기", reviewing: "검토중", approved: "승인", rejected: "반려",
};

const SUGGESTION_TYPE_EMOJI: Record<string, string> = {
  new_store: "🆕", closed: "🚫", name_change: "✏️",
  hours_change: "🕐", phone_change: "📞", category_change: "🔀", other: "💬",
};

export default function AdminSuggestionsPage() {
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<AdminSuggestion | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await adminFetchSuggestions(statusFilter || undefined);
    setSuggestions(data);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  function openDetail(s: AdminSuggestion) {
    setSelected(s);
    setAdminNote(s.admin_note ?? "");
  }

  async function updateStatus(status: "reviewing" | "approved" | "rejected") {
    if (!selected) return;
    setSaving(true);
    try {
      await adminUpdateSuggestion(selected.id, { status, admin_note: adminNote || null });
      setSelected(null);
      load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh bg-[#F8F9FB]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 bg-white border-b border-[#E5E8EB] sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-[#8B95A1] hover:text-[#191F28]">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-[16px] font-bold text-[#191F28] flex-1">정보 제안 관리</h1>
        <button onClick={load} className="p-2 text-[#8B95A1] hover:text-[#191F28] active:opacity-60">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {["", "pending", "reviewing", "approved", "rejected"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
              statusFilter === s
                ? "bg-[#3182F6] border-[#3182F6] text-white"
                : "border-[#E5E8EB] text-[#4E5968] bg-white hover:border-[#3182F6]"
            }`}>
            {s ? STATUS_LABELS[s] : "전체"}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          <div className="py-12 text-center text-[#8B95A1] text-[14px]">불러오는 중...</div>
        ) : suggestions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-2">📭</p>
            <p className="text-[15px] font-medium text-[#191F28]">제안이 없어요</p>
          </div>
        ) : suggestions.map(s => (
          <button key={s.id} onClick={() => openDetail(s)}
            className="w-full bg-white rounded-2xl p-4 text-left border border-[#E5E8EB] hover:border-[#3182F6] transition-colors active:opacity-70">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{SUGGESTION_TYPE_EMOJI[s.suggestion_type ?? "other"] ?? "💬"}</span>
                <div>
                  <p className="text-[14px] font-bold text-[#191F28]">
                    {SUGGESTION_TYPE_LABELS[s.suggestion_type ?? "other"] ?? "기타"}
                  </p>
                  {s.store_name && (
                    <p className="text-[12px] text-[#4E5968]">{s.store_name}</p>
                  )}
                </div>
              </div>
              <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status] ?? ""}`}>
                {STATUS_LABELS[s.status] ?? s.status}
              </span>
            </div>
            {(s.building_name || s.floor) && (
              <p className="text-[12px] text-[#8B95A1] mb-1">{[s.building_name, s.floor].filter(Boolean).join(" · ")}</p>
            )}
            {s.message && (
              <p className="text-[12px] text-[#4E5968] line-clamp-2 bg-[#F8F9FB] rounded-lg px-3 py-2">{s.message}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] text-[#B0B8C1]">
              <span className="flex items-center gap-0.5"><Clock size={10} /> {new Date(s.created_at).toLocaleDateString("ko-KR")}</span>
              {s.contact && <span>연락처: {s.contact}</span>}
            </div>
          </button>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="text-[15px] font-bold">제안 상세</h2>
              <button onClick={() => setSelected(null)} className="text-[#8B95A1] hover:text-[#191F28]">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{SUGGESTION_TYPE_EMOJI[selected.suggestion_type ?? "other"]}</span>
                <div>
                  <p className="text-[15px] font-bold">{SUGGESTION_TYPE_LABELS[selected.suggestion_type ?? "other"] ?? "기타"}</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status]}`}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>
              </div>

              {[
                ["매장명", selected.store_name],
                ["건물/위치", [selected.building_name, selected.floor].filter(Boolean).join(" · ")],
                ["업종", [selected.category, selected.sub_category].filter(Boolean).join(" > ")],
                ["전화번호", selected.phone],
                ["영업시간", selected.hours],
                ["설명", selected.description],
                ["연락처", selected.contact],
              ].map(([label, val]) => val ? (
                <div key={label as string} className="bg-[#F8F9FB] rounded-xl px-4 py-3">
                  <p className="text-[11px] text-[#8B95A1] mb-0.5">{label}</p>
                  <p className="text-[14px] text-[#191F28]">{val}</p>
                </div>
              ) : null)}

              {selected.message && (
                <div className="bg-[#F8F9FB] rounded-xl px-4 py-3">
                  <p className="text-[11px] text-[#8B95A1] mb-0.5 flex items-center gap-1"><MessageSquare size={10} /> 메시지</p>
                  <p className="text-[14px] text-[#191F28] whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">관리자 메모</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="처리 내용, 참고사항 등"
                  className="w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6] resize-none" />
              </div>
            </div>

            <div className="px-5 py-4 border-t grid grid-cols-3 gap-2">
              <button onClick={() => updateStatus("reviewing")} disabled={saving || selected.status === "reviewing"}
                className="py-2.5 rounded-xl text-[13px] font-bold bg-[#E0F2FE] text-[#0369A1] disabled:opacity-40">
                검토중
              </button>
              <button onClick={() => updateStatus("rejected")} disabled={saving}
                className="py-2.5 rounded-xl text-[13px] font-bold bg-[#FEE2E2] text-[#991B1B] disabled:opacity-40 flex items-center justify-center gap-1">
                <X size={14} /> 반려
              </button>
              <button onClick={() => updateStatus("approved")} disabled={saving}
                className="py-2.5 rounded-xl text-[13px] font-bold bg-[#D1FAE5] text-[#065F46] disabled:opacity-40 flex items-center justify-center gap-1">
                <Check size={14} /> 승인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
