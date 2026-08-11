import { readFile, writeFile } from "node:fs/promises";

const path = "public/data/geumdan-buildings.geojson";
const data = JSON.parse(await readFile(path, "utf8"));
const feature = data.features.find((item) => item.properties?.commerceId === "b_golden");
if (!feature) throw new Error("골든스퀘어 3D 외곽을 찾지 못했습니다.");
feature.properties = { ...feature.properties, name:"골든스퀘어",height:27.6,floors:8,confidence:"onsite_verified",
  source:"OpenStreetMap 건물 외곽 + 현장 층별 안내판",sourceCheckedAt:"2026-08-11" };
data.metadata = { ...data.metadata,generatedAt:new Date().toISOString(),featureCount:data.features.length };
await writeFile(path,JSON.stringify(data));
console.log(JSON.stringify({commerceId:"b_golden",height:27.6,floors:8}));
