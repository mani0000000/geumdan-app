"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { Building2, CarFront, ChevronRight, Clock3, ImageIcon, LocateFixed, MapPin, Search, ShieldCheck, Store as StoreIcon, X } from "lucide-react";
import type { Building, Store, StoreCategory } from "@/lib/types";
import StoreCategoryIcon from "@/components/ui/StoreCategoryIcon";
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
        label: `${row.name}\n${(row.categories ?? []).slice(0, 3).join(" · ") || "입점 업종 확인"}${Number.isFinite(row.floors) && Number(row.floors) > 1 ? ` · ${row.floors}층` : ""}`,
      },
      geometry: { type: "Point" as const, coordinates: positioned(row, index) },
    })),
  };
}

function buildingImage(row: BuildingRow | null): string | null {
  if (!row) return null;
  return row.portrait_image_url ?? row.image_url ?? row.photo_north ?? row.photo_east ?? row.photo_south ?? row.photo_west ?? null;
}

function distanceKm(a: { lat: number; lng: number } | null, row: BuildingRow | null) {
  if (!a || !row?.lat || !row.lng) return null;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(row.lat - a.lat);
  const dLng = toRad(row.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(row.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function FloorPlan({ building, row, userLocation, selectedFloor, onFloor, onClose }: { building: Building; row: BuildingRow | null; userLocation: { lat: number; lng: number } | null; selectedFloor: string; onFloor: (value: string) => void; onClose: () => void }) {
  const floor = building.floors.find((item) => item.label === selectedFloor)
    ?? building.floors.find((item) => item.label === defaultFloorLabel(building.floors))
    ?? building.floors[0];
  const [photoDirection, setPhotoDirection] = useState("대표");
  const floorNumber = (label: string) => Number(label.match(/\d+/)?.[0] ?? 0);
  const groundFloors = useMemo(() => building.floors.filter((item) => !/^B/i.test(item.label)).sort((a, b) => floorNumber(b.label) - floorNumber(a.label)), [building.floors]);
  const basementFloors = useMemo(() => building.floors.filter((item) => /^B/i.test(item.label)).sort((a, b) => floorNumber(a.label) - floorNumber(b.label)), [building.floors]);
  const photos = [
    ["대표", row?.portrait_image_url ?? row?.image_url], ["북", row?.photo_north], ["동", row?.photo_east],
    ["남", row?.photo_south], ["서", row?.photo_west],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const imageUrl = photos.find(([label]) => label === photoDirection)?.[1] ?? photos[0]?.[1] ?? buildingImage(row);
  const distance = distanceKm(userLocation, row);
  const unassignedStores = useMemo(() => building.floors.filter((item) => /미확인|확인\s*중/.test(item.label)).flatMap((item) => item.stores), [building.floors]);
  const displayStores = floor?.stores.length ? floor.stores : (/^1F$|^1층$/.test(floor?.label ?? "") ? unassignedStores : []);
  const showingUnassigned = Boolean(!floor?.stores.length && displayStores.length);

  useEffect(() => { setPhotoDirection(photos[0]?.[0] ?? "대표"); }, [building.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button type="button" aria-label="상가 정보 닫기" onClick={onClose} className="fixed inset-0 z-[9490] cursor-default bg-black/35 backdrop-blur-[2px]" />
      <section data-store-floor-sheet role="dialog" aria-modal="true" aria-label={`${building.name} 층별 매장`} className="fixed inset-x-0 bottom-0 z-[9500] max-h-[86dvh] overflow-y-auto rounded-t-[28px] bg-[#fbfaf6] shadow-[0_-20px_60px_rgba(28,25,20,.28)] md:bottom-5 md:left-auto md:right-5 md:w-[440px] md:rounded-[28px]">
      <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-[#d8d4ca]" />
      <div className="flex items-start gap-3 px-4 pb-3 pt-3">
        <div className="grid aspect-[3/4] h-[86px] shrink-0 place-items-center overflow-hidden rounded-[18px] bg-[#ebe8df] text-[#a09b91] shadow-sm">
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

      <div className="mx-4 mb-3 rounded-[20px] border border-[#E1E8F2] bg-white p-3.5 shadow-[0_6px_18px_rgba(38,52,74,.06)]">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px] font-black text-[#25231f]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#EAF3FF] text-[#1769D2]"><CarFront size={16}/></span>주차 안내</p>
          <span className={`rounded-full px-2 py-1 text-[9px] font-black ${building.parkingStatus === "verified" ? "bg-[#DDF7EA] text-[#087A50]" : building.parkingStatus === "unavailable" ? "bg-[#EEEFF2] text-[#606975]" : "bg-[#FFF1D6] text-[#936000]"}`}>{building.parkingStatus === "verified" ? "확인 완료" : building.parkingStatus === "unavailable" ? "주차 불가" : "현장 확인"}</span>
        </div>
        {building.parkingStatus !== "unavailable" && <div className="mt-3 grid grid-cols-2 gap-2">
          <ParkingChip label="기본" value={building.parkingBaseFee} />
          <ParkingChip label="추가" value={building.parkingExtraFee} />
          <ParkingChip label="무료" value={building.parkingFreeMinutes != null ? `${building.parkingFreeMinutes}분` : undefined} />
          <ParkingChip label="일 최대" value={building.parkingDailyMax} />
        </div>}
        <p className="mt-3 text-[11px] font-semibold leading-4 text-[#5F6875]">{building.parkingValidation || building.parkingInfo || (building.parkingStatus === "unavailable" ? "건물 내 주차장을 이용할 수 없습니다." : "주차 요금과 무료 지원은 입점 매장에 확인해 주세요.")}</p>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-bold text-[#87909C]">
          {building.parkingType && <span className="flex items-center gap-1"><CarFront size={10}/>{building.parkingType}</span>}
          {building.parkingHours && <span className="flex items-center gap-1"><Clock3 size={10}/>{building.parkingHours}</span>}
          {building.parkingVerifiedAt && <span className="flex items-center gap-1"><ShieldCheck size={10}/>{building.parkingVerifiedAt.slice(0,10)} 확인</span>}
        </div>
      </div>

      <div className="border-t border-[#ece8df] px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3">
        <div className="mb-2 flex items-end justify-between pl-[72px]">
          <div><p className="text-[15px] font-black text-[#25231f]">{floor?.label} 입점 매장</p><p className="text-[10px] font-bold text-[#8b877f]">{showingUnassigned ? "층 확인 중인 연결 매장을 함께 보여드려요" : "좌우로 넘겨 매장 정보를 확인하세요"}</p></div>
          <span className="text-[11px] font-black text-[#EF665B]">{displayStores.length}곳</span>
        </div>
        <div className="flex min-h-[210px] gap-3">
          <div className="scrollbar-hide flex w-[60px] shrink-0 flex-col overflow-y-auto py-1">
            <div className="flex flex-col overflow-hidden rounded-t-[12px] border-x border-t border-[#d8d3c9] bg-[#e9e5dc] shadow-[0_8px_18px_rgba(54,48,38,.10)]">
            {groundFloors.map((item) => {
              const active = item.label === floor?.label;
              const isGround = item.level === 1;
              return <button key={item.label} type="button" onClick={() => onFloor(item.label)} className={`relative flex min-h-9 items-center justify-center border-b border-[#d8d3c9] text-[12px] font-black transition ${active ? "z-[1] bg-[#25231f] text-white shadow-md" : isGround ? "bg-[#fff8e9] text-[#8A5A18]" : "bg-[#f5f2eb] text-[#625f59]"}`}>{item.label}{isGround && <span className="absolute bottom-0.5 text-[7px] font-bold opacity-70">출입층</span>}</button>;
            })}
            </div>
            {basementFloors.length > 0 && <div className="mt-2 border-t-2 border-dashed border-[#bbb4a8] pt-1"><p className="mb-1 text-center text-[7px] font-black text-[#918a7e]">지하</p>{basementFloors.map((item) => {
              const active = item.label === floor?.label;
              return <button key={item.label} type="button" onClick={() => onFloor(item.label)} className={`mb-1 flex min-h-8 w-full items-center justify-center rounded-[9px] text-[11px] font-black ${active ? "bg-[#25231f] text-white" : "bg-[#ddd9d1] text-[#625f59]"}`}>{item.label}</button>;
            })}</div>}
          </div>
          <div className="scrollbar-hide flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-[16%]">
            {displayStores.length ? displayStores.map((store) => {
              const color = CATEGORY_COLOR[store.category] ?? CATEGORY_COLOR.기타!;
              return (
                <article key={store.id} className="min-w-[82%] snap-start overflow-hidden rounded-[20px] border border-[#e5e0d6] bg-white shadow-[0_8px_22px_rgba(48,43,34,.08)]">
                  <div className="relative h-[92px] overflow-hidden" style={{ background: `${color}18` }}>
                    {store.thumbnail_url ? <img src={store.thumbnail_url} alt={`${store.name} 대표`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><StoreCategoryIcon category={store.category} size={48} rounded="rounded-[17px]" /></div>}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-black backdrop-blur" style={{ color }}>{store.category}</span>
                  </div>
                  <div className="p-3.5">
                    <h4 className="truncate text-[15px] font-black text-[#25231f]">{store.name}</h4>
                    <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-[#77736c]">{store.description || store.hours || "매장 상세에서 영업시간과 이용 정보를 확인하세요."}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`text-[10px] font-black ${store.isOpen === true ? "text-[#16865C]" : "text-[#8b877f]"}`}>{store.isOpen === true ? "영업 중" : store.hours || "시간 확인"}</span>
                      <Link href={`/stores/detail/?id=${encodeURIComponent(store.id)}`} className="flex h-8 items-center gap-1 rounded-full bg-[#25231f] px-3 text-[10px] font-black text-white">상세 <ChevronRight size={12}/></Link>
                    </div>
                  </div>
                </article>
              );
            }) : <div className="grid min-w-full place-items-center rounded-[20px] bg-[#f3f1eb] text-center"><div><StoreIcon className="mx-auto text-[#b4afa5]"/><p className="mt-2 text-[12px] font-bold text-[#8b877f]">이 층의 매장을 정리하고 있어요</p></div></div>}
          </div>
        </div>
      </div>
      </section>
    </>
  );
}

function ParkingChip({ label, value }: { label: string; value?: string }) {
  return <div className="rounded-xl bg-[#F5F7FA] px-2.5 py-2"><p className="text-[8px] font-black text-[#929AA6]">{label}</p><p className="mt-0.5 truncate text-[11px] font-black text-[#27313F]">{value || "확인 필요"}</p></div>;
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
      || ["apartment_commerce", "central_commerce", "neighborhood_commerce", "mixed_use"].includes(row.building_type));
    return compact
      ? commerceBuildings.sort((a, b) => (b.total_stores ?? 0) - (a.total_stores ?? 0)).slice(0, 24)
      : commerceBuildings;
  }, [buildings, compact]);
  const geojson = useMemo(() => toGeoJSON(displayedBuildings), [displayedBuildings]);
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
      map.addSource(LABEL_SOURCE_ID, { type: "geojson", data: labelGeojson });
      const currentLocation = userLocationRef.current;
      map.addSource(USER_SOURCE_ID, { type: "geojson", data: {
        type: "FeatureCollection",
        features: currentLocation ? [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [currentLocation.lng, currentLocation.lat] } }] : [],
      } });
      map.addLayer({ id: LAYER_ID, type: "fill-extrusion", source: SOURCE_ID, minzoom: 13, paint: {
        "fill-extrusion-color": ["match", ["get", "buildingType"], "apartment_commerce", "#2FA87A", "central_commerce", "#F28A43", "#EF665B"],
        "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, ["get", "height"]],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 1, 0.92],
        "fill-extrusion-vertical-gradient": true,
      }}, firstSymbolLayer);
      map.addLayer({ id: LABEL_LAYER_ID, type: "symbol", source: LABEL_SOURCE_ID, minzoom: 13.2, layout: {
        "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"], "text-size": ["interpolate", ["linear"], ["zoom"], 13, 10, 16, 12, 18, 14],
        "text-line-height": 1.12, "text-anchor": "bottom", "text-offset": [0, -1.05], "text-max-width": 13,
        "symbol-sort-key": ["-", 1000, ["get", "stores"]], "text-allow-overlap": false, "text-ignore-placement": false,
      }, paint: { "text-color": "#201E1A", "text-halo-color": "rgba(255,255,255,.98)", "text-halo-width": 3, "text-halo-blur": 0.25 } });
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
      map.on("mouseenter", LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("mouseenter", VERIFIED_FOOTPRINT_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", VERIFIED_FOOTPRINT_LAYER_ID, () => { map.getCanvas().style.cursor = ""; });
      map.on("click", LABEL_LAYER_ID, (event) => {
        const id = String(event.features?.[0]?.properties?.id ?? "");
        if (id) selectBuilding(id);
      });

      // 방향값이 있는 사진을 건물 외벽 높이에 맞춰 파사드처럼 매핑한다.
      displayedBuildings.forEach((row, index) => {
        const directional = [row.photo_north, row.photo_east, row.photo_south, row.photo_west];
        const fallback = compact
          ? (row.portrait_image_url ?? row.image_url ?? directional.find(Boolean) ?? null)
          : (row.image_url ?? directional.find(Boolean) ?? row.portrait_image_url ?? null);
        if (!fallback) return;
        const element = document.createElement("button");
        element.type = "button";
        element.className = "overflow-hidden bg-[#d9d4ca] shadow-[0_5px_13px_rgba(35,31,25,.35)] transition-opacity active:opacity-80";
        const floors = Math.max(1, Number(row.floors) || 2);
        element.style.width = compact ? "46px" : `${Math.min(76, 42 + (row.total_stores ?? 0) * 0.65)}px`;
        element.style.height = compact ? "58px" : `${Math.min(82, 28 + floors * 5)}px`;
        element.style.border = compact ? "2px solid rgba(255,255,255,.96)" : "1px solid rgba(255,255,255,.78)";
        element.style.borderRadius = compact ? "10px 10px 5px 5px" : "4px";
        element.style.clipPath = compact ? "none" : "polygon(7% 8%, 100% 0, 93% 92%, 0 100%)";
        element.style.transform = compact ? "none" : "perspective(180px) rotateY(-7deg) skewY(-1deg)";
        element.setAttribute("aria-label", `${row.name} 외관`);
        const photo = document.createElement("img");
        const updateFacade = () => {
          const bearing = ((map.getBearing() % 360) + 360) % 360;
          // bearing 0°에서는 카메라가 남측에서 북쪽을 바라보므로 남측 외관이 보인다.
          const directionIndex = (Math.round(bearing / 90) + 2) % 4;
          photo.src = compact ? fallback : (directional[directionIndex] ?? fallback);
          element.dataset.direction = ["북", "동", "남", "서"][directionIndex];
        };
        updateFacade();
        photo.alt = "";
        photo.loading = "lazy";
        photo.referrerPolicy = "no-referrer";
        photo.style.width = "100%"; photo.style.height = "100%"; photo.style.objectFit = "cover";
        photo.addEventListener("error", () => {
          photo.style.display = "none";
          element.textContent = row.name.slice(0, 2);
          element.style.color = "#8c4936";
          element.style.fontSize = "11px";
          element.style.fontWeight = "900";
        });
        element.appendChild(photo);
        element.addEventListener("click", (event) => { event.stopPropagation(); selectBuilding(row.id); });
        map.on("rotateend", updateFacade);
        new maplibregl.Marker({ element, anchor: "bottom", offset: [0, 2] })
          .setLngLat(positioned(row, index))
          .addTo(map);
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [compact, displayedBuildings, geojson, labelGeojson, selectBuilding]);

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
    displayedBuildings.forEach((item) => {
      const state = { selected: item.id === selectedId };
      mapRef.current?.setFeatureState({ source: SOURCE_ID, id: item.id }, state);
    });
  }, [selectedId, displayedBuildings]);

  const results = query.trim() ? displayedBuildings.filter((item) => `${item.name} ${item.address} ${(item.store_names ?? []).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  const closeSelection = () => {
    setSelectedId(null); setBuilding(null); setSelectedFloor("");
    mapRef.current?.easeTo({ center: CENTER, zoom: 14.45, pitch: 58, bearing: -22, duration: 750, offset: [0, 0] });
  };

  return (
    <div className={`relative h-full overflow-hidden bg-[#e9e6dd] ${compact ? "min-h-0" : "min-h-[520px]"}`}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(250,249,244,.15),transparent_24%,rgba(244,240,231,.12))]" />
      <div className={`pointer-events-none absolute z-[7] rounded-full bg-white/82 px-2 py-1 text-[8px] font-bold text-[#77736c] backdrop-blur ${compact ? "right-2 top-2" : "bottom-[82px] left-3 md:bottom-3"}`}>
        © OpenStreetMap · 상가 건물 정보
      </div>
      <div className={`pointer-events-none absolute z-[6] flex items-center gap-2 rounded-full bg-white/88 px-2.5 py-1.5 text-[9px] font-black text-[#445064] shadow-sm backdrop-blur ${compact ? "left-2 top-2 max-w-[58%]" : "bottom-[82px] right-3 md:bottom-3"}`}>
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
