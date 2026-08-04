"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Building2, ChevronRight, ImageIcon, LocateFixed, MapPin, Search, Store as StoreIcon, X } from "lucide-react";
import type { Building, Store, StoreCategory } from "@/lib/types";
import type { BuildingRow } from "@/lib/db/buildings";
import { fetchBuildingWithFloors } from "@/lib/db/buildings";

// 검단신도시 공동주택·중심상업지의 실제 공간 분포 중심.
// 이전 좌표는 원당동 서측에 치우쳐 신도시 동측 고층 주거군이 첫 화면 밖에 있었다.
// 인천 검단신도시 사업지 중심. 126.72 동쪽은 김포 풍무 생활권이 먼저 보여
// 지도 배경이 정확한 김포를 검단으로 오인하게 만들 수 있다.
const CENTER: [number, number] = [126.7080, 37.5961];
const SOURCE_ID = "geumdan-commerce";
const LAYER_ID = "geumdan-commerce-3d";
const LABEL_SOURCE_ID = "geumdan-commerce-labels";
const LABEL_LAYER_ID = "geumdan-commerce-labels-layer";
const USER_SOURCE_ID = "geumdan-user-location";
const USER_HALO_ID = "geumdan-user-halo";
const USER_DOT_ID = "geumdan-user-dot";
const OPENFREE_BUILDING_LAYER_ID = "building-3d";
const HIT_SOURCE_ID = "geumdan-commerce-hit";
const BUILDING_HALO_LAYER_ID = "geumdan-commerce-hit-halo";
const VERIFIED_FOOTPRINT_SOURCE_ID = "geumdan-commerce-verified-footprints";
const VERIFIED_FOOTPRINT_LAYER_ID = "geumdan-commerce-verified-footprints-3d";

const CATEGORY_COLOR: Partial<Record<StoreCategory, string>> = {
  카페: "#C47A34", 음식점: "#EF6351", 편의점: "#3478F6", "병원/약국": "#E34C67",
  미용: "#C85B9E", 학원: "#7057D9", 마트: "#27A56B", "헬스/운동": "#2B91C8",
  베이커리: "#D6953D", 부동산: "#258D83", 기타: "#76767B",
};

type FeatureProps = { id: string; name: string; floors: number; stores: number; floorVerified: boolean; hasKnownFloors: boolean; buildingType: string; height: number };

function defaultFloorLabel(floors: Building["floors"]): string {
  return floors.find((floor) => floor.label === "1F")?.label
    ?? floors.find((floor) => /^1\s*층$/.test(floor.label))?.label
    ?? floors.find((floor) => floor.level === 1)?.label
    ?? floors.find((floor) => floor.level > 0)?.label
    ?? floors[0]?.label
    ?? "";
}

function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) result = ((result << 5) - result + value.charCodeAt(i)) | 0;
  return Math.abs(result);
}

function positioned(row: BuildingRow, index: number): [number, number] {
  if (row.lng && row.lat && Number.isFinite(row.lng) && Number.isFinite(row.lat)) return [row.lng, row.lat];
  const seed = hash(row.id || String(index));
  const ring = 0.0032 + ((seed % 6) * 0.00115);
  const angle = ((seed % 360) * Math.PI) / 180;
  return [CENTER[0] + Math.cos(angle) * ring, CENTER[1] + Math.sin(angle) * ring * 0.72];
}

function hasVerifiedPosition(row: BuildingRow) {
  return Number.isFinite(Number(row.lng)) && Number.isFinite(Number(row.lat))
    && Number(row.lng) >= 126.675 && Number(row.lng) <= 126.725
    && Number(row.lat) >= 37.565 && Number(row.lat) <= 37.635;
}

function commerceType(row: BuildingRow): "apartment_commerce" | "central_commerce" | "neighborhood_commerce" {
  if (row.building_type === "apartment_commerce") return "apartment_commerce";
  if (row.building_type === "central_commerce") return "central_commerce";
  if (/(타워|프라자|스퀘어|아너시티|메디컬|시티|플라자|몰)/.test(row.name) && Number(row.floors) >= 4) return "central_commerce";
  return "neighborhood_commerce";
}

