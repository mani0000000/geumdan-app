import { supabase } from "@/lib/supabase";
import { adminApiGet, adminApiPost } from "@/lib/db/admin-api";

export interface WidgetConfig {
  id: string;
  label: string;
  enabled: boolean;
  sort_order: number;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "greeting",  label: "인사·날씨 배너", enabled: true, sort_order: 1  },
  { id: "banners",   label: "이번 주 행사 배너", enabled: true, sort_order: 2  },
  { id: "quickmenu", label: "퀵 메뉴",      enabled: true, sort_order: 3  },
  { id: "coupons",   label: "이번 주 쿠폰", enabled: true, sort_order: 4  },
  { id: "openings",  label: "신규 오픈",    enabled: true, sort_order: 5  },
  { id: "mart",      label: "주변 마트",    enabled: true, sort_order: 6  },
  { id: "pharmacy",  label: "약국·응급실",  enabled: true, sort_order: 7  },
  { id: "transport",   label: "교통",        enabled: true, sort_order: 8  },
  { id: "community",  label: "커뮤니티",    enabled: true, sort_order: 9  },
  { id: "livefeed",   label: "라이브 피드", enabled: true, sort_order: 10 },
  { id: "news",       label: "검단 뉴스",   enabled: true, sort_order: 11 },
  { id: "youtube",    label: "유튜브 소식", enabled: true, sort_order: 12 },
  { id: "instagram",  label: "인스타 소식", enabled: true, sort_order: 13 },
  { id: "realestate", label: "실거래가",    enabled: true, sort_order: 14 },
  { id: "places",     label: "가볼만한곳",  enabled: true, sort_order: 15 },
  { id: "sports",     label: "스포츠 경기", enabled: true, sort_order: 16 },
  { id: "tides",      label: "서해안 조석·해루질·낚시", enabled: true, sort_order: 17 },
  { id: "gas",        label: "주유소 가격",  enabled: true, sort_order: 18 },
];

export async function fetchWidgetConfig(): Promise<WidgetConfig[]> {
  try {
    const { data, error } = await supabase
      .from("home_widget_config")
      .select("id, label, enabled, sort_order")
      .order("sort_order");
    if (error || !data?.length) return DEFAULT_WIDGETS;

    const dbList = data as WidgetConfig[];
    const dbMap = new Map(dbList.map(w => [w.id, w]));

    // 마이그레이션: weather 위젯이 DB에 있으면 제거 (greeting에 통합됨)
    // tides가 없거나 구버전 위치면 DEFAULT_WIDGETS 순서로 재정렬
    const hasWeather = dbMap.has("weather");
    const tidesInDb = dbMap.get("tides");
    if (hasWeather || !tidesInDb || tidesInDb.sort_order < 10) {
      return DEFAULT_WIDGETS.map(def => ({
        ...def,
        enabled: dbMap.get(def.id)?.enabled ?? def.enabled,
      }));
    }

    // Merge: append any DEFAULT_WIDGETS entries missing from DB (new widgets added after initial save)
    const dbIds = new Set(dbList.map(w => w.id));
    const missing = DEFAULT_WIDGETS.filter(w => !dbIds.has(w.id));
    // weather 위젯은 더 이상 사용하지 않으므로 DB 목록에서도 제거
    const filtered = dbList.filter(w => w.id !== "weather");
    return missing.length > 0 ? [...filtered, ...missing] : filtered;
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
