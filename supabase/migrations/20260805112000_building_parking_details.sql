alter table public.buildings
  add column if not exists parking_type text,
  add column if not exists parking_base_fee text,
  add column if not exists parking_extra_fee text,
  add column if not exists parking_daily_max text,
  add column if not exists parking_free_minutes integer,
  add column if not exists parking_validation text,
  add column if not exists parking_hours text,
  add column if not exists parking_phone text,
  add column if not exists parking_source_url text,
  add column if not exists parking_verified_at date,
  add column if not exists parking_status text not null default 'needs_check';

alter table public.buildings
  drop constraint if exists buildings_parking_status_check;

alter table public.buildings
  add constraint buildings_parking_status_check
  check (parking_status in ('verified', 'needs_check', 'unavailable'));

alter table public.buildings
  drop constraint if exists buildings_parking_free_minutes_check;

alter table public.buildings
  add constraint buildings_parking_free_minutes_check
  check (parking_free_minutes is null or parking_free_minutes >= 0);

comment on column public.buildings.parking_status is
  'verified: official/on-site source checked, needs_check: not yet verified, unavailable: no building parking';

update public.buildings
set parking_status = case
  when parking_info is null or btrim(parking_info) = '' or parking_info ilike '%확인 필요%' then 'needs_check'
  when parking_info ilike '%주차 불가%' then 'unavailable'
  else 'needs_check'
end
where parking_status is null or parking_status = 'needs_check';

-- 공개된 입점 업체 안내에서 건물명과 주소가 일치하는 항목만 선반영한다.
-- 기본/추가 요금이 명시되지 않은 경우에는 추정하지 않고 null로 유지한다.
update public.buildings
set parking_type = '건물 뒤편 지하주차장',
    parking_free_minutes = 120,
    parking_validation = '입점 매장 이용 시 최대 2시간 무료 지원. 적용 매장과 정산 방법은 결제 전 확인하세요.',
    parking_source_url = 'https://gdkhhani.imweb.me/directions',
    parking_verified_at = date '2026-08-05',
    parking_status = 'verified',
    parking_info = '건물 뒤편 지하주차장 · 입점 매장 이용 시 최대 2시간 무료 지원'
where id = 'b_onetower'
  and name = '더원타워'
  and address like '%이음5로 36%';

update public.buildings
set parking_type = '건물 주차장',
    parking_free_minutes = 180,
    parking_validation = '일부 입점 매장 이용 안내에서 3시간 무료가 확인됩니다. 매장별 적용 여부와 정산 방법은 방문 전 확인하세요.',
    parking_source_url = 'https://www.diningcode.com/profile.php?rid=guUIPhVbXBk1',
    parking_verified_at = date '2026-08-05',
    parking_status = 'needs_check',
    parking_info = '건물 주차장 · 입점 매장별 무료 지원 조건 확인 필요'
where id = 'b_jungseok'
  and name = '정석프라자'
  and address like '%발산로 41%';
