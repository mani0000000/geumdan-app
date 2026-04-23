import { supabase } from '@/lib/supabase';
import type { Building, Store, Floor } from '@/lib/types';

export interface BuildingRow {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  floors: number | null;
  total_stores: number | null;
  image_url: string | null;
  categories: string[] | null;
  has_data: boolean;
}

export async function fetchBuildings(): Promise<BuildingRow[]> {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) ?? '',
      lat: (row.lat as number | null) ?? null,
      lng: (row.lng as number | null) ?? null,
      floors: (row.floors as number | null) ?? null,
      total_stores: (row.total_stores as number | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      categories: (row.categories as string[] | null) ?? null,
      has_data: (row.has_data as boolean) ?? false,
    }));
  } catch (err) {
    console.error('[buildings] fetchBuildings error:', err);
    return [];
  }
}

export async function fetchBuildingWithFloors(buildingId: string): Promise<Building | null> {
  try {
    const [buildingRes, floorsRes, storesRes] = await Promise.all([
      supabase.from('buildings').select('*').eq('id', buildingId).single(),
      supabase
        .from('floors')
        .select('*')
        .eq('building_id', buildingId)
        .order('sort_order'),
      supabase
        .from('stores')
        .select('*')
        .eq('building_id', buildingId)
        .order('floor_label'),
    ]);

    if (buildingRes.error || !buildingRes.data) return null;

    const bRow = buildingRes.data;
    const floorRows = floorsRes.data ?? [];
    const storeRows = storesRes.data ?? [];

    if (floorRows.length === 0) return null;

    // Group stores by floor_label
    const storesByFloor: Record<string, Store[]> = {};
    for (const row of storeRows) {
      const label = row.floor_label as string;
      if (!storesByFloor[label]) storesByFloor[label] = [];
      storesByFloor[label].push({
        id: row.id as string,
        name: row.name as string,
        category: (row.category as Store['category']) ?? '기타',
        phone: (row.phone as string | undefined) ?? undefined,
        hours: (row.hours as string | undefined) ?? undefined,
        x: (row.x as number) ?? 0,
        y: (row.y as number) ?? 0,
        w: (row.w as number) ?? 10,
        h: (row.h as number) ?? 10,
        isOpen: (row.is_open as boolean | undefined) ?? undefined,
        isPremium: (row.is_premium as boolean | undefined) ?? false,
      });
    }

    const floors: Floor[] = floorRows.map((row) => ({
      level: row.level as number,
      label: row.label as string,
      hasRestroom: (row.has_restroom as boolean) ?? false,
      restroomCode: (row.restroom_code as string | undefined) ?? undefined,
      stores: storesByFloor[row.label as string] ?? [],
    }));

    return {
      id: bRow.id as string,
      name: bRow.name as string,
      address: (bRow.address as string) ?? '',
      parkingInfo: (bRow.parking_info as string) ?? '',
      openTime: (bRow.open_time as string) ?? '',
      floors,
    };
  } catch (err) {
    console.error(`[buildings] fetchBuildingWithFloors error for ${buildingId}:`, err);
    return null;
  }
}

// ─── 전체 매장 flat 목록 (검색 / 리스트뷰용) ──────────────────
export interface FlatStore extends Store {
  floorLabel: string;
  buildingId: string;
  buildingName: string;
  thumbnail_url?: string | null;
}

export async function fetchAllStoresFlat(): Promise<FlatStore[]> {
  try {
    const [storesRes, buildingsRes] = await Promise.all([
      supabase.from('stores').select('*'),
      supabase.from('buildings').select('id, name'),
    ]);

    if (storesRes.error) throw storesRes.error;

    const buildingNames: Record<string, string> = {};
    (buildingsRes.data ?? []).forEach((b: { id: string; name: string }) => {
      buildingNames[b.id] = b.name;
    });

    return (storesRes.data ?? [])
      .filter((row) => row.name !== '공실')
      .map((row) => ({
        id: row.id as string,
        name: row.name as string,
        category: (row.category as Store['category']) ?? '기타',
        phone: (row.phone as string | undefined) ?? undefined,
        hours: (row.hours as string | undefined) ?? undefined,
        x: (row.x as number) ?? 0,
        y: (row.y as number) ?? 0,
        w: (row.w as number) ?? 10,
        h: (row.h as number) ?? 10,
        isOpen: (row.is_open as boolean | undefined) ?? undefined,
        isPremium: (row.is_premium as boolean | undefined) ?? false,
        floorLabel: (row.floor_label as string) ?? '',
        buildingId: (row.building_id as string) ?? '',
        buildingName: buildingNames[(row.building_id as string) ?? ''] ?? '',
        thumbnail_url: (row.thumbnail_url as string | null) ?? null,
      }));
  } catch (err) {
    console.error('[buildings] fetchAllStoresFlat error:', err);
    return [];
  }
}

export async function fetchStoresByBuilding(buildingId: string): Promise<Store[]> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_label');

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: (row.category as Store['category']) ?? '기타',
      phone: (row.phone as string | undefined) ?? undefined,
      hours: (row.hours as string | undefined) ?? undefined,
      x: (row.x as number) ?? 0,
      y: (row.y as number) ?? 0,
      w: (row.w as number) ?? 10,
      h: (row.h as number) ?? 10,
      isOpen: (row.is_open as boolean | undefined) ?? undefined,
      isPremium: (row.is_premium as boolean | undefined) ?? false,
    }));
  } catch (err) {
    console.error(`[buildings] fetchStoresByBuilding error for ${buildingId}:`, err);
    return [];
  }
}
