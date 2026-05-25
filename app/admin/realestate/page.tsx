"use client";
import { useState, useEffect, useCallback, useId } from "react";
import { Plus, Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp, X } from "lucide-react";
import {
  adminFetchApartments, adminCreateApartment, adminUpdateApartment, adminDeleteApartment,
  adminFetchSizes, adminUpsertSize, adminDeleteSize,
  adminFetchDeals, adminCreateDeal, adminDeleteDeal,
  adminFetchPriceIndex, adminUpsertPriceIndex, adminDeletePriceIndex,
  adminFetchRealEstateStats,
  type AdminApartment, type AdminApartmentSize, type AdminDeal, type AdminPriceIndex,
} from "@/lib/db/admin-realestate";

const DONGS = ["당하동", "불로동", "마전동", "왕길동", "대곡동", "원당동", "백석동"];
const INPUT = "w-full border border-[#E5E8EB] rounded-xl px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-[#3182F6]";
const SELECT = INPUT + " bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#8B95A1] mb-1">{label}</label>
      {children}
    </div>
  );
}

function fmt만원(v: number) {
  if (v >= 10000) return `${(v / 10000).toFixed(1)}억`;
  return `${v.toLocaleString()}만`;
}

// ─── 아파트 모달 ──────────────────────────────────────────────
const APT_EMPTY: Omit<AdminApartment, "id"> = {
  name: "", dong: "당하동", households: 0, built_year: 2020, lat: null, lng: null,
};

