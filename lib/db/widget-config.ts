import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface WidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "greeting",  label: "인사 배너",    enabled: true, sort_order: 1  },
  { id: "banners",   label: "이번 주 행사 배너", enabled: true, sort_order: 2  },
  { id: "weather",   label: "날씨 위젯",    enabled: true, sort_order: 3  },
  { id: "quickmenu", label: "퀵 메뉴",      enabled: true, sort_order: 4  },
  { id: "coupons",   label: "이번 주 쿠폰", enabled: true, sort_order: 5  },
  { id: "openings",  label: "신규 오픈",    enabled: true, sort_order: 6  },
  { id: "mart",      label: "주변 마트",    enabled: true, sort_order: 7  },
  { id: "pharmacy",  label: "약국·응급실",  enabled: true, sort_order: 8  },
  { id: "transport",   label: "교통",        enabled: true, sort_order: 9  },
  { id: "community",  label: "커뮤니티",    enabled: true, sort_order: 10 },
  { id: "news",       label: "검단 뉴스",   enabled: true, sort_order: 11 },
  { id: "youtube",    label: "유튜브 소식", enabled: true, sort_order: 12 },
  { id: "instagram",  label: "인스타 소식", enabled: true, sort_order: 13 },
  { id: "realestate", label: "실거래가",    enabled: true, sort_order: 14 },
  { id: "places",     label: "가볼만한곳",  enabled: true, sort_order: 15 },
  { id: "sports",     label: "스포츠 경기", enabled: true, sort_order: 16 },
];

export async function fetchWidgetConfig(): Promise<WidgetConfig[]> {
  try {
    const { data, error } = await supabase
      .from("home_widget_config")
      .select("id, label, enabled, sort_order")
      .order("sort_order");
    if (error || !data?.length) return DEFAULT_WIDGETS;
    // Merge: append any DEFAULT_WIDGETS entries missing from DB (new widgets added after initial save)
    const dbIds = new Set((data as WidgetConfig[]).map(w => w.id));
    const missing = DEFAULT_WIDGETS.filter(w => !dbIds.has(w.id));
    return missing.length > 0 ? [...(data as WidgetConfig[]), ...missing] : (data as WidgetConfig[]);
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export async function adminFetchWidgetConfig(): Promise<WidgetConfig[]> {
  const data = await adminApiGet<WidgetConfig>("home_widget_config", {
    select: "id,label,enabled,sort_order",
    order: "sort_order",
  });
  if (!data.length) return DEFAULT_WIDGETS;
  return data;
}

export async function adminSaveWidgetConfig(widgets: WidgetConfig[]): Promise<void> {
  const rows = widgets.map((w, i) => ({
    id: w.id,
    label: w.label,
    enabled: w.enabled,
    sort_order: i + 1,
    updated_at: new Date().toISOString(),
  }));
  await adminApiPost("home_widget_config", "POST", rows, { onConflict: "id" });
}
