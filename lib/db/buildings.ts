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

export async function fetchBuildings(): Promise<BuildingRow[]> {
  if (!isSupabaseConfigured()) {
    console.log('[buildings] Supabase not configured, using mock data');
    return mockBuildings.map((b) => ({
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
    }));
  }

  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('name');

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('[buildings] No rows in DB, using mock data');
      return mockBuildings.map((b) => ({
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
      }));
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
    console.error('[buildings] Error fetching from Supabase, falling back to mock data:', err);
    return mockBuildings.map((b) => ({
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
    }));
  }
}

export async function fetchStoresByBuilding(buildingId: string): Promise<Store[]> {
  if (!isSupabaseConfigured()) {
    console.log('[buildings] Supabase not configured, using mock store data');
    return getMockStores(buildingId);
  }

  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('building_id', buildingId)
      .order('floor_label');

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log(`[buildings] No store rows for building ${buildingId}, using mock data`);
      return getMockStores(buildingId);
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
      isPremium: (row.is_premium as boolean | undefined) ?? undefined,
    }));
  } catch (err) {
    console.error(`[buildings] Error fetching stores for building ${buildingId}, falling back to mock data:`, err);
    return getMockStores(buildingId);
  }
}

function getMockStores(buildingId: string): Store[] {
  const building = mockBuildings.find((b) => b.id === buildingId);
  if (!building) return [];
  return building.floors.flatMap((f) => f.stores);
}

export async function fetchBuildingWithFloors(buildingId: string): Promise<Building | null> {
  if (!isSupabaseConfigured()) {
    console.log('[buildings] Supabase not configured, using mock building data');
    return mockBuildings.find((b) => b.id === buildingId) ?? null;
  }

  try {
    const { data: buildingRow, error: buildingError } = await supabase
      .from('buildings')
      .select('*')
      .eq('id', buildingId)
      .single();

    if (buildingError) throw buildingError;
    if (!buildingRow) return mockBuildings.find((b) => b.id === buildingId) ?? null;

    const stores = await fetchStoresByBuilding(buildingId);

    // Group stores by floor_label – but since we're returning Building type
    // which has floors structure, fall back to mock if DB stores aren't structured that way
    if (stores.length === 0) {
      return mockBuildings.find((b) => b.id === buildingId) ?? null;
    }

    // Return mock building structure as DB doesn't store floor hierarchy separately
    return mockBuildings.find((b) => b.id === buildingId) ?? null;
  } catch (err) {
    console.error(`[buildings] Error fetching building ${buildingId}:`, err);
    return mockBuildings.find((b) => b.id === buildingId) ?? null;
  }
}
