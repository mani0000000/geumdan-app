import { supabase } from '@/lib/supabase';
import { apartments as mockApartments } from '@/lib/mockData';
import type { Apartment } from '@/lib/types';

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchApartments(): Promise<Apartment[]> {
  if (!isSupabaseConfigured()) {
    console.log('[apartments] Supabase not configured, using mock data');
    return mockApartments;
  }

  try {
    const { data: aptRows, error: aptError } = await supabase
      .from('apartments')
      .select('*')
      .order('name');

    if (aptError) throw aptError;
    if (!aptRows || aptRows.length === 0) {
      console.log('[apartments] No rows in DB, using mock data');
      return mockApartments;
    }

    const { data: sizeRows, error: sizeError } = await supabase
      .from('apartment_sizes')
      .select('*');

    if (sizeError) throw sizeError;

    const { data: historyRows, error: historyError } = await supabase
      .from('apartment_price_history')
      .select('*')
      .order('deal_date', { ascending: true });

    if (historyError) throw historyError;

    const apartments: Apartment[] = aptRows.map((apt) => {
      const sizes = (sizeRows ?? [])
        .filter((s) => s.apt_id === apt.id)
        .map((s) => {
          const history = (historyRows ?? [])
            .filter((h) => h.apt_id === apt.id && h.pyeong === s.pyeong)
            .map((h) => ({ date: h.deal_date as string, price: h.price as number }));

          // Find most recent deal for this size
          const recentHistory = [...history].sort((a, b) =>
            b.date.localeCompare(a.date)
          );

          return {
            pyeong: s.pyeong as number,
            sqm: s.sqm as number,
            avgPrice: s.avg_price as number,
            priceHistory: history,
            recentDeal: recentHistory[0]
              ? {
                  price: recentHistory[0].price,
                  date: recentHistory[0].date,
                  floor: 0,
                  pyeong: s.pyeong as number,
                }
              : undefined,
          };
        });

      // Most recent deal across all sizes
      const allHistory = (historyRows ?? [])
        .filter((h) => h.apt_id === apt.id)
        .sort((a, b) => (b.deal_date as string).localeCompare(a.deal_date as string));

      const recentDeal = allHistory[0]
        ? {
            price: allHistory[0].price as number,
            date: allHistory[0].deal_date as string,
            floor: (allHistory[0].floor as number) ?? 0,
            pyeong: allHistory[0].pyeong as number,
          }
        : undefined;

      return {
        id: apt.id as string,
        name: apt.name as string,
        dong: (apt.dong as string) ?? '',
        households: (apt.households as number) ?? 0,
        built: (apt.built_year as number) ?? 0,
        sizes,
        recentDeal,
      };
    });

    return apartments;
  } catch (err) {
    console.error('[apartments] Error fetching from Supabase, falling back to mock data:', err);
    return mockApartments;
  }
}