function commerceFootprint(row: BuildingRow, index: number): [number, number][][] {
  const [lng, lat] = positioned(row, index);
  const seed = hash(row.id || String(index));
  const type = commerceType(row);
  const stores = Math.max(1, Number(row.total_stores) || 1);
  const longMeters = type === "apartment_commerce"
    ? Math.min(72, 34 + stores * 1.35)
    : type === "central_commerce"
      ? Math.min(58, 32 + stores * 0.8)
      : Math.min(46, 25 + stores * 0.72);
  const shortMeters = type === "apartment_commerce" ? 15 : type === "central_commerce" ? 30 : 22;
  const angle = ((seed % 12) * 15 * Math.PI) / 180;
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]] as const;
  return [corners.map(([x, y]) => {
    const east = x * longMeters / 2; const north = y * shortMeters / 2;
    const rotatedEast = east * cos - north * sin;
    const rotatedNorth = east * sin + north * cos;
    return [lng + rotatedEast / 88_000, lat + rotatedNorth / 111_000];
  })];
}

function toGeoJSON(rows: BuildingRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.filter(hasVerifiedPosition).map((row, index) => {
      const [lng, lat] = positioned(row, index);
      const floorVerified = ["public_building_register", "official_document", "admin_verified"].includes(row.floor_verification ?? "");
      const hasKnownFloors = Number.isFinite(row.floors) && Number(row.floors) > 1;
      const floors = hasKnownFloors ? Number(row.floors) : 0;
      const stores = Math.max(0, row.total_stores ?? 0);
      return {
        type: "Feature" as const,
        id: row.id,
        properties: {
          id: row.id, name: row.name, floors, stores, floorVerified, hasKnownFloors,
          buildingType: commerceType(row),
          height: Math.max(4.2, (hasKnownFloors ? floors : Math.min(5, Math.max(2, Math.ceil(stores / 5)))) * 3.45),
        } satisfies FeatureProps,
        geometry: { type: "Polygon" as const, coordinates: commerceFootprint(row, index) },
      };
    }),
  };
}

function toHitGeoJSON(rows: BuildingRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.filter(hasVerifiedPosition).map((row, index) => ({
      type: "Feature" as const,
      id: row.id,
      properties: { id: row.id },
      geometry: { type: "Point" as const, coordinates: positioned(row, index) },
    })),
  };
}

function toLabelGeoJSON(rows: BuildingRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.filter(hasVerifiedPosition).map((row, index) => ({
      type: "Feature" as const,
      id: row.id,
      properties: {
        id: row.id,
        name: row.name,
        stores: Math.max(0, row.total_stores ?? 0),
        label: `${row.name}\n${Number.isFinite(row.floors) && Number(row.floors) > 1 ? `${row.floors}층 · ${Math.max(0, row.total_stores ?? 0)}개 매장` : `${Math.max(0, row.total_stores ?? 0)}개 매장`}`,
      },
      geometry: { type: "Point" as const, coordinates: positioned(row, index) },
    })),
  };
}

function buildingImage(row: BuildingRow | null): string | null {
  if (!row) return null;
  return row.image_url ?? row.photo_north ?? row.photo_east ?? row.photo_south ?? row.photo_west ?? null;
}

