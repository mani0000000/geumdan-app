import { readFile, writeFile } from "node:fs/promises";

const officialPath = "public/data/geumdan-vworld-buildings.geojson";
const outputPath = "public/data/geumdan-buildings.geojson";
const parcelPnu = "2829010500104370005";

const [official, output] = await Promise.all([
  readFile(officialPath, "utf8").then(JSON.parse),
  readFile(outputPath, "utf8").then(JSON.parse),
]);

const parcelParts = official.features.filter((feature) => feature.properties?.pnu === parcelPnu);
if (parcelParts.length === 0) throw new Error("새샘프라자 공식 건물 외곽을 찾지 못했습니다.");

const polygons = parcelParts.flatMap((feature) => {
  if (feature.geometry?.type === "MultiPolygon") return feature.geometry.coordinates;
  if (feature.geometry?.type === "Polygon") return [feature.geometry.coordinates];
  return [];
});
if (polygons.length === 0) throw new Error("새샘프라자 건물 외곽 좌표가 비어 있습니다.");

output.features = output.features.filter((feature) => feature.properties?.commerceId !== "b_saesaem");
output.features.push({
  type: "Feature",
  id: "official-saesaem-plaza",
  properties: {
    id: "official-saesaem-plaza",
    name: "새샘프라자",
    kind: "commerce",
    height: 27.6,
    floors: 8,
    confidence: "official",
    commerceId: "b_saesaem",
    source: "국토교통부 GIS건물통합정보 · VWorld WFS + 현장 층별 안내판",
    sourceCheckedAt: "2026-08-11",
  },
  geometry: { type: "MultiPolygon", coordinates: polygons },
});
output.metadata = {
  ...output.metadata,
  generatedAt: new Date().toISOString(),
  featureCount: output.features.length,
};

await writeFile(outputPath, JSON.stringify(output));
console.log(JSON.stringify({ commerceId: "b_saesaem", parts: parcelParts.length, height: 27.6, floors: 8 }));
