import type { BusArrival } from "@/lib/api/bus";
import { GEUMDAN_BUS_STATIONS } from "@/lib/api/bus";

export interface FavStopMeta {
  id: string;
  name: string;
}

export interface FavRouteMeta {
  key: string;
  stopId: string;
  stopName: string;
  routeId?: string;
  routeNo?: string;
}

function loadSet(storageKey: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try { return new Set(JSON.parse(localStorage.getItem(storageKey) ?? "[]")); } catch { return new Set(); }
}

/**
 * 정류장 이름 조회 — 3단계 폴백
 *  1. favStops_meta  : transport/page.tsx toggleStop()이 저장
 *  2. favStopNames   : saveStopName()이 저장
 *  3. GEUMDAN_BUS_STATIONS : 앱 내 정적 데이터 (id 또는 stationId 매칭)
 */
function loadStopNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const result: Record<string, string> = {};

  // 3. 정적 데이터 (가장 낮은 우선순위 — 나중에 덮어쓰여도 됨)
  for (const s of GEUMDAN_BUS_STATIONS) {
    if (s.name) {
      result[s.id]        = s.name;
      result[s.stationId] = s.name;
    }
  }

  // 2. favStopNames (saveStopName()으로 직접 저장한 이름)
  try {
    const names: Record<string, string> = JSON.parse(
      localStorage.getItem("favStopNames") ?? "{}"
    );
    for (const [id, name] of Object.entries(names)) {
      if (name && name !== "정류장") result[id] = name;
    }
  } catch { /* ignore */ }

  // 1. favStops_meta (transport 페이지가 저장하는 주 소스 — 최우선)
  try {
    const meta: Record<string, { name?: string }> = JSON.parse(
      localStorage.getItem("favStops_meta") ?? "{}"
    );
    for (const [id, val] of Object.entries(meta)) {
      if (val?.name && val.name !== "정류장") result[id] = val.name;
    }
  } catch { /* ignore */ }

  return result;
}

export function saveStopName(stopId: string, name: string) {
  if (typeof window === "undefined" || !name) return;
  try {
    const names: Record<string, string> = JSON.parse(
      localStorage.getItem("favStopNames") ?? "{}"
    );
    names[stopId] = name;
    localStorage.setItem("favStopNames", JSON.stringify(names));
  } catch { /* ignore */ }
}

export function routeFavKey(stopId: string, a: Pick<BusArrival, "routeId" | "routeNo">): string {
  return `${stopId}::${a.routeId || a.routeNo}`;
}

export function loadFavStops(): FavStopMeta[] {
  const names = loadStopNames();
  return Array.from(loadSet("favStops")).map(id => ({ id, name: names[id] ?? "" }));
}

export function loadFavRoutes(): FavRouteMeta[] {
  const names = loadStopNames();
  return Array.from(loadSet("favRoutes")).map(key => {
    const [stopId, routeId] = key.split("::");
    return { key, stopId: stopId ?? key, stopName: names[stopId ?? key] ?? "", routeId };
  });
}
