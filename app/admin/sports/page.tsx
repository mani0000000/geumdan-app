"use client";
import { useEffect, useRef, useState } from "react";
import {
  adminFetchSportsMatches,
  adminCreateSportsMatch,
  adminUpdateSportsMatch,
  adminDeleteSportsMatch,
  adminFetchSportsAssets,
  adminSaveTeamLogo,
  adminSaveLeagueLogo,
  adminSaveBroadcastChannels,
  TEAM_META,
  TEAM_LOGOS,
  LEAGUE_STYLES,
  DEFAULT_SPORTS_ASSETS,
  type SportsMatch,
  type SportType,
  type MatchStatus,
  type TeamCode,
  type SportsAssets,
} from "@/lib/db/sports";
import ImageUpload from "@/components/ui/ImageUpload";
import { Trophy, Plus, Pencil, Trash2, X, Save, Loader2, Image as ImageIcon, Tv, AlertCircle, CheckCircle2 } from "lucide-react";

const SPORTS: SportType[] = ["축구", "야구", "배구", "농구", "A매치"];
const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "upcoming",  label: "예정" },
  { value: "live",      label: "진행중" },
  { value: "finished",  label: "종료" },
  { value: "cancelled", label: "취소" },
];
const TEAM_CODES: TeamCode[] = ["incheon_utd", "ssg_landers", "daehan_jumpos", "incheon_el", "national"];
const LEAGUES = ["K리그1", "KBO", "V리그", "KBL", "A매치"];

const EMPTY: Omit<SportsMatch, "id"> = {
  sport: "축구",
  team_code: "incheon_utd",
  home_team: "",
  away_team: "",
  home_score: null,
  away_score: null,
  match_date: "",
  venue: null,
  status: "upcoming",
  ticket_url: null,
  broadcast: null,
  sort_order: 0,
  active: true,
};

function statusBadge(s: MatchStatus) {
  if (s === "live")      return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold animate-pulse">● LIVE</span>;
  if (s === "finished")  return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold">종료</span>;
  if (s === "cancelled") return <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-[11px] font-bold">취소</span>;
  return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-bold">예정</span>;
}

// 클라이언트 사이드 이미지 압축 (Canvas API)
async function compressLogo(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 256;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob ?? file), "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = objectUrl;
  });
}

