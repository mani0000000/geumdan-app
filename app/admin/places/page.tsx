"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, RefreshCw } from "lucide-react";
import ImageUpload from "@/components/ui/ImageUpload";
import {
  adminFetchPlaces, adminCreatePlace, adminUpdatePlace,
  adminDeletePlace, adminTogglePublished, type AdminPlace,
} from "@/lib/db/admin-places";
import { CATEGORY_META, AREAS, type PlaceCategory, type PlaceArea } from "@/lib/db/places";

const EMPTY: Omit<AdminPlace, "id" | "created_at"> = {
  name: "", category: "kids", area: "강화도",
  short_desc: "", description: "", address: "",
  thumbnail_url: null, tags: [], distance_km: null, drive_min: null,
  operating_hours: null, admission_fee: null, phone: null, website: null,
  published: true, sort_order: 0,
  lat: null, lng: null,
};
function PlaceModal({
  initial, onSave, onClose,
}: {
  initial: AdminPlace | null;
  onSave: (data: Omit<AdminPlace, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<AdminPlace, "id" | "created_at">>(
    initial ? { ...initial } : { ...EMPTY }
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr("장소명을 입력하세요."); return; }
    if (!form.short_desc.trim()) { setErr("한줄 설명을 입력하세요."); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally { setSaving(false); }
  }

  const labelCls = "text-[12px] font-semibold text-[#424245] mb-1 block";
  const inputCls = "w-full border border-[#d2d2d7] rounded-xl px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3]";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#f5f5f7] px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl">
          <h2 className="text-[17px] font-bold text-[#1d1d1f]">{initial ? "장소 수정" : "장소 추가"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#6e6e73] text-[16px] font-bold active:opacity-60">✕</button>
        </div>
        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          {err && <p className="text-[13px] text-[#F04452] bg-[#FFF0F0] rounded-xl px-3 py-2">{err}</p>}

          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>장소명 *</label>
              <input className={inputCls} value={form.name} onChange={e => set("name", e.target.value)} placeholder="예: 강화 자연사박물관" />
            </div>
            <div>
              <label className={labelCls}>카테고리 *</label>
              <select className={inputCls} value={form.category} onChange={e => set("category", e.target.value as PlaceCategory)}>
                {(Object.keys(CATEGORY_META) as PlaceCategory[]).map(k => (
                  <option key={k} value={k}>{CATEGORY_META[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>지역 *</label>
              <select className={inputCls} value={form.area} onChange={e => set("area", e.target.value as PlaceArea)}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>한줄 설명 *</label>
            <input className={inputCls} value={form.short_desc} onChange={e => set("short_desc", e.target.value)} placeholder="카드에 표시되는 짧은 설명 (40자 이내 권장)" maxLength={80} />
          </div>

          <div>
            <label className={labelCls}>상세 설명</label>
            <textarea className={inputCls + " resize-none h-28"} value={form.description} onChange={e => set("description", e.target.value)} placeholder="상세 페이지에 표시되는 본문 설명" />
          </div>

          <div>
            <label className={labelCls}>주소</label>
            <input className={inputCls} value={form.address} onChange={e => set("address", e.target.value)} placeholder="도로명 주소" />
          </div>

          <div>
            <label className={labelCls}>대표 이미지</label>
            <ImageUpload
              value={form.thumbnail_url}
              onChange={url => set("thumbnail_url", url)}
              folder="places"
            />
          </div>

          {/* 거리·시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>검단 기준 거리 (km)</label>
              <input type="number" className={inputCls} value={form.distance_km ?? ""} onChange={e => set("distance_km", e.target.value ? Number(e.target.value) : null)} placeholder="예: 32" />
            </div>
            <div>
              <label className={labelCls}>자동차 소요 (분)</label>
              <input type="number" className={inputCls} value={form.drive_min ?? ""} onChange={e => set("drive_min", e.target.value ? Number(e.target.value) : null)} placeholder="예: 40" />
            </div>
          </div>

          {/* 위도·경도 (지도 연결용) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>위도 (lat)</label>
              <input type="number" step="any" className={inputCls} value={form.lat ?? ""} onChange={e => set("lat", e.target.value ? Number(e.target.value) : null)} placeholder="예: 37.6788" />
            </div>
            <div>
              <label className={labelCls}>경도 (lng)</label>
              <input type="number" step="any" className={inputCls} value={form.lng ?? ""} onChange={e => set("lng", e.target.value ? Number(e.target.value) : null)} placeholder="예: 126.6438" />
            </div>
          </div>

          {/* 운영·요금 */}
          <div>
            <label className={labelCls}>운영시간</label>
            <input className={inputCls} value={form.operating_hours ?? ""} onChange={e => set("operating_hours", e.target.value || null)} placeholder="예: 화~일 09:30~17:30 (월 휴관)" />
          </div>
          <div>
            <label className={labelCls}>입장료</label>
            <input className={inputCls} value={form.admission_fee ?? ""} onChange={e => set("admission_fee", e.target.value || null)} placeholder="예: 어른 3,000원 / 어린이 무료" />
          </div>

          {/* 연락처·웹 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>전화번호</label>
              <input className={inputCls} value={form.phone ?? ""} onChange={e => set("phone", e.target.value || null)} placeholder="032-000-0000" />
            </div>
            <div>
              <label className={labelCls}>웹사이트</label>
              <input className={inputCls} value={form.website ?? ""} onChange={e => set("website", e.target.value || null)} placeholder="https://..." />
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label className={labelCls}>태그 (쉼표 구분)</label>
            <input className={inputCls} value={form.tags.join(", ")} onChange={e => set("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} placeholder="예: 어린이체험, 주차가능, 실내공간" />
          </div>

          {/* 정렬·공개 */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className={labelCls}>정렬 순서</label>
              <input type="number" className={inputCls} value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))} />
            </div>
            <div className="pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => set("published", !form.published)}
                  className={`w-10 h-6 rounded-full transition-colors ${form.published ? "bg-[#34C759]" : "bg-[#d2d2d7]"} relative`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.published ? "translate-x-5" : "translate-x-1"}`} />
                </div>
                <span className="text-[13px] text-[#424245]">공개</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2 pb-4">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl border border-[#d2d2d7] text-[14px] font-semibold text-[#424245]">취소</button>
            <button type="submit" disabled={saving} className="flex-1 h-11 rounded-xl bg-[#0071e3] text-white text-[14px] font-semibold disabled:opacity-50">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminPlacesPage() {
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<PlaceCategory | "all">("all");
  const [modal, setModal] = useState<{ open: boolean; place: AdminPlace | null }>({ open: false, place: null });

  const load = useCallback(async () => {
    setLoading(true);
    try { setPlaces(await adminFetchPlaces()); } catch (e) { console.error(e instanceof Error ? e.message : "로드 실패"); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Omit<AdminPlace, "id" | "created_at">) {
    if (modal.place) {
      await adminUpdatePlace(modal.place.id, data);
    } else {
      await adminCreatePlace(data);
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeletePlace(id);
    setPlaces(p => p.filter(x => x.id !== id));
  }

  async function handleToggle(id: string, current: boolean) {
    await adminTogglePublished(id, !current);
    setPlaces(p => p.map(x => x.id === id ? { ...x, published: !current } : x));
  }

  const filtered = places.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.name.includes(q) || p.area.includes(q) || p.short_desc.includes(q);
    const matchCat = filterCat === "all" || p.category === filterCat;
    return matchQ && matchCat;
  });

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[22px] font-bold text-[#1d1d1f]">가볼만한곳 관리</h1>
          <p className="text-[13px] text-[#6e6e73] mt-0.5">총 {places.length}개 · 공개 {places.filter(p => p.published).length}개</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="w-9 h-9 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
            <RefreshCw size={16} className="text-[#424245]" />
          </button>
          <button onClick={() => setModal({ open: true, place: null })}
            className="flex items-center gap-1.5 bg-[#0071e3] text-white px-4 h-9 rounded-xl text-[14px] font-semibold active:opacity-80">
            <Plus size={16} />장소 추가
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
          <input
            className="w-full h-9 pl-8 pr-3 border border-[#d2d2d7] rounded-xl text-[14px] focus:outline-none focus:border-[#0071e3]"
            placeholder="장소명·지역 검색" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          className="h-9 px-3 border border-[#d2d2d7] rounded-xl text-[14px] focus:outline-none focus:border-[#0071e3] bg-white"
          value={filterCat} onChange={e => setFilterCat(e.target.value as PlaceCategory | "all")}>
          <option value="all">전체 카테고리</option>
          {(Object.keys(CATEGORY_META) as PlaceCategory[]).map(k => (
            <option key={k} value={k}>{CATEGORY_META[k].label}</option>
          ))}
        </select>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-[#f5f5f7] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#86868b] text-[14px]">장소가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            const cat = CATEGORY_META[p.category];
            return (
              <div key={p.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 border border-[#f5f5f7]">
                {/* 썸네일 */}
                <div className="w-14 h-14 rounded-xl bg-[#f5f5f7] shrink-0 overflow-hidden">
                  {p.thumbnail_url
                    ? <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[22px]">📍</div>}
                </div>
                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: cat.color, background: cat.bg }}>{cat.label}</span>
                    <span className="text-[11px] text-[#86868b] font-medium">{p.area}</span>
                    {p.distance_km && <span className="text-[11px] text-[#86868b]">{p.distance_km}km · {p.drive_min}분</span>}
                  </div>
                  <p className="text-[15px] font-bold text-[#1d1d1f] truncate mt-0.5">{p.name}</p>
                  <p className="text-[12px] text-[#6e6e73] truncate">{p.short_desc}</p>
                </div>
                {/* 액션 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggle(p.id, p.published)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center active:opacity-60 ${p.published ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#f5f5f7] text-[#86868b]"}`}>
                    {p.published ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => setModal({ open: true, place: p })}
                    className="w-8 h-8 rounded-xl bg-[#f5f5f7] flex items-center justify-center active:opacity-60">
                    <Pencil size={15} className="text-[#424245]" />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="w-8 h-8 rounded-xl bg-[#FFF0F0] flex items-center justify-center active:opacity-60">
                    <Trash2 size={15} className="text-[#F04452]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal.open && (
        <PlaceModal
          initial={modal.place}
          onSave={handleSave}
          onClose={() => setModal({ open: false, place: null })}
        />
      )}
    </div>
  );
}
