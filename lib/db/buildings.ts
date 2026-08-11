import { supabase } from '@/lib/supabase';
import type { Building, Store, Floor } from '@/lib/types';
import { buildings as fallbackBuildings } from '@/lib/mockData';
import {
  getTwosomeGeumdanCourtProfile,
  TWOSOME_GEUMDAN_COURT_STORE_ID,
} from '@/lib/data/twosome-geumdan-court';
import {
  buildGeneratedStoreSummary,
  kakaoPlaceUrlFromStoreId,
} from '@/lib/data/store-local-profiles';

export function getStoreOpenState(
  hours: string | null | undefined,
  isOperating: boolean | null | undefined,
): boolean | undefined {
  if (isOperating === false) return false;
  if (!hours) return undefined;
  if (/24\s*시간/.test(hours)) return true;

  const match = hours.match(/(\d{1,2}):(\d{2})\s*[~～\-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return undefined;

  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const open = Number(match[1]) * 60 + Number(match[2]);
  const close = Number(match[3]) * 60 + Number(match[4]);
  return close <= open
    ? current >= open || current < close
    : current >= open && current < close;
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
  portrait_image_url: string | null;
  categories: string[] | null;
  has_data: boolean;
  photo_north: string | null;
  photo_south: string | null;
  photo_east: string | null;
  photo_west: string | null;
  floor_verification?: string | null;
  building_type?: string | null;
  source_name?: string | null;
  source_checked_at?: string | null;
  store_names?: string[];
}

function fallbackBuildingRows(): BuildingRow[] {
  return withTwosomeBuilding(fallbackBuildings.map((building) => {
    const storeList = building.floors.flatMap((floor) => floor.stores)
      .filter((store) => store.name !== '공실');
    const categories = Array.from(new Set(storeList.map((store) => store.category)));
    return {
      id: building.id,
      name: building.name,
      address: building.address,
      lat: null,
      lng: null,
      floors: building.floors.length,
      total_stores: storeList.length,
      image_url: null,
      portrait_image_url: null,
      categories,
      has_data: true,
      photo_north: null,
      photo_south: null,
      photo_east: null,
      photo_west: null,
    };
  }));
}

function twosomeProfile() {
  return getTwosomeGeumdanCourtProfile();
}

function twosomeBuildingRow(): BuildingRow {
  const profile = twosomeProfile();
  return {
    id: profile.building.id,
    name: profile.building.name,
    address: profile.building.address,
    lat: profile.building.lat ?? null,
    lng: profile.building.lng ?? null,
    floors: 2,
    total_stores: 1,
    image_url: profile.store.coverImageUrl ?? profile.store.thumbnail_url ?? null,
    portrait_image_url: null,
    categories: ['카페'],
    has_data: true,
    photo_north: null,
    photo_south: null,
    photo_east: null,
    photo_west: null,
  };
}

function twosomeBuilding(): Building {
  const profile = twosomeProfile();
  return {
    id: profile.building.id,
    name: profile.building.name,
    address: profile.building.address,
    parkingInfo: profile.building.parkingInfo,
    openTime: profile.building.openTime,
    floors: [
      {
        level: 0,
        label: profile.floor.label,
        hasRestroom: profile.floor.hasRestroom,
        restroomLocation: profile.floor.restroomLocation,
        restroomGender: profile.floor.restroomGender,
        restroomNote: profile.floor.restroomNote,
        stores: [{
          id: profile.store.id,
          name: profile.store.name,
          category: profile.store.category,
          phone: profile.store.phone,
          hours: profile.store.hours,
          description: profile.store.description,
          x: 8,
          y: 8,
          w: 84,
          h: 84,
          isOpen: profile.store.isOpen,
          isPremium: profile.store.isPremium,
          thumbnail_url: profile.store.thumbnail_url,
        }],
      },
    ],
  };
}

function twosomeFlatStore(): FlatStore {
  const profile = twosomeProfile();
  return {
    id: profile.store.id,
    name: profile.store.name,
    category: profile.store.category,
    phone: profile.store.phone,
    hours: profile.store.hours,
    description: profile.store.shortDescription ?? profile.store.description,
    x: 8,
    y: 8,
    w: 84,
    h: 84,
    isOpen: profile.store.isOpen,
    isPremium: profile.store.isPremium,
    thumbnail_url: profile.store.thumbnail_url,
    floorLabel: profile.floor.label,
    buildingId: profile.building.id,
    buildingName: profile.building.name,
  };
}

function withTwosomeBuilding(rows: BuildingRow[]): BuildingRow[] {
  return rows.some(row => row.id === twosomeBuildingRow().id)
    ? rows
    : [...rows, twosomeBuildingRow()];
}

function withTwosomeFlatStore(stores: FlatStore[]): FlatStore[] {
  return stores.some(store => store.id === TWOSOME_GEUMDAN_COURT_STORE_ID)
    ? stores
    : [twosomeFlatStore(), ...stores];
}

function fallbackBuildingById(buildingId: string): Building | null {
  if (buildingId === twosomeBuildingRow().id) return twosomeBuilding();
  return fallbackBuildings.find((building) => building.id === buildingId) ?? null;
}

function rowExtraInfo(row: Record<string, unknown>): Record<string, unknown> {
  return row.extra_info && typeof row.extra_info === 'object' && !Array.isArray(row.extra_info)
    ? row.extra_info as Record<string, unknown>
    : {};
}

function kakaoPlaceKeyFromRow(row: Record<string, unknown>): string {
  const id = String(row.id ?? '');
  const extra = rowExtraInfo(row);
  const sourceUrl = typeof extra.source_url === 'string' ? extra.source_url : '';
  const placeId = id.match(/_(\d{6,})$/)?.[1] ?? sourceUrl.match(/(\d{6,})$/)?.[1];
  return placeId ? `kakao:${placeId}` : `store:${id}`;
}

function normalizeForMatch(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, '').toLowerCase();
}

function storeRowQualityScore(
  row: Record<string, unknown>,
  buildingName: string,
  buildingAddress: string,
): number {
  const extra = rowExtraInfo(row);
  const text = normalizeForMatch([
    row.name,
    row.short_description,
    row.description,
    extra.parent_building_name,
    extra.kakao_category,
  ].filter(Boolean).join(' '));
  const normalizedBuildingName = normalizeForMatch(buildingName);
  const normalizedBuildingAddress = normalizeForMatch(buildingAddress);
  let score = 0;

  if (row.short_description) score += 6;
  if (row.description) score += 2;
  if (row.phone) score += 2;
  if (row.hours) score += 1;
  if (extra.source_url) score += 2;
  if (extra.commerce_scope === 'apartment_complex') score += 3;

  const distance = Number(extra.distance_m);
  if (Number.isFinite(distance)) score += Math.max(0, 8 - Math.min(distance, 800) / 100);

  if (normalizedBuildingName && text.includes(normalizedBuildingName)) score += 24;
  if (normalizedBuildingAddress && text.includes(normalizedBuildingAddress)) score += 12;

  return score;
}

function compactDuplicatePlaceRows(
  rows: Record<string, unknown>[],
  buildingNames: Record<string, string>,
  buildingAddresses: Record<string, string>,
): Record<string, unknown>[] {
  const byPlace = new Map<string, { row: Record<string, unknown>; score: number; index: number }>();

  rows.forEach((row, index) => {
    const key = kakaoPlaceKeyFromRow(row);
    const buildingId = String(row.building_id ?? '');
    const score = storeRowQualityScore(
      row,
      buildingNames[buildingId] ?? '',
      buildingAddresses[buildingId] ?? '',
    );
    const current = byPlace.get(key);
    if (!current || score > current.score) byPlace.set(key, { row, score, index });
  });

  return [...byPlace.values()]
    .sort((a, b) => a.index - b.index)
    .map((item) => item.row);
}

function generatedStoreDescription(
  row: Record<string, unknown>,
  buildingName?: string,
  buildingAddress?: string,
  parkingInfo?: string,
): string | undefined {
  const description = (row.short_description as string | null)
    ?? (row.description as string | null)
    ?? undefined;
  return buildGeneratedStoreSummary({
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    category: (row.category as Store['category']) ?? '기타',
    phone: (row.phone as string | null) ?? undefined,
    hours: (row.hours as string | null) ?? undefined,
    description,
    buildingName,
    buildingAddress,
    floorLabel: (row.floor_label as string | null) ?? undefined,
    parkingInfo,
    extraInfo: {
      ...rowExtraInfo(row),
      source_url: kakaoPlaceUrlFromStoreId(String(row.id ?? '')),
    },
  });
}

export async function fetchBuildings(): Promise<BuildingRow[]> {
  try {
    const [{ data, error }, firstLinkedStores] = await Promise.all([
      supabase.from('buildings').select('*').eq('is_published', true).order('name'),
      supabase.from('stores').select('building_id,category,name', { count: 'exact' }).eq('is_published', true).range(0, 999),
    ]);

    if (error) throw error;
    if (firstLinkedStores.error) throw firstLinkedStores.error;
    if (!data || data.length === 0) return [];

    const linkedTotal = firstLinkedStores.count ?? firstLinkedStores.data?.length ?? 0;
    const linkedPages = await Promise.all(Array.from(
      { length: Math.max(0, Math.ceil(linkedTotal / 1000) - 1) },
      (_, index) => (index + 1) * 1000,
    ).map((from) => supabase.from('stores').select('building_id,category,name').eq('is_published', true).range(from, from + 999)));
    const linkedPageError = linkedPages.find((page) => page.error)?.error;
    if (linkedPageError) throw linkedPageError;
    const linkedStores = [...(firstLinkedStores.data ?? []), ...linkedPages.flatMap((page) => page.data ?? [])];

    const storeSummary = new Map<string, { count: number; categories: Set<string>; names: string[] }>();
    for (const store of linkedStores ?? []) {
      const buildingId = String(store.building_id ?? '');
      if (!buildingId) continue;
      const summary = storeSummary.get(buildingId) ?? { count: 0, categories: new Set<string>(), names: [] };
      summary.count += 1;
      if (store.category) summary.categories.add(String(store.category));
      if (store.name && summary.names.length < 12) summary.names.push(String(store.name));
      storeSummary.set(buildingId, summary);
    }

    return data.map((row) => {
      const linked = storeSummary.get(String(row.id));
      return ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) ?? '',
      lat: (row.lat as number | null) ?? null,
      lng: (row.lng as number | null) ?? null,
      floors: (row.floors as number | null) ?? null,
      image_url: (row.image_url as string | null) ?? null,
      portrait_image_url: (row.portrait_image_url as string | null) ?? null,
      categories: linked ? [...linked.categories] : ((row.categories as string[] | null) ?? null),
      has_data: (row.has_data as boolean) ?? false,
      photo_north: (row.photo_north as string | null) ?? null,
      photo_south: (row.photo_south as string | null) ?? null,
      photo_east: (row.photo_east as string | null) ?? null,
      photo_west: (row.photo_west as string | null) ?? null,
      floor_verification: (row.floor_verification as string | null) ?? null,
      building_type: (row.building_type as string | null) ?? null,
      source_name: (row.source_name as string | null) ?? null,
      source_checked_at: (row.source_checked_at as string | null) ?? null,
      total_stores: linked?.count ?? ((row.total_stores as number | null) ?? null),
      store_names: linked?.names ?? [],
    }); });
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
        .eq('is_published', true)
        .order('floor_label'),
    ]);

    if (buildingRes.error || !buildingRes.data) return null;

    const bRow = buildingRes.data;
    const floorRows = floorsRes.data ?? [];
    const storeRows = storesRes.data ?? [];

    const normalizeFloorLabel = (value: unknown) => {
      const raw = String(value ?? '').trim().toUpperCase();
      const basement = raw.match(/^B\s*(\d+)/);
      if (basement) return `B${basement[1]}`;
      const ground = raw.match(/(\d+)/);
      return ground ? `${ground[1]}F` : raw || '1F';
    };

    // Group stores by floor_label
    const storesByFloor: Record<string, Store[]> = {};
    for (const row of storeRows) {
      const label = normalizeFloorLabel(row.floor_label);
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
        isOpen: getStoreOpenState(
          row.hours as string | null,
          row.is_open as boolean | null,
        ),
        isPremium: (row.is_premium as boolean | undefined) ?? false,
        description: generatedStoreDescription(
          row as Record<string, unknown>,
          bRow.name as string,
          (bRow.address as string) ?? '',
          (bRow.parking_info as string) ?? '',
        ),
        thumbnail_url: (row.cover_image_url as string | null)
          ?? (row.landscape_image_url as string | null)
          ?? (row.thumbnail_url as string | null)
          ?? null,
      });
    }

    const registeredFloors = floorRows.map((row) => ({
      ...row,
      normalizedLabel: normalizeFloorLabel(row.label),
    }));
    const floorLabels = new Set(registeredFloors.map((row) => row.normalizedLabel));
    Object.keys(storesByFloor).forEach((label) => floorLabels.add(label));
    const declaredFloors = Number(bRow.floors);
    if (Number.isFinite(declaredFloors) && declaredFloors > 0) {
      for (let level = 1; level <= declaredFloors; level += 1) floorLabels.add(`${level}F`);
    }
    const declaredBasementFloors = Number(bRow.basement_floors);
    if (Number.isFinite(declaredBasementFloors) && declaredBasementFloors > 0) {
      for (let level = 1; level <= declaredBasementFloors; level += 1) floorLabels.add(`B${level}`);
    }
    if (floorLabels.size === 0) floorLabels.add('1F');

    const floorLevel = (label: string) => label.startsWith('B') ? -Number(label.slice(1)) : Number(label.replace('F', ''));
    const floors: Floor[] = [...floorLabels]
      .sort((a, b) => floorLevel(a) - floorLevel(b))
      .map((label) => {
        const row = registeredFloors.find((item) => item.normalizedLabel === label);
        return {
      level: row ? row.level as number : floorLevel(label),
      label,
      hasRestroom: (row?.has_restroom as boolean | undefined) ?? false,
      restroomCode: (row?.restroom_code as string | undefined) ?? undefined,
      stores: storesByFloor[label] ?? [],
    }; });

    return {
      id: bRow.id as string,
      name: bRow.name as string,
      address: (bRow.address as string) ?? '',
      parkingInfo: (bRow.parking_info as string) ?? '',
      parkingType: (bRow.parking_type as string) ?? '',
      parkingBaseFee: (bRow.parking_base_fee as string) ?? '',
      parkingExtraFee: (bRow.parking_extra_fee as string) ?? '',
      parkingDailyMax: (bRow.parking_daily_max as string) ?? '',
      parkingFreeMinutes: (bRow.parking_free_minutes as number | null) ?? undefined,
      parkingValidation: (bRow.parking_validation as string) ?? '',
      parkingHours: (bRow.parking_hours as string) ?? '',
      parkingPhone: (bRow.parking_phone as string) ?? '',
      parkingSourceUrl: (bRow.parking_source_url as string) ?? '',
      parkingVerifiedAt: (bRow.parking_verified_at as string) ?? '',
      parkingStatus: (bRow.parking_status as Building['parkingStatus']) ?? 'needs_check',
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

function fallbackFlatStores(): FlatStore[] {
  return withTwosomeFlatStore(fallbackBuildings.flatMap((building) =>
    building.floors.flatMap((floor) =>
      floor.stores
        .filter((store) => store.name !== '공실')
        .map((store) => ({
          ...store,
          floorLabel: floor.label,
          buildingId: building.id,
          buildingName: building.name,
          thumbnail_url: store.thumbnail_url ?? null,
        })),
    ),
  ));
}

export async function fetchAllStoresFlat(): Promise<FlatStore[]> {
  try {
    const PAGE_SIZE = 1000;
    const [firstStoresRes, buildingsRes] = await Promise.all([
      supabase.from('stores').select('*', { count: 'exact' }).eq('is_published', true).range(0, PAGE_SIZE - 1),
      supabase.from('buildings').select('id, name, address, parking_info').eq('is_published', true),
    ]);

    if (firstStoresRes.error) throw firstStoresRes.error;

    const total = firstStoresRes.count ?? firstStoresRes.data?.length ?? 0;
    const remainingPageStarts = Array.from(
      { length: Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) },
      (_, index) => (index + 1) * PAGE_SIZE,
    );
    const remainingPages = await Promise.all(
      remainingPageStarts.map(from =>
        supabase.from('stores').select('*').eq('is_published', true).range(from, from + PAGE_SIZE - 1)
      ),
    );
    const failedPage = remainingPages.find(page => page.error);
    if (failedPage?.error) throw failedPage.error;
    const storeRows = [
      ...(firstStoresRes.data ?? []),
      ...remainingPages.flatMap(page => page.data ?? []),
    ];

    const buildingNames: Record<string, string> = {};
    const buildingAddresses: Record<string, string> = {};
    const buildingParking: Record<string, string> = {};
    (buildingsRes.data ?? []).forEach((b: { id: string; name: string }) => {
      buildingNames[b.id] = b.name;
      buildingAddresses[b.id] = (b as { address?: string | null }).address ?? '';
      buildingParking[b.id] = (b as { parking_info?: string | null }).parking_info ?? '';
    });

    const compactRows = compactDuplicatePlaceRows(
      storeRows as Record<string, unknown>[],
      buildingNames,
      buildingAddresses,
    );

    const stores = compactRows
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
        isOpen: getStoreOpenState(
          row.hours as string | null,
          row.is_open as boolean | null,
        ),
        isPremium: (row.is_premium as boolean | undefined) ?? false,
        description: generatedStoreDescription(
          row as Record<string, unknown>,
          buildingNames[(row.building_id as string) ?? ''] ?? '',
          buildingAddresses[(row.building_id as string) ?? ''] ?? '',
          buildingParking[(row.building_id as string) ?? ''] ?? '',
        ),
        floorLabel: (row.floor_label as string) ?? '',
        buildingId: (row.building_id as string) ?? '',
        buildingName: buildingNames[(row.building_id as string) ?? ''] ?? '',
        thumbnail_url: (row.cover_image_url as string | null)
          ?? (row.landscape_image_url as string | null)
          ?? (row.thumbnail_url as string | null)
          ?? null,
      }));
    return stores;
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
      .eq('is_published', true)
      .order('floor_label');

    if (error) throw error;

    const stores = (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: (row.category as Store['category']) ?? '기타',
      phone: (row.phone as string | undefined) ?? undefined,
      hours: (row.hours as string | undefined) ?? undefined,
      x: (row.x as number) ?? 0,
      y: (row.y as number) ?? 0,
      w: (row.w as number) ?? 10,
      h: (row.h as number) ?? 10,
      isOpen: getStoreOpenState(
        row.hours as string | null,
        row.is_open as boolean | null,
      ),
      isPremium: (row.is_premium as boolean | undefined) ?? false,
      description: generatedStoreDescription(row as Record<string, unknown>),
      thumbnail_url: (row.cover_image_url as string | null)
        ?? (row.landscape_image_url as string | null)
        ?? (row.thumbnail_url as string | null)
        ?? null,
    }));
    if (stores.length > 0) return stores;
    return [];
  } catch (err) {
    console.error(`[buildings] fetchStoresByBuilding error for ${buildingId}:`, err);
    return [];
  }
}
