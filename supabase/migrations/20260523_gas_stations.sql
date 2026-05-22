-- 검단 주유소 큐레이션 테이블
create table if not exists gas_stations (
  id            bigserial primary key,
  name          text        not null,
  brand_code    text        not null default 'ETC',
  brand_name    text        not null,
  area          text        not null,  -- 동 이름 (당하동, 원당동, ...)
  address       text        not null,
  lat           double precision not null,
  lng           double precision not null,
  opinet_id     text,                  -- Opinet UNI_ID (자동 매칭 후 저장)
  is_self       boolean     not null default false,   -- 셀프 여부
  is_alttul     boolean     not null default false,   -- 알뜰 여부
  sort_order    int         not null default 0,
  active        boolean     not null default true,
  created_at    timestamptz not null default now()
);

create index if not exists idx_gas_stations_area on gas_stations(area);
create index if not exists idx_gas_stations_opinet_id on gas_stations(opinet_id);

-- RLS: 모든 사람이 읽기 가능 (가격 조회용)
alter table gas_stations enable row level security;
drop policy if exists "gas_stations_select" on gas_stations;
create policy "gas_stations_select" on gas_stations
  for select using (active = true);

-- ─── 시드 데이터 ────────────────────────────────────────────────────
insert into gas_stations
  (name, brand_code, brand_name, area, address, lat, lng, is_self, is_alttul, sort_order)
values
  -- 1. 당하동 · 원당동 (검단신도시 중심축)
  ('검단농협주유소',   'NHO', '농협알뜰',     '당하동', '인천 서구 완정로 38',       37.5445, 126.6715, false, true,  10),
  ('신도시주유소',     'ETC', '자가상표',     '당하동', '인천 서구 고산후로 102',    37.5505, 126.6775, false, false, 20),
  ('창신주유소',       'ETC', '자가상표',     '원당동', '인천 서구 원당대로 802',    37.5490, 126.6840, false, false, 30),
  ('검단원당주유소',   'SOL', 'S-OIL',        '원당동', '인천 서구 원당대로 834',    37.5495, 126.6850, false, false, 40),

  -- 2. 마전동 · 검단동
  ('검단주유소',       'HDO', '현대오일뱅크', '마전동', '인천 서구 완정로 183',      37.5565, 126.6745, false, false, 50),
  ('마전주유소',       'RTO', '알뜰주유소',   '마전동', '인천 서구 완정로 223',      37.5580, 126.6745, false, true,  60),
  ('검단대로주유소',   'GSC', 'GS칼텍스',     '마전동', '인천 서구 검단로 502',      37.5555, 126.6810, false, false, 70),

  -- 3. 왕길동 (공단 및 서구 서북권 길목)
  ('차오름에너지주유소','SKE', 'SK에너지',     '왕길동', '인천 서구 단봉로 78',       37.5615, 126.6675, false, false, 80),
  ('미소주유소',       'SKE', 'SK에너지',     '왕길동', '인천 서구 단봉로 118',      37.5630, 126.6680, false, false, 90),
  ('오일드림주유소',   'HDO', '현대오일뱅크', '왕길동', '인천 서구 거남로 22',       37.5610, 126.6650, false, false, 100),
  ('구도일주유소',     'SOL', 'S-OIL',        '왕길동', '인천 서구 단봉로 30',       37.5608, 126.6668, false, false, 110),
  ('단봉주유소',       'ETC', '자가상표',     '왕길동', '인천 서구 검단로 123',      37.5640, 126.6700, false, false, 120),
  ('왕길셀프주유소',   'ETC', '자가상표',     '왕길동', '인천 서구 사곶로 25',       37.5650, 126.6635, true,  false, 130),

  -- 4. 금곡동 · 오류동 (검단산단 및 강화/통진 방면)
  ('금곡주유소',       'HDO', '현대오일뱅크', '금곡동', '인천 서구 검단로 732',      37.5525, 126.6565, false, false, 140),
  ('검단스타주유소',   'GSC', 'GS칼텍스',     '금곡동', '인천 서구 검단로 669',      37.5515, 126.6605, false, false, 150),
  ('인천랍스터주유소', 'HDO', '현대오일뱅크', '금곡동', '인천 서구 검단로 694',      37.5520, 126.6595, false, false, 160),
  ('오류공단주유소',   'ETC', '자가상표',     '오류동', '인천 서구 검단로 45번길 12',37.5460, 126.6495, false, false, 170),
  ('오류셀프주유소',   'HDO', '현대오일뱅크', '오류동', '인천 서구 드림로 112',      37.5470, 126.6510, true,  false, 180),

  -- 5. 불로동 · 대곡동 (김포 경계지대)
  ('불로주유소',       'ETC', '자가상표',     '불로동', '인천 서구 검단로 798',      37.5395, 126.6650, false, false, 190),
  ('대곡주유소',       'ETC', '자가상표',     '대곡동', '인천 서구 대곡로 214',      37.5350, 126.6800, false, false, 200),
  ('대곡대로주유소',   'ETC', '자가상표',     '대곡동', '인천 서구 대곡로 351',      37.5360, 126.6820, false, false, 210)
on conflict do nothing;
