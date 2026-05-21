import { supabase } from "@/lib/supabase";

export async function fetchSiteSetting(key: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .single();
    return (data?.value as string) ?? null;
  } catch {
    return null;
  }
}

// Delegates to server-side API route to avoid sending sb_* key as JWT Bearer
export async function adminSaveSiteSetting(key: string, value: string): Promise<void> {
  const res = await fetch("/api/admin/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  const json = await res.json().catch(() => ({})) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? "저장 실패");
}

// ── 마이페이지 위젯 노출 설정 ────────────────────────────────
export type MypageWidgetKey =
  | "profile"
  | "points"
  | "missions"
  | "rewards"
  | "recent_posts"
  | "menu_activity"
  | "menu_favorites"
  | "menu_settings";

export type MypageWidgetConfig = Record<MypageWidgetKey, boolean>;

export const MYPAGE_WIDGET_DEFAULT: MypageWidgetConfig = {
  profile:        true,
  points:         true,
  missions:       true,
  rewards:        true,
  recent_posts:   true,
  menu_activity:  true,
  menu_favorites: true,
  menu_settings:  true,
};

const SETTING_KEY = "mypage_widgets";

export async function fetchMypageWidgetConfig(): Promise<MypageWidgetConfig> {
  const raw = await fetchSiteSetting(SETTING_KEY);
  if (!raw) return { ...MYPAGE_WIDGET_DEFAULT };
  try {
    return { ...MYPAGE_WIDGET_DEFAULT, ...(JSON.parse(raw) as Partial<MypageWidgetConfig>) };
  } catch {
    return { ...MYPAGE_WIDGET_DEFAULT };
  }
}

export async function adminSaveMypageWidgetConfig(cfg: MypageWidgetConfig): Promise<void> {
  await adminSaveSiteSetting(SETTING_KEY, JSON.stringify(cfg));
}
