"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminFetchSportsMatches,
  adminCreateSportsMatch,
  adminUpdateSportsMatch,
  adminDeleteSportsMatch,
  TEAM_META,
  type SportsMatch,
  type SportType,
  type MatchStatus,
  type TeamCode,
} from "@/lib/db/sports";
import {
  fetchSportCategories, createSportCategory, updateSportCategory, deleteSportCategory,
  fetchLeagues, createLeague, updateLeague, deleteLeague,
  fetchTeams, createTeam, updateTeam, deleteTeam,
  fetchBroadcasters, createBroadcaster, updateBroadcaster, deleteBroadcaster,
  compressImageToBase64,
  type SportCategory, type League, type LeagueType, type Team, type Broadcaster,
} from "@/lib/db/sports-admin";
import {
  Trophy, Plus, Pencil, Trash2, X, Save, Loader2, Image as ImageIcon, Tv, AlertCircle, CheckCircle2,
  Users, Volleyball, ListTree,
} from "lucide-react";

type Tab = "categories" | "leagues" | "teams" | "broadcasters" | "matches";

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "categories",   label: "종목",     icon: ListTree },
  { key: "leagues",      label: "리그/대회", icon: Trophy },
  { key: "teams",        label: "팀",       icon: Users },
  { key: "broadcasters", label: "방송사",    icon: Tv },
  { key: "matches",      label: "경기 일정", icon: Volleyball },
];

// ─── 공용 — 토스트 ─────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  function show(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }
  return { toast, show };
}

// ─── 로고 업로드 버튼 ──────────────────────────────────────────
function LogoUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function pick(file: File) {
    setBusy(true);
    try { onChange(await compressImageToBase64(file)); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  }
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
        {value
          ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={value} alt="" className="w-full h-full object-cover" />
          : <ImageIcon size={16} className="text-gray-300" />}
      </div>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
        className="flex-1 h-10 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-[12px] font-bold hover:border-[#3182F6] hover:text-[#3182F6] disabled:opacity-50 flex items-center justify-center gap-1">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
        {value ? "교체" : "로고 업로드"}
      </button>
      {value && (
        <button type="button" onClick={() => onChange(null)}
          className="h-10 px-3 rounded-xl text-[12px] font-bold text-red-500 border border-red-200 hover:bg-red-50">
          삭제
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) pick(f); }} />
    </div>
  );
}