function distanceKm(a: { lat: number; lng: number } | null, row: BuildingRow | null) {
  if (!a || !row?.lat || !row.lng) return null;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(row.lat - a.lat);
  const dLng = toRad(row.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(row.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function safeStoreLayout(store: Store, index: number, total: number) {
  const valid = store.w > 2 && store.h > 2 && (store.x > 0 || store.y > 0);
  if (valid) return { left: store.x, top: store.y, width: store.w, height: store.h };
  const cols = total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const rows = Math.ceil(total / cols);
  const gap = 2;
  const width = (100 - gap * (cols + 1)) / cols;
  const height = (100 - gap * (rows + 1)) / rows;
  return { left: gap + (index % cols) * (width + gap), top: gap + Math.floor(index / cols) * (height + gap), width, height };
}

function FloorPlan({ building, row, userLocation, selectedFloor, onFloor, onClose }: { building: Building; row: BuildingRow | null; userLocation: { lat: number; lng: number } | null; selectedFloor: string; onFloor: (value: string) => void; onClose: () => void }) {
  const floor = building.floors.find((item) => item.label === selectedFloor)
    ?? building.floors.find((item) => item.label === defaultFloorLabel(building.floors))
    ?? building.floors[0];
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [planPage, setPlanPage] = useState(0);
  const [photoDirection, setPhotoDirection] = useState("대표");
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil((floor?.stores.length ?? 0) / pageSize));
  const visibleStores = floor?.stores.slice(planPage * pageSize, (planPage + 1) * pageSize) ?? [];
  const photos = [
    ["대표", row?.image_url], ["북", row?.photo_north], ["동", row?.photo_east],
    ["남", row?.photo_south], ["서", row?.photo_west],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const imageUrl = photos.find(([label]) => label === photoDirection)?.[1] ?? photos[0]?.[1] ?? buildingImage(row);
  const distance = distanceKm(userLocation, row);

  useEffect(() => { setSelectedStore(null); setPlanPage(0); }, [selectedFloor, building.id]);
  useEffect(() => { setPhotoDirection(photos[0]?.[0] ?? "대표"); }, [building.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="absolute inset-x-3 bottom-[72px] z-20 overflow-hidden rounded-[26px] bg-[#fbfaf6]/95 shadow-[0_18px_50px_rgba(42,38,31,.22)] backdrop-blur-2xl md:bottom-5 md:left-auto md:right-5 md:w-[410px]">
      <div className="flex items-start gap-3 px-4 pb-3 pt-4">
        <div className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-[16px] bg-[#ebe8df] text-[#a09b91]">
          {imageUrl ? <img src={imageUrl} alt={`${building.name} 건물`} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <ImageIcon size={22}/>} 
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[11px] font-black text-[#EF665B]">선택한 상가</p>
          <h3 className="truncate text-[19px] font-black tracking-[-.04em] text-[#25231f]">{building.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#77736c]"><MapPin size={10}/>{distance != null ? `${distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`} · ` : ""}{building.address}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="건물 닫기" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0eee8] active:scale-90"><X size={18}/></button>
      </div>

      {photos.length > 1 && (
        <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-4 pb-3">
          {photos.map(([label]) => (
            <button key={label} type="button" onClick={() => setPhotoDirection(label)}
              className={`h-7 shrink-0 rounded-full px-3 text-[10px] font-black ${photoDirection === label ? "bg-[#25231f] text-white" : "bg-[#efede7] text-[#77736c]"}`}>
              {label === "대표" ? label : `${label}측`}
            </button>
          ))}
          <span className="self-center pl-1 text-[9px] font-bold text-[#9a968e]">실제 촬영 방향</span>
        </div>
      )}

      <div className="scrollbar-hide flex gap-2 overflow-x-auto px-5 pb-3">
        {building.floors.map((item) => {
          const active = item.label === floor?.label;
          return <button key={item.label} type="button" onClick={() => onFloor(item.label)} className="h-9 min-w-12 rounded-full px-3 text-[12px] font-black transition-colors" style={{ background: active ? "#EF665B" : "#efede7", color: active ? "white" : "#625f59" }}>{item.label}</button>;
        })}
      </div>

      <div className="mx-4 flex items-center justify-between pb-1.5 text-[10px] font-bold text-[#8b877f]">
        <span>{floor?.label} · {floor?.stores.length ?? 0}개 매장</span>
        {pageCount > 1 && <span className="flex items-center gap-2"><button type="button" onClick={() => setPlanPage((value) => Math.max(0, value - 1))} disabled={planPage === 0} className="rounded-full bg-[#efede7] px-2 py-1 disabled:opacity-35">이전</button>{planPage + 1}/{pageCount}<button type="button" onClick={() => setPlanPage((value) => Math.min(pageCount - 1, value + 1))} disabled={planPage === pageCount - 1} className="rounded-full bg-[#efede7] px-2 py-1 disabled:opacity-35">다음</button></span>}
      </div>
      <div className="mx-4 rounded-[18px] border border-[#ddd8cc] bg-[#eeeae0] p-2 shadow-inner">
        <div className="relative h-[190px] overflow-hidden rounded-[13px] bg-[#f9f7f1] sm:h-[220px]">
          {visibleStores.length ? visibleStores.map((store, index) => {
            const layout = safeStoreLayout({ ...store, x: 0, y: 0, w: 0, h: 0 }, index, visibleStores.length);
            const active = selectedStore?.id === store.id;
            const color = CATEGORY_COLOR[store.category] ?? CATEGORY_COLOR.기타!;
            return (
              <button key={store.id} type="button" onClick={() => setSelectedStore(store)} className="absolute flex min-h-0 flex-col items-start justify-center overflow-hidden rounded-[8px] border px-2 text-left transition-[transform,box-shadow] active:scale-[.97]" style={{ left: `${layout.left}%`, top: `${layout.top}%`, width: `${layout.width}%`, height: `${layout.height}%`, borderColor: active ? color : "#d6d0c5", background: active ? color : "#fffefa", color: active ? "white" : "#292722", boxShadow: active ? `0 7px 16px ${color}45` : "none", zIndex: active ? 2 : 1 }}>
                <span className="line-clamp-2 text-[10px] font-black leading-tight sm:text-[11px]">{store.name}</span>
                <span className={`mt-0.5 text-[8px] font-bold ${active ? "text-white/75" : "text-[#8b877f]"}`}>{store.category}</span>
              </button>
            );
          }) : <div className="grid h-full place-items-center text-center"><div><StoreIcon className="mx-auto text-[#b4afa5]"/><p className="mt-2 text-[12px] font-bold text-[#8b877f]">등록된 매장을 정리하고 있어요</p></div></div>}
        </div>
      </div>

      <div className="min-h-[72px] px-5 py-3">
        {selectedStore ? (
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px]" style={{ background: `${CATEGORY_COLOR[selectedStore.category] ?? CATEGORY_COLOR.기타}20`, color: CATEGORY_COLOR[selectedStore.category] ?? CATEGORY_COLOR.기타 }}><StoreIcon size={21}/></div>
            <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-black text-[#25231f]">{selectedStore.name}</p><p className="mt-0.5 truncate text-[11px] text-[#77736c]">{selectedStore.category} · {selectedStore.isOpen === true ? "영업 중" : selectedStore.hours || "영업시간 확인"}</p></div>
            <Link href={`/stores/detail/?id=${encodeURIComponent(selectedStore.id)}`} className="flex h-10 shrink-0 items-center gap-1 rounded-full bg-[#EF665B] px-4 text-[12px] font-black text-white">상세 <ChevronRight size={14}/></Link>
          </div>
        ) : <p className="py-3 text-center text-[11px] font-bold text-[#8b877f]">매장을 누르면 상세 정보를 바로 볼 수 있어요</p>}
      </div>
    </div>
  );
}

export default function Store3DMapView({ buildings, userLocation, locating, onRequestLocation, compact = false }: { buildings: BuildingRow[]; userLocation: { lat: number; lng: number } | null; locating?: boolean; onRequestLocation: () => void; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userLocationRef = useRef(userLocation);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [query, setQuery] = useState("");
  const displayedBuildings = useMemo(() => {
    const commerceBuildings = buildings.filter(hasVerifiedPosition).filter((row) => !row.building_type
      || ["apartment_commerce", "central_commerce", "neighborhood_commerce"].includes(row.building_type));
    return compact
      ? commerceBuildings.sort((a, b) => (b.total_stores ?? 0) - (a.total_stores ?? 0)).slice(0, 24)
      : commerceBuildings;
  }, [buildings, compact]);
  const geojson = useMemo(() => toGeoJSON(displayedBuildings), [displayedBuildings]);
  const hitGeojson = useMemo(() => toHitGeoJSON(displayedBuildings), [displayedBuildings]);
  const labelGeojson = useMemo(() => toLabelGeoJSON(displayedBuildings), [displayedBuildings]);
  const selectedRow = useMemo(() => buildings.find((item) => item.id === selectedId) ?? null, [buildings, selectedId]);

  const selectBuilding = useCallback((id: string) => {
    const rowIndex = buildings.findIndex((item) => item.id === id);
    const row = buildings[rowIndex];
    if (!row) return;
    setSelectedId(id);
    setBuilding(null);
    if (hasVerifiedPosition(row)) {
      const [lng, lat] = positioned(row, rowIndex);
      mapRef.current?.easeTo({ center: [lng, lat], zoom: 17.1, pitch: 62, bearing: -28, duration: 950, offset: [0, -100] });
    }
    fetchBuildingWithFloors(id).then((data) => {
      const registeredFloorCount = Number(row.floors);
      const baseData: Building | null = data ?? (Number.isFinite(registeredFloorCount) && registeredFloorCount > 1 ? {
        id: row.id,
        name: row.name,
        address: row.address,
        parkingInfo: "",
        openTime: "",
        floors: [],
      } : null);
      const completeData = baseData && Number.isFinite(registeredFloorCount) && registeredFloorCount > 1 && baseData.floors.length < registeredFloorCount
        ? {
            ...baseData,
            floors: Array.from({ length: registeredFloorCount }, (_, index) => {
              const label = `${index + 1}F`;
              return baseData.floors.find((floor) => floor.label === label) ?? {
                level: index + 1,
                label,
                hasRestroom: false,
                stores: [],
              };
            }),
          }
        : data;
      setBuilding(completeData);
      setSelectedFloor(defaultFloorLabel(completeData?.floors ?? []));
    });
  }, [buildings]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      // OpenFreeMap의 주간 갱신 OSM 벡터와 기본 3D 건물 레이어를 사용한다.
      // Positron보다 도로·단지 경계 식별성이 높은 Liberty를 기반으로 하고,
      // 아래에서 건물 높이/색만 검단 지도 톤에 맞게 재정의한다.
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: CENTER,
      zoom: compact ? 14.15 : 14.45,
      pitch: compact ? 46 : 58,
      bearing: compact ? -12 : -22,
      minZoom: 12,
      maxZoom: 19,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    if (!compact) {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
    }

    map.on("load", () => {
      const firstSymbolLayer = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      if (map.getLayer(OPENFREE_BUILDING_LAYER_ID)) map.setLayoutProperty(OPENFREE_BUILDING_LAYER_ID, "visibility", "none");
      // 상가 DB 좌표와 매칭된 실제 건물 외곽선만 별도 3D 레이어로 올린다.
      // 같은 파일의 아파트·일반건물·타 지역 상가는 필터에서 완전히 제외된다.
      map.addSource(VERIFIED_FOOTPRINT_SOURCE_ID, {
        type: "geojson",
        data: "/data/geumdan-buildings.geojson",
        generateId: true,
      });
      map.addLayer({
        id: VERIFIED_FOOTPRINT_LAYER_ID,
        type: "fill-extrusion",
        source: VERIFIED_FOOTPRINT_SOURCE_ID,
        minzoom: 13,
        filter: ["all", ["==", ["get", "kind"], "commerce"], ["!=", ["get", "commerceId"], null]],
        paint: {
          "fill-extrusion-color": "#E9574B",
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, ["get", "height"]],
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 0.98,
          "fill-extrusion-vertical-gradient": true,
        },
      }, firstSymbolLayer);
      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
      map.addSource(HIT_SOURCE_ID, { type: "geojson", data: hitGeojson });
      map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labelGeojson });
      const currentLocation = userLocationRef.current;
      map.addSource(USER_SOURCE_ID, { type: "geojson", data: {
        type: "FeatureCollection",
        features: currentLocation ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [currentLocation.lng, currentLocation.lat] } }] : [],
      } });
      map.addLayer({ id: BUILDING_HALO_LAYER_ID, type: "circle", source: HIT_SOURCE_ID, minzoom: 13, paint: {
        "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 26, compact ? 18 : 23],
        "circle-color": "#ffffff",
        "circle-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.42, 0.92],
        "circle-stroke-color": "rgba(239,102,91,.22)", "circle-stroke-width": 2,
      }});
      map.addLayer({ id: LAYER_ID, type: "fill-extrusion", source: SOURCE_ID, minzoom: 13, paint: {
        "fill-extrusion-color": ["match", ["get", "buildingType"], "apartment_commerce", "#2FA87A", "central_commerce", "#F28A43", "#EF665B"],
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, ["get", "height"]],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 1, 0.92],
        "fill-extrusion-vertical-gradient": true,
      }}, firstSymbolLayer);
      map.addLayer({ id: LABEL_LAYER_ID, type: "symbol", source: LABEL_SOURCE_ID, minzoom: 13.2, layout: {
        "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 12, 18, 14],
        "text-line-height": 1.05, "text-anchor": "bottom", "text-offset": [0, -1.15], "text-max-width": 10,
        "symbol-sort-key": ["-", 1000, ["get", "stores"]], "text-allow-overlap": false, "text-ignore-placement": false,
      }, paint: { "text-color": "#292722", "text-halo-color": "rgba(255,255,255,.96)", "text-halo-width": 2, "text-halo-blur": 0.5 } });
      map.addLayer({ id: USER_HALO_ID, type: "circle", source: USER_SOURCE_ID, paint: { "circle-radius": 16, "circle-color": "#1677FF", "circle-opacity": 0.16, "circle-stroke-width": 0 } });
      map.addLayer({ id: USER_DOT_ID, type: "circle", source: USER_SOURCE_ID, paint: { "circle-radius": 7, "circle-color": "#1677FF", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });

      map.on("click", VERIFIED_FOOTPRINT_LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.commerceId ?? "");
        if (id) selectBuilding(id);
      });
      map.on("click", LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });
      map.on("click", BUILDING_HALO_LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });
      map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", VERIFIED_FOOTPRINT_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", VERIFIED_FOOTPRINT_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("click", LABEL_LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });

      // 사용권이 확인된 관리자 등록 사진을 건물 지붕 위치에 매핑한다.
      // 스트리트뷰 화면을 복제·저장하지 않고, DB의 대표/방향별 사진만 사용한다.
      displayedBuildings.forEach((row, index) => {
        const image = buildingImage(row);
        if (!image) return;
        const element = document.createElement("button");
        element.type = "button";
        element.className = "group overflow-hidden rounded-[9px] border-2 border-white bg-white shadow-[0_7px_18px_rgba(35,31,25,.30)] transition-transform active:scale-95";
        element.style.width = compact ? "40px" : "50px";
        element.style.height = compact ? "31px" : "38px";
        element.setAttribute("aria-label", `${row.name} 건물 사진`);
        const photo = document.createElement("img");
        photo.src = image;
        photo.alt = "";
        photo.loading = "lazy";
        photo.referrerPolicy = "no-referrer";
        photo.style.width = "100%"; photo.style.height = "100%"; photo.style.objectFit = "cover";
        photo.addEventListener("error", () => element.remove());
        element.appendChild(photo);
        element.addEventListener("click", (event) => { event.stopPropagation(); selectBuilding(row.id); });
        const floorHeight = Math.max(4.2, (Number(row.floors) || 2) * 3.45);
        new maplibregl.Marker({ element, anchor: "bottom", offset: [0, -Math.min(36, floorHeight * 0.65)] })
          .setLngLat(positioned(row, index))
          .addTo(map);
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [compact, displayedBuildings, geojson, hitGeojson, labelGeojson, selectBuilding]);

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(geojson);
    const hits = mapRef.current?.getSource(HIT_SOURCE_ID) as GeoJSONSource | undefined;
    hits?.setData(hitGeojson);
    const labels = mapRef.current?.getSource(LABEL_SOURCE_ID) as GeoJSONSource | undefined;
    labels?.setData(labelGeojson);
  }, [geojson, hitGeojson, labelGeojson]);

  useEffect(() => {
    userLocationRef.current = userLocation;
    const source = mapRef.current?.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;
    source.setData({ type: "FeatureCollection", features: userLocation ? [{ type: "Feature", properties: { label: "내 위치" }, geometry: { type: "Point", coordinates: [userLocation.lng, userLocation.lat] } }] : [] });
  }, [userLocation]);

  const focusMyLocation = () => {
    if (!userLocation) { onRequestLocation(); return; }
    mapRef.current?.easeTo({ center: [userLocation.lng, userLocation.lat], zoom: 16.2, pitch: 48, duration: 700 });
  };

  useEffect(() => {
    if (!mapRef.current?.getLayer(LAYER_ID)) return;
    displayedBuildings.forEach((item) => {
      const state = { selected: item.id === selectedId };
      mapRef.current?.setFeatureState({ source: SOURCE_ID, id: item.id }, state);
      mapRef.current?.setFeatureState({ source: HIT_SOURCE_ID, id: item.id }, state);
    });
  }, [selectedId, displayedBuildings]);

  const results = query.trim() ? displayedBuildings.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  const closeSelection = () => {
    setSelectedId(null); setBuilding(null); setSelectedFloor("");
    mapRef.current?.easeTo({ center: CENTER, zoom: 14.45, pitch: 58, bearing: -22, duration: 750, offset: [0, 0] });
  };

  return (
    <div className={`relative h-full overflow-hidden bg-[#e9e6dd] ${compact ? "min-h-0" : "min-h-[520px]"}`}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,249,244,.15),transparent_24%,rgba(244,240,231,.12))]" />
      <div className={`pointer-events-none absolute z-[5] rounded-full bg-white/78 px-2 py-1 text-[8px] font-bold text-[#77736c] backdrop-blur ${compact ? "bottom-2 right-2" : "bottom-[82px] left-3 md:bottom-3"}`}>
        © OpenStreetMap · 상가 건물 정보
      </div>
      <div className={`pointer-events-none absolute z-[6] flex items-center gap-2 rounded-full bg-white/88 px-2.5 py-1.5 text-[9px] font-black text-[#445064] shadow-sm backdrop-blur ${compact ? "left-2 top-2" : "bottom-[82px] right-3 md:bottom-3"}`}>
        <span className="h-2.5 w-2.5 rounded-[3px] bg-[#2FA87A]" />단지상가
        <span className="ml-1 h-2.5 w-2.5 rounded-[3px] bg-[#F28A43]" />중심상가
        <span className="ml-1 h-2.5 w-2.5 rounded-[3px] bg-[#EF665B]" />근린상가
      </div>

      {!compact && <div className="absolute left-4 right-4 top-4 z-10 md:left-6 md:right-auto md:w-[360px]">
        <div className="flex h-12 items-center gap-2 rounded-full bg-white/94 px-4 shadow-[0_8px_25px_rgba(68,61,47,.13)] backdrop-blur-xl">
          <Search size={18} className="text-[#77736c]"/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상가 건물·매장 검색" className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[#25231f] outline-none placeholder:text-[#9a968e]"/>
          {query && <button type="button" onClick={() => setQuery("")} className="grid h-7 w-7 place-items-center rounded-full bg-[#efede7]"><X size={14}/></button>}
        </div>
        {results.length > 0 && <div className="mt-2 overflow-hidden rounded-[20px] bg-white/96 p-2 shadow-[0_14px_35px_rgba(68,61,47,.16)] backdrop-blur-xl">{results.map((item) => <button key={item.id} type="button" onClick={() => { selectBuilding(item.id); setQuery(""); }} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left active:bg-[#f3f1eb]"><Building2 size={17} className="text-[#EF665B]"/><span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#25231f]">{item.name}</b><small className="block truncate text-[10px] text-[#8b877f]">{Number.isFinite(item.floors) && Number(item.floors) > 1 ? `${item.floors}층` : "층수 미확인"} · {item.total_stores ?? 0}개 매장</small></span><ChevronRight size={15} className="text-[#aaa59c]"/></button>)}</div>}
      </div>}

      {!compact && !selectedId && <div className="absolute bottom-[92px] right-4 z-10 md:bottom-6 md:right-6">
        <button type="button" onClick={focusMyLocation} aria-label="내 위치로 이동" className="relative grid h-11 w-11 place-items-center rounded-full bg-white/94 text-[#1677FF] shadow-lg backdrop-blur"><LocateFixed size={19}/>{locating && <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1677FF]/30"/>}</button>
      </div>}
      {!compact && selectedId && !building && <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[12px] font-black text-[#EF665B] shadow-xl">층별 정보를 불러오는 중…</div>}
      {!compact && building && <FloorPlan building={building} row={selectedRow} userLocation={userLocation} selectedFloor={selectedFloor} onFloor={setSelectedFloor} onClose={closeSelection}/>}
    </div>
  );
}
