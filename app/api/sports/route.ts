import { NextResponse } from "next/server";
import type { SportsMatch } from "@/lib/db/sports";

export const revalidate = 1800;

const KBO_TEAMS: Record<string, string> = {
  SK: "SSG", HT: "KIA", SS: "삼성", OB: "두산", LT: "롯데",
  NC: "NC", WO: "키움", LG: "LG", HH: "한화", KT: "KT",
};

type LandersGame = {
  date: string; gTime: string; stadium: string; home_key: string; visit_key: string;
  end_Flag: string; hScore: number; vScore: number; cancel_Flag: number;
};

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchIncheonUnited(year: number): Promise<SportsMatch[]> {
  const response = await fetch(`https://www.incheonutd.com/match/schedule.php?year=${year}`, {
    next: { revalidate: 1800 },
    headers: { "User-Agent": "GeumdanApp/1.0 (local sports schedule)" },
  });
  if (!response.ok) return [];
  const html = await response.text();
  return html.split(/<div class="gameBox[^"]*"/).slice(1).flatMap((block, index) => {
    const date = block.match(/<p class="date[^"]*">([^<]+)<\/p>/i)?.[1]?.trim();
    const stadium = [...block.matchAll(/<p class="stadium">([\s\S]*?)<\/p>/gi)]
      .map((match) => plainText(match[1]).replace(/^@/, ""))
      .find(Boolean) ?? "";
    const home = plainText(block.match(/<span class="team home">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const away = plainText(block.match(/<span class="team away">([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const score = block.match(/<span class="vs">\s*(\d+)\s*<span>\s*:\s*<\/span>\s*(\d+)/i);
    const parts = date?.match(/(\d{1,2})월\s*(\d{1,2})일[^0-9]*(\d{1,2}):(\d{2})/);
    if (!parts || !home || !away) return [];
    const [, month, day, hour, minute] = parts;
    const finished = Boolean(score);
    const matchDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00+09:00`;
    return [{
      id: `incheon-utd-${year}-${month}-${day}-${index}`,
      sport: "축구",
      team_code: "incheon_utd",
      home_team: home,
      away_team: away,
      home_score: finished ? Number(score?.[1]) : null,
      away_score: finished ? Number(score?.[2]) : null,
      match_date: matchDate,
      venue: stadium,
      status: finished ? "finished" : "upcoming",
      ticket_url: !finished && home.includes("인천") ? "https://www.incheonutd.com/ticket/ticket_intro.php" : null,
      broadcast: null,
      sort_order: index,
      active: true,
    } satisfies SportsMatch];
  });
}

async function fetchShinhanSbirds(): Promise<SportsMatch[]> {
  const response = await fetch("https://www.sbirds.com/game/list", {
    next: { revalidate: 1800 },
    headers: { "User-Agent": "GeumdanApp/1.0 (local sports schedule)" },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const tbody = html.match(/<tbody>([\s\S]*?)<\/tbody>/i)?.[1] ?? "";
  return [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].flatMap((row, index) => {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => plainText(cell[1]));
    if (cells.length < 4) return [];
    const date = cells[0].match(/(\d{4})-(\d{2})-(\d{2})\s*(오전|오후)\s*(\d{1,2}):(\d{2})/);
    const score = cells[3].match(/(\d+)\s*:\s*(\d+)/);
    if (!date) return [];
    let hour = Number(date[5]);
    if (date[4] === "오후" && hour < 12) hour += 12;
    if (date[4] === "오전" && hour === 12) hour = 0;
    const venue = cells[2];
    const isHome = venue.includes("인천");
    return [{
      id: `sbirds-${date[1]}-${date[2]}-${date[3]}-${index}`,
      sport: "농구",
      team_code: "shinhan_sbirds",
      home_team: isHome ? "신한은행" : cells[1],
      away_team: isHome ? cells[1] : "신한은행",
      home_score: score ? Number(isHome ? score[1] : score[2]) : null,
      away_score: score ? Number(isHome ? score[2] : score[1]) : null,
      match_date: `${date[1]}-${date[2]}-${date[3]}T${String(hour).padStart(2, "0")}:${date[6]}:00+09:00`,
      venue,
      status: score ? "finished" : "upcoming",
      ticket_url: null,
      broadcast: null,
      sort_order: index,
      active: true,
    } satisfies SportsMatch];
  });
}

async function fetchLandersMonth(year: number, month: number): Promise<SportsMatch[]> {
  const response = await fetch(`https://www.ssglanders.com/game/schedule/data?year=${year}&month=${month}`, {
    next: { revalidate: 1800 },
    headers: { "User-Agent": "GeumdanApp/1.0 (local sports schedule)" },
  });
  if (!response.ok) return [];
  const games = await response.json() as LandersGame[];
  return games.filter((game) => game.cancel_Flag !== 1).map((game) => ({
    id: `ssg-${game.date}-${game.home_key}-${game.visit_key}`,
    sport: "야구",
    team_code: "ssg_landers",
    home_team: KBO_TEAMS[game.home_key] ?? game.home_key,
    away_team: KBO_TEAMS[game.visit_key] ?? game.visit_key,
    home_score: game.end_Flag === "1" ? game.hScore : null,
    away_score: game.end_Flag === "1" ? game.vScore : null,
    match_date: `${game.date}T${game.gTime || "18:30"}:00+09:00`,
    venue: game.stadium === "인천" ? "인천SSG랜더스필드" : game.stadium,
    status: game.end_Flag === "1" ? "finished" : "upcoming",
    ticket_url: game.stadium === "인천" && game.end_Flag !== "1" ? "https://www.ssglanders.com/game/ticket" : null,
    broadcast: null,
    sort_order: 0,
    active: true,
  }));
}

export async function GET() {
  const now = new Date();
  const korea = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const year = korea.getFullYear();
  const month = korea.getMonth() + 1;
  const next = new Date(year, month, 1);
  try {
    const rows = (await Promise.all([
      fetchLandersMonth(year, month),
      fetchLandersMonth(next.getFullYear(), next.getMonth() + 1),
      fetchIncheonUnited(year),
      fetchShinhanSbirds(),
    ])).flat();
    return NextResponse.json({ matches: rows, updatedAt: new Date().toISOString(), source: "official-club-sites" });
  } catch {
    return NextResponse.json({ matches: [], updatedAt: new Date().toISOString(), source: "unavailable" });
  }
}