// ─── 종목 탭 ────────────────────────────────────────────────────
function CategoriesTab({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<SportCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<SportCategory> | null>(null);
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await fetchSportCategories()); } catch (e) { show(String(e), false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name) return;
    try {
      if (editing.id) await updateSportCategory(editing.id, { name: editing.name, icon: editing.icon ?? null, sort_order: editing.sort_order ?? 0, active: editing.active ?? true });
      else await createSportCategory({ name: editing.name, icon: editing.icon ?? null, sort_order: editing.sort_order ?? items.length, active: true });
      setEditing(null);
      await load();
      onChange();
      show("저장됐어요");
    } catch (e) { show(e instanceof Error ? e.message : "저장 실패", false); }
  }

  async function del(id: string) {
    if (!confirm("종목을 삭제하면 하위 리그·팀이 모두 삭제됩니다. 진행할까요?")) return;
    try { await deleteSportCategory(id); await load(); onChange(); show("삭제됐어요"); }
    catch (e) { show(e instanceof Error ? e.message : "삭제 실패", false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setEditing({ name: "", icon: "", sort_order: items.length })}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold">
          <Plus size={15} />종목 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">등록된 종목이 없습니다</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="text-[28px]">{c.icon || "🏆"}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{c.name}</p>
                <p className="text-[11px] text-gray-400">정렬 {c.sort_order}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(c)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Pencil size={13} /></button>
                <button onClick={() => del(c.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "종목 수정" : "종목 추가"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="종목명">
            <input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="예: 축구"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <Field label="아이콘 (이모지)">
            <input value={editing.icon ?? ""} onChange={e => setEditing({ ...editing, icon: e.target.value })}
              placeholder="예: ⚽"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <Field label="정렬 순서">
            <input type="number" value={editing.sort_order ?? 0}
              onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
        </Modal>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ─── 리그 탭 ────────────────────────────────────────────────────
function LeaguesTab({ categories, onChange }: { categories: SportCategory[]; onChange: () => void }) {
  const [items, setItems] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<League> | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await fetchLeagues()); } catch (e) { show(String(e), false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? items : items.filter(l => l.sport_category_id === filter);
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? "—";
  const catIcon = (id: string) => categories.find(c => c.id === id)?.icon ?? "🏆";

  async function save() {
    if (!editing?.name || !editing.sport_category_id) return;
    try {
      const payload = {
        sport_category_id: editing.sport_category_id,
        name: editing.name,
        type: (editing.type ?? "리그") as LeagueType,
        logo_url: editing.logo_url ?? null,
        sort_order: editing.sort_order ?? 0,
        active: editing.active ?? true,
      };
      if (editing.id) await updateLeague(editing.id, payload);
      else await createLeague(payload);
      setEditing(null);
      await load();
      onChange();
      show("저장됐어요");
    } catch (e) { show(e instanceof Error ? e.message : "저장 실패", false); }
  }

  async function del(id: string) {
    if (!confirm("리그를 삭제하면 하위 팀이 모두 삭제됩니다. 진행할까요?")) return;
    try { await deleteLeague(id); await load(); onChange(); show("삭제됐어요"); }
    catch (e) { show(e instanceof Error ? e.message : "삭제 실패", false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>전체</FilterChip>
          {categories.map(c => (
            <FilterChip key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
              {c.icon} {c.name}
            </FilterChip>
          ))}
        </div>
        <button onClick={() => setEditing({ name: "", type: "리그", sport_category_id: categories[0]?.id, sort_order: items.length })}
          disabled={categories.length === 0}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold disabled:opacity-50">
          <Plus size={15} />리그 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">등록된 리그가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(l => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3182F6] to-[#1849A3] flex items-center justify-center overflow-hidden shrink-0">
                {l.logo_url
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={l.logo_url} alt={l.name} className="w-full h-full object-cover" />
                  : <span className="text-white text-[10px] font-black px-1 text-center leading-tight">{l.name}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-[#1d1d1f] truncate">{l.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">{l.type}</span>
                </div>
                <p className="text-[11px] text-gray-400">{catIcon(l.sport_category_id)} {catName(l.sport_category_id)}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(l)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Pencil size={13} /></button>
                <button onClick={() => del(l.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "리그 수정" : "리그 추가"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="종목">
            <select value={editing.sport_category_id ?? ""}
              onChange={e => setEditing({ ...editing, sport_category_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </Field>
          <Field label="리그명">
            <input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="예: K리그1"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <Field label="유형">
            <div className="flex gap-2 flex-wrap">
              {(["리그", "A매치", "컵", "토너먼트"] as LeagueType[]).map(t => (
                <button key={t} type="button" onClick={() => setEditing({ ...editing, type: t })}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border ${
                    (editing.type ?? "리그") === t ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-gray-600 border-gray-200"
                  }`}>{t}</button>
              ))}
            </div>
          </Field>
          <Field label="로고">
            <LogoUploader value={editing.logo_url ?? null} onChange={url => setEditing({ ...editing, logo_url: url })} />
          </Field>
          <Field label="정렬 순서">
            <input type="number" value={editing.sort_order ?? 0}
              onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
        </Modal>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ─── 팀 탭 ──────────────────────────────────────────────────────
function TeamsTab({ categories, leagues, onChange }: { categories: SportCategory[]; leagues: League[]; onChange: () => void }) {
  const [items, setItems] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Team> | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await fetchTeams()); } catch (e) { show(String(e), false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const leagueById = useMemo(() => new Map(leagues.map(l => [l.id, l])), [leagues]);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const filtered = filter === "all" ? items : items.filter(t => t.league_id === filter);

  async function save() {
    if (!editing?.name || !editing.league_id) return;
    try {
      const payload = {
        league_id: editing.league_id,
        name: editing.name,
        short_name: editing.short_name ?? null,
        logo_url: editing.logo_url ?? null,
        primary_color: editing.primary_color ?? null,
        city: editing.city ?? null,
        sort_order: editing.sort_order ?? 0,
        active: editing.active ?? true,
      };
      if (editing.id) await updateTeam(editing.id, payload);
      else await createTeam(payload);
      setEditing(null);
      await load();
      onChange();
      show("저장됐어요");
    } catch (e) { show(e instanceof Error ? e.message : "저장 실패", false); }
  }

  async function del(id: string) {
    if (!confirm("팀을 삭제하시겠습니까?")) return;
    try { await deleteTeam(id); await load(); onChange(); show("삭제됐어요"); }
    catch (e) { show(e instanceof Error ? e.message : "삭제 실패", false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>전체</FilterChip>
          {leagues.map(l => (
            <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
              {catById.get(l.sport_category_id)?.icon} {l.name}
            </FilterChip>
          ))}
        </div>
        <button onClick={() => setEditing({ name: "", league_id: leagues[0]?.id, sort_order: items.length })}
          disabled={leagues.length === 0}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold disabled:opacity-50">
          <Plus size={15} />팀 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">등록된 팀이 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(t => {
            const league = leagueById.get(t.league_id);
            const cat = league ? catById.get(league.sport_category_id) : undefined;
            return (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-black text-white shrink-0"
                  style={{ background: t.primary_color ?? "#94a3b8" }}>
                  {t.logo_url
                    ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                    : <span className="text-[11px]">{t.short_name || t.name.slice(0, 2)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{t.name}</p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {cat?.icon} {league?.name}{t.city ? ` · ${t.city}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(t)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Pencil size={13} /></button>
                  <button onClick={() => del(t.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "팀 수정" : "팀 추가"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="리그">
            <select value={editing.league_id ?? ""}
              onChange={e => setEditing({ ...editing, league_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
              {leagues.map(l => (
                <option key={l.id} value={l.id}>
                  {catById.get(l.sport_category_id)?.icon} {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="팀명">
            <input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="예: SSG 랜더스"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="약어 (3자)">
              <input value={editing.short_name ?? ""} onChange={e => setEditing({ ...editing, short_name: e.target.value || null })}
                placeholder="SSG" maxLength={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
            </Field>
            <Field label="연고지">
              <input value={editing.city ?? ""} onChange={e => setEditing({ ...editing, city: e.target.value || null })}
                placeholder="인천"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
            </Field>
          </div>
          <Field label="대표 색상">
            <div className="flex gap-2">
              <input type="color" value={editing.primary_color ?? "#3182F6"}
                onChange={e => setEditing({ ...editing, primary_color: e.target.value })}
                className="w-12 h-10 rounded-xl border border-gray-200 cursor-pointer" />
              <input value={editing.primary_color ?? ""}
                onChange={e => setEditing({ ...editing, primary_color: e.target.value || null })}
                placeholder="#0033A0"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] font-mono" />
            </div>
          </Field>
          <Field label="로고">
            <LogoUploader value={editing.logo_url ?? null} onChange={url => setEditing({ ...editing, logo_url: url })} />
          </Field>
          <Field label="정렬 순서">
            <input type="number" value={editing.sort_order ?? 0}
              onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
        </Modal>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ─── 방송사 탭 ──────────────────────────────────────────────────
function BroadcastersTab({ onChange }: { onChange: () => void }) {
  const [items, setItems] = useState<Broadcaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Broadcaster> | null>(null);
  const { toast, show } = useToast();

  async function load() {
    setLoading(true);
    try { setItems(await fetchBroadcasters()); } catch (e) { show(String(e), false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing?.name) return;
    try {
      const payload = {
        name: editing.name,
        channel_number: editing.channel_number ?? null,
        logo_url: editing.logo_url ?? null,
        sort_order: editing.sort_order ?? 0,
        active: editing.active ?? true,
      };
      if (editing.id) await updateBroadcaster(editing.id, payload);
      else await createBroadcaster(payload);
      setEditing(null);
      await load();
      onChange();
      show("저장됐어요");
    } catch (e) { show(e instanceof Error ? e.message : "저장 실패", false); }
  }

  async function del(id: string) {
    if (!confirm("방송사를 삭제하시겠습니까?")) return;
    try { await deleteBroadcaster(id); await load(); onChange(); show("삭제됐어요"); }
    catch (e) { show(e instanceof Error ? e.message : "삭제 실패", false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setEditing({ name: "", sort_order: items.length })}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold">
          <Plus size={15} />방송사 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />불러오는 중…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">등록된 방송사가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                {b.logo_url
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" />
                  : <Tv size={18} className="text-gray-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1d1d1f] truncate">{b.name}</p>
                <p className="text-[11px] text-gray-400">{b.channel_number ? `Ch.${b.channel_number}` : "OTT/온라인"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(b)} className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"><Pencil size={13} /></button>
                <button onClick={() => del(b.id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing.id ? "방송사 수정" : "방송사 추가"} onClose={() => setEditing(null)} onSave={save}>
          <Field label="방송사명">
            <input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value })}
              placeholder="예: SPOTV"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <Field label="채널 번호 (없으면 비워두세요)">
            <input value={editing.channel_number ?? ""} onChange={e => setEditing({ ...editing, channel_number: e.target.value || null })}
              placeholder="예: 21"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
          <Field label="로고">
            <LogoUploader value={editing.logo_url ?? null} onChange={url => setEditing({ ...editing, logo_url: url })} />
          </Field>
          <Field label="정렬 순서">
            <input type="number" value={editing.sort_order ?? 0}
              onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>
        </Modal>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ─── 경기 일정 탭 (FK 활용) ─────────────────────────────────────
const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "upcoming", label: "예정" },
  { value: "live", label: "진행중" },
  { value: "finished", label: "종료" },
  { value: "cancelled", label: "취소" },
];

function statusBadge(s: MatchStatus) {
  if (s === "live")      return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold animate-pulse">● LIVE</span>;
  if (s === "finished")  return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold">종료</span>;
  if (s === "cancelled") return <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-bold">취소</span>;
  return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">예정</span>;
}

interface MatchForm {
  league_id: string | null;
  team_home_id: string | null;
  team_away_id: string | null;
  broadcaster_id: string | null;
  // legacy 필드 (호환성 — 자동 채움)
  sport: SportType;
  team_code: TeamCode;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  venue: string | null;
  status: MatchStatus;
  ticket_url: string | null;
  broadcast: string | null;
  sort_order: number;
  active: boolean;
}

const EMPTY_FORM: MatchForm = {
  league_id: null, team_home_id: null, team_away_id: null, broadcaster_id: null,
  sport: "축구", team_code: "incheon_utd",
  home_team: "", away_team: "",
  home_score: null, away_score: null,
  match_date: "",
  venue: null,
  status: "upcoming",
  ticket_url: null,
  broadcast: null,
  sort_order: 0,
  active: true,
};

function MatchesTab({ categories, leagues, teams, broadcasters }: {
  categories: SportCategory[]; leagues: League[]; teams: Team[]; broadcasters: Broadcaster[];
}) {
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{ id: string | null; form: MatchForm } | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { toast, show } = useToast();

  const teamById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const leagueById = useMemo(() => new Map(leagues.map(l => [l.id, l])), [leagues]);
  const catById = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const bcById = useMemo(() => new Map(broadcasters.map(b => [b.id, b])), [broadcasters]);

  async function load() {
    setLoading(true);
    try { setMatches(await adminFetchSportsMatches() as unknown as SportsMatch[]); } catch (e) { show(String(e), false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ id: null, form: { ...EMPTY_FORM, sort_order: matches.length } });
  }

  function openEdit(m: SportsMatch) {
    const ext = m as unknown as SportsMatch & { league_id?: string; team_home_id?: string; team_away_id?: string; broadcaster_id?: string };
    setEditing({
      id: m.id,
      form: {
        league_id: ext.league_id ?? null,
        team_home_id: ext.team_home_id ?? null,
        team_away_id: ext.team_away_id ?? null,
        broadcaster_id: ext.broadcaster_id ?? null,
        sport: m.sport, team_code: m.team_code,
        home_team: m.home_team, away_team: m.away_team,
        home_score: m.home_score, away_score: m.away_score,
        match_date: m.match_date?.slice(0, 16) ?? "",
        venue: m.venue, status: m.status,
        ticket_url: m.ticket_url, broadcast: m.broadcast,
        sort_order: m.sort_order, active: m.active,
      },
    });
  }

  function setF<K extends keyof MatchForm>(key: K, val: MatchForm[K]) {
    setEditing(e => e ? { ...e, form: { ...e.form, [key]: val } } : null);
  }

  // 리그 선택 시 종목 자동 동기화
  function selectLeague(leagueId: string | null) {
    setEditing(e => {
      if (!e) return null;
      const next: MatchForm = { ...e.form, league_id: leagueId, team_home_id: null, team_away_id: null };
      if (leagueId) {
        const lg = leagueById.get(leagueId);
        const cat = lg ? catById.get(lg.sport_category_id) : undefined;
        if (cat) next.sport = cat.name as SportType;
      }
      return { ...e, form: next };
    });
  }

  function selectHomeTeam(teamId: string | null) {
    setEditing(e => {
      if (!e) return null;
      const t = teamId ? teamById.get(teamId) : undefined;
      return { ...e, form: { ...e.form, team_home_id: teamId, home_team: t?.name ?? e.form.home_team } };
    });
  }

  function selectAwayTeam(teamId: string | null) {
    setEditing(e => {
      if (!e) return null;
      const t = teamId ? teamById.get(teamId) : undefined;
      return { ...e, form: { ...e.form, team_away_id: teamId, away_team: t?.name ?? e.form.away_team } };
    });
  }

  function selectBroadcaster(bcId: string | null) {
    setEditing(e => {
      if (!e) return null;
      const b = bcId ? bcById.get(bcId) : undefined;
      return { ...e, form: { ...e.form, broadcaster_id: bcId, broadcast: b?.name ?? e.form.broadcast } };
    });
  }

  async function save() {
    if (!editing) return;
    const f = editing.form;
    if (!f.home_team || !f.away_team || !f.match_date) {
      show("홈팀, 원정팀, 경기 일시를 모두 입력해 주세요", false);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...f,
        match_date: new Date(f.match_date).toISOString(),
      };
      if (editing.id) await adminUpdateSportsMatch(editing.id, payload);
      else await adminCreateSportsMatch(payload);
      setEditing(null);
      await load();
      show("저장됐어요");
    } catch (e) {
      show(e instanceof Error ? e.message : "저장 실패", false);
    }
    setSaving(false);
  }

  async function del(id: string) {
    if (!confirm("경기를 삭제하시겠습니까?")) return;
    setDeleting(id);
    try { await adminDeleteSportsMatch(id); await load(); show("삭제됐어요"); }
    catch (e) { show(e instanceof Error ? e.message : "삭제 실패", false); }
    setDeleting(null);
  }

  const filtered = filter === "all" ? matches : matches.filter(m => {
    const ext = m as unknown as SportsMatch & { league_id?: string };
    return ext.league_id === filter;
  });

  // 편집 중인 리그에 속한 팀 후보
  const teamCandidates = editing?.form.league_id
    ? teams.filter(t => t.league_id === editing.form.league_id)
    : teams;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>전체</FilterChip>
          {leagues.map(l => (
            <FilterChip key={l.id} active={filter === l.id} onClick={() => setFilter(l.id)}>
              {catById.get(l.sport_category_id)?.icon} {l.name}
            </FilterChip>
          ))}
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold">
          <Plus size={15} />경기 추가
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400"><Loader2 size={20} className="animate-spin mr-2" />불러오는 중…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">등록된 경기가 없습니다</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const ext = m as unknown as SportsMatch & { league_id?: string; team_home_id?: string; team_away_id?: string; broadcaster_id?: string };
            const lg = ext.league_id ? leagueById.get(ext.league_id) : undefined;
            const cat = lg ? catById.get(lg.sport_category_id) : undefined;
            const meta = TEAM_META[m.team_code];
            const dt = m.match_date ? new Date(m.match_date) : null;
            const homeTeam = ext.team_home_id ? teamById.get(ext.team_home_id) : undefined;
            const awayTeam = ext.team_away_id ? teamById.get(ext.team_away_id) : undefined;
            return (
              <div key={m.id} className={`bg-white rounded-2xl p-4 border border-gray-100 ${m.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[16px]">{cat?.icon ?? meta?.emoji}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{lg?.name ?? meta?.league}</span>
                      {statusBadge(m.status)}
                      {!m.active && <span className="text-[11px] text-gray-400">비활성</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[15px] font-bold text-[#1d1d1f]">
                      {homeTeam?.logo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={homeTeam.logo_url} alt="" className="w-5 h-5 rounded-full" />}
                      <span>{m.home_team}</span>
                      {(m.home_score != null || m.away_score != null) ? (
                        <span className="text-[#3182F6]">{m.home_score ?? "-"} : {m.away_score ?? "-"}</span>
                      ) : (
                        <span className="text-gray-400 font-normal text-[13px]">vs</span>
                      )}
                      <span>{m.away_team}</span>
                      {awayTeam?.logo_url && /* eslint-disable-next-line @next/next/no-img-element */ <img src={awayTeam.logo_url} alt="" className="w-5 h-5 rounded-full" />}
                    </div>
                    {dt && (
                      <p className="text-[12px] text-gray-500 mt-1">
                        {dt.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} {dt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        {m.venue ? ` · ${m.venue}` : ""}
                        {m.broadcast ? ` · ${m.broadcast}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(m)} className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600"><Pencil size={14} /></button>
                    <button onClick={() => del(m.id)} disabled={deleting === m.id}
                      className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50">
                      {deleting === m.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? "경기 수정" : "경기 추가"}
          onClose={() => setEditing(null)}
          onSave={save}
          saving={saving}
        >
          <Field label="리그/대회">
            <select value={editing.form.league_id ?? ""} onChange={e => selectLeague(e.target.value || null)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
              <option value="">— 리그 선택 (선택사항) —</option>
              {leagues.map(l => (
                <option key={l.id} value={l.id}>
                  {catById.get(l.sport_category_id)?.icon} {l.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="홈팀">
              <select value={editing.form.team_home_id ?? ""} onChange={e => selectHomeTeam(e.target.value || null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
                <option value="">— 선택 —</option>
                {teamCandidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input value={editing.form.home_team} onChange={e => setF("home_team", e.target.value)}
                placeholder="또는 직접 입력"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] mt-1.5" />
            </Field>
            <Field label="원정팀">
              <select value={editing.form.team_away_id ?? ""} onChange={e => selectAwayTeam(e.target.value || null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
                <option value="">— 선택 —</option>
                {teamCandidates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input value={editing.form.away_team} onChange={e => setF("away_team", e.target.value)}
                placeholder="또는 직접 입력"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] mt-1.5" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="홈 점수">
              <input type="number" min={0} value={editing.form.home_score ?? ""}
                onChange={e => setF("home_score", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="-"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
            </Field>
            <Field label="원정 점수">
              <input type="number" min={0} value={editing.form.away_score ?? ""}
                onChange={e => setF("away_score", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="-"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
            </Field>
          </div>

          <Field label="경기 일시">
            <input type="datetime-local" value={editing.form.match_date?.slice(0, 16) ?? ""}
              onChange={e => setF("match_date", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>

          <Field label="경기장">
            <input value={editing.form.venue ?? ""}
              onChange={e => setF("venue", e.target.value || null)}
              placeholder="예: 인천SSG랜더스필드"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>

          <Field label="상태">
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button key={s.value} type="button" onClick={() => setF("status", s.value)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                    editing.form.status === s.value ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-gray-600 border-gray-200"
                  }`}>{s.label}</button>
              ))}
            </div>
          </Field>

          <Field label="중계 방송사">
            <select value={editing.form.broadcaster_id ?? ""} onChange={e => selectBroadcaster(e.target.value || null)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
              <option value="">— 방송사 선택 —</option>
              {broadcasters.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.channel_number ? ` (Ch.${b.channel_number})` : ""}
                </option>
              ))}
            </select>
            <input value={editing.form.broadcast ?? ""} onChange={e => setF("broadcast", e.target.value || null)}
              placeholder="또는 직접 입력"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] mt-1.5" />
          </Field>

          <Field label="예매 링크">
            <input value={editing.form.ticket_url ?? ""} onChange={e => setF("ticket_url", e.target.value || null)}
              placeholder="https://ticket.interpark.com/..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>

          <Field label="정렬 순서">
            <input type="number" value={editing.form.sort_order}
              onChange={e => setF("sort_order", Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
          </Field>

          <label className="flex items-center gap-3 cursor-pointer pt-1">
            <div className={`w-11 h-6 rounded-full transition-colors ${editing.form.active ? "bg-[#3182F6]" : "bg-gray-300"}`}
              onClick={() => setF("active", !editing.form.active)}>
              <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${editing.form.active ? "translate-x-5.5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-[13px] font-semibold text-[#1d1d1f]">홈화면에 표시</span>
          </label>
        </Modal>
      )}
      <Toast toast={toast} />
    </div>
  );
}

// ─── 공통 컴포넌트 ───────────────────────────────────────────────
function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
        active ? "bg-[#3182F6] text-white" : "bg-white text-gray-600 border border-gray-200"
      }`}>{children}</button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose, onSave, saving }: {
  title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saving?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[500px] bg-white rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-extrabold text-[16px] text-[#1d1d1f]">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">{children}</div>
        <div className="px-5 py-4 border-t border-gray-100">
          <button onClick={onSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#3182F6] text-white py-3 rounded-xl font-bold text-[15px] disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }: { toast: { msg: string; ok: boolean } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-[14px] font-semibold text-white ${toast.ok ? "bg-[#191F28]" : "bg-red-500"}`}>
      {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {toast.msg}
    </div>
  );
}

// ─── 페이지 ──────────────────────────────────────────────────────
export default function AdminSportsPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [categories, setCategories] = useState<SportCategory[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [broadcasters, setBroadcasters] = useState<Broadcaster[]>([]);
  const [bootstrapped, setBootstrapped] = useState(false);

  async function reloadAll() {
    try {
      const [c, l, t, b] = await Promise.all([
        fetchSportCategories(),
        fetchLeagues(),
        fetchTeams(),
        fetchBroadcasters(),
      ]);
      setCategories(c); setLeagues(l); setTeams(t); setBroadcasters(b);
    } catch (e) {
      console.warn("[admin/sports] 부트스트랩 실패", e);
    } finally {
      setBootstrapped(true);
    }
  }
  useEffect(() => { reloadAll(); }, []);

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-5">
        <Trophy size={20} className="text-[#3182F6]" />
        <h1 className="text-[20px] font-extrabold text-[#1d1d1f]">스포츠 경기관리</h1>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] font-bold transition-all ${
                active ? "bg-white text-[#1d1d1f] shadow-sm" : "text-gray-500"
              }`}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {!bootstrapped ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 size={24} className="animate-spin mr-2" />초기 데이터 로드 중…
        </div>
      ) : (
        <>
          {tab === "categories"   && <CategoriesTab onChange={reloadAll} />}
          {tab === "leagues"      && <LeaguesTab categories={categories} onChange={reloadAll} />}
          {tab === "teams"        && <TeamsTab categories={categories} leagues={leagues} onChange={reloadAll} />}
          {tab === "broadcasters" && <BroadcastersTab onChange={reloadAll} />}
          {tab === "matches"      && <MatchesTab categories={categories} leagues={leagues} teams={teams} broadcasters={broadcasters} />}
        </>
      )}
    </div>
  );
}
