import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  { id: "transport", label: "교통",         enabled: true, sort_order: 9  },
  { id: "sosik",     label: "검단 소식",    enabled: true, sort_order: 10 },
];

export async function fetchWidgetConfig(): Promise<WidgetConfig[]> {
  try {
    const { data, error } = await supabase
      .from("home_widget_config")
      .select("id, label, enabled, sort_order")
      .order("sort_order");
    if (error || !data?.length) return DEFAULT_WIDGETS;
    return data as WidgetConfig[];
  } catch {
    return DEFAULT_WIDGETS;
  }
}

export async function adminFetchWidgetConfig(): Promise<WidgetConfig[]> {
  const { data, error } = await supabaseAdmin
    .from("home_widget_config")
    .select("id, label, enabled, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  if (!data?.length) return DEFAULT_WIDGETS;
  return data as WidgetConfig[];
}

export async function adminSaveWidgetConfig(widgets: WidgetConfig[]): Promise<void> {
  const rows = widgets.map((w, i) => ({
    id: w.id,
    label: w.label,
    enabled: w.enabled,
    sort_order: i + 1,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabaseAdmin
    .from("home_widget_config")
    .upsert(rows, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
