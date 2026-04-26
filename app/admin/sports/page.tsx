"use client";
import { useEffect, useState } from "react";
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
import { Trophy, Plus, Pencil, Trash2, X, Save, Loader2 } from "lucide-react";

const SPORTS: SportType[] = ["축구", "야구", "배구", "농구", "A매치"];
const STATUSES: { value: MatchStatus; label: string }[] = [
  { value: "upcoming",  label: "예정" },
  { value: "live",      label: "진행중" },
  { value: "finished",  label: "종료" },
  { value: "cancelled", label: "취소" },
];
const TEAM_CODES: TeamCode[] = ["incheon_utd", "ssg_landers", "daehan_jumpos", "incheon_el", "national"];

const BROADCASTS = ["SPOTV", "SPOTV2", "MBC스포츠", "KBS N스포츠", "SBS Sports", "tvN스포츠", "쿠팡플레이", "네이버스포츠", "유튜브"];

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

export default function AdminSportsPage() {
  const [matches, setMatches] = useState<SportsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<SportsMatch | null>(null);
  const [form, setForm] = useState<Omit<SportsMatch, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<SportType | "전체">("전체");

  async function load() {
    setLoading(true);
    setMatches(await adminFetchSportsMatches());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

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
    load();
  }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    setDeleting(id);
    await adminDeleteSportsMatch(id);
    setDeleting(null);
    load();
  }

  function setF<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
    if (key === "team_code") {
      const meta = TEAM_META[val as TeamCode];
      setForm(f => ({ ...f, [key]: val, sport: meta.sport, home_team: meta.name }));
    }
  }

  const filtered = filter === "전체" ? matches : matches.filter(m => m.sport === filter);

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[#3182F6]" />
          <h1 className="text-[20px] font-extrabold text-[#1d1d1f]">스포츠 경기 관리</h1>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white px-4 py-2 rounded-xl text-[13px] font-bold active:opacity-80">
          <Plus size={15} />경기 추가
        </button>
      </div>

      {/* 종목 필터 */}
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

      {loading ? (
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

      {/* 편집 모달 */}
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

              {/* 팀 / 종목 */}
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

              {/* 홈/어웨이 팀명 */}
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

              {/* 점수 */}
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

              {/* 경기 날짜/시간 */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">경기 일시</label>
                <input type="datetime-local" value={form.match_date?.slice(0, 16) ?? ""}
                  onChange={e => setF("match_date", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              {/* 장소 */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">경기장</label>
                <input value={form.venue ?? ""}
                  onChange={e => setF("venue", e.target.value || null)}
                  placeholder="예) 인천SSG랜더스필드"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              {/* 상태 */}
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

              {/* 중계 */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">중계 채널</label>
                <div className="flex flex-wrap gap-1.5">
                  {BROADCASTS.map(b => (
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

              {/* 예매 URL */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">예매 링크</label>
                <input value={form.ticket_url ?? ""}
                  onChange={e => setF("ticket_url", e.target.value || null)}
                  placeholder="https://ticket.interpark.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              {/* 정렬 순서 */}
              <div>
                <label className="block text-[12px] font-bold text-gray-500 mb-1">정렬 순서</label>
                <input type="number" value={form.sort_order}
                  onChange={e => setF("sort_order", Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px]" />
              </div>

              {/* 활성 */}
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
    </div>
  );
}
