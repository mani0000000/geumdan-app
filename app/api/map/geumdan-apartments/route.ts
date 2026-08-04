import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Apartment = { id: string; name: string; dong: string; households?: number; built?: number };

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

function rectangle(lng: number, lat: number, widthM: number, depthM: number, angle: number) {
  const dx = widthM / 2 / (88000 * Math.cos(lat * Math.PI / 180));
  const dy = depthM / 2 / 111000;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const rotate = (x: number, y: number) => [lng + x * cos - y * sin, lat + x * sin + y * cos];
  const points = [rotate(-dx, -dy), rotate(dx, -dy), rotate(dx, dy), rotate(-dx, dy)];
  return [...points, points[0]];
}

async function locate(apartment: Apartment, key: string) {
  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  url.searchParams.set("query", `${apartment.name} 인천 ${apartment.dong}`);
  url.searchParams.set("size", "10");
  const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` }, next: { revalidate: 604800 } });
  if (!response.ok) return null;
  const data = await response.json();
  const target = apartment.name.replace(/[^0-9a-zA-Z가-힣]/g, "").replace(/^검단(신도시)?/, "");
  const matches = (data.documents ?? []).map((place: Record<string, string>) => {
    const address = place.road_address_name || place.address_name || "";
    const lng = Number(place.x); const lat = Number(place.y);
    const placeName = String(place.place_name ?? "").replace(/[^0-9a-zA-Z가-힣]/g, "");
    const sameComplex = placeName.includes(target) || target.includes(placeName.replace(/아파트$/, ""));
    const valid = sameComplex && address.includes("인천") && (address.includes("서구") || address.includes("검단구"))
      && lng >= 126.675 && lng <= 126.72 && lat >= 37.565 && lat <= 37.635;
    return valid ? { lng, lat, address, placeId: place.id } : null;
  }).filter(Boolean);
  return matches[0] ?? null;
}

export async function GET(request: Request) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return NextResponse.json({ type: "FeatureCollection", features: [], degraded: true });
  const origin = new URL(request.url).origin;
  const estateResponse = await fetch(`${origin}/api/realestate`, { next: { revalidate: 3600 } });
  if (!estateResponse.ok) return NextResponse.json({ type: "FeatureCollection", features: [], degraded: true });
  const estate = await estateResponse.json();
  const apartments = (estate.apartments ?? [])
    .filter((item: Apartment) => Number(item.built) >= 2020)
    .slice(0, 70) as Apartment[];
  const located = await Promise.all(apartments.map((apartment) => locate(apartment, key)));
  const features: Array<Record<string, unknown>> = [];

  apartments.forEach((apartment, apartmentIndex) => {
    const place = located[apartmentIndex] as { lng: number; lat: number; address: string; placeId: string } | null;
    if (!place) return;
    const seed = hash(apartment.id);
    const towerCount = Math.max(4, Math.min(10, Math.round((apartment.households || 720) / 120)));
    const columns = Math.ceil(Math.sqrt(towerCount));
    for (let index = 0; index < towerCount; index += 1) {
      const column = index % columns; const row = Math.floor(index / columns);
      const spacing = 72;
      const east = (column - (columns - 1) / 2) * spacing;
      const north = (row - (Math.ceil(towerCount / columns) - 1) / 2) * spacing;
      const lng = place.lng + east / (88000 * Math.cos(place.lat * Math.PI / 180));
      const lat = place.lat + north / 111000;
      const floors = 18 + ((seed + index * 7) % 12);
      const angle = (((seed % 4) * 22.5) + (index % 2) * 90) * Math.PI / 180;
      features.push({
        type: "Feature",
        id: `official-apartment-${apartment.id}-${index}`,
        properties: {
          id: `official-apartment-${apartment.id}-${index}`,
          name: apartment.name,
          kind: "apartment",
          height: floors * 3.15,
          floors,
          confidence: "location_verified_geometry_estimated",
          source: "국토교통부 단지목록 · Kakao Local API",
          kakaoPlaceId: place.placeId,
        },
        geometry: { type: "Polygon", coordinates: [rectangle(lng, lat, 48, 18, angle)] },
      });
    }
  });

  return NextResponse.json({
    type: "FeatureCollection",
    metadata: { locatedComplexes: located.filter(Boolean).length, generatedAt: new Date().toISOString() },
    features,
  }, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
