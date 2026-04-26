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
