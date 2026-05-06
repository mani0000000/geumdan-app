"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin, Tv, Calendar } from "lucide-react";
import Link from "next/link";

// ─── 타입 ────────────────────────────────────────────────────
interface SportsMatch {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string;
  venue: string | null;
  status: "upcoming" | "live" | "finished" | "cancelled";
  ticket_url: string | null;
  broadcast: string | null;
  active: boolean;
  league_id?: string | null;
  team_home_id?: string | null;
  team_away_id?: string | null;
  broadcaster_id?: string | null;
}

interface Team {
  id: string;
  league_id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  active: boolean;
}

interface League {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

interface Broadcaster {
  id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

// ─── 헬퍼 ────────────────────────────────────────────────────
function nameToColor(name: string): string {
  const palette = ["#1e40af", "#6d28d9", "#be185d", "#065f46", "#b45309", "#991b1b", "#0e7490", "#4d7c0f"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (/[가-힣]/.test(cleaned)) return cleaned.slice(0, 2);
  return cleaned.slice(0, 3).toUpperCase();
}

function darken(hex: string, amount = 0.35): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.floor(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.floor(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.floor((n & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

function formatDateBadge(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return "오늘";
  const diffDays = Math.ceil((d.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 1) return "내일";
  if (diffDays > 1 && diffDays <= 6) return ["일", "월", "화", "수", "목", "금", "토"][d.getDay()] + "요일";
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return `${month}/${day}`;
}

function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// ─── 팀 로고 ──────────────────────────────────────────────────
function TeamCrest({ team, fallbackName, size = 52 }: { team: Team | null; fallbackName: string; size?: number }) {
  const name = team?.name ?? fallbackName;
  const logo = team?.logo_url ?? null;
  const bg = team?.primary_color ?? nameToColor(name);
  const abbr = team?.short_name ?? getInitials(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-black overflow-hidden ring-2 ring-white/20 shadow-lg"
      style={{
        width: size,
        height: size,
        background: logo ? "#ffffff" : bg,
        color: "#ffffff",
        fontSize: Math.floor(size * 0.32),
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={name} className="w-full h-full object-contain p-1" />
      ) : (
        abbr
      )}
    </div>
  );
}

// ─── 상태 배지 ────────────────────────────────────────────────
function StatusBadge({ match }: { match: SportsMatch }) {
  if (match.status === "live") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </span>
    );
  }
  if (match.status === "finished") {
    return (
      <span className="text-[10px] font-bold text-white/90 bg-white/15 px-2 py-0.5 rounded-full">종료</span>
    );
  }
  if (match.status === "cancelled") {
    return (
      <span className="text-[10px] font-bold text-white/80 bg-white/10 px-2 py-0.5 rounded-full">취소</span>
    );
  }
  if (isToday(match.match_date)) {
    return (
      <span className="text-[10px] font-black text-white bg-blue-500 px-2 py-0.5 rounded-full">오늘</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/85 bg-white/10 px-2 py-0.5 rounded-full">
      <Calendar size={10} /> {formatDateBadge(match.match_date)}
    </span>
  );
}

// ─── 카드 ────────────────────────────────────────────────────
function MatchCard({
  m,
  homeTeam,
  awayTeam,
  league,
  broadcaster,
}: {
  m: SportsMatch;
  homeTeam: Team | null;
  awayTeam: Team | null;
  league: League | null;
  broadcaster: Broadcaster | null;
}) {
  const baseColor = homeTeam?.primary_color ?? awayTeam?.primary_color ?? nameToColor(m.sport);
  const gradient = `linear-gradient(135deg, ${baseColor} 0%, ${darken(baseColor, 0.55)} 100%)`;
  const hasScore = m.home_score != null && m.away_score != null;
  const showScore = hasScore && (m.status === "live" || m.status === "finished");
  const leagueName = league?.name ?? m.sport;
  const broadcastName = broadcaster?.name ?? m.broadcast;

  return (
    <div
      className="shrink-0 w-[280px] rounded-2xl overflow-hidden shadow-lg flex flex-col"
      style={{ background: gradient }}
    >
      {/* 헤더 */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          {league?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={league.logo_url}
              alt={leagueName}
              className="w-4 h-4 object-contain rounded-sm bg-white/95 p-[1px]"
            />
          ) : null}
          <span className="text-[11px] font-black text-white/95 tracking-wide truncate">{leagueName}</span>
        </div>
        <StatusBadge match={m} />
      </div>

      {/* 팀 vs 팀 */}
      <div className="px-3 pt-1 pb-3 flex items-center justify-between gap-2">
        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamCrest team={homeTeam} fallbackName={m.home_team} />
          <p className="text-[11px] font-bold text-white text-center leading-tight line-clamp-2 max-w-[88px]">
            {m.home_team}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center px-1 min-w-[64px]">
          {showScore ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-[26px] font-black text-white leading-none">{m.home_score}</span>
              <span className="text-[15px] font-black text-white/50">:</span>
              <span className="text-[26px] font-black text-white leading-none">{m.away_score}</span>
            </div>
          ) : (
            <>
              <span className="text-[10px] font-bold text-white/70 leading-none">VS</span>
              <span className="text-[16px] font-black text-white leading-tight mt-1">
                {formatKickoffTime(m.match_date)}
              </span>
            </>
          )}
          {m.status === "finished" && <span className="text-[9px] font-bold text-white/60 mt-1">최종</span>}
          {m.status === "live" && (
            <span className="text-[9px] font-bold text-red-200 mt-1 animate-pulse">진행 중</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <TeamCrest team={awayTeam} fallbackName={m.away_team} />
          <p className="text-[11px] font-bold text-white text-center leading-tight line-clamp-2 max-w-[88px]">
            {m.away_team}
          </p>
        </div>
      </div>

      {/* 푸터 (방송사/경기장) */}
      {(broadcastName || m.venue) && (
        <div className="mt-auto px-4 py-2.5 bg-black/25 backdrop-blur-sm flex items-center gap-2 text-[10.5px] text-white/85">
          {broadcastName && (
            <span className="inline-flex items-center gap-1 font-semibold truncate">
              {broadcaster?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={broadcaster.logo_url}
                  alt={broadcastName}
                  className="w-3.5 h-3.5 object-contain rounded-sm bg-white p-[1px]"
                />
              ) : (
                <Tv size={11} />
              )}
              <span className="truncate">{broadcastName}</span>
            </span>
          )}
          {broadcastName && m.venue && <span className="text-white/30">·</span>}
          {m.venue && (
            <span className="inline-flex items-center gap-1 truncate min-w-0">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{m.venue}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 위젯 본체 ────────────────────────────────────────────────
export default function SportsWidget() {
  const [matches, setMatches] = useState<SportsMatch[] | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [broadcasters, setBroadcasters] = useState<Broadcaster[]>([]);
  const [filter, setFilter] = useState<string>("전체");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [mRes, tRes, lRes, bRes] = await Promise.all([
          fetch("/api/admin/db?table=sports_matches&select=*&order=match_date&limit=40"),
          fetch("/api/admin/db?table=teams&select=*"),
          fetch("/api/admin/db?table=leagues&select=*"),
          fetch("/api/admin/db?table=broadcasters&select=*"),
        ]);
        const [mJson, tJson, lJson, bJson] = await Promise.all([
          mRes.ok ? mRes.json() : { data: [] },
          tRes.ok ? tRes.json() : { data: [] },
          lRes.ok ? lRes.json() : { data: [] },
          bRes.ok ? bRes.json() : { data: [] },
        ]);
        if (cancelled) return;
        setMatches(((mJson.data ?? []) as SportsMatch[]).filter(m => m.active !== false));
        setTeams((tJson.data ?? []) as Team[]);
        setLeagues((lJson.data ?? []) as League[]);
        setBroadcasters((bJson.data ?? []) as Broadcaster[]);
      } catch {
        if (!cancelled) setMatches([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const teamsByName = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.name, t);
    return map;
  }, [teams]);

  const teamsById = useMemo(() => {
    const map = new Map<string, Team>();
    for (const t of teams) map.set(t.id, t);
    return map;
  }, [teams]);

  const leaguesById = useMemo(() => {
    const map = new Map<string, League>();
    for (const l of leagues) map.set(l.id, l);
    return map;
  }, [leagues]);

  const leaguesByName = useMemo(() => {
    const map = new Map<string, League>();
    for (const l of leagues) map.set(l.name, l);
    return map;
  }, [leagues]);

  const broadcastersById = useMemo(() => {
    const map = new Map<string, Broadcaster>();
    for (const b of broadcasters) map.set(b.id, b);
    return map;
  }, [broadcasters]);

  const broadcastersByName = useMemo(() => {
    const map = new Map<string, Broadcaster>();
    for (const b of broadcasters) map.set(b.name, b);
    return map;
  }, [broadcasters]);

  if (matches === null) {
    return (
      <div className="px-4 pb-3">
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map(i => (
            <div key={i} className="shrink-0 w-[280px] h-[180px] rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!matches.length) return null;

  const sportTabs = ["전체", ...Array.from(new Set(matches.map(m => m.sport)))];
  const filtered = filter === "전체" ? matches : matches.filter(m => m.sport === filter);

  // 정렬: live → 오늘 예정 → 미래 예정 → 종료 (최신순) → 취소
  const statusRank = (m: SportsMatch) => {
    if (m.status === "live") return 0;
    if (m.status === "upcoming" && isToday(m.match_date)) return 1;
    if (m.status === "upcoming") return 2;
    if (m.status === "finished") return 3;
    return 4;
  };
  const sorted = [...filtered].sort((a, b) => {
    const r = statusRank(a) - statusRank(b);
    if (r !== 0) return r;
    if (a.status === "finished" && b.status === "finished") {
      return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
    }
    return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
  });

  return (
    <>
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <span className="text-[19px] font-extrabold text-[#1d1d1f]">인천 스포츠</span>
        <Link href="/community/?tab=스포츠" className="text-[13px] text-[#0071e3] font-medium flex items-center gap-0.5">
          전체보기 <ChevronRight size={13} />
        </Link>
      </div>

      {/* 종목 필터 */}
      {sportTabs.length > 2 && (
        <div className="overflow-x-auto px-4 pb-2.5" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {sportTabs.map(s => {
              const active = filter === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors"
                  style={
                    active
                      ? { background: "#1d1d1f", color: "#fff" }
                      : { background: "#fff", color: "#6b7280", border: "1px solid #e5e7eb" }
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 카드 가로 스크롤 */}
      <div className="overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
          {sorted.map(m => {
            const homeTeam =
              (m.team_home_id ? teamsById.get(m.team_home_id) : null) ?? teamsByName.get(m.home_team) ?? null;
            const awayTeam =
              (m.team_away_id ? teamsById.get(m.team_away_id) : null) ?? teamsByName.get(m.away_team) ?? null;
            const league =
              (m.league_id ? leaguesById.get(m.league_id) : null) ??
              (m.sport ? leaguesByName.get(m.sport) ?? null : null);
            const broadcaster =
              (m.broadcaster_id ? broadcastersById.get(m.broadcaster_id) : null) ??
              (m.broadcast ? broadcastersByName.get(m.broadcast) ?? null : null);
            return (
              <MatchCard
                key={m.id}
                m={m}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                league={league}
                broadcaster={broadcaster}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}
