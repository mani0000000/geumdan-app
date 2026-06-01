/**
 * lib/db/weather.ts
 * Supabase weather_cache 테이블에서 최신 날씨 데이터 조회
 */
import { supabase } from "@/lib/supabase";
import type { WeatherData } from "@/lib/api/weather";

const STALE_MS = 35 * 60 * 1000; // 35분 이상 지난 데이터는 신선하지 않음으로 처리

export async function fetchWeatherFromDB(): Promise<WeatherData | null> {
  try {
    const { data, error } = await supabase
      .from("weather_cache")
      .select("data, fetched_at, source")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data?.data) return null;

    // 35분 이상 된 데이터는 스킵 (배치가 밀렸을 때 대비)
    const age = Date.now() - new Date(data.fetched_at).getTime();
    if (age > STALE_MS) {
      console.warn("[weather-db] 데이터가 너무 오래됨:", Math.round(age / 60000), "분");
      return null;
    }

    return data.data as WeatherData;
  } catch {
    return null;
  }
}