function AptModal({ initial, onSave, onClose }: {
  initial: AdminApartment | null;
  onSave: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<AdminApartment, "id">>(initial ?? APT_EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("단지명을 입력하세요."); return; }
    setSaving(true);
    try {
      if (initial) await adminUpdateApartment(initial.id, form);
      else await adminCreateApartment(form);
      onSave(); onClose();
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "저장 실패"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{initial ? "단지 수정" : "단지 추가"}</h2>
          <button onClick={onClose} className="text-[#8B95A1] p-1">✕</button>
        </div>
        <form onSubmit={submit} className="overflow-y-auto max-h-[75vh]">
          <div className="px-5 py-4 space-y-3">
            <Field label="단지명 *">
              <input className={INPUT} value={form.name} onChange={e => set("name", e.target.value)} placeholder="검단 푸르지오 더 퍼스트" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="법정동">
                <select className={SELECT} value={form.dong} onChange={e => set("dong", e.target.value)}>
                  {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="준공년도">
                <input className={INPUT} type="number" value={form.built_year}
                  onChange={e => set("built_year", Number(e.target.value))} />
              </Field>
            </div>
            <Field label="세대수">
              <input className={INPUT} type="number" value={form.households}
                onChange={e => set("households", Number(e.target.value))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="위도(lat)">
                <input className={INPUT} type="number" step="0.000001"
                  value={form.lat ?? ""} onChange={e => set("lat", e.target.value ? Number(e.target.value) : null)} />
              </Field>
              <Field label="경도(lng)">
                <input className={INPUT} type="number" step="0.000001"
                  value={form.lng ?? ""} onChange={e => set("lng", e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            {err && <p className="text-[#F04452] text-[12px]">{err}</p>}
          </div>
          <div className="px-5 py-4 border-t flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-[13px] border border-[#E5E8EB] text-[#4E5968]">취소</button>
            <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl text-[13px] font-bold bg-[#3182F6] text-white disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 평형 관리 패널 ───────────────────────────────────────────
function SizesPanel({ apt }: { apt: AdminApartment }) {
  const uid = useId();
  const [sizes, setSizes] = useState<AdminApartmentSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newSize, setNewSize] = useState({ pyeong: 34, sqm: 114, avg_price: 50000 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setSizes(await adminFetchSizes(apt.id));
    setLoading(false);
  }, [apt.id]);

  useEffect(() => { load(); }, [load]);

  async function addSize() {
    await adminUpsertSize({ id: `sz_${Date.now().toString(36)}`, apt_id: apt.id, ...newSize });
    setAdding(false);
    load();
  }

  async function saveAvgPrice(s: AdminApartmentSize) {
    await adminUpsertSize({ ...s, avg_price: editVal });
    setEditId(null);
    load();
  }

  return (
    <div className="border-t border-[#F2F4F6] bg-[#FAFBFC] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-bold text-[#8B95A1]">평형별 시세</span>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 text-[12px] text-[#3182F6] font-semibold">
          <Plus size={12} /> 평형 추가
        </button>
      </div>
      {adding && (
        <div className="flex items-end gap-2 mb-3 bg-[#EFF6FF] rounded-xl p-3">
          <div className="flex-1">
            <label className="text-[10px] text-[#8B95A1] font-bold">평형</label>
            <input className={INPUT} type="number" value={newSize.pyeong}
              onChange={e => setNewSize(s => ({ ...s, pyeong: Number(e.target.value) }))} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-[#8B95A1] font-bold">㎡</label>
            <input className={INPUT} type="number" value={newSize.sqm}
              onChange={e => setNewSize(s => ({ ...s, sqm: Number(e.target.value) }))} />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-[#8B95A1] font-bold">시세(만원)</label>
            <input className={INPUT} type="number" value={newSize.avg_price}
              onChange={e => setNewSize(s => ({ ...s, avg_price: Number(e.target.value) }))} />
          </div>
          <button onClick={addSize} className="px-3 py-2 bg-[#3182F6] text-white rounded-xl text-[12px] font-bold shrink-0">추가</button>
          <button onClick={() => setAdding(false)} className="text-[#8B95A1] p-1"><X size={14} /></button>
        </div>
      )}
      {loading ? (
        <p className="text-[12px] text-[#B0B8C1]">로딩 중...</p>
      ) : sizes.length === 0 ? (
        <p className="text-[12px] text-[#B0B8C1]">평형 정보 없음</p>
      ) : (
        <div className="space-y-1.5">
          {sizes.map(s => (
            <div key={s.id} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 border border-[#F2F4F6]">
              <span className="text-[13px] font-bold text-[#191F28] w-10">{s.pyeong}평</span>
              <span className="text-[12px] text-[#8B95A1] w-14">{s.sqm}㎡</span>
              {editId === s.id ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    id={`${uid}-edit-${s.id}`}
                    className="flex-1 border border-[#3182F6] rounded-lg px-2 py-1 text-[12px] outline-none"
                    type="number" value={editVal}
                    onChange={e => setEditVal(Number(e.target.value))} />
                  <span className="text-[11px] text-[#8B95A1]">만원</span>
                  <button onClick={() => saveAvgPrice(s)} className="text-[#3182F6] text-[12px] font-bold">저장</button>
                  <button onClick={() => setEditId(null)} className="text-[#8B95A1]"><X size={12} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-[13px] font-semibold text-[#3182F6]">{fmt만원(s.avg_price)}</span>
                  <button onClick={() => { setEditId(s.id); setEditVal(s.avg_price); }}
                    className="p-1 rounded hover:bg-[#EFF6FF] text-[#3182F6]">
                    <Pencil size={11} />
                  </button>
                </div>
              )}
              <button onClick={async () => { await adminDeleteSize(s.id); load(); }}
                className="p-1 rounded hover:bg-[#FFF0F0] text-[#F04452]">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 탭1: 단지 관리 ───────────────────────────────────────────
function ApartmentsTab() {
  const [apts, setApts] = useState<AdminApartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | AdminApartment | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setApts(await adminFetchApartments()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function del(apt: AdminApartment) {
    if (!confirm(`"${apt.name}" 단지를 삭제할까요?\n평형 시세, 실거래 내역도 함께 삭제됩니다.`)) return;
    await adminDeleteApartment(apt.id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] text-[#8B95A1]">{apts.length}개 단지</p>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB]">
            <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
          </button>
          <button onClick={() => setModal("add")}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold">
            <Plus size={14} /> 단지 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        {/* 데스크탑 헤더 */}
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[#F8F9FB] border-b border-[#E5E8EB] text-[11px] font-bold text-[#8B95A1] uppercase">
          <span>단지명</span><span>위치</span><span>세대/준공</span><span>좌표</span><span className="w-24 text-center">관리</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : apts.length === 0 ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">단지 없음</div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {apts.map(apt => (
              <div key={apt.id}>
                {/* 데스크탑 행 */}
                <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 hover:bg-[#F8F9FB]">
                  <span className="font-semibold text-[13px] text-[#191F28] truncate">{apt.name}</span>
                  <span className="text-[12px] text-[#4E5968]">{apt.dong}</span>
                  <span className="text-[12px] text-[#4E5968]">{apt.households.toLocaleString()}세대 · {apt.built_year}년</span>
                  <span className="text-[11px] text-[#B0B8C1]">
                    {apt.lat && apt.lng ? `${apt.lat.toFixed(4)}, ${apt.lng.toFixed(4)}` : "—"}
                  </span>
                  <div className="w-24 flex items-center gap-1">
                    <button onClick={() => setExpandedId(id => id === apt.id ? null : apt.id)}
                      className={`p-1.5 rounded-lg text-[12px] font-semibold transition-colors ${expandedId === apt.id ? "bg-[#EFF6FF] text-[#3182F6]" : "hover:bg-[#F2F4F6] text-[#8B95A1]"}`}>
                      {expandedId === apt.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button onClick={() => setModal(apt)} className="p-1.5 rounded-lg hover:bg-[#EFF6FF] text-[#3182F6]"><Pencil size={13} /></button>
                    <button onClick={() => del(apt)} className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452]"><Trash2 size={13} /></button>
                  </div>
                </div>
                {/* 모바일 카드 */}
                <div className="md:hidden p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-[14px] text-[#191F28]">{apt.name}</p>
                      <p className="text-[12px] text-[#8B95A1]">{apt.dong} · {apt.households.toLocaleString()}세대 · {apt.built_year}년</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setExpandedId(id => id === apt.id ? null : apt.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-[12px] font-bold border ${expandedId === apt.id ? "border-[#3182F6] bg-[#EFF6FF] text-[#3182F6]" : "border-[#E5E8EB] text-[#4E5968]"}`}>
                      {expandedId === apt.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      평형 시세
                    </button>
                    <button onClick={() => setModal(apt)} className="p-2 rounded-xl border border-[#E5E8EB] text-[#3182F6]"><Pencil size={15} /></button>
                    <button onClick={() => del(apt)} className="p-2 rounded-xl border border-[#E5E8EB] text-[#F04452]"><Trash2 size={15} /></button>
                  </div>
                </div>
                {expandedId === apt.id && <SizesPanel apt={apt} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <AptModal
          initial={modal === "add" ? null : modal as AdminApartment}
          onSave={load}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── 탭2: 실거래 내역 ─────────────────────────────────────────
function DealsTab({ apts }: { apts: AdminApartment[] }) {
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selApt, setSelApt] = useState("");
  const [adding, setAdding] = useState(false);
  const [newDeal, setNewDeal] = useState({ apt_id: "", pyeong: 34, price: 50000, deal_date: new Date().toISOString().slice(0, 7), floor: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try { setDeals(await adminFetchDeals({ aptId: selApt || undefined, limit: 100 })); }
    finally { setLoading(false); }
  }, [selApt]);

  useEffect(() => { load(); }, [load]);

  async function addDeal() {
    if (!newDeal.apt_id) { alert("단지를 선택하세요."); return; }
    await adminCreateDeal({ apt_id: newDeal.apt_id, pyeong: newDeal.pyeong, price: newDeal.price, deal_date: newDeal.deal_date, floor: newDeal.floor });
    setAdding(false);
    load();
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <select className={SELECT + " flex-1 min-w-[160px] max-w-[240px]"} value={selApt} onChange={e => setSelApt(e.target.value)}>
          <option value="">전체 단지</option>
          {apts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB]">
          <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold ml-auto">
          <Plus size={14} /> 내역 추가
        </button>
      </div>

      {adding && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 mb-3 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Field label="단지 *">
            <select className={SELECT} value={newDeal.apt_id} onChange={e => setNewDeal(d => ({ ...d, apt_id: e.target.value }))}>
              <option value="">선택</option>
              {apts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="평형">
            <input className={INPUT} type="number" value={newDeal.pyeong} onChange={e => setNewDeal(d => ({ ...d, pyeong: Number(e.target.value) }))} />
          </Field>
          <Field label="거래가(만원)">
            <input className={INPUT} type="number" value={newDeal.price} onChange={e => setNewDeal(d => ({ ...d, price: Number(e.target.value) }))} />
          </Field>
          <Field label="계약년월 (YYYY-MM)">
            <input className={INPUT} type="month" value={newDeal.deal_date} onChange={e => setNewDeal(d => ({ ...d, deal_date: e.target.value }))} />
          </Field>
          <Field label="층">
            <input className={INPUT} type="number" value={newDeal.floor} onChange={e => setNewDeal(d => ({ ...d, floor: Number(e.target.value) }))} />
          </Field>
          <div className="col-span-2 md:col-span-5 flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-xl border border-[#E5E8EB] text-[13px] text-[#4E5968]">취소</button>
            <button onClick={addDeal} className="px-5 py-2 rounded-xl bg-[#3182F6] text-white text-[13px] font-bold">추가</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[#F8F9FB] border-b text-[11px] font-bold text-[#8B95A1] uppercase">
          <span>단지명</span><span>평형</span><span>거래가</span><span>계약년월</span><span>층</span><span className="w-10">삭제</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : deals.length === 0 ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">실거래 내역 없음</div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {deals.map(d => (
              <div key={d.id} className="flex md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-4 items-center px-4 py-3 hover:bg-[#F8F9FB]">
                <span className="text-[13px] font-semibold text-[#191F28] truncate flex-1">{d.apt_name ?? d.apt_id}</span>
                <span className="text-[12px] text-[#4E5968] shrink-0">{d.pyeong}평</span>
                <span className="text-[13px] font-bold text-[#3182F6] shrink-0">{fmt만원(d.price)}</span>
                <span className="hidden md:block text-[12px] text-[#4E5968]">{d.deal_date}</span>
                <span className="hidden md:block text-[12px] text-[#4E5968]">{d.floor ?? "—"}층</span>
                <button onClick={async () => { if (confirm("삭제할까요?")) { await adminDeleteDeal(d.id); load(); } }}
                  className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452] shrink-0 md:w-10">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 탭3: 가격 지수 ───────────────────────────────────────────
function PriceIndexTab() {
  const [rows, setRows] = useState<AdminPriceIndex[]>([]);
  const [loading, setLoading] = useState(true);
  const [srcFilter, setSrcFilter] = useState<"" | "kb" | "reb">("");
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState<AdminPriceIndex>({
    source: "kb", region: "인천시 서구",
    period: new Date().toISOString().slice(0, 7).replace("-", ""),
    index_value: null, change_rate: null, trade_count: null,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adminFetchPriceIndex({ source: srcFilter || undefined, limit: 60 })); }
    finally { setLoading(false); }
  }, [srcFilter]);

  useEffect(() => { load(); }, [load]);

  async function addRow() {
    await adminUpsertPriceIndex(newRow);
    setAdding(false);
    load();
  }

  function srcBadge(src: string) {
    return src === "kb"
      ? <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309]">KB</span>
      : <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#6D28D9]">R-ONE</span>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 bg-[#F2F4F6] rounded-xl p-1">
          {(["", "kb", "reb"] as const).map(s => (
            <button key={s} onClick={() => setSrcFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${srcFilter === s ? "bg-white shadow-sm text-[#191F28]" : "text-[#8B95A1]"}`}>
              {s === "" ? "전체" : s === "kb" ? "KB부동산" : "한국부동산원"}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 rounded-xl border border-[#E5E8EB]">
          <RefreshCw size={14} className={loading ? "animate-spin text-[#3182F6]" : "text-[#8B95A1]"} />
        </button>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#3182F6] text-white rounded-xl text-[13px] font-bold ml-auto">
          <Plus size={14} /> 지수 추가
        </button>
      </div>

      {adding && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 mb-3 grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label="출처">
            <select className={SELECT} value={newRow.source} onChange={e => setNewRow(r => ({ ...r, source: e.target.value as "kb" | "reb" }))}>
              <option value="kb">KB부동산</option>
              <option value="reb">한국부동산원 (R-ONE)</option>
            </select>
          </Field>
          <Field label="지역">
            <input className={INPUT} value={newRow.region} onChange={e => setNewRow(r => ({ ...r, region: e.target.value }))} placeholder="인천시 서구" />
          </Field>
          <Field label="기간 (YYYYMM)">
            <input className={INPUT} value={newRow.period} onChange={e => setNewRow(r => ({ ...r, period: e.target.value }))} placeholder="202604" />
          </Field>
          <Field label="지수값">
            <input className={INPUT} type="number" step="0.01"
              value={newRow.index_value ?? ""} onChange={e => setNewRow(r => ({ ...r, index_value: e.target.value ? Number(e.target.value) : null }))} />
          </Field>
          <Field label="변동률(%)">
            <input className={INPUT} type="number" step="0.01"
              value={newRow.change_rate ?? ""} onChange={e => setNewRow(r => ({ ...r, change_rate: e.target.value ? Number(e.target.value) : null }))} />
          </Field>
          <Field label="거래건수">
            <input className={INPUT} type="number"
              value={newRow.trade_count ?? ""} onChange={e => setNewRow(r => ({ ...r, trade_count: e.target.value ? Number(e.target.value) : null }))} />
          </Field>
          <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-xl border border-[#E5E8EB] text-[13px] text-[#4E5968]">취소</button>
            <button onClick={addRow} className="px-5 py-2 rounded-xl bg-[#3182F6] text-white text-[13px] font-bold">추가/업데이트</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E8EB] overflow-hidden">
        <div className="hidden md:grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-[#F8F9FB] border-b text-[11px] font-bold text-[#8B95A1] uppercase">
          <span className="w-16">출처</span><span>지역</span><span>기간</span><span>지수</span><span>변동률</span><span>거래수</span><span className="w-10">삭제</span>
        </div>
        {loading ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">로딩 중...</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-[#B0B8C1] text-[13px]">가격지수 데이터 없음</div>
        ) : (
          <div className="divide-y divide-[#F2F4F6]">
            {rows.map(r => (
              <div key={`${r.source}-${r.region}-${r.period}`}
                className="flex md:grid md:grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_auto] gap-2 md:gap-3 items-center px-4 py-3 hover:bg-[#F8F9FB]">
                <span className="shrink-0 md:w-16">{srcBadge(r.source)}</span>
                <span className="text-[12px] text-[#4E5968] truncate flex-1 md:flex-none">{r.region}</span>
                <span className="text-[12px] font-semibold text-[#191F28] shrink-0">
                  {r.period.length === 6 ? `${r.period.slice(0, 4)}.${r.period.slice(4)}` : r.period}
                </span>
                <span className="hidden md:block text-[12px] text-[#4E5968]">{r.index_value?.toFixed(2) ?? "—"}</span>
                <span className={`hidden md:block text-[13px] font-bold ${(r.change_rate ?? 0) >= 0 ? "text-[#F04452]" : "text-[#3182F6]"}`}>
                  {r.change_rate != null ? `${r.change_rate >= 0 ? "+" : ""}${r.change_rate.toFixed(2)}%` : "—"}
                </span>
                <span className="hidden md:block text-[12px] text-[#4E5968]">{r.trade_count?.toLocaleString() ?? "—"}</span>
                <button onClick={async () => { if (r.id && confirm("삭제할까요?")) { await adminDeletePriceIndex(r.id); load(); } }}
                  className="p-1.5 rounded-lg hover:bg-[#FFF0F0] text-[#F04452] shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────
export default function AdminRealEstatePage() {
  const [tab, setTab] = useState<"apts" | "deals" | "index">("apts");
  const [stats, setStats] = useState({ totalApts: 0, totalDeals: 0, latestDealDate: null as string | null, latestKbPeriod: null as string | null, latestRebPeriod: null as string | null });
  const [apts, setApts] = useState<AdminApartment[]>([]);

  useEffect(() => {
    adminFetchRealEstateStats().then(setStats).catch(() => {});
    adminFetchApartments().then(setApts).catch(() => {});
  }, [tab]);

  const TABS = [
    { id: "apts" as const, label: "단지 관리" },
    { id: "deals" as const, label: "실거래 내역" },
    { id: "index" as const, label: "가격 지수" },
  ];

  return (
    <div className="p-4 md:p-6">
      {/* 헤더 */}
      <div className="mb-4">
        <h1 className="text-[18px] md:text-[20px] font-extrabold text-[#191F28]">부동산 시세 관리</h1>
        <p className="text-[12px] text-[#8B95A1] mt-0.5">검단신도시 아파트 단지·시세·지수 관리</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-5">
        {[
          { label: "단지 수", value: stats.totalApts, color: "#3182F6" },
          { label: "거래 내역", value: stats.totalDeals, color: "#10B981" },
          { label: "최근 거래", value: stats.latestDealDate ?? "—", color: "#8B5CF6", small: true },
          { label: "KB 최신", value: stats.latestKbPeriod ? `${stats.latestKbPeriod.slice(0,4)}.${stats.latestKbPeriod.slice(4)}` : "—", color: "#F59E0B", small: true },
          { label: "R-ONE 최신", value: stats.latestRebPeriod ? `${stats.latestRebPeriod.slice(0,4)}.${stats.latestRebPeriod.slice(4)}` : "—", color: "#F97316", small: true },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E8EB] px-3 py-3 text-center">
            <p className={`font-extrabold ${s.small ? "text-[14px] md:text-[16px]" : "text-[20px] md:text-[24px]"}`} style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] text-[#8B95A1] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-[#F2F4F6] rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${tab === t.id ? "bg-white shadow-sm text-[#191F28]" : "text-[#8B95A1] hover:text-[#191F28]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "apts"  && <ApartmentsTab />}
      {tab === "deals" && <DealsTab apts={apts} />}
      {tab === "index" && <PriceIndexTab />}
    </div>
  );
}
