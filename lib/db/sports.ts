import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export type SportType = "축구" | "야구" | "배구" | "농구" | "A매치";
export type MatchStatus = "upcoming" | "live" | "finished" | "cancelled";
export type TeamCode = "incheon_utd" | "ssg_landers" | "daehan_jumpos" | "incheon_el" | "national";

export interface SportsMatch {
  id: string;
  sport: SportType;
  team_code: TeamCode;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  match_date: string; // ISO datetime
  venue: string | null;
  status: MatchStatus;
  ticket_url: string | null;
  broadcast: string | null;
  sort_order: number;
  active: boolean;
}

export const TEAM_META: Record<TeamCode, { name: string; sport: SportType; color: string; emoji: string; league: string }> = {
  incheon_utd:    { name: "인천 유나이티드",  sport: "축구",  color: "#0033A0", emoji: "⚽", league: "K리그1" },
  ssg_landers:    { name: "SSG 랜더스",        sport: "야구",  color: "#CE0E2D", emoji: "⚾", league: "KBO" },
  daehan_jumpos:  { name: "대한항공 점보스",  sport: "배구",  color: "#003087", emoji: "🏐", league: "V리그" },
  incheon_el:     { name: "인천 전자랜드",    sport: "농구",  color: "#E31837", emoji: "🏀", league: "KBL" },
  national:       { name: "대한민국",          sport: "A매치", color: "#C60C30", emoji: "🇰🇷", league: "A매치" },
};

export const SPORT_COLORS: Record<SportType, string> = {
  "축구":  "#0033A0",
  "야구":  "#CE0E2D",
  "배구":  "#003087",
  "농구":  "#E31837",
  "A매치": "#C60C30",
};

export const LEAGUE_STYLES: Record<string, { gradient: string; accent: string }> = {
  "K리그1": { gradient: "linear-gradient(135deg,#1a237e,#303f9f)", accent: "#69f0ae" },
  "KBO":    { gradient: "linear-gradient(135deg,#b71c1c,#c62828)", accent: "#ffd54f" },
  "V리그":  { gradient: "linear-gradient(135deg,#0d47a1,#1976d2)", accent: "#ffb300" },
  "KBL":    { gradient: "linear-gradient(135deg,#4a148c,#7b1fa2)", accent: "#ff8a65" },
  "A매치":  { gradient: "linear-gradient(135deg,#b71c1c,#7f0000)", accent: "#ffd700" },
};

export interface TeamLogoData {
  bg: string;
  fg: string;
  abbr: string;
}

export const TEAM_LOGOS: Record<TeamCode, TeamLogoData> = {
  incheon_utd:   { bg: "#0033A0", fg: "#ffffff", abbr: "ICU" },
  ssg_landers:   { bg: "#CE0E2D", fg: "#ffffff", abbr: "SSG" },
  daehan_jumpos: { bg: "#003087", fg: "#FFD700", abbr: "KAL" },
  incheon_el:    { bg: "#E31837", fg: "#ffffff", abbr: "ICH" },
  national:      { bg: "#C60C30", fg: "#ffffff", abbr: "KOR" },
};

export interface Standing {
  rank: number;
  teamName: string;
  teamCode?: TeamCode;
  played: number;
  wins: number;
  draws?: number;
  losses: number;
  points?: number;
  winRate?: number;
}

