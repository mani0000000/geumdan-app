"use client";
/**
 * lib/favorites.ts
 * 교통 즐겨찾기 공용 스토어 — 버스 정류장 / 버스 노선 / 지하철 역
 *
 * 홈 위젯과 교통 페이지가 동일한 데이터를 바라보도록 단일 진실 공급원으로 사용.
 * 정류장 이름·좌표를 함께 저장하므로 홈에서 "정류장" 으로만 보이던 버그가 사라진다.
 * 추가/삭제 시 같은 탭(CustomEvent)·다른 탭(storage event) 모두 즉시 반영된다.
 */
import { useCallback, useSyncExternalStore } from "react";

export interface FavStop {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
}

export interface FavRoute {
  key: string;        // `${stopId}::${routeId||routeNo}`
  routeNo: string;
  routeId: string;
  destination: string;
  stopId: string;
  stopName: string;
  isExpress?: boolean;
}

export interface FavState {
  stops: Record<string, FavStop>;
  routes: Record<string, FavRoute>;
  subways: string[];
}

const STORAGE_KEY = "geumdan_favorites";
// 구버전 키 (id/key 배열만 저장) — 마이그레이션 + 하위호환 미러링
const LEGACY_STOPS = "favStops";
const LEGACY_ROUTES = "favRoutes";
const LEGACY_SUBWAYS = "favSubways";
const EVENT = "geumdan:favorites";

const EMPTY: FavState = { stops: {}, routes: {}, subways: [] };

// useSyncExternalStore 안정성: 원본 문자열이 같으면 동일 객체 반환
let cacheRaw: string | null = null;
let cacheVal: FavState = EMPTY;

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function migrateFromLegacy(): FavState {
  if (typeof window === "undefined") return EMPTY;
  const stopIds = safeParse<string[]>(localStorage.getItem(LEGACY_STOPS), []);
  const routeKeys = safeParse<string[]>(localStorage.getItem(LEGACY_ROUTES), []);
  const subways = safeParse<string[]>(localStorage.getItem(LEGACY_SUBWAYS), []);
  const stops: Record<string, FavStop> = {};
  for (const id of stopIds) stops[id] = { id, name: "" };
  const routes: Record<string, FavRoute> = {};
  for (const key of routeKeys) {
    const [stopId, rid] = key.split("::");
    routes[key] = {
      key,
      routeNo: rid ?? "",
      routeId: rid ?? "",
      destination: "",
      stopId: stopId ?? "",
      stopName: "",
    };
  }
  return { stops, routes, subways };
}

export function loadFavorites(): FavState {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw === null) {
    // 최초 1회 구버전 → 신버전 이관
    const migrated = migrateFromLegacy();
    if (
      Object.keys(migrated.stops).length ||
      Object.keys(migrated.routes).length ||
      migrated.subways.length
    ) {
      persist(migrated, false);
      return loadFavorites();
    }
    return EMPTY;
  }
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  cacheVal = {
    ...EMPTY,
    ...safeParse<FavState>(raw, EMPTY),
  };
  return cacheVal;
}

function persist(next: FavState, emit = true) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // 하위호환: 구버전 키도 동기화 (혹시 남아있는 참조 보호)
  localStorage.setItem(LEGACY_STOPS, JSON.stringify(Object.keys(next.stops)));
  localStorage.setItem(LEGACY_ROUTES, JSON.stringify(Object.keys(next.routes)));
  localStorage.setItem(LEGACY_SUBWAYS, JSON.stringify(next.subways));
  if (emit) window.dispatchEvent(new Event(EVENT));
}

function update(mut: (s: FavState) => FavState) {
  const cur = loadFavorites();
  const next = mut({
    stops: { ...cur.stops },
    routes: { ...cur.routes },
    subways: [...cur.subways],
  });
  persist(next);
}

export function toggleStop(stop: FavStop) {
  update(s => {
    if (s.stops[stop.id]) delete s.stops[stop.id];
    else s.stops[stop.id] = stop;
    return s;
  });
}

export function toggleRoute(route: FavRoute) {
  update(s => {
    if (s.routes[route.key]) delete s.routes[route.key];
    else s.routes[route.key] = route;
    return s;
  });
}

export function toggleSubway(id: string) {
  update(s => {
    s.subways = s.subways.includes(id)
      ? s.subways.filter(x => x !== id)
      : [...s.subways, id];
    return s;
  });
}

// ── 구독 (같은 탭 CustomEvent + 다른 탭 storage) ──────────────
function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

// ── React 훅 ─────────────────────────────────────────────────
export function useFavorites() {
  const state = useSyncExternalStore(subscribe, loadFavorites, () => EMPTY);

  const isStopFav = useCallback((id: string) => !!state.stops[id], [state]);
  const isRouteFav = useCallback((key: string) => !!state.routes[key], [state]);
  const isSubwayFav = useCallback(
    (id: string) => state.subways.includes(id),
    [state],
  );

  return {
    stops: state.stops,
    routes: state.routes,
    subways: state.subways,
    stopList: Object.values(state.stops),
    routeList: Object.values(state.routes),
    isStopFav,
    isRouteFav,
    isSubwayFav,
    toggleStop,
    toggleRoute,
    toggleSubway,
  };
}

export const routeFavKey = (stopId: string, a: { routeId?: string; routeNo: string }) =>
  `${stopId}::${a.routeId || a.routeNo}`;
