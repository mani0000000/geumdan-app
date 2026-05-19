"use client";
import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Lock, Eye, EyeOff, Plus, Pencil, Trash2, Save,
  CheckCircle2, XCircle, Star, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  fetchStoreById, fetchStoreBrandBundle,
  fetchReservationsByStore, fetchWaitingsByStore, fetchReviewsByStoreIncludingHidden,
  adminUpdateStorePage, adminUpsertMenu, adminDeleteMenu,
  adminUpsertHour, adminUpsertEvent, adminDeleteEvent,
  adminUpsertStoreCoupon, adminDeleteStoreCoupon,
  adminUpdateReservation, adminDeleteReservation,
  adminUpdateWaiting, adminDeleteWaiting,
  adminUpdateReview, adminDeleteReview,
  genId,
  type StoreBrand, type StoreMenu, type StoreHour, type StoreEvent,
  type StoreCouponDetail, type StoreReservation, type StoreWaiting, type StoreReview,
} from "@/lib/db/store-brand";

const TABS = [
  { key: "info",         label: "기본정보" },
  { key: "menu",         label: "메뉴" },
  { key: "hours",        label: "영업시간" },
  { key: "events",       label: "이벤트" },
  { key: "coupons",      label: "쿠폰" },
  { key: "reservations", label: "예약관리" },
  { key: "waitings",     label: "웨이팅" },
  { key: "reviews",      label: "리뷰관리" },
  { key: "modules",      label: "페이지 구성" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const INPUT = "w-full h-10 rounded-lg border border-[#E5E5EA] px-3 text-[14px] outline-none focus:border-[#3182F6]";
const LABEL = "block text-[12px] font-bold text-[#3C3C43] mb-1";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function StoreAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StoreAdmin storeId={id} />;
}

function StoreAdmin({ storeId }: { storeId: string }) {
  const router = useRouter();
  const [store, setStore] = useState<StoreBrand | null>(null);
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("info");
  const [loading, setLoading] = useState(true);

  const reloadStore = useCallback(async () => {
    setLoading(true);
    const s = await fetchStoreById(storeId);
    setStore(s);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { reloadStore(); }, [reloadStore]);

  // 비밀번호 통과 체크 (sessionStorage)
  useEffect(() => {
    if (!store) return;
    const tokenKey = `store_admin_${storeId}`;
    const ok = sessionStorage.getItem(tokenKey) === "1";
    setAuthed(ok);
  }, [store, storeId]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#F5F6F8] flex items-center justify-center">
        <p className="text-[14px] text-[#86868B] animate-pulse">로딩 중…</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-dvh bg-[#F5F6F8] flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-2">🏢</p>
          <p className="text-[15px] font-bold">매장을 찾을 수 없어요</p>
          <button onClick={() => router.push("/stores")} className="mt-4 h-10 px-4 bg-[#0071e3] text-white rounded-xl text-[13px]">
            매장 목록으로
          </button>
        </div>
      </div>
    );
  }

  if (!authed) {
    return <PasswordGate store={store} onPass={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-dvh bg-[#F5F6F8] pb-20">
      {/* Top */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#EBEBED]">
        <div className="max-w-[920px] mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => router.push(`/stores/${storeId}`)} className="p-1.5 -ml-1.5 rounded-full hover:bg-black/5">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-[#86868B]">매장 어드민</p>
            <p className="text-[15px] font-extrabold text-[#1d1d1f] truncate">{store.name}</p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem(`store_admin_${storeId}`); setAuthed(false); }}
            className="text-[12px] text-[#86868B] hover:text-[#1d1d1f]"
          >
            로그아웃
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-[920px] mx-auto px-2 overflow-x-auto">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-3 py-2.5 text-[13px] font-bold border-b-2 transition-colors
                  ${tab === t.key ? "border-[#0071e3] text-[#0071e3]" : "border-transparent text-[#86868B] hover:text-[#1d1d1f]"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-[920px] mx-auto px-4 py-5">
        {tab === "info"         && <InfoTab     store={store} onSaved={reloadStore} />}
        {tab === "menu"         && <MenuTab     storeId={storeId} />}
        {tab === "hours"        && <HoursTab    storeId={storeId} />}
        {tab === "events"       && <EventsTab   storeId={storeId} />}
        {tab === "coupons"      && <CouponsTab  storeId={storeId} store={store} />}
        {tab === "reservations" && <ReservationsTab storeId={storeId} />}
        {tab === "waitings"     && <WaitingsTab     storeId={storeId} />}
        {tab === "reviews"      && <ReviewsTab      storeId={storeId} />}
        {tab === "modules"      && <ModulesTab      store={store} onSaved={reloadStore} />}
      </main>
    </div>
  );
}

// ─── 비밀번호 게이트 ─────────────────────────────────────
function PasswordGate({ store, onPass }: { store: StoreBrand; onPass: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const expected = store.id === "preview"
      ? ""
      : (store as unknown as { admin_password?: string }).admin_password;
    // store.admin_password 는 fetchStoreById 가 normalizeStore 로 깎아냈을 수 있어 raw 가져오기 위해 별도 페치
    fetch("/api/admin/db?table=stores&select=admin_password&eq=id=eq." + encodeURIComponent(store.id))
      .then(r => r.json())
      .then((j: { data?: { admin_password?: string }[] }) => {
        const real = j.data?.[0]?.admin_password ?? expected ?? "";
        // 비번이 비어있으면 "0000" 기본값 허용 (초기 설정 편의)
        const pass = real || "0000";
        if (pw === pass) {
          sessionStorage.setItem(`store_admin_${store.id}`, "1");
          onPass();
        } else {
          setErr("비밀번호가 올바르지 않습니다.");
        }
      })
      .catch(() => setErr("확인 중 오류가 발생했습니다."));
  }

  return (
    <div className="min-h-dvh bg-[#191F28] flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white/5 rounded-2xl p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3182F6] rounded-2xl mb-3">
            <Lock size={20} className="text-white" />
          </div>
          <p className="text-white text-[12px]">매장 어드민</p>
          <h1 className="text-white text-[20px] font-extrabold mt-1">{store.name}</h1>
        </div>
        <label className="block text-white/60 text-[12px] mb-1.5">매장 어드민 비밀번호</label>
        <div className="relative">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(""); }}
            className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 pr-11 text-[14px] outline-none focus:ring-2 focus:ring-[#3182F6] border border-white/10"
            placeholder="기본 0000"
            autoFocus
          />
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {err && <p className="text-[#F04452] text-[12px] mt-2">{err}</p>}
        <button type="submit" className="w-full h-11 mt-4 bg-[#3182F6] text-white font-bold rounded-xl text-[14px]">
          입장
        </button>
        <p className="text-white/40 text-[11px] mt-3 text-center">비밀번호 변경은 검단 백오피스에 문의하세요.</p>
      </form>
    </div>
  );
}

// ─── 기본정보 탭 ───────────────────────────────────────
function InfoTab({ store, onSaved }: { store: StoreBrand; onSaved: () => void }) {
  const [form, setForm] = useState<StoreBrand>(store);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof StoreBrand>(k: K, v: StoreBrand[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    setBusy(true);
    try {
      await adminUpdateStorePage(store.id, {
        name: form.name,
        category: form.category,
        phone: form.phone,
        hours: form.hours,
        description: form.description,
        short_description: form.short_description,
        logo_url: form.logo_url,
        cover_image_url: form.cover_image_url,
        website: form.website,
        sns_instagram: form.sns_instagram,
        sns_kakao: form.sns_kakao,
        parking_info: form.parking_info,
        is_published: form.is_published,
      });
      onSaved();
      alert("저장되었습니다.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="기본 정보">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="매장명">
          <input className={INPUT} value={form.name} onChange={e => set("name", e.target.value)} />
        </Field>
        <Field label="카테고리">
          <input className={INPUT} value={form.category} onChange={e => set("category", e.target.value)} />
        </Field>
        <Field label="전화번호">
          <input className={INPUT} value={form.phone ?? ""} onChange={e => set("phone", e.target.value || null)} />
        </Field>
        <Field label="영업시간 요약 (예: 매일 10:00~22:00)">
          <input className={INPUT} value={form.hours ?? ""} onChange={e => set("hours", e.target.value || null)} />
        </Field>
        <Field label="홈페이지">
          <input className={INPUT} value={form.website ?? ""} onChange={e => set("website", e.target.value || null)} placeholder="https://..." />
        </Field>
        <Field label="인스타그램 핸들">
          <input className={INPUT} value={form.sns_instagram ?? ""} onChange={e => set("sns_instagram", e.target.value || null)} placeholder="@brand" />
        </Field>
        <Field label="카톡 채널 URL">
          <input className={INPUT} value={form.sns_kakao ?? ""} onChange={e => set("sns_kakao", e.target.value || null)} placeholder="https://pf.kakao.com/..." />
        </Field>
        <Field label="주차 안내">
          <input className={INPUT} value={form.parking_info ?? ""} onChange={e => set("parking_info", e.target.value || null)} />
        </Field>
        <Field label="로고 URL">
          <input className={INPUT} value={form.logo_url ?? ""} onChange={e => set("logo_url", e.target.value || null)} placeholder="https://..." />
        </Field>
        <Field label="커버 이미지 URL">
          <input className={INPUT} value={form.cover_image_url ?? ""} onChange={e => set("cover_image_url", e.target.value || null)} placeholder="https://..." />
        </Field>
      </div>
      <Field label="한 줄 소개">
        <input className={INPUT} value={form.short_description ?? ""} onChange={e => set("short_description", e.target.value || null)} placeholder="브랜드 한 줄 소개" />
      </Field>
      <Field label="매장 소개">
        <textarea
          rows={5}
          className="w-full rounded-lg border border-[#E5E5EA] p-3 text-[14px] outline-none focus:border-[#3182F6] resize-none"
          value={form.description ?? ""}
          onChange={e => set("description", e.target.value || null)}
        />
      </Field>
      <label className="flex items-center gap-2 mt-2">
        <input type="checkbox" checked={form.is_published} onChange={e => set("is_published", e.target.checked)} />
        <span className="text-[13px]">공개 (체크 해제 시 페이지 비활성)</span>
      </label>
      <div className="mt-4">
        <button onClick={save} disabled={busy} className="h-10 px-5 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
          <Save size={14} /> {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </Card>
  );
}

// ─── 메뉴 탭 ───────────────────────────────────────────
function MenuTab({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<StoreMenu[]>([]);
  const [editing, setEditing] = useState<StoreMenu | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const b = await fetchStoreBrandBundle(storeId);
    setItems(b.menus);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  function emptyItem(): StoreMenu {
    return {
      id: "", store_id: storeId, category: "", name: "", description: null,
      price: null, image_url: null, is_signature: false, is_available: true,
      sort_order: items.length,
    };
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteMenu(id);
    reload();
  }

  return (
    <Card title="메뉴" right={
      <button onClick={() => setEditing(emptyItem())} className="h-9 px-3 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold inline-flex items-center gap-1">
        <Plus size={14} /> 메뉴 추가
      </button>
    }>
      {loading ? <p className="text-[13px] text-[#86868B]">로딩…</p> : (
        items.length === 0 ? <Empty text="아직 등록된 메뉴가 없어요" /> : (
          <ul className="divide-y divide-[#F2F2F4]">
            {items.map(m => (
              <li key={m.id} className="py-3 flex items-center gap-3">
                {m.image_url ? <img src={m.image_url} className="w-12 h-12 rounded-lg object-cover" alt="" />
                  : <div className="w-12 h-12 rounded-lg bg-[#F5F6F8] flex items-center justify-center text-xl">🍽️</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate">
                    {m.name}
                    {m.is_signature && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#B45309]">시그니처</span>}
                    {!m.is_available && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F2F2F4] text-[#86868B]">품절</span>}
                  </p>
                  <p className="text-[12px] text-[#86868B] truncate">{m.category ?? "—"} · {m.price?.toLocaleString() ?? "—"}원</p>
                </div>
                <button onClick={() => setEditing(m)} className="p-2 hover:bg-[#F5F6F8] rounded-lg"><Pencil size={14} /></button>
                <button onClick={() => remove(m.id)} className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>
        )
      )}

      {editing && <MenuModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Card>
  );
}

function MenuModal({ initial, onClose, onSaved }: { initial: StoreMenu; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  function set<K extends keyof StoreMenu>(k: K, v: StoreMenu[K]) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim()) return alert("메뉴명을 입력하세요.");
    setBusy(true);
    try {
      const id = form.id || genId("mn");
      await adminUpsertMenu({ ...form, id });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <Modal title={initial.id ? "메뉴 수정" : "메뉴 추가"} onClose={onClose}>
      <Field label="이름 *"><input className={INPUT} value={form.name} onChange={e => set("name", e.target.value)} /></Field>
      <Field label="카테고리"><input className={INPUT} value={form.category ?? ""} onChange={e => set("category", e.target.value || null)} /></Field>
      <Field label="설명"><input className={INPUT} value={form.description ?? ""} onChange={e => set("description", e.target.value || null)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="가격 (원)"><input type="number" className={INPUT} value={form.price ?? ""} onChange={e => set("price", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="정렬 순서"><input type="number" className={INPUT} value={form.sort_order} onChange={e => set("sort_order", Number(e.target.value))} /></Field>
      </div>
      <Field label="이미지 URL"><input className={INPUT} value={form.image_url ?? ""} onChange={e => set("image_url", e.target.value || null)} /></Field>
      <div className="flex gap-3 mt-2">
        <label className="flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={form.is_signature} onChange={e => set("is_signature", e.target.checked)} /> 시그니처
        </label>
        <label className="flex items-center gap-1.5 text-[13px]">
          <input type="checkbox" checked={form.is_available} onChange={e => set("is_available", e.target.checked)} /> 판매중
        </label>
      </div>
      <ModalFooter onCancel={onClose} onConfirm={save} busy={busy} />
    </Modal>
  );
}

// ─── 영업시간 탭 ──────────────────────────────────────
function HoursTab({ storeId }: { storeId: string }) {
  const [hours, setHours] = useState<StoreHour[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const b = await fetchStoreBrandBundle(storeId);
    const arr: StoreHour[] = [];
    for (let d = 0; d < 7; d++) {
      const h = b.hours.find(x => x.day_of_week === d);
      arr.push(h ?? {
        id: "", store_id: storeId, day_of_week: d,
        open_time: "10:00", close_time: "22:00",
        break_start: null, break_end: null, is_closed: false,
      });
    }
    setHours(arr);
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  function update(idx: number, patch: Partial<StoreHour>) {
    setHours(arr => arr.map((h, i) => i === idx ? { ...h, ...patch } : h));
  }

  async function saveAll() {
    setBusy(true);
    try {
      for (const h of hours) {
        await adminUpsertHour({ ...h, id: h.id || genId(`hr_d${h.day_of_week}`) });
      }
      alert("저장되었습니다.");
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <Card title="영업시간">
      <ul className="space-y-2">
        {hours.map((h, idx) => (
          <li key={idx} className="flex items-center gap-2 flex-wrap">
            <span className="w-8 text-[14px] font-bold">{DAYS[h.day_of_week]}</span>
            <label className="inline-flex items-center gap-1 text-[12px] text-[#86868B]">
              <input type="checkbox" checked={h.is_closed} onChange={e => update(idx, { is_closed: e.target.checked })} /> 휴무
            </label>
            {!h.is_closed && (
              <>
                <input type="time" className="h-9 rounded-lg border border-[#E5E5EA] px-2 text-[13px]" value={h.open_time ?? ""} onChange={e => update(idx, { open_time: e.target.value })} />
                <span className="text-[#86868B]">~</span>
                <input type="time" className="h-9 rounded-lg border border-[#E5E5EA] px-2 text-[13px]" value={h.close_time ?? ""} onChange={e => update(idx, { close_time: e.target.value })} />
                <span className="text-[11px] text-[#86868B] ml-2">브레이크</span>
                <input type="time" className="h-9 rounded-lg border border-[#E5E5EA] px-2 text-[13px]" value={h.break_start ?? ""} onChange={e => update(idx, { break_start: e.target.value || null })} />
                <span className="text-[#86868B]">~</span>
                <input type="time" className="h-9 rounded-lg border border-[#E5E5EA] px-2 text-[13px]" value={h.break_end ?? ""} onChange={e => update(idx, { break_end: e.target.value || null })} />
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <button onClick={saveAll} disabled={busy} className="h-10 px-5 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold disabled:opacity-50 inline-flex items-center gap-1.5">
          <Save size={14} /> {busy ? "저장 중…" : "전체 저장"}
        </button>
      </div>
    </Card>
  );
}

// ─── 이벤트 탭 ────────────────────────────────────────
function EventsTab({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<StoreEvent[]>([]);
  const [editing, setEditing] = useState<StoreEvent | null>(null);

  const reload = useCallback(async () => {
    const b = await fetchStoreBrandBundle(storeId);
    setItems(b.events);
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  function empty(): StoreEvent {
    return { id: "", store_id: storeId, title: "", description: null, image_url: null, start_date: null, end_date: null, is_active: true };
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteEvent(id);
    reload();
  }

  return (
    <Card title="이벤트" right={
      <button onClick={() => setEditing(empty())} className="h-9 px-3 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold inline-flex items-center gap-1">
        <Plus size={14} /> 추가
      </button>
    }>
      {items.length === 0 ? <Empty text="등록된 이벤트가 없어요" /> : (
        <ul className="divide-y divide-[#F2F2F4]">
          {items.map(e => (
            <li key={e.id} className="py-3 flex items-start gap-3">
              {e.image_url && <img src={e.image_url} className="w-16 h-16 object-cover rounded-lg" alt="" />}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold">{e.title}</p>
                <p className="text-[12px] text-[#86868B] line-clamp-2">{e.description}</p>
                <p className="text-[11px] text-[#86868B] mt-1">{e.start_date ?? "—"} ~ {e.end_date ?? "—"}</p>
              </div>
              <button onClick={() => setEditing(e)} className="p-2 hover:bg-[#F5F6F8] rounded-lg"><Pencil size={14} /></button>
              <button onClick={() => remove(e.id)} className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {editing && <EventModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Card>
  );
}

function EventModal({ initial, onClose, onSaved }: { initial: StoreEvent; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  function set<K extends keyof StoreEvent>(k: K, v: StoreEvent[K]) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.title.trim()) return alert("제목을 입력하세요.");
    setBusy(true);
    try {
      await adminUpsertEvent({ ...form, id: form.id || genId("ev") });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <Modal title={initial.id ? "이벤트 수정" : "이벤트 추가"} onClose={onClose}>
      <Field label="제목 *"><input className={INPUT} value={form.title} onChange={e => set("title", e.target.value)} /></Field>
      <Field label="설명">
        <textarea rows={4} className="w-full rounded-lg border border-[#E5E5EA] p-3 text-[14px] resize-none" value={form.description ?? ""} onChange={e => set("description", e.target.value || null)} />
      </Field>
      <Field label="이미지 URL"><input className={INPUT} value={form.image_url ?? ""} onChange={e => set("image_url", e.target.value || null)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="시작일"><input type="date" className={INPUT} value={form.start_date ?? ""} onChange={e => set("start_date", e.target.value || null)} /></Field>
        <Field label="종료일"><input type="date" className={INPUT} value={form.end_date ?? ""} onChange={e => set("end_date", e.target.value || null)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] mt-2">
        <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} /> 활성
      </label>
      <ModalFooter onCancel={onClose} onConfirm={save} busy={busy} />
    </Modal>
  );
}

// ─── 쿠폰 탭 ──────────────────────────────────────────
function CouponsTab({ storeId, store }: { storeId: string; store: StoreBrand }) {
  const [items, setItems] = useState<StoreCouponDetail[]>([]);
  const [editing, setEditing] = useState<StoreCouponDetail | null>(null);

  const reload = useCallback(async () => {
    const b = await fetchStoreBrandBundle(storeId);
    setItems(b.coupons);
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  function empty(): StoreCouponDetail {
    return {
      id: "", store_id: storeId, store_name: store.name,
      building_name: "", title: "", description: null,
      discount: "10%", discount_type: "rate", discount_value: 10,
      min_order_amount: null, max_discount_amount: null, code: null,
      start_date: null, end_date: null,
      expiry: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      usage_limit: null, used_count: 0,
      category: store.category, color: "#3182F6", active: true,
    };
  }

  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteStoreCoupon(id);
    reload();
  }

  return (
    <Card title="쿠폰" right={
      <button onClick={() => setEditing(empty())} className="h-9 px-3 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold inline-flex items-center gap-1">
        <Plus size={14} /> 추가
      </button>
    }>
      {items.length === 0 ? <Empty text="등록된 쿠폰이 없어요" /> : (
        <ul className="divide-y divide-[#F2F2F4]">
          {items.map(c => (
            <li key={c.id} className="py-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-extrabold text-[12px]" style={{ background: c.color }}>{c.discount}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold truncate">{c.title}</p>
                <p className="text-[11px] text-[#86868B]">~{c.expiry} · 사용 {c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</p>
              </div>
              <button onClick={() => setEditing(c)} className="p-2 hover:bg-[#F5F6F8] rounded-lg"><Pencil size={14} /></button>
              <button onClick={() => remove(c.id)} className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded-lg"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      )}

      {editing && <CouponModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </Card>
  );
}

function CouponModal({ initial, onClose, onSaved }: { initial: StoreCouponDetail; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  function set<K extends keyof StoreCouponDetail>(k: K, v: StoreCouponDetail[K]) { setForm(f => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.title.trim()) return alert("제목을 입력하세요.");
    setBusy(true);
    try {
      await adminUpsertStoreCoupon({ ...form, id: form.id || genId("cp") });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <Modal title={initial.id ? "쿠폰 수정" : "쿠폰 추가"} onClose={onClose}>
      <Field label="제목 *"><input className={INPUT} value={form.title} onChange={e => set("title", e.target.value)} /></Field>
      <Field label="설명"><input className={INPUT} value={form.description ?? ""} onChange={e => set("description", e.target.value || null)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="할인 표시">
          <input className={INPUT} value={form.discount} onChange={e => set("discount", e.target.value)} placeholder="10% 또는 1000원" />
        </Field>
        <Field label="할인 유형">
          <select className={INPUT} value={form.discount_type} onChange={e => set("discount_type", e.target.value as "rate" | "amount")}>
            <option value="rate">% (정률)</option>
            <option value="amount">원 (정액)</option>
          </select>
        </Field>
        <Field label="값"><input type="number" className={INPUT} value={form.discount_value ?? ""} onChange={e => set("discount_value", e.target.value ? Number(e.target.value) : null)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="최소 주문(원)"><input type="number" className={INPUT} value={form.min_order_amount ?? ""} onChange={e => set("min_order_amount", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="최대 할인(원)"><input type="number" className={INPUT} value={form.max_discount_amount ?? ""} onChange={e => set("max_discount_amount", e.target.value ? Number(e.target.value) : null)} /></Field>
      </div>
      <Field label="코드 (선택)"><input className={INPUT} value={form.code ?? ""} onChange={e => set("code", e.target.value || null)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="만료일 *"><input type="date" className={INPUT} value={form.expiry} onChange={e => set("expiry", e.target.value)} /></Field>
        <Field label="사용 한도"><input type="number" className={INPUT} value={form.usage_limit ?? ""} onChange={e => set("usage_limit", e.target.value ? Number(e.target.value) : null)} /></Field>
      </div>
      <Field label="컬러">
        <input type="color" className="h-10 w-20 rounded border border-[#E5E5EA]" value={form.color} onChange={e => set("color", e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-[13px] mt-2">
        <input type="checkbox" checked={form.active} onChange={e => set("active", e.target.checked)} /> 활성
      </label>
      <ModalFooter onCancel={onClose} onConfirm={save} busy={busy} />
    </Modal>
  );
}

// ─── 예약관리 탭 ──────────────────────────────────────
function ReservationsTab({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<StoreReservation[]>([]);

  const reload = useCallback(async () => {
    setItems(await fetchReservationsByStore(storeId));
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  async function update(id: string, status: StoreReservation["status"]) {
    await adminUpdateReservation(id, { status });
    reload();
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteReservation(id);
    reload();
  }

  return (
    <Card title={`예약 관리 (${items.length})`}>
      {items.length === 0 ? <Empty text="예약 신청이 아직 없어요" /> : (
        <ul className="divide-y divide-[#F2F2F4]">
          {items.map(r => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold">{r.customer_name} · {r.party_size}명</p>
                  <p className="text-[12px] text-[#86868B]">{r.reservation_date} {r.reservation_time} {r.customer_phone && `· ${r.customer_phone}`}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex gap-1">
                  {r.status !== "confirmed" && <button onClick={() => update(r.id, "confirmed")} className="h-8 px-2 rounded-lg bg-[#E6F7EE] text-[#16A34A] text-[12px] font-bold inline-flex items-center gap-1"><CheckCircle2 size={13} /> 확정</button>}
                  {r.status !== "cancelled" && <button onClick={() => update(r.id, "cancelled")} className="h-8 px-2 rounded-lg bg-[#FEE2E2] text-[#DC2626] text-[12px] font-bold inline-flex items-center gap-1"><XCircle size={13} /> 취소</button>}
                  {r.status !== "completed" && <button onClick={() => update(r.id, "completed")} className="h-8 px-2 rounded-lg bg-[#E0E7FF] text-[#3730A3] text-[12px] font-bold">완료</button>}
                  <button onClick={() => remove(r.id)} className="h-8 w-8 rounded-lg hover:bg-[#FEE2E2] text-[#DC2626] inline-flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── 웨이팅 탭 ────────────────────────────────────────
function WaitingsTab({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<StoreWaiting[]>([]);

  const reload = useCallback(async () => {
    setItems(await fetchWaitingsByStore(storeId));
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  async function update(id: string, status: StoreWaiting["status"]) {
    await adminUpdateWaiting(id, { status });
    reload();
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteWaiting(id);
    reload();
  }

  return (
    <Card title={`웨이팅 (${items.length})`}>
      {items.length === 0 ? <Empty text="대기 중인 손님이 없어요" /> : (
        <ul className="divide-y divide-[#F2F2F4]">
          {items.map(w => (
            <li key={w.id} className="py-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#F0F7FF] text-[#0071e3] font-extrabold flex items-center justify-center">{w.queue_number ?? "—"}</div>
                  <div>
                    <p className="text-[14px] font-bold">{w.customer_name} · {w.party_size}명</p>
                    <p className="text-[12px] text-[#86868B]">{w.customer_phone ?? "—"}</p>
                    <StatusBadge status={w.status} />
                  </div>
                </div>
                <div className="flex gap-1">
                  {w.status === "waiting" && <button onClick={() => update(w.id, "called")} className="h-8 px-2 rounded-lg bg-[#FFF7ED] text-[#C2410C] text-[12px] font-bold">호출</button>}
                  {w.status !== "seated" && <button onClick={() => update(w.id, "seated")} className="h-8 px-2 rounded-lg bg-[#E6F7EE] text-[#16A34A] text-[12px] font-bold">착석</button>}
                  {w.status !== "cancelled" && <button onClick={() => update(w.id, "cancelled")} className="h-8 px-2 rounded-lg bg-[#FEE2E2] text-[#DC2626] text-[12px] font-bold">취소</button>}
                  <button onClick={() => remove(w.id)} className="h-8 w-8 rounded-lg hover:bg-[#FEE2E2] text-[#DC2626] inline-flex items-center justify-center"><Trash2 size={13} /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── 리뷰관리 탭 ──────────────────────────────────────
function ReviewsTab({ storeId }: { storeId: string }) {
  const [items, setItems] = useState<StoreReview[]>([]);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const reload = useCallback(async () => {
    setItems(await fetchReviewsByStoreIncludingHidden(storeId));
  }, [storeId]);

  useEffect(() => { reload(); }, [reload]);

  async function toggleHide(r: StoreReview) {
    await adminUpdateReview(r.id, { is_hidden: !r.is_hidden });
    reload();
  }
  async function remove(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await adminDeleteReview(id);
    reload();
  }
  async function saveReply(r: StoreReview) {
    await adminUpdateReview(r.id, { owner_reply: replyText.trim() || null });
    setReplyId(null);
    setReplyText("");
    reload();
  }

  return (
    <Card title={`리뷰 관리 (${items.length})`}>
      {items.length === 0 ? <Empty text="아직 리뷰가 없어요" /> : (
        <ul className="space-y-3">
          {items.map(r => (
            <li key={r.id} className={`border rounded-xl p-3 ${r.is_hidden ? "bg-[#F5F6F8] border-[#E5E5EA] opacity-70" : "bg-white border-[#F2F2F4]"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-bold">{r.author_nickname}</p>
                  <div className="flex">
                    {[1,2,3,4,5].map(i => <Star key={i} size={11} className={i <= r.rating ? "text-[#FFBB00] fill-[#FFBB00]" : "text-[#D4D6DA]"} />)}
                  </div>
                </div>
                <p className="text-[11px] text-[#86868B]">{r.created_at.slice(0, 10)}</p>
              </div>
              {r.content && <p className="text-[13px] mt-1">{r.content}</p>}
              {r.owner_reply && (
                <div className="mt-2 ml-2 pl-3 border-l-2 border-[#3182F6] bg-[#F0F7FF] rounded-r-lg p-2">
                  <p className="text-[11px] font-bold text-[#3182F6] mb-1">사장님 답글</p>
                  <p className="text-[12px]">{r.owner_reply}</p>
                </div>
              )}
              {replyId === r.id ? (
                <div className="mt-2">
                  <textarea rows={2} value={replyText} onChange={e => setReplyText(e.target.value)} className="w-full rounded-lg border border-[#E5E5EA] p-2 text-[13px] resize-none" placeholder="답글 작성" />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => saveReply(r)} className="h-8 px-3 rounded-lg bg-[#0071e3] text-white text-[12px] font-bold">저장</button>
                    <button onClick={() => { setReplyId(null); setReplyText(""); }} className="h-8 px-3 rounded-lg bg-[#F2F2F4] text-[#1d1d1f] text-[12px] font-bold">취소</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setReplyId(r.id); setReplyText(r.owner_reply ?? ""); }} className="h-8 px-3 rounded-lg bg-[#F0F7FF] text-[#0071e3] text-[12px] font-bold">{r.owner_reply ? "답글 수정" : "답글 작성"}</button>
                  <button onClick={() => toggleHide(r)} className="h-8 px-3 rounded-lg bg-[#F2F2F4] text-[#1d1d1f] text-[12px] font-bold">{r.is_hidden ? "표시" : "숨김"}</button>
                  <button onClick={() => remove(r.id)} className="h-8 px-3 rounded-lg bg-[#FEE2E2] text-[#DC2626] text-[12px] font-bold inline-flex items-center gap-1"><Trash2 size={12} /> 삭제</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── 페이지 모듈 순서 탭 ──────────────────────────────
const ALL_MODULES: { key: string; label: string }[] = [
  { key: "hero",     label: "히어로 (필수)" },
  { key: "info",     label: "매장 소개" },
  { key: "menu",     label: "메뉴" },
  { key: "hours",    label: "영업시간" },
  { key: "events",   label: "이벤트" },
  { key: "coupons",  label: "쿠폰" },
  { key: "reviews",  label: "리뷰" },
  { key: "map",      label: "지도" },
  { key: "reserve",  label: "예약 폼" },
  { key: "waiting",  label: "웨이팅 폼" },
];

function ModulesTab({ store, onSaved }: { store: StoreBrand; onSaved: () => void }) {
  const [modules, setModules] = useState<string[]>(store.page_modules);
  const [busy, setBusy] = useState(false);

  function move(idx: number, dir: -1 | 1) {
    setModules(arr => {
      const next = [...arr];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return arr;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  }
  function toggle(key: string) {
    setModules(arr => arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key]);
  }

  async function save() {
    setBusy(true);
    try {
      await adminUpdateStorePage(store.id, { page_modules: modules });
      alert("저장되었습니다.");
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 실패");
    } finally { setBusy(false); }
  }

  return (
    <Card title="페이지 모듈 구성">
      <p className="text-[12px] text-[#86868B] mb-3">매장 상세 페이지에 표시할 섹션과 순서를 정합니다.</p>
      <ul className="space-y-1.5">
        {modules.map((key, idx) => {
          const meta = ALL_MODULES.find(m => m.key === key);
          return (
            <li key={key} className="flex items-center gap-2 bg-[#F5F6F8] rounded-lg px-3 py-2">
              <span className="text-[12px] text-[#86868B] tabular-nums w-5">{idx + 1}</span>
              <span className="flex-1 text-[13px] font-bold">{meta?.label ?? key}</span>
              <button onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-white disabled:opacity-30"><ArrowUp size={13} /></button>
              <button onClick={() => move(idx, 1)} disabled={idx === modules.length - 1} className="p-1.5 rounded hover:bg-white disabled:opacity-30"><ArrowDown size={13} /></button>
              <button onClick={() => toggle(key)} className="p-1.5 rounded hover:bg-[#FEE2E2] text-[#DC2626]"><Trash2 size={13} /></button>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px] text-[#86868B] mt-4 mb-2">+ 추가할 모듈</p>
      <div className="flex flex-wrap gap-1.5">
        {ALL_MODULES.filter(m => !modules.includes(m.key)).map(m => (
          <button key={m.key} onClick={() => toggle(m.key)} className="h-8 px-3 rounded-full border border-[#E5E5EA] text-[12px] hover:border-[#0071e3] hover:text-[#0071e3]">
            + {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        <button onClick={save} disabled={busy} className="h-10 px-5 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold disabled:opacity-50">
          {busy ? "저장 중…" : "저장"}
        </button>
      </div>
    </Card>
  );
}

// ─── 공통 ─────────────────────────────────────────────
function Card({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-extrabold text-[#1d1d1f]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-[13px] text-[#86868B] py-6 text-center">{text}</p>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    pending:   { bg: "#FEF3C7", fg: "#92400E", label: "대기" },
    confirmed: { bg: "#E6F7EE", fg: "#16A34A", label: "확정" },
    cancelled: { bg: "#FEE2E2", fg: "#DC2626", label: "취소" },
    completed: { bg: "#E0E7FF", fg: "#3730A3", label: "완료" },
    no_show:   { bg: "#F2F2F4", fg: "#86868B", label: "노쇼" },
    waiting:   { bg: "#FEF3C7", fg: "#92400E", label: "대기중" },
    called:    { bg: "#FFF7ED", fg: "#C2410C", label: "호출" },
    seated:    { bg: "#E6F7EE", fg: "#16A34A", label: "착석" },
  };
  const m = map[status] ?? { bg: "#F2F2F4", fg: "#86868B", label: status };
  return <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: m.bg, color: m.fg }}>{m.label}</span>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:px-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#F2F2F4] flex items-center justify-between">
          <h3 className="text-[15px] font-extrabold">{title}</h3>
          <button onClick={onClose} className="text-[#86868B] hover:text-[#1d1d1f] text-xl">✕</button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: () => void; busy: boolean }) {
  return (
    <div className="flex gap-2 mt-4 pt-3 border-t border-[#F2F2F4]">
      <button onClick={onCancel} className="flex-1 h-10 rounded-lg bg-[#F2F2F4] text-[#1d1d1f] text-[13px] font-bold">취소</button>
      <button onClick={onConfirm} disabled={busy} className="flex-1 h-10 rounded-lg bg-[#0071e3] text-white text-[13px] font-bold disabled:opacity-50">
        {busy ? "저장 중…" : "저장"}
      </button>
    </div>
  );
}