// 컴팩트 업로드 버튼 — 클릭 시 압축 후 base64 data URL 반환 (Storage 불필요)
function LogoUploadButton({
  currentUrl, onUpload, onRemove,
}: {
  currentUrl?: string; onUpload: (url: string) => void; onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      // 클라이언트에서 256×256 압축 → base64 직접 반환 (서버 업로드 불필요)
      const blob = await compressLogo(file);
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      onUpload(base64);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "처리 실패");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <button type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[12px] font-bold border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#3182F6] hover:text-[#3182F6] transition-colors disabled:opacity-50">
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
          {currentUrl ? "교체" : "업로드"}
        </button>
        {currentUrl && (
          <button type="button" onClick={onRemove}
            className="px-3 py-2 rounded-xl text-[12px] font-bold text-red-500 border border-red-200 hover:bg-red-50">
            삭제
          </button>
        )}
      </div>
      {err && <p className="text-[11px] text-red-500 mt-1">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

export default function AdminSportsPage() {
  const [tab, setTab] = useState<"matches" | "assets">("matches");

  // ─── 경기 관리 상태 ─────────────────────
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [editing, setEditing] = useState<SportsMatch | null>(null);
  const [form, setForm] = useState<Omit<SportsMatch, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<SportType | "전체">("전체");

  // ─── 로고 & 채널 상태 ───────────────────
  const [assets, setAssets] = useState<SportsAssets>(DEFAULT_SPORTS_ASSETS);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [savingAssets, setSavingAssets] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [newChannel, setNewChannel] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  }

  // ─── 경기 관리 로직 ─────────────────────
  async function loadMatches() {
    setLoadingMatches(true);
    setMatches(await adminFetchSportsMatches());
    setLoadingMatches(false);
  }
  useEffect(() => { loadMatches(); }, []);

  function openNew() {
    setEditing({ id: "__new__", ...EMPTY });
    setForm({ ...EMPTY, sort_order: matches.length });
  }
  function openEdit(m: SportsMatch) {
    setEditing(m);
    setForm({
      sport: m.sport, team_code: m.team_code,
      home_team: m.home_team, away_team: m.away_team,
      home_score: m.home_score, away_score: m.away_score,
      match_date: m.match_date?.slice(0, 16) ?? "",
      venue: m.venue, status: m.status,
      ticket_url: m.ticket_url, broadcast: m.broadcast,
      sort_order: m.sort_order, active: m.active,
    });
  }
  async function save() {
    if (!form.home_team || !form.away_team || !form.match_date) return;
    setSaving(true);
    const payload = { ...form, match_date: new Date(form.match_date).toISOString() };
    if (editing?.id === "__new__") {
      await adminCreateSportsMatch(payload);
    } else if (editing) {
      await adminUpdateSportsMatch(editing.id, payload);
    }
    setSaving(false);
    setEditing(null);
    loadMatches();
  }
  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    setDeleting(id);
    await adminDeleteSportsMatch(id);
    setDeleting(null);
    loadMatches();
  }
  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === "team_code") {
      const meta = TEAM_META[val as TeamCode];
      setForm(f => ({ ...f, [key]: val, sport: meta.sport, home_team: meta.name }));
    }
  }
  const filtered = filter === "전체" ? matches : matches.filter(m => m.sport === filter);

  // ─── 로고 & 채널 로직 ───────────────────
  async function loadAssets() {
    setLoadingAssets(true);
    try { setAssets(await adminFetchSportsAssets()); } catch {}
    setLoadingAssets(false);
  }
  useEffect(() => { if (tab === "assets") loadAssets(); }, [tab]);

  async function updateTeamLogo(tc: TeamCode, url: string | null) {
    setSavingAssets(true);
    try {
      await adminSaveTeamLogo(tc, url);
      setAssets(prev => {
        const teamLogos = { ...prev.teamLogos };
        if (url) teamLogos[tc] = url; else delete teamLogos[tc];
        return { ...prev, teamLogos };
      });
      showToast("저장됐어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    }
    setSavingAssets(false);
  }

  async function updateLeagueLogo(league: string, url: string | null) {
    setSavingAssets(true);
    try {
      await adminSaveLeagueLogo(league, url);
      setAssets(prev => {
        const leagueLogos = { ...prev.leagueLogos };
        if (url) leagueLogos[league] = url; else delete leagueLogos[league];
        return { ...prev, leagueLogos };
      });
      showToast("저장됐어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    }
    setSavingAssets(false);
  }

  async function addChannel() {
    const ch = newChannel.trim();
    if (!ch || assets.broadcastChannels.includes(ch)) return;
    const next = [...assets.broadcastChannels, ch];
    setSavingAssets(true);
    try {
      await adminSaveBroadcastChannels(next);
      setAssets(prev => ({ ...prev, broadcastChannels: next }));
      setNewChannel("");
      showToast("저장됐어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    }
    setSavingAssets(false);
  }

  async function removeChannel(ch: string) {
    const next = assets.broadcastChannels.filter(c => c !== ch);
    setSavingAssets(true);
    try {
      await adminSaveBroadcastChannels(next);
      setAssets(prev => ({ ...prev, broadcastChannels: next }));
      showToast("저장됐어요");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장 실패", false);
    }
    setSavingAssets(false);
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[#3182F6]" />
          <h1 className="text-[20px] font-extrabold text-[#1d1d1f]">스포츠 경기 관리</h1>
        </div>
        {tab === "matches" && (
          <button onClick={openNew}
            className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold active:opacity-80">
            <Plus size={15} />경기 추가
          </button>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
        {([
          { key: "matches", label: "경기 관리" },
          { key: "assets",  label: "로고 & 채널" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-bold transition-all ${
              tab === t.key ? "bg-white text-[#1d1d1f] shadow-sm" : "text-gray-500"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── 경기 관리 탭 ──────────────────────────────── */}
      {tab === "matches" && (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {(["전체", ...SPORTS] as (SportType | "전체")[]).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${
                  filter === s ? "bg-[#3182F6] text-white" : "bg-white text-gray-600 border border-gray-200"
                }`}>
                {s}
              </button>
            ))}
          </div>

          {loadingMatches ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" />불러오는 중…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-[14px]">등록된 경기가 없습니다</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(m => {
                const meta = TEAM_META[m.team_code];
                const dt = m.match_date ? new Date(m.match_date) : null;
                return (
                  <div key={m.id}
                    className={`bg-white rounded-2xl p-4 border ${m.active ? "border-gray-100" : "border-gray-100 opacity-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-[18px]">{meta.emoji}</span>
                          <span className="text-[12px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: meta.color }}>
                            {meta.league}
                          </span>
                          {statusBadge(m.status)}
                          {!m.active && <span className="text-[11px] text-gray-400">비활성</span>}
                        </div>
                        <div className="flex items-center gap-2 text-[15px] font-bold text-[#1d1d1f]">
                          <span>{m.home_team}</span>
                          {(m.home_score != null || m.away_score != null) ? (
                            <span className="text-[#3182F6]">{m.home_score ?? "-"} : {m.away_score ?? "-"}</span>
                          ) : (
                            <span className="text-gray-400 font-normal text-[13px]">vs</span>
                          )}
                          <span>{m.away_team}</span>
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
                        <button onClick={() => openEdit(m)}
                          className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600">
                          <Pencil size={14} />
                        </button>
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
        </>
      )}

      {/* ─── 로고 & 채널 탭 ────────────────────────────── */}
      {tab === "assets" && (
        <div className="space-y-8">
          {loadingAssets ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 size={24} className="animate-spin mr-2" />불러오는 중…
            </div>
          ) : (
            <>
              {/* 팀 로고 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon size={16} className="text-[#3182F6]" />
                  <h2 className="text-[15px] font-extrabold text-[#1d1d1f]">팀 로고</h2>
                  <span className="text-[12px] text-gray-400">홈화면 위젯에 표시됩니다</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {TEAM_CODES.map(tc => {
                    const meta = TEAM_META[tc];
                    const logo = TEAM_LOGOS[tc];
                    const uploadedUrl = assets.teamLogos[tc];
                    return (
                      <div key={tc} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                        {/* 프리뷰 */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center font-black"
                            style={{ background: uploadedUrl ? "transparent" : logo.bg, color: logo.fg, fontSize: 13 }}>
                            {uploadedUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={uploadedUrl} alt={meta.name} className="w-full h-full object-cover" />
                            ) : logo.abbr}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#1d1d1f] truncate">{meta.name}</p>
                            <p className="text-[11px] text-gray-400">{meta.league}</p>
                          </div>
                        </div>
                        {/* 업로드 */}
                        <LogoUploadButton
                          currentUrl={uploadedUrl}
                          onUpload={url => updateTeamLogo(tc, url)}
                          onRemove={() => updateTeamLogo(tc, null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 리그 로고 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={16} className="text-[#3182F6]" />
                  <h2 className="text-[15px] font-extrabold text-[#1d1d1f]">리그 로고</h2>
                  <span className="text-[12px] text-gray-400">경기 카드 헤더에 표시됩니다</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {LEAGUES.map(league => {
                    const ls = LEAGUE_STYLES[league];
                    const uploadedUrl = assets.leagueLogos[league];
                    return (
                      <div key={league} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                        {/* 프리뷰 */}
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-sm flex items-center justify-center"
                            style={{ background: ls?.gradient }}>
                            {uploadedUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={uploadedUrl} alt={league} className="w-10 h-10 object-contain" />
                            ) : (
                              <span className="text-[9px] font-black text-white text-center px-1 leading-tight">{league}</span>
                            )}
                          </div>
                          <p className="text-[13px] font-bold text-[#1d1d1f]">{league}</p>
                        </div>
                        {/* 업로드 */}
                        <LogoUploadButton
                          currentUrl={uploadedUrl}
                          onUpload={url => updateLeagueLogo(league, url)}
                          onRemove={() => updateLeagueLogo(league, null)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* 방송 채널 */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Tv size={16} className="text-[#3182F6]" />
                  <h2 className="text-[15px] font-extrabold text-[#1d1d1f]">방송 채널</h2>
                  <span className="text-[12px] text-gray-400">경기 등록 시 선택 목록</span>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {assets.broadcastChannels.map(ch => (
                      <div key={ch}
                        className="flex items-center gap-1 pl-3 pr-1.5 py-1.5 rounded-full bg-gray-100 text-[13px] font-semibold text-[#1d1d1f]">
                        {ch}
                        <button onClick={() => removeChannel(ch)}
                          className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-300 text-gray-500 ml-0.5">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                    {assets.broadcastChannels.length === 0 && (
                      <p className="text-[13px] text-gray-400">채널이 없습니다</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newChannel}
                      onChange={e => setNewChannel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addChannel()}
                      placeholder="채널 추가 (예: JTBC3)"
                      className="flex-1 h-10 rounded-xl border border-gray-200 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
                    />
                    <button onClick={addChannel} disabled={!newChannel.trim() || savingAssets}
                      className="h-10 px-4 rounded-xl bg-[#3182F6] text-white text-[13px] font-bold disabled:opacity-50 flex items-center gap-1.5">
                      {savingAssets ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      추가
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ─── 경기 편집 모달 ─────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-[500px] bg-white rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-extrabold text-[16px] text-[#1d1d1f]">
                {editing.id === "__new__" ? "경기 추가" : "경기 수정"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">인천 연고 팀</label>
                <select value={form.team_code}
                  onChange={e => setF("team_code", e.target.value as TeamCode)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] bg-white">
                  {TEAM_CODES.map(tc => (
                    <option key={tc} value={tc}>
                      {TEAM_META[tc].emoji} {TEAM_META[tc].name} ({TEAM_META[tc].league})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">홈팀</label>
                  <input value={form.home_team} onChange={e => setF("home_team", e.target.value)}
                    placeholder="홈팀 이름"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">원정팀</label>
                  <input value={form.away_team} onChange={e => setF("away_team", e.target.value)}
                    placeholder="원정팀 이름"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">홈 점수</label>
                  <input type="number" min={0}
                    value={form.home_score ?? ""}
                    onChange={e => setF("home_score", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="-"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-gray-500 mb-1">원정 점수</label>
                  <input type="number" min={0}
                    value={form.away_score ?? ""}
                    onChange={e => setF("away_score", e.target.value === "" ? null : Number(e.target.value))}
                    placeholder="-"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">경기 일시</label>
                <input type="datetime-local" value={form.match_date?.slice(0, 16) ?? ""}
                  onChange={e => setF("match_date", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">경기장</label>
                <input value={form.venue ?? ""}
                  onChange={e => setF("venue", e.target.value || null)}
                  placeholder="예) 인천SSG랜더스필드"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">상태</label>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map(s => (
                    <button key={s.value} type="button"
                      onClick={() => setF("status", s.value)}
                      className={`px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${
                        form.status === s.value ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-gray-600 border-gray-200"
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">중계 채널</label>
                <div className="flex flex-wrap gap-1.5">
                  {assets.broadcastChannels.map(b => (
                    <button key={b} type="button"
                      onClick={() => setF("broadcast", form.broadcast === b ? null : b)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                        form.broadcast === b ? "bg-[#3182F6] text-white border-[#3182F6]" : "bg-white text-gray-600 border-gray-200"
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
                <input value={form.broadcast ?? ""}
                  onChange={e => setF("broadcast", e.target.value || null)}
                  placeholder="직접 입력"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] mt-2" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">예매 링크</label>
                <input value={form.ticket_url ?? ""}
                  onChange={e => setF("ticket_url", e.target.value || null)}
                  placeholder="https://ticket.interpark.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">정렬 순서</label>
                <input type="number" value={form.sort_order}
                  onChange={e => setF("sort_order", Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-11 h-6 rounded-full transition-colors ${form.active ? "bg-[#3182F6]" : "bg-gray-300"}`}
                  onClick={() => setF("active", !form.active)}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${form.active ? "translate-x-5.5" : "translate-x-0.5"}`} />
                </div>
                <span className="text-[13px] font-semibold text-[#1d1d1f]">홈화면에 표시</span>
              </label>
            </div>

            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={save} disabled={saving || !form.home_team || !form.away_team || !form.match_date}
                className="w-full flex items-center justify-center gap-2 bg-[#3182F6] text-white py-3 rounded-xl font-bold text-[15px] disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-[14px] font-semibold text-white ${toast.ok ? "bg-[#191F28]" : "bg-red-500"}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
