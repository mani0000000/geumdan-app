import { supabase } from '@/lib/supabase';
import { buildings as mockBuildings } from '@/lib/mockData';
import type { Building, Store, Floor } from '@/lib/types';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

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

function mockBuildingRow(b: Building): BuildingRow {
  return {
    id: b.id,
    name: b.name,
    address: b.address,
    lat: null,
    lng: null,
    floors: b.floors.length,
    total_stores: b.floors.reduce((acc, f) => acc + f.stores.length, 0),
    image_url: null,
    categories: null,
    has_data: true,
  };
}

export async function fetchBuildings(): Promise<BuildingRow[]> {
  if (!isSupabaseConfigured()) {
    return mockBuildings.map(mockBuildingRow);
  }

  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');

    if (error) throw error;
    if (!data || data.length === 0) {
      return mockBuildings.map(mockBuildingRow);
    }

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
    console.error('[buildings] fetchBuildings error, falling back to mock:', err);
    return mockBuildings.map(mockBuildingRow);
  }
}

export async function fetchBuildingWithFloors(buildingId: string): Promise<Building | null> {
  if (!isSupabaseConfigured()) {
    return mockBuildings.find((b) => b.id === buildingId) ?? null;
  }

  try {
    // Fetch building meta, floors, and stores in parallel
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

    if (buildingRes.error) throw buildingRes.error;
    if (!buildingRes.data) return mockBuildings.find((b) => b.id === buildingId) ?? null;

    const bRow = buildingRes.data;
    const floorRows = floorsRes.data ?? [];
    const storeRows = storesRes.data ?? [];

    // Fall back to mock if no floor data in DB yet
    if (floorRows.length === 0) {
      return mockBuildings.find((b) => b.id === buildingId) ?? null;
    }

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
    console.error(`[buildings] fetchBuildingWithFloors error for ${buildingId}, falling back to mock:`, err);
    return mockBuildings.find((b) => b.id === buildingId) ?? null;
  }
}

export async function fetchStoresByBuilding(buildingId: string): Promise<Store[]> {
  if (!isSupabaseConfigured()) {
    const building = mockBuildings.find((b) => b.id === buildingId);
    return building ? building.floors.flatMap((f) => f.stores) : [];
  }

  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_label');

    if (error) throw error;
    if (!data || data.length === 0) {
      const building = mockBuildings.find((b) => b.id === buildingId);
      return building ? building.floors.flatMap((f) => f.stores) : [];
    }

    return data.map((row) => ({
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
    const building = mockBuildings.find((b) => b.id === buildingId);
    return building ? building.floors.flatMap((f) => f.stores) : [];
  }
}
