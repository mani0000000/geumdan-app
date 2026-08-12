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

// GIS 원본은 한 동을 설비/부속동까지 5개 조각으로 나눠 제공한다. 지도에서는
// 현장에서 보이는 단순한 직육면체를 표현하도록 전체 외곽의 중심·방향만 사용한다.
const center = [126.715446, 37.594821];
const widthMeters = 27.5;
const depthMeters = 14.5;
const bearingDegrees = 2;
const rad = bearingDegrees * Math.PI / 180;
const rectangle = [[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]].map(([x,y]) => {
  const east = x * widthMeters / 2;
  const north = y * depthMeters / 2;
  const rotatedEast = east * Math.cos(rad) - north * Math.sin(rad);
  const rotatedNorth = east * Math.sin(rad) + north * Math.cos(rad);
  return [center[0] + rotatedEast / (88_000 * Math.cos(center[1] * Math.PI / 180)), center[1] + rotatedNorth / 111_000];
});

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
    confidence: "official_location_simplified_shape",
    commerceId: "b_saesaem",
    source: "국토교통부 GIS건물통합정보 · VWorld WFS + 현장 층별 안내판",
    sourceCheckedAt: "2026-08-11",
  },
  geometry: { type: "Polygon", coordinates: [rectangle] },
});
output.metadata = {
  ...output.metadata,
  generatedAt: new Date().toISOString(),
  featureCount: output.features.length,
};

await writeFile(outputPath, JSON.stringify(output));
console.log(JSON.stringify({ commerceId: "b_saesaem", sourceParts: parcelParts.length, shape: "rectangular_prism", bearingDegrees, height: 27.6, floors: 8 }));
