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

export function routeFavKey(stopId: string, a: Pick<BusArrival, "routeId" | "routeNo">): string {
  return `${stopId}::${a.routeId || a.routeNo}`;
}

export function loadFavStops(): FavStopMeta[] {
  return Array.from(loadSet("favStops")).map(id => ({ id, name: "" }));
}

export function loadFavRoutes(): FavRouteMeta[] {
  return Array.from(loadSet("favRoutes")).map(key => {
    const [stopId, routeId] = key.split("::");
    return { key, stopId: stopId ?? key, stopName: "", routeId };
  });
}