export const LEAGUE_STANDINGS: Record<string, Standing[]> = {
  "K리그1": [
    { rank: 1, teamName: "울산 HD",         played: 10, wins: 7, draws: 2, losses: 1, points: 23 },
    { rank: 2, teamName: "전북 현대",        played: 10, wins: 6, draws: 2, losses: 2, points: 20 },
    { rank: 3, teamName: "포항 스틸러스",    played: 10, wins: 5, draws: 3, losses: 2, points: 18 },
    { rank: 4, teamName: "서울 FC",          played: 10, wins: 4, draws: 3, losses: 3, points: 15 },
    { rank: 5, teamName: "인천 유나이티드",  teamCode: "incheon_utd", played: 10, wins: 3, draws: 3, losses: 4, points: 12 },
    { rank: 6, teamName: "수원 FC",          played: 10, wins: 2, draws: 2, losses: 6, points: 8 },
  ],
  "KBO": [
    { rank: 1, teamName: "KIA 타이거즈",    played: 35, wins: 23, losses: 12, winRate: 0.657 },
    { rank: 2, teamName: "LG 트윈스",        played: 35, wins: 21, losses: 14, winRate: 0.600 },
    { rank: 3, teamName: "두산 베어스",      played: 35, wins: 20, losses: 15, winRate: 0.571 },
    { rank: 4, teamName: "SSG 랜더스", teamCode: "ssg_landers", played: 35, wins: 18, losses: 17, winRate: 0.514 },
    { rank: 5, teamName: "롯데 자이언츠",   played: 35, wins: 17, losses: 18, winRate: 0.486 },
    { rank: 6, teamName: "키움 히어로즈",   played: 35, wins: 15, losses: 20, winRate: 0.429 },
  ],
  "V리그": [
    { rank: 1, teamName: "대한항공 점보스", teamCode: "daehan_jumpos", played: 22, wins: 17, draws: 0, losses: 5, points: 49 },
    { rank: 2, teamName: "현대캐피탈",       played: 22, wins: 15, draws: 0, losses: 7, points: 43 },
    { rank: 3, teamName: "OK 저축은행",      played: 22, wins: 13, draws: 0, losses: 9, points: 37 },
    { rank: 4, teamName: "삼성화재",         played: 22, wins: 11, draws: 0, losses: 11, points: 32 },
    { rank: 5, teamName: "우리카드",         played: 22, wins: 9,  draws: 0, losses: 13, points: 26 },
  ],
  "KBL": [
    { rank: 1, teamName: "울산 현대모비스",  played: 28, wins: 20, losses: 8,  winRate: 0.714 },
    { rank: 2, teamName: "원주 DB",          played: 28, wins: 18, losses: 10, winRate: 0.643 },
    { rank: 3, teamName: "서울 SK",          played: 28, wins: 16, losses: 12, winRate: 0.571 },
    { rank: 4, teamName: "인천 전자랜드", teamCode: "incheon_el", played: 28, wins: 14, losses: 14, winRate: 0.500 },
    { rank: 5, teamName: "부산 KCC",         played: 28, wins: 12, losses: 16, winRate: 0.429 },
  ],
  "A매치": [
    { rank: 1, teamName: "대한민국",    teamCode: "national", played: 6, wins: 5, draws: 1, losses: 0, points: 16 },
    { rank: 2, teamName: "일본",         played: 6, wins: 4, draws: 1, losses: 1, points: 13 },
    { rank: 3, teamName: "이란",         played: 6, wins: 3, draws: 1, losses: 2, points: 10 },
    { rank: 4, teamName: "사우디아라비아", played: 6, wins: 2, draws: 0, losses: 4, points: 6 },
    { rank: 5, teamName: "호주",         played: 6, wins: 1, draws: 1, losses: 4, points: 4 },
  ],
};

export async function adminFetchSportsMatches(): Promise<SportsMatch[]> {
  return adminApiGet<SportsMatch>("sports_matches", {
    select: "*",
    order: "match_date",
  });
}

export async function adminCreateSportsMatch(m: Omit<SportsMatch, "id">): Promise<string> {
  const id = crypto.randomUUID();
  await adminApiPost("sports_matches", "POST", [{ id, ...m }], { onConflict: "id" });
  return id;
}

export async function adminUpdateSportsMatch(id: string, m: Partial<Omit<SportsMatch, "id">>): Promise<void> {
  await adminApiPost("sports_matches", "PATCH", m, { eq: `id=eq.${id}` });
}

export async function adminDeleteSportsMatch(id: string): Promise<void> {
  await adminApiPost("sports_matches", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// ─── 로고 & 채널 설정 ─────────────────────────────────────────
// 각 로고를 개별 site_settings 키로 분리 저장 (value 크기 제한 우회)
// sports_team_logo_{teamCode}, sports_league_logo_{encoded}, sports_broadcast_channels

export interface SportsAssets {
  teamLogos: Partial<Record<TeamCode, string>>;
  leagueLogos: Partial<Record<string, string>>;
  broadcastChannels: string[];
  awayTeamLogos: Record<string, string>; // teamName → url
  teamSportMap: Record<string, SportType>; // teamName → sport (for admin grouping)
  channelLogos: Record<string, string>; // channelName → url
}

export const DEFAULT_SPORTS_ASSETS: SportsAssets = {
  teamLogos: {},
  leagueLogos: {},
  broadcastChannels: ["SPOTV", "SPOTV2", "MBC스포츠", "KBS N스포츠", "SBS Sports", "tvN스포츠", "쿠팡플레이", "네이버스포츠", "유튜브"],
  awayTeamLogos: {},
  teamSportMap: {},
  channelLogos: {},
};

function leagueKey(league: string) {
  return `sports_league_logo_${league.replace(/[^a-zA-Z0-9가-힣]/g, "_")}`;
}

function awayKey(teamName: string) {
  return `sports_away_logo_${teamName.replace(/[^a-zA-Z0-9가-힣]/g, "_")}`;
}

async function settingsGet(key: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const json = await res.json() as { value?: string | null };
    return json.value ?? null;
  } catch { return null; }
}

async function settingsSet(key: string, value: string): Promise<void> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  const json = await res.json() as { error?: string };
  if (!res.ok) throw new Error(json.error ?? `설정 저장 실패 (${res.status})`);
}

