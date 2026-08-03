"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Building2, ChevronRight, ImageIcon, LocateFixed, MapPin, Search, Store as StoreIcon, X } from "lucide-react";
import type { Building, Store, StoreCategory } from "@/lib/types";
import type { BuildingRow } from "@/lib/db/buildings";
import { fetchBuildingWithFloors } from "@/lib/db/buildings";

const CENTER: [number, number] = [126.7107, 37.5924];
const SOURCE_ID = "geumdan-commerce";
const LAYER_ID = "geumdan-commerce-3d";
const LABEL_SOURCE_ID = "geumdan-commerce-labels";
const LABEL_LAYER_ID = "geumdan-commerce-labels-layer";
const USER_SOURCE_ID = "geumdan-user-location";
const USER_HALO_ID = "geumdan-user-halo";
const USER_DOT_ID = "geumdan-user-dot";

const CATEGORY_COLOR: Partial<Record<StoreCategory, string>> = {
  카페: "#C47A34", 음식점: "#EF6351", 편의점: "#3478F6", "병원/약국": "#E34C67",
  미용: "#C85B9E", 학원: "#7057D9", 마트: "#27A56B", "헬스/운동": "#2B91C8",
  베이커리: "#D6953D", 부동산: "#258D83", 기타: "#76767B",
};

type FeatureProps = { id: string; name: string; floors: number; stores: number; height: number; color: string; floorVerified: boolean };

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

// OSM building footprints whose centre is within 30 m of our verified address point.
// The value is the footprint's longest-axis angle measured counter-clockwise from east.
// Buildings without a safe footprint match use the road-axis fallback below instead of
// borrowing a nearby building's direction.
const VERIFIED_BUILDING_ANGLES: Record<string, number> = {
  b_abm: -55.2,
  b_cs_med: 62.9,
  b_jk: -13.7,
  b_apt_apt6_shops: 18.8,
  b_central: 62.9,
  b_jeongin: -10.9,
  b_keumgang: 65.3,
  b_daon2: -31.1,
  b_onetower: -38.2,
  b_dike: -81.6,
  b_mega: -81.5,
  b_metro1: -41.5,
  b_shinhwa: -25.2,
  b_angel: -2.1,
  b_yonsei8: 2.7,
  b_yonsei9: -4.3,
  b_winner: -13.3,
  b_jungseok: -16.7,
  b_jeil: -1.4,
  b_joy: -88.9,
  b_sung: 88.6,
  b_sejoong2: -17.3,
  b_sunwoo: -13.2,
  b_syace1: -10.9,
  b_syace3p: -7.9,
};

function buildingAngle(row: BuildingRow) {
  if (Number.isFinite(VERIFIED_BUILDING_ANGLES[row.id])) return VERIFIED_BUILDING_ANGLES[row.id];
  const address = row.address ?? "";
  if (/\uc11c\ub85c3\ub85c/.test(address)) return 90;
  if (/\uc774\uc74c3\ub85c/.test(address)) return -13;
  if (/\uc774\uc74c5\ub85c/.test(address)) return -10;
  if (/\ubc1c\uc0b0\ub85c5\ubc88\uae38/.test(address)) return -2;
  if (/\ubc1c\uc0b0\ub85c/.test(address)) return -16;
  if (/\ub9e4\ubc2d\ub85c/.test(address)) return -82;
  if (/\uc774\uc74c\ub300\ub85c/.test(address)) return 64;
  if (/\uac80\ub2e8\ub85c/.test(address)) return 19;
  return 0;
}

function polygonAround(lng: number, lat: number, row: BuildingRow, index: number) {
  const stores = Math.max(1, row.total_stores ?? 1);
  const seed = hash(row.id || String(index));
  const width = 0.000075 + Math.min(stores, 30) * 0.000004 + (seed % 5) * 0.000008;
  const depth = width * (0.58 + (seed % 4) * 0.1);
  const angle = buildingAngle(row) * Math.PI / 180;
  // Longitude degrees are narrower than latitude degrees at Geomdan's latitude.
  // Rotate in local metre space, then convert back to geographic coordinates.
  const cosLat = Math.cos(lat * Math.PI / 180);
  const rotate = (x: number, y: number): [number, number] => {
    const metreX = x * cosLat;
    const rotatedX = metreX * Math.cos(angle) - y * Math.sin(angle);
    const rotatedY = metreX * Math.sin(angle) + y * Math.cos(angle);
    return [lng + rotatedX / cosLat, lat + rotatedY];
  };
  const nw = rotate(-width, -depth);
  const ne = rotate(width, -depth);
  const se = rotate(width, depth);
  const sw = rotate(-width, depth);
  return [[
    nw, ne, se, sw, nw,
  ]];
}

