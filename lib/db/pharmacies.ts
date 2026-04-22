import { supabase } from '@/lib/supabase';
import { pharmacies as mockPharmacies } from '@/lib/mockData';
import type { Pharmacy } from '@/lib/mockData';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Parse "HH:MM~HH:MM" time range string, return true if current time is within range
function isWithinHoursStr(hoursStr: string | null): boolean {
  if (!hoursStr) return false;
  if (/24시간/.test(hoursStr)) return true;

  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();

  // Find all time ranges in the string (handles "토 09:00~18:00 / 일 10:00~15:00")
  const matches = [...hoursStr.matchAll(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/g)];
  for (const m of matches) {
    const s = parseInt(m[1]) * 60 + parseInt(m[2]);
    const e = parseInt(m[3]) * 60 + parseInt(m[4]);
    if (e < s) {
      // Overnight span (e.g. 22:00~06:00)
      if (cur >= s || cur < e) return true;
    } else {
      if (cur >= s && cur < e) return true;
    }
  }
  return false;
}

function computeIsOpenNow(row: {
  weekday_hours: string | null;
  weekend_hours: string | null;
  night_hours: string | null;
}): boolean {
  const now = new Date();
  const day = now.getDay();
  const isWeekend = day === 0 || day === 6;
  const hour = now.getHours();
  const isNight = hour >= 21 || hour < 6;

  // 24-hour pharmacy
  const allHours = [row.weekday_hours, row.weekend_hours, row.night_hours].join(' ');
  if (/24시간/.test(allHours)) return true;

  // Night time: check night_hours first, then fall through to regular hours
  if (isNight && row.night_hours) return isWithinHoursStr(row.night_hours);

  const relevantHours = isWeekend ? row.weekend_hours : row.weekday_hours;
  return isWithinHoursStr(relevantHours);
}

function computeTags(row: {
  is_night_pharmacy: boolean;
  is_weekend_pharmacy: boolean;
  night_hours: string | null;
  weekday_hours: string | null;
  weekend_hours: string | null;
}): string[] {
  const tags: string[] = [];
  if (row.is_weekend_pharmacy) tags.push('주말');
  if (row.is_night_pharmacy) tags.push('심야');
  const allHours = [row.weekday_hours, row.weekend_hours, row.night_hours].join(' ');
  if (/24시간/.test(allHours)) tags.push('24시');
  return tags;
}

export async function fetchAllPharmacies(): Promise<Pharmacy[]> {
  if (!isSupabaseConfigured()) {
    console.log('[pharmacies] Supabase not configured, using mock data');
    return mockPharmacies;
  }

  try {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
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
      weekdayHours: (row.weekday_hours as string | null) ?? null,
      weekendHours: (row.weekend_hours as string | null) ?? null,
      nightHours: (row.night_hours as string | null) ?? null,
      isOpenNow: computeIsOpenNow({
        weekday_hours: row.weekday_hours,
        weekend_hours: row.weekend_hours,
        night_hours: row.night_hours,
      }),
      tags: computeTags({
        is_night_pharmacy: (row.is_night_pharmacy as boolean) ?? false,
        is_weekend_pharmacy: (row.is_weekend_pharmacy as boolean) ?? false,
        night_hours: row.night_hours,
        weekday_hours: row.weekday_hours,
        weekend_hours: row.weekend_hours,
      }),
      distance: undefined,
    }));
  } catch (err) {
    console.error('[pharmacies] Error fetching from Supabase, falling back to mock data:', err);
    return mockPharmacies;
  }
}

// Keep the night-only fetch for backwards compatibility
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
      weekdayHours: (row.weekday_hours as string | null) ?? null,
      weekendHours: (row.weekend_hours as string | null) ?? null,
      nightHours: (row.night_hours as string | null) ?? null,
      isOpenNow: computeIsOpenNow({
        weekday_hours: row.weekday_hours,
        weekend_hours: row.weekend_hours,
        night_hours: row.night_hours,
      }),
      tags: computeTags({
        is_night_pharmacy: (row.is_night_pharmacy as boolean) ?? false,
        is_weekend_pharmacy: (row.is_weekend_pharmacy as boolean) ?? false,
        night_hours: row.night_hours,
        weekday_hours: row.weekday_hours,
        weekend_hours: row.weekend_hours,
      }),
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
    { id: 'er1', name: '검단탑병원',              address: '인천 서구 청마로 19번길 5 (당하동)',        phone: '032-590-0114', distance: '1.5km',  isOpen: true, hours: '24시간 응급실 운영', isPediatric: false, level: '지역응급의료기관' },
    { id: 'er2', name: '인천검단 온누리병원',      address: '인천 서구 완정로 199 (왕길동)',             phone: '032-568-9111', distance: '2.2km',  isOpen: true, hours: '24시간 응급실 운영', isPediatric: false, level: '지역응급의료기관' },
    { id: 'er3', name: '가톨릭대학교 인천성모병원',address: '인천 부평구 동수로 56 (부평동)',            phone: '1544-9004',    distance: '8.5km',  isOpen: true, hours: '24시간 응급실 운영', isPediatric: true,  level: '권역응급의료센터' },
    { id: 'er4', name: '가천대 길병원',            address: '인천 남동구 남동대로 774번길 21 (구월동)', phone: '1577-2299',    distance: '13.5km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true,  level: '권역응급의료센터' },
    { id: 'er5', name: '인하대학교병원',           address: '인천 중구 인항로 27 (신흥동)',              phone: '032-890-2300', distance: '16.0km', isOpen: true, hours: '24시간 응급실 운영', isPediatric: true,  level: '권역응급의료센터' },
  ];
  return type === 'pediatric' ? all.filter((e) => e.isPediatric) : all;
}
