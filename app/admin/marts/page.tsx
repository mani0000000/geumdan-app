"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, RefreshCw, MapPin, Phone, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchMarts, adminCreateMart, adminUpdateMart, adminDeleteMart,
  type Mart, type MartType, type MartClosingPattern,
} from "@/lib/db/marts";

const PROJECT_REF = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
const SQL_EDITOR_URL = PROJECT_REF
  ? `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`
  : "https://supabase.com/dashboard";

const MART_TYPES: MartType[] = ["대형마트", "중형마트", "동네마트", "슈퍼마트"];
const CLOSING_PATTERNS: { value: MartClosingPattern; label: string }[] = [
  { value: "2nd4th", label: "2·4번째 일요일 의무휴업" },
  { value: "1st3rd", label: "1·3번째 일요일 의무휴업" },
  { value: "open",   label: "일요일 정상 영업" },
  { value: "closed", label: "매주 일요일 휴무" },
];

const EMPTY: Omit<Mart, "id"> = {
  name: "", brand: "", type: "동네마트", address: "", phone: "",
  distance: "", weekday_hours: "", saturday_hours: "", sunday_hours: "",
  closing_pattern: "open", notice: "", logo_url: null,
  lat: null, lng: null, sort_order: 0, active: true,
};

function MartForm({
  initial, onSave, onClose,
}: {
  initial: Mart | null;
  onSave: (data: Omit<Mart, "id">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Mart, "id">>(initial ? { ...initial } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("마트명을 입력하세요"); return; }
    if (!form.address.trim()) { setErr("주소를 입력하세요"); return; }
    setSaving(true); setErr("");
    try { await onSave(form); onClose(); }
    catch (e) { setErr(e instanceof Error ? e.message : "저장 실패"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:px-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between shrink-0">
          <h2 className="text-[16px] font-bold text-[#191F28]">{initial ? "마트 수정" : "마트 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] text-xl">✕</button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            {/* 로고 */}
            <div>
              <p className="text-[13px] font-semibold text-[#191F28] mb-2">로고 이미지</p>
              <ImageUpload value={form.logo_url} onChange={v => set("logo_url", v)} folder="marts" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">마트명 *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="이마트 검단점" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">브랜드명</label>
                <input value={form.brand} onChange={e => set("brand", e.target.value)}
                  placeholder="이마트" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">유형</label>
                <select value={form.type} onChange={e => set("type", e.target.value as MartType)}
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]">
                  {MART_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">거리</label>
                <input value={form.distance ?? ""} onChange={e => set("distance", e.target.value)}
                  placeholder="1.2km" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#8B95A1]">주소 *</label>
              <input value={form.address} onChange={e => set("address", e.target.value)}
                placeholder="인천 서구 검단로 123" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">전화번호</label>
                <input value={form.phone ?? ""} onChange={e => set("phone", e.target.value)}
                  placeholder="032-000-0000" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">정렬 순서</label>
                <input type="number" value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))}
                  className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#8B95A1]">평일 영업시간</label>
              <input value={form.weekday_hours ?? ""} onChange={e => set("weekday_hours", e.target.value)}
                placeholder="10:00~23:00" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">토요일 영업시간</label>
                <input value={form.saturday_hours ?? ""} onChange={e => set("saturday_hours", e.target.value)}
                  placeholder="10:00~23:00" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">일요일 영업시간</label>
                <input value={form.sunday_hours ?? ""} onChange={e => set("sunday_hours", e.target.value)}
                  placeholder="10:00~22:00 (없으면 빈칸)" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#8B95A1]">의무휴업 패턴</label>
              <select value={form.closing_pattern} onChange={e => set("closing_pattern", e.target.value as MartClosingPattern)}
                className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]">
                {CLOSING_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">위도 (lat)</label>
                <input type="number" step="any" value={form.lat ?? ""} onChange={e => set("lat", e.target.value ? Number(e.target.value) : null)}
                  placeholder="37.5665" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-[#8B95A1]">경도 (lng)</label>
                <input type="number" step="any" value={form.lng ?? ""} onChange={e => set("lng", e.target.value ? Number(e.target.value) : null)}
                  placeholder="126.9780" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#8B95A1]">안내 문구</label>
              <input value={form.notice ?? ""} onChange={e => set("notice", e.target.value)}
                placeholder="매월 2·4번째 일요일 의무휴업" className="mt-1 w-full border rounded-xl px-3 py-2 text-[13px]" />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-[13px] font-semibold text-[#191F28]">활성화 (홈 화면에 표시)</span>
            </label>

            {err && <p className="text-[12px] text-[#F04452]">{err}</p>}
          </div>

          <div className="px-5 pb-5 shrink-0">
            <button type="submit" disabled={saving}
              className="w-full py-3 bg-[#3182F6] text-white rounded-xl text-[14px] font-bold disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const TYPE_STYLE: Record<string, { bg: string; color: string }> = {
  "대형마트": { bg: "#EDE9FE", color: "#6D28D9" },
  "중형마트": { bg: "#DBEAFE", color: "#1D4ED8" },
  "동네마트": { bg: "#D1FAE5", color: "#065F46" },
  "슈퍼마트": { bg: "#E0F2FE", color: "#0369A1" },
};

export default function AdminMartsPage() {
  const [marts, setMarts] = useState<Mart[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Mart | null>(null);
  const [tableErr, setTableErr] = useState(false);
  const [initing, setIniting] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  async function reload() {
    setLoading(true); setErr(""); setTableErr(false);
    try { setMarts(await adminFetchMarts()); }
    catch (e) {
      const msg = e instanceof Error ? e.message : "로드 실패";
      setErr(msg);
      if (msg.includes("PGRST205") || msg.includes("schema cache") || msg.includes("Could not find")) {
        setTableErr(true);
      }
    }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function handleSave(data: Omit<Mart, "id">) {
    if (editing) await adminUpdateMart(editing.id, data);
    else await adminCreateMart(data);
    await reload();
  }

  async function handleDelete(m: Mart) {
    if (!confirm(`"${m.name}" 마트를 삭제할까요?`)) return;
    try { await adminDeleteMart(m.id); await reload(); }
    catch (e) { alert(e instanceof Error ? e.message : "삭제 실패"); }
  }

  function openCreate() { setEditing(null); setShowForm(true); }
  function openEdit(m: Mart) { setEditing(m); setShowForm(true); }

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {(showForm) && (
        <MartForm initial={editing} onSave={handleSave} onClose={() => setShowForm(false)} />
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[16px] md:text-[20px] font-extrabold text-[#191F28]">주변 마트 관리</h1>
          <p className="text-[13px] text-[#8B95A1] mt-0.5">총 {marts.length}개 · 활성 {marts.filter(m => m.active).length}개</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} className="p-2 rounded-xl bg-white border border-[#E5E8EB]">
            <RefreshCw size={16} className={`text-[#8B95A1] ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold">
            <Plus size={15} /> 마트 추가
          </button>
        </div>
      </div>

      {err && <p className="text-[13px] text-[#F04452] mb-3">{err}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-[#F2F4F6] animate-pulse" />)}
        </div>
      ) : marts.length === 0 ? (
        <div className="text-center py-16 text-[#8B95A1] text-[14px]">마트가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {marts.map(m => {
            const ts = TYPE_STYLE[m.type] ?? { bg: "#F2F4F6", color: "#6e6e73" };
            const mapUrl = m.lat && m.lng
              ? `https://map.kakao.com/link/map/${encodeURIComponent(m.name)},${m.lat},${m.lng}`
              : `https://map.kakao.com/link/search/${encodeURIComponent(m.address)}`;

            return (
              <div key={m.id} className={`bg-white rounded-2xl border ${m.active ? "border-[#E5E8EB]" : "border-dashed border-[#E5E8EB] opacity-60"} p-4`}>
                <div className="flex items-start gap-3">
                  {/* 로고 */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#F2F4F6] flex items-center justify-center">
                    {m.logo_url
                      ? <img src={m.logo_url} alt={m.brand} className="w-full h-full object-contain p-1" />
                      : <span className="text-[18px] font-black text-[#8B95A1]">{m.brand.slice(0, 1)}</span>
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-[#191F28]">{m.name}</span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: ts.bg, color: ts.color }}>{m.type}</span>
                      {!m.active && <span className="text-[11px] text-[#8B95A1]">비활성</span>}
                    </div>
                    <p className="text-[12px] text-[#8B95A1] mt-0.5 truncate">{m.address}</p>
                    <div className="flex gap-3 mt-1 text-[11px] text-[#6e6e73] flex-wrap">
                      {m.weekday_hours && <span>평일 {m.weekday_hours}</span>}
                      {m.saturday_hours && <span>토 {m.saturday_hours}</span>}
                      {m.sunday_hours && <span>일 {m.sunday_hours}</span>}
                      {m.distance && <span>· {m.distance}</span>}
                    </div>
                    <p className="text-[11px] text-[#8B95A1] mt-0.5">
                      {CLOSING_PATTERNS.find(p => p.value === m.closing_pattern)?.label}
                    </p>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {m.phone && (
                      <a href={`tel:${m.phone}`}
                        className="w-8 h-8 rounded-lg bg-[#E8F1FD] flex items-center justify-center">
                        <Phone size={13} className="text-[#3182F6]" />
                      </a>
                    )}
                    <a href={mapUrl} target="_blank" rel="noreferrer"
                      className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                      <MapPin size={13} className="text-[#D97706]" />
                    </a>
                    <button onClick={() => openEdit(m)}
                      className="w-8 h-8 rounded-lg bg-[#F2F4F6] flex items-center justify-center">
                      <Pencil size={13} className="text-[#6e6e73]" />
                    </button>
                    <button onClick={() => handleDelete(m)}
                      className="w-8 h-8 rounded-lg bg-[#FEE2E2] flex items-center justify-center">
                      <Trash2 size={13} className="text-[#F04452]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 테이블 없음 오류 패널 */}
      {tableErr && (() => {
        const sql = `CREATE TABLE IF NOT EXISTS marts (\n  id TEXT PRIMARY KEY,\n  name TEXT NOT NULL,\n  brand TEXT NOT NULL DEFAULT '',\n  type TEXT NOT NULL DEFAULT '동네마트',\n  address TEXT NOT NULL DEFAULT '',\n  phone TEXT,\n  distance TEXT,\n  weekday_hours TEXT,\n  saturday_hours TEXT,\n  sunday_hours TEXT,\n  closing_pattern TEXT NOT NULL DEFAULT 'open',\n  notice TEXT,\n  logo_url TEXT,\n  lat DOUBLE PRECISION,\n  lng DOUBLE PRECISION,\n  sort_order INT NOT NULL DEFAULT 0,\n  active BOOLEAN NOT NULL DEFAULT TRUE,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);\nALTER TABLE marts ENABLE ROW LEVEL SECURITY;\nCREATE POLICY IF NOT EXISTS anon_all ON marts FOR ALL TO anon USING (true) WITH CHECK (true);`;
        return (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
            <p className="text-[13px] font-bold text-red-700">marts 테이블이 없습니다</p>
            <button
              disabled={initing}
              onClick={async () => {
                setIniting(true);
                try {
                  const r = await fetch("/api/admin/init-db", { method: "POST" });
                  const d = await r.json();
                  if (d.success) { setInitDone(true); setTimeout(() => reload(), 1000); }
                  else { setInitDone(false); }
                } catch {}
                setIniting(false);
              }}
              className="w-full py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-bold disabled:opacity-50">
              {initing ? "생성 중…" : initDone ? "✅ 완료" : "🗄️ 자동 생성 시도"}
            </button>
            <p className="text-[12px] text-red-600">자동 생성이 안 되면 아래 SQL을 직접 실행하세요.</p>
            <pre className="bg-white border border-red-200 rounded-xl p-3 text-[10px] text-red-800 overflow-x-auto whitespace-pre leading-relaxed">{sql}</pre>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(sql).catch(() => {});
                  setSqlCopied(true); setTimeout(() => setSqlCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-[12px] font-bold">
                {sqlCopied ? <CheckCircle2 size={13} className="text-green-500" /> : <Copy size={13} />}
                {sqlCopied ? "복사됨" : "SQL 복사"}
              </button>
              <a href={SQL_EDITOR_URL} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-600 text-white text-[12px] font-bold">
                <ExternalLink size={13} /> SQL Editor 열기
              </a>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
