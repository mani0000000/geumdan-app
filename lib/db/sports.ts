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
