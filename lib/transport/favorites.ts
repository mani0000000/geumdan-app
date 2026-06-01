import type { BusArrival } from "@/lib/api/bus";

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

function loadStopNames(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("favStopNames") ?? "{}"); } catch { return {}; }
}

export function saveStopName(stopId: string, name: string) {
  if (typeof window === "undefined" || !name) return;
  try {
    const names = loadStopNames();
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
