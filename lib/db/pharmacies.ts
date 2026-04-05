import { supabase } from '@/lib/supabase';
import { pharmacies as mockPharmacies } from '@/lib/mockData';
import type { Pharmacy } from '@/lib/mockData';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchNightPharmacies(): Promise<Pharmacy[]> {
  if (!isSupabaseConfigured()) {
    console.log('[pharmacies] Supabase not configured, using mock data');
    return mockPharmacies;
  }

  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('is_night_pharmacy', true)
      .order('name');

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('[pharmacies] No rows in DB, using mock data');
      return mockPharmacies;
    }

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) ?? '',
      phone: (row.phone as string) ?? '',
      weekendHours: (row.weekend_hours as string | null) ?? null,
      nightHours: (row.weekday_hours as string | null) ?? null,
      isOpenNow: false,
      tags: ['심야'],
      distance: undefined,
    }));
  } catch (err) {
    console.error('[pharmacies] Error fetching from Supabase, falling back to mock data:', err);
    return mockPharmacies;
  }
}

export interface EmergencyRoomRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  distance: string;
  isOpen: boolean;
  hours: string;
  isPediatric: boolean;
  level: string;
}

export async function fetchEmergencyRooms(
  type: 'all' | 'pediatric' = 'all'
): Promise<EmergencyRoomRow[]> {
  if (!isSupabaseConfigured()) {
    console.log('[emergency] Supabase not configured, using mock data');
    return getMockEmergencyRooms(type);
  }

  try {
    let query = supabase
      .from('emergency_rooms')
      .select('*')
      .order('distance_km', { ascending: true });

    if (type === 'pediatric') {
      query = query.eq('is_pediatric', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log('[emergency] No rows in DB, using mock data');
      return getMockEmergencyRooms(type);
    }

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) ?? '',
      phone: (row.phone as string) ?? '',
      distance: row.distance_km ? `${(row.distance_km as number).toFixed(1)}km` : '?km',
      isOpen: true,
      hours: '24시간 응급실 운영',
      isPediatric: (row.is_pediatric as boolean) ?? false,
      level: (row.level as string) ?? '',
    }));
  } catch (err) {
    console.error('[emergency] Error fetching from Supabase, falling back to mock data:', err);
    return getMockEmergencyRooms(type);
  }
}

function getMockEmergencyRooms(type: 'all' | 'pediatric'): EmergencyRoomRow[] {
  const all: EmergencyRoomRow[] = [
    { id: 'er1', name: '검단탑병원', address: '인천 서구 검단로 345', phone: '032-561-1119', distance: '1.4km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: false, level: '지역응급의료기관' },
    { id: 'er2', name: '인천성모병원', address: '인천 부평구 동수로 56', phone: '032-280-5114', distance: '6.2km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true, level: '권역응급의료센터' },
    { id: 'er3', name: '나사렛국제병원', address: '인천 부평구 부평대로 56', phone: '032-570-2114', distance: '7.1km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true, level: '지역응급의료센터' },
    { id: 'er4', name: '가천대 길병원', address: '인천 남동구 남동대로 774', phone: '032-460-3114', distance: '11.3km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true, level: '권역응급의료센터' },
    { id: 'er5', name: '인하대병원', address: '인천 중구 인항로 27', phone: '032-890-2114', distance: '13.8km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true, level: '권역응급의료센터' },
  ];
  return type === 'pediatric' ? all.filter((e) => e.isPediatric) : all;
}