function toGeoJSON(rows: BuildingRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((row, index) => {
      const [lng, lat] = positioned(row, index);
      const floorVerified = ["public_building_register", "official_document", "admin_verified"].includes(row.floor_verification ?? "");
      const floors = floorVerified ? Math.max(1, row.floors ?? 1) : 0;
      const stores = Math.max(0, row.total_stores ?? 0);
      return {
        type: "Feature" as const,
        id: row.id,
        properties: { id: row.id, name: row.name, floors, stores, height: floorVerified ? Math.min(180, 12 + floors * 8) : 8, color: floorVerified && row.has_data ? "#EF665B" : "#B7B4AA", floorVerified } satisfies FeatureProps,
        geometry: { type: "Polygon" as const, coordinates: polygonAround(lng, lat, row, index) },
      };
    }),
  };
}

function toLabelGeoJSON(rows: BuildingRow[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((row, index) => ({
      type: "Feature" as const,
      id: row.id,
      properties: {
        id: row.id,
        name: row.name,
        stores: Math.max(0, row.total_stores ?? 0),
        label: `${row.name}\n${["public_building_register", "official_document", "admin_verified"].includes(row.floor_verification ?? "") ? `${Math.max(0, row.total_stores ?? 0)}개 매장` : "층수 확인 중"}`,
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
  const floor = building.floors.find((item) => item.label === selectedFloor) ?? building.floors[0];
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

export default function Store3DMapView({ buildings, userLocation, locating, onRequestLocation }: { buildings: BuildingRow[]; userLocation: { lat: number; lng: number } | null; locating?: boolean; onRequestLocation: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const userLocationRef = useRef(userLocation);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [query, setQuery] = useState("");
  const geojson = useMemo(() => toGeoJSON(buildings), [buildings]);
  const labelGeojson = useMemo(() => toLabelGeoJSON(buildings), [buildings]);
  const selectedRow = useMemo(() => buildings.find((item) => item.id === selectedId) ?? null, [buildings, selectedId]);

  const selectBuilding = useCallback((id: string) => {
    const rowIndex = buildings.findIndex((item) => item.id === id);
    const row = buildings[rowIndex];
    if (!row) return;
    setSelectedId(id);
    setBuilding(null);
    const [lng, lat] = positioned(row, rowIndex);
    mapRef.current?.easeTo({ center: [lng, lat], zoom: 17.1, pitch: 62, bearing: -28, duration: 950, offset: [0, -100] });
    fetchBuildingWithFloors(id).then((data) => {
      setBuilding(data);
      setSelectedFloor(data?.floors[0]?.label ?? "");
    });
  }, [buildings]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "osm-light": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          { id: "warm-base", type: "background", paint: { "background-color": "#e9e6dd" } },
          { id: "osm-light", type: "raster", source: "osm-light", paint: { "raster-opacity": 0.62, "raster-saturation": -0.48, "raster-contrast": 0.08, "raster-brightness-min": 0.28, "raster-brightness-max": 0.94 } },
        ],
      },
      center: CENTER,
      zoom: 14.4,
      pitch: 52,
      bearing: -22,
      minZoom: 12,
      maxZoom: 19,
      attributionControl: false,
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;
    map.dragRotate.enable();
    map.touchZoomRotate.enableRotation();

    map.on("load", () => {
      map.addSource(SOURCE_ID, { type: "geojson", data: geojson });
      map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labelGeojson });
      const currentLocation = userLocationRef.current;
      map.addSource(USER_SOURCE_ID, { type: "geojson", data: {
        type: "FeatureCollection",
        features: currentLocation ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [currentLocation.lng, currentLocation.lat] } }] : [],
      } });
      map.addLayer({ id: "geumdan-commerce-footprint", type: "fill", source: SOURCE_ID, paint: { "fill-color": "#4b3a31", "fill-opacity": 0.14 } });
      map.addLayer({ id: LAYER_ID, type: "fill-extrusion", source: SOURCE_ID, paint: {
        "fill-extrusion-color": ["case", ["boolean", ["feature-state", "selected"], false], "#EF665B", ["get", "color"]],
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.94,
      }});
      map.addLayer({ id: LABEL_LAYER_ID, type: "symbol", source: LABEL_SOURCE_ID, minzoom: 13.2, layout: {
        "text-field": ["get", "label"], "text-font": ["Open Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 12, 18, 14],
        "text-line-height": 1.05, "text-anchor": "bottom", "text-offset": [0, -1.15], "text-max-width": 10,
        "symbol-sort-key": ["-", 1000, ["get", "stores"]], "text-allow-overlap": false, "text-ignore-placement": false,
      }, paint: { "text-color": "#292722", "text-halo-color": "rgba(255,255,255,.96)", "text-halo-width": 2, "text-halo-blur": 0.5 } });
      map.addLayer({ id: USER_HALO_ID, type: "circle", source: USER_SOURCE_ID, paint: { "circle-radius": 16, "circle-color": "#1677FF", "circle-opacity": 0.16, "circle-stroke-width": 0 } });
      map.addLayer({ id: USER_DOT_ID, type: "circle", source: USER_SOURCE_ID, paint: { "circle-radius": 7, "circle-color": "#1677FF", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      map.on("click", LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });
      map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("click", LABEL_LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [geojson, labelGeojson, selectBuilding]);

  useEffect(() => {
    const source = mapRef.current?.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(geojson);
    const labels = mapRef.current?.getSource(LABEL_SOURCE_ID) as GeoJSONSource | undefined;
    labels?.setData(labelGeojson);
  }, [geojson, labelGeojson]);

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
    buildings.forEach((item) => mapRef.current?.setFeatureState({ source: SOURCE_ID, id: item.id }, { selected: item.id === selectedId }));
  }, [selectedId, buildings]);

  const results = query.trim() ? buildings.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  const closeSelection = () => {
    setSelectedId(null); setBuilding(null); setSelectedFloor("");
    mapRef.current?.easeTo({ center: CENTER, zoom: 14.4, pitch: 52, bearing: -22, duration: 750, offset: [0, 0] });
  };

  return (
    <div className="relative h-full min-h-[520px] overflow-hidden bg-[#e9e6dd]">
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,249,244,.15),transparent_24%,rgba(244,240,231,.12))]" />

      <div className="absolute left-4 right-4 top-4 z-10 md:left-6 md:right-auto md:w-[360px]">
        <div className="flex h-12 items-center gap-2 rounded-full bg-white/94 px-4 shadow-[0_8px_25px_rgba(68,61,47,.13)] backdrop-blur-xl">
          <Search size={18} className="text-[#77736c]"/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="상가 건물·매장 검색" className="min-w-0 flex-1 bg-transparent text-[14px] font-bold text-[#25231f] outline-none placeholder:text-[#9a968e]"/>
          {query && <button type="button" onClick={() => setQuery("")} className="grid h-7 w-7 place-items-center rounded-full bg-[#efede7]"><X size={14}/></button>}
        </div>
        {results.length > 0 && <div className="mt-2 overflow-hidden rounded-[20px] bg-white/96 p-2 shadow-[0_14px_35px_rgba(68,61,47,.16)] backdrop-blur-xl">{results.map((item) => <button key={item.id} type="button" onClick={() => { selectBuilding(item.id); setQuery(""); }} className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left active:bg-[#f3f1eb]"><Building2 size={17} className="text-[#EF665B]"/><span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#25231f]">{item.name}</b><small className="block truncate text-[10px] text-[#8b877f]">{["public_building_register", "official_document", "admin_verified"].includes(item.floor_verification ?? "") ? `${item.floors ?? 1}개 층` : "층수 확인 중"} · {item.total_stores ?? 0}개 매장</small></span><ChevronRight size={15} className="text-[#aaa59c]"/></button>)}</div>}
      </div>

      {!selectedId && <div className="absolute bottom-[92px] right-4 z-10 md:bottom-6 md:right-6">
        <button type="button" onClick={focusMyLocation} aria-label="내 위치로 이동" className="relative grid h-11 w-11 place-items-center rounded-full bg-white/94 text-[#1677FF] shadow-lg backdrop-blur"><LocateFixed size={19}/>{locating && <span className="absolute inset-0 animate-ping rounded-full border-2 border-[#1677FF]/30"/>}</button>
      </div>}
      {selectedId && !building && <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[12px] font-black text-[#EF665B] shadow-xl">층별 정보를 불러오는 중…</div>}
      {building && <FloorPlan building={building} row={selectedRow} userLocation={userLocation} selectedFloor={selectedFloor} onFloor={setSelectedFloor} onClose={closeSelection}/>} 
    </div>
  );
}
