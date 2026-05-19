// 교통(버스/지하철) 즐겨찾기 영속화 헬퍼.
// 위치에 상관없이 즐겨찾기를 항상 표시할 수 있도록 ID 외에 표시용 메타데이터도 함께 저장한다.
// 기존(string[]) 포맷 호환을 위해 로딩 시 양쪽을 모두 처리한다.

import type { BusArrival } from "@/lib/api/bus";

export type FavStopMeta = {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
};

export type FavRouteMeta = {
  key: string;       // `${stopId}::${routeId||routeNo}`
  stopId: string;
  stopName: string;
  routeNo: string;
  routeId?: string;
  destination: string;
  isExpress?: boolean;
  isLowFloor?: boolean;
};

const STOPS_KEY = "favStops";
const STOPS_META_KEY = "favStopsMeta";
const ROUTES_KEY = "favRoutes";
const ROUTES_META_KEY = "favRoutesMeta";

function safeRead(key: string): unknown {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
}
function safeWrite(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

// ─── 정류장 즐겨찾기 ──────────────────────────────────────────
export function loadFavStops(): FavStopMeta[] {
  const meta = safeRead(STOPS_META_KEY);
  if (Array.isArray(meta)) {
    return meta.filter((m): m is FavStopMeta =>
      !!m && typeof m === "object" && typeof (m as FavStopMeta).id === "string"
    );
  }
  // 구 포맷 호환:
  //   ① "favStops"   = string[]  (ID만)
  //   ② "favStops_meta" = Record<id, { name, lat, lng }>  (transport 페이지 main 포맷)
  const ids = safeRead(STOPS_KEY);
  if (Array.isArray(ids)) {
    let metaMap: Record<string, { name?: string; lat?: number; lng?: number }> = {};
    const rawMap = safeRead("favStops_meta");
    if (rawMap && typeof rawMap === "object" && !Array.isArray(rawMap)) {
      metaMap = rawMap as Record<string, { name?: string; lat?: number; lng?: number }>;
    }
    return ids
      .filter((x): x is string => typeof x === "string")
      .map(id => {
        const m = metaMap[id];
        return {
          id,
          name: typeof m?.name === "string" ? m.name : "정류장",
          ...(typeof m?.lat === "number" ? { lat: m.lat } : {}),
          ...(typeof m?.lng === "number" ? { lng: m.lng } : {}),
        };
      });
  }
  return [];
}

export function saveFavStops(stops: FavStopMeta[]) {
  safeWrite(STOPS_META_KEY, stops);
  // 다른 코드 경로의 호환을 위해 ID 배열도 함께 저장
  safeWrite(STOPS_KEY, stops.map(s => s.id));
}

export function toggleFavStop(stops: FavStopMeta[], meta: FavStopMeta): FavStopMeta[] {
  const existing = stops.find(s => s.id === meta.id);
  if (existing) return stops.filter(s => s.id !== meta.id);
  return [...stops, meta];
}

// ─── 노선 즐겨찾기 ────────────────────────────────────────────
export const routeFavKey = (stopId: string, a: Pick<BusArrival, "routeId" | "routeNo">) =>
  `${stopId}::${a.routeId || a.routeNo}`;

export function loadFavRoutes(): FavRouteMeta[] {
  const meta = safeRead(ROUTES_META_KEY);
  if (Array.isArray(meta)) {
    return meta.filter((m): m is FavRouteMeta =>
      !!m && typeof m === "object" && typeof (m as FavRouteMeta).key === "string"
    );
  }
  const keys = safeRead(ROUTES_KEY);
  if (Array.isArray(keys)) {
    // 구 포맷에서는 메타가 없어 즐겨찾기 카드를 표시할 수 없으므로 빈 배열로 시작
    return [];
  }
  return [];
}

export function saveFavRoutes(routes: FavRouteMeta[]) {
  safeWrite(ROUTES_META_KEY, routes);
  safeWrite(ROUTES_KEY, routes.map(r => r.key));
}

export function toggleFavRoute(routes: FavRouteMeta[], meta: FavRouteMeta): FavRouteMeta[] {
  const existing = routes.find(r => r.key === meta.key);
  if (existing) return routes.filter(r => r.key !== meta.key);
  return [...routes, meta];
}