export async function adminFetchSportsAssets(): Promise<SportsAssets> {
  try {
    const teamLogos: Partial<Record<TeamCode, string>> = {};
    const teamCodes: TeamCode[] = ["incheon_utd","ssg_landers","daehan_jumpos","incheon_el","national"];
    await Promise.all(teamCodes.map(async tc => {
      const v = await settingsGet(`sports_team_logo_${tc}`);
      if (v) teamLogos[tc] = v;
    }));

    const leagueLogos: Partial<Record<string, string>> = {};
    const leagues = ["K리그1","KBO","V리그","KBL","A매치"];
    await Promise.all(leagues.map(async lg => {
      const v = await settingsGet(leagueKey(lg));
      if (v) leagueLogos[lg] = v;
    }));

    const chJson = await settingsGet("sports_broadcast_channels");
    const channels = chJson ? JSON.parse(chJson) as string[] : DEFAULT_SPORTS_ASSETS.broadcastChannels;

    const awayTeamLogos: Record<string, string> = {};
    const awayJson = await settingsGet("sports_away_team_logos");
    if (awayJson) { try { Object.assign(awayTeamLogos, JSON.parse(awayJson) as Record<string, string>); } catch { /* */ } }

    const teamSportMap: Record<string, SportType> = {};
    const sportMapJson = await settingsGet("sports_team_sport_map");
    if (sportMapJson) { try { Object.assign(teamSportMap, JSON.parse(sportMapJson) as Record<string, SportType>); } catch { /* */ } }

    const channelLogos: Record<string, string> = {};
    const channelLogosJson = await settingsGet("sports_channel_logos");
    if (channelLogosJson) { try { Object.assign(channelLogos, JSON.parse(channelLogosJson) as Record<string, string>); } catch { /* */ } }

    return { teamLogos, leagueLogos, broadcastChannels: channels, awayTeamLogos, teamSportMap, channelLogos };
  } catch {
    return { ...DEFAULT_SPORTS_ASSETS };
  }
}

export async function adminSaveTeamLogo(tc: TeamCode, url: string | null): Promise<void> {
  await settingsSet(`sports_team_logo_${tc}`, url ?? "");
}

export async function adminSaveLeagueLogo(league: string, url: string | null): Promise<void> {
  await settingsSet(leagueKey(league), url ?? "");
}

export async function adminSaveBroadcastChannels(channels: string[]): Promise<void> {
  await settingsSet("sports_broadcast_channels", JSON.stringify(channels));
}

export async function adminSaveAwayTeamLogo(teamName: string, url: string | null, current: Record<string, string>): Promise<Record<string, string>> {
  const next = { ...current };
  if (url) next[teamName] = url; else delete next[teamName];
  await settingsSet("sports_away_team_logos", JSON.stringify(next));
  return next;
}

export async function adminSaveTeamSportMap(map: Record<string, SportType>): Promise<void> {
  await settingsSet("sports_team_sport_map", JSON.stringify(map));
}

export async function adminSaveChannelLogo(channelName: string, url: string | null, current: Record<string, string>): Promise<Record<string, string>> {
  const next = { ...current };
  if (url) next[channelName] = url; else delete next[channelName];
  await settingsSet("sports_channel_logos", JSON.stringify(next));
  return next;
}

export async function fetchSportsAssets(): Promise<SportsAssets> {
  try {
    const res = await fetch(`/api/admin/db?table=site_settings&select=key,value&eq=key=like.sports_%25`);
    if (!res.ok) return { ...DEFAULT_SPORTS_ASSETS };
    const { data } = await res.json() as { data?: { key: string; value: string }[] };
    if (!data?.length) return { ...DEFAULT_SPORTS_ASSETS };

    const map = Object.fromEntries(data.map(r => [r.key, r.value]));
    const teamLogos: Partial<Record<TeamCode, string>> = {};
    const leagueLogos: Partial<Record<string, string>> = {};
    const teamCodes: TeamCode[] = ["incheon_utd","ssg_landers","daehan_jumpos","incheon_el","national"];
    const leagues = ["K리그1","KBO","V리그","KBL","A매치"];

    for (const tc of teamCodes) {
      const v = map[`sports_team_logo_${tc}`];
      if (v) teamLogos[tc] = v;
    }
    for (const lg of leagues) {
      const v = map[leagueKey(lg)];
      if (v) leagueLogos[lg] = v;
    }

    const chJson = map["sports_broadcast_channels"];
    const channels = chJson ? JSON.parse(chJson) as string[] : DEFAULT_SPORTS_ASSETS.broadcastChannels;

    const awayTeamLogos: Record<string, string> = {};
    const awayJson = map["sports_away_team_logos"];
    if (awayJson) { try { Object.assign(awayTeamLogos, JSON.parse(awayJson) as Record<string, string>); } catch { /* */ } }

    const teamSportMap: Record<string, SportType> = {};
    const sportMapJson = map["sports_team_sport_map"];
    if (sportMapJson) { try { Object.assign(teamSportMap, JSON.parse(sportMapJson) as Record<string, SportType>); } catch { /* */ } }

    const channelLogos: Record<string, string> = {};
    const channelLogosJson = map["sports_channel_logos"];
    if (channelLogosJson) { try { Object.assign(channelLogos, JSON.parse(channelLogosJson) as Record<string, string>); } catch { /* */ } }

    return { teamLogos, leagueLogos, broadcastChannels: channels, awayTeamLogos, teamSportMap, channelLogos };
  } catch {
    return { ...DEFAULT_SPORTS_ASSETS };
  }
}

