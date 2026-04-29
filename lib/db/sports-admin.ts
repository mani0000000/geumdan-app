import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

// ─── 타입 ────────────────────────────────────────────────────────
export interface SportCategory {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at?: string;
}

export type LeagueType = "리그" | "A매치" | "컵" | "토너먼트";

export interface League {
  id: string;
  sport_category_id: string;
  name: string;
  type: LeagueType;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
  created_at?: string;
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
  created_at?: string;
}

export interface Broadcaster {
  id: string;
  name: string;
  channel_number: string | null;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
  created_at?: string;
}

// ─── 종목 ─────────────────────────────────────────────────────────
export async function fetchSportCategories(): Promise<SportCategory[]> {
  return adminApiGet<SportCategory>("sport_categories", { select: "*", order: "sort_order" });
}

export async function createSportCategory(input: Omit<SportCategory, "id" | "created_at">): Promise<void> {
  await adminApiPost("sport_categories", "POST", [input]);
}

export async function updateSportCategory(id: string, patch: Partial<Omit<SportCategory, "id" | "created_at">>): Promise<void> {
  await adminApiPost("sport_categories", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function deleteSportCategory(id: string): Promise<void> {
  await adminApiPost("sport_categories", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// ─── 리그 ─────────────────────────────────────────────────────────
export async function fetchLeagues(): Promise<League[]> {
  return adminApiGet<League>("leagues", { select: "*", order: "sort_order" });
}

export async function createLeague(input: Omit<League, "id" | "created_at">): Promise<void> {
  await adminApiPost("leagues", "POST", [input]);
}

export async function updateLeague(id: string, patch: Partial<Omit<League, "id" | "created_at">>): Promise<void> {
  await adminApiPost("leagues", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function deleteLeague(id: string): Promise<void> {
  await adminApiPost("leagues", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// ─── 팀 ───────────────────────────────────────────────────────────
export async function fetchTeams(): Promise<Team[]> {
  return adminApiGet<Team>("teams", { select: "*", order: "sort_order" });
}

export async function createTeam(input: Omit<Team, "id" | "created_at">): Promise<void> {
  await adminApiPost("teams", "POST", [input]);
}

export async function updateTeam(id: string, patch: Partial<Omit<Team, "id" | "created_at">>): Promise<void> {
  await adminApiPost("teams", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function deleteTeam(id: string): Promise<void> {
  await adminApiPost("teams", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// ─── 방송사 ───────────────────────────────────────────────────────
export async function fetchBroadcasters(): Promise<Broadcaster[]> {
  return adminApiGet<Broadcaster>("broadcasters", { select: "*", order: "sort_order" });
}

export async function createBroadcaster(input: Omit<Broadcaster, "id" | "created_at">): Promise<void> {
  await adminApiPost("broadcasters", "POST", [input]);
}

export async function updateBroadcaster(id: string, patch: Partial<Omit<Broadcaster, "id" | "created_at">>): Promise<void> {
  await adminApiPost("broadcasters", "PATCH", patch, { eq: `id=eq.${id}` });
}

export async function deleteBroadcaster(id: string): Promise<void> {
  await adminApiPost("broadcasters", "DELETE", undefined, { eq: `id=eq.${id}` });
}

// ─── 이미지 압축 (256px JPEG → base64) ───────────────────────────
export async function compressImageToBase64(file: File): Promise<string> {
  const blob = await new Promise<Blob>((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 256;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => resolve(b ?? file), "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(file);
    img.src = url;
  });
  return await new Promise<string>((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}
