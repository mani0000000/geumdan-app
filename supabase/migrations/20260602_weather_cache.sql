-- 날씨 캐시 테이블: 기상청 API 30분 배치로 수집
create table if not exists weather_cache (
  id          serial primary key,
  fetched_at  timestamptz not null default now(),
  source      text not null default '기상청',  -- '기상청' | 'Open-Meteo'
  data        jsonb not null                   -- WeatherData 전체를 JSON으로 저장
);

-- 최신 1건만 빠르게 조회
create index if not exists idx_weather_cache_fetched_at on weather_cache (fetched_at desc);

-- 오래된 데이터 자동 정리 (3일 이상 지난 것 삭제)
create or replace function cleanup_old_weather()
returns void language plpgsql as $$
begin
  delete from weather_cache where fetched_at < now() - interval '3 days';
end;
$$;