export async function fetchUpcomingSportsMatches(limit = 20): Promise<SportsMatch[]> {
  try {
    const res = await fetch(
      `/api/admin/db?table=sports_matches&select=*&order=match_date&eq=active.eq.true&limit=${limit}`
    );
    if (!res.ok) return [];
    const { data } = await res.json();
    return (data ?? []) as SportsMatch[];
  } catch {
    return [];
  }
}

// ─── 새 DB 테이블 타입 ────────────────────────────────────────

export interface SportCategory {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface League {
  id: string;
  sport_category_id: string;
  name: string;
  type: "리그" | "A매치" | "컵" | "토너먼트";
  logo_url: string | null;
  sort_order: number;
  active: boolean;
}

export interface Team {
  id: string;
  league_id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  city: string | null;
  sort_order: number;
  active: boolean;
}

export interface Broadcaster {
  id: string;
  name: string;
  channel_number: string | null;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
}

// ─── 새 DB CRUD 함수 ─────────────────────────────────────────

async function dbGet<T>(table: string, params: Record<string, string> = {}): Promise<T[]> {
  const qs = new URLSearchParams({ table, ...params }).toString();
  const res = await fetch(`/api/admin/db?${qs}`);
  if (!res.ok) return [];
  const { data } = await res.json() as { data?: T[] };
  return data ?? [];
}

async function dbPost(table: string, method: string, rows: unknown, extra: Record<string, string> = {}): Promise<void> {
  const res = await fetch("/api/admin/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ table, method, rows, ...extra }),
  });
  if (!res.ok) {
    const j = await res.json() as { error?: string };
    throw new Error(j.error ?? `DB error ${res.status}`);
  }
}

// SportCategory
export async function fetchSportCategories(): Promise<SportCategory[]> {
  return dbGet<SportCategory>("sport_categories", { select: "*", order: "sort_order" });
}
export async function saveSportCategory(c: Partial<SportCategory> & { id?: string }): Promise<void> {
  if (!c.id) c.id = crypto.randomUUID();
  await dbPost("sport_categories", "POST", [c], { onConflict: "id" });
}
export async function deleteSportCategory(id: string): Promise<void> {
  await dbPost("sport_categories", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// League
export async function fetchLeagues(sportCategoryId?: string): Promise<League[]> {
  const params: Record<string, string> = { select: "*", order: "sort_order" };
  if (sportCategoryId) params.eq = `sport_category_id=eq.${sportCategoryId}`;
  return dbGet<League>("leagues", params);
}
export async function saveLeague(l: Partial<League> & { id?: string }): Promise<void> {
  if (!l.id) l.id = crypto.randomUUID();
  await dbPost("leagues", "POST", [l], { onConflict: "id" });
}
export async function deleteLeague(id: string): Promise<void> {
  await dbPost("leagues", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// Team
export async function fetchTeams(leagueId?: string): Promise<Team[]> {
  const params: Record<string, string> = { select: "*", order: "sort_order" };
  if (leagueId) params.eq = `league_id=eq.${leagueId}`;
  return dbGet<Team>("teams", params);
}
export async function saveTeam(t: Partial<Team> & { id?: string }): Promise<void> {
  if (!t.id) t.id = crypto.randomUUID();
  await dbPost("teams", "POST", [t], { onConflict: "id" });
}
export async function deleteTeam(id: string): Promise<void> {
  await dbPost("teams", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// Broadcaster
export async function fetchBroadcasters(): Promise<Broadcaster[]> {
  return dbGet<Broadcaster>("broadcasters", { select: "*", order: "sort_order" });
}
export async function saveBroadcaster(b: Partial<Broadcaster> & { id?: string }): Promise<void> {
  if (!b.id) b.id = crypto.randomUUID();
  await dbPost("broadcasters", "POST", [b], { onConflict: "id" });
}
export async function deleteBroadcaster(id: string): Promise<void> {
  await dbPost("broadcasters", "DELETE", undefined, { eq: `id=eq.${id}` });
}
