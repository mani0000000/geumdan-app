import { supabase } from '@/lib/supabase';
import type { Coupon, NewStoreOpening, StoreCategory } from '@/lib/types';

// ─── 이번달 오픈 매장 ─────────────────────────────────────────
export async function fetchThisMonthOpenings(): Promise<NewStoreOpening[]> {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, category, floor_label, open_date, logo_url, emoji, promo_text, show_in_openings, open_benefit')
      .or(`open_date.gte.${monthStart},show_in_openings.eq.true`)
      .eq('is_open', true)
      .order('open_date', { ascending: false });

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id as string,
      storeId: row.id as string,
      storeName: row.name as string,
      category: (row.category as StoreCategory) ?? '기타',
      floor: (row.floor_label as string) ?? '',
      openDate: (row.open_date as string) ?? now.toISOString().slice(0, 10),
      emoji: (row.emoji as string) ?? '🏪',
      isNew: row.open_date ? (row.open_date as string) >= monthStart : false,
      openBenefit: (row.open_benefit as { summary: string; details: string[]; validUntil?: string }) ?? undefined,
    }));
  } catch {
    return [];
  }
}

// ─── StoreDetail (상세 매장 정보) ─────────────────────────────
export interface StoreDetail {
  description: string;
  tags: string[];
  priceRange?: string;
  menu?: { name: string; price: string; tag?: string }[];
  services?: string[];
  notice?: string;
}

export async function fetchStoreDetail(storeId: string): Promise<StoreDetail | null> {
  try {
    const { data, error } = await supabase
      .from('store_details')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error || !data) return null;

    return {
      description: (data.description as string) ?? '',
      tags: (data.tags as string[]) ?? [],
      priceRange: (data.price_range as string | null) ?? undefined,
      menu: data.menu
        ? (data.menu as { name: string; price: string; tag?: string }[])
        : undefined,
      services: (data.services as string[] | null) ?? undefined,
      notice: (data.notice as string | null) ?? undefined,
    };
  } catch {
    return null;
  }
}

// ─── 활성 쿠폰 목록 (expiry >= today) ────────────────────────
export async function fetchActiveCoupons(): Promise<Coupon[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('store_coupons')
      .select('*')
      .eq('active', true)
      .gte('expiry', today)
      .order('expiry');

    if (error || !data) return [];

    return data.map(row => ({
      id: row.id as string,
      storeId: (row.store_id as string) ?? '',
      storeName: (row.store_name as string) ?? '',
      buildingName: (row.building_name as string) ?? '',
      title: (row.title as string) ?? '',
      discount: (row.discount as string) ?? '',
      discountType: (row.discount_type as 'rate' | 'amount') ?? 'rate',
      category: (row.category as StoreCategory) ?? '기타',
      expiry: (row.expiry as string) ?? '',
      color: (row.color as string) ?? '#3182F6',
      downloaded: false,
    }));
  } catch {
    return [];
  }
}

// ─── 활성 신규 오픈 목록 ──────────────────────────────────────
export async function fetchActiveOpenings(): Promise<NewStoreOpening[]> {
  try {
    const { data, error } = await supabase
      .from('store_openings')
      .select('*')
      .eq('active', true)
      .order('open_date', { ascending: false });

    if (error || !data) return [];

    return data.map(row => {
      const ob = row.open_benefit as {
        summary: string;
        details: string[];
        validUntil?: string;
      } | null;

      return {
        id: row.id as string,
        storeId: (row.store_id as string) ?? '',
        storeName: (row.store_name as string) ?? '',
        category: (row.category as StoreCategory) ?? '기타',
        floor: (row.floor as string) ?? '',
        openDate: (row.open_date as string) ?? '',
        emoji: (row.emoji as string) ?? '🏪',
        isNew: false, // dynamically determined via classifyOpening in UI
        openBenefit: ob ?? undefined,
      };
    });
  } catch {
    return [];
  }
}
