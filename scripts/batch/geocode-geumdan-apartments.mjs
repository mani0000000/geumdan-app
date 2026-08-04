#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const output = resolve(process.argv[2] ?? "/tmp/geumdan-apartment-inventory.json");
const apiKey = process.env.KAKAO_REST_API_KEY;
if (!apiKey) throw new Error("KAKAO_REST_API_KEY is required");

const response = await fetch("https://geumdan-app.vercel.app/api/realestate");
if (!response.ok) throw new Error(`realestate API ${response.status}`);
const payload = await response.json();
const apartments = payload.apartments ?? [];

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const compact = (value) => String(value ?? "").replace(/\s+/g, "").toLowerCase();

async function search(apartment) {
  const queries = [
    `${apartment.name} 인천 서구`,
    `인천 ${apartment.dong} ${apartment.name}`,
    `${apartment.name} 아파트`,
  ];
  const candidates = new Map();
  for (const query of queries) {
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", query);
    url.searchParams.set("size", "15");
    const result = await fetch(url, { headers: { Authorization: `KakaoAK ${apiKey}` } });
    if (!result.ok) continue;
    const json = await result.json();
    for (const place of json.documents ?? []) candidates.set(place.id, place);
    await sleep(90);
  }

  const target = compact(apartment.name).replace(/^검단(신도시)?/, "");
  return [...candidates.values()]
    .map((place) => {
      const address = place.road_address_name || place.address_name || "";
      const name = compact(place.place_name);
      const lng = Number(place.x); const lat = Number(place.y);
      const score = (name.includes(target) ? 30 : 0)
        + (address.includes("인천") ? 15 : -30)
        + (address.includes("서구") || address.includes("검단구") ? 12 : 0)
        + (address.includes(apartment.dong) ? 8 : 0)
        + (/아파트|주거/.test(place.category_name ?? "") ? 4 : 0)
        + (lng >= 126.675 && lng <= 126.725 && lat >= 37.565 && lat <= 37.635 ? 10 : -40);
      return { place, address, lng, lat, score };
    })
    .filter((item) => Number.isFinite(item.lng) && Number.isFinite(item.lat) && item.score > 10)
    .sort((a, b) => b.score - a.score)[0] ?? null;
}

const located = [];
for (const [index, apartment] of apartments.entries()) {
  const match = await search(apartment);
  if (match) located.push({
    id: apartment.id,
    name: apartment.name,
    dong: apartment.dong,
    households: apartment.households ?? 0,
    built: apartment.built ?? null,
    lat: match.lat,
    lng: match.lng,
    address: match.address,
    kakaoPlaceId: match.place.id,
    source: "Kakao Local API",
  });
  if ((index + 1) % 20 === 0) console.log(`${index + 1}/${apartments.length} checked, ${located.length} located`);
}

await writeFile(output, JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Kakao Local API + Geumdan real-estate inventory",
  total: apartments.length,
  located: located.length,
  apartments: located,
}, null, 2));
console.log(JSON.stringify({ output, total: apartments.length, located: located.length }));
