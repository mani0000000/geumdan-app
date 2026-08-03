alter table public.buildings
  add column if not exists is_published boolean not null default true,
  add column if not exists building_type text not null default 'neighborhood_commerce',
  add column if not exists floor_verification text not null default 'legacy_unverified',
  add column if not exists source_type text not null default 'legacy_unknown',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists ground_floors integer,
  add column if not exists basement_floors integer;

alter table public.floors
  add column if not exists verification_status text not null default 'legacy_unverified',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz;

alter table public.stores
  add column if not exists source_type text not null default 'legacy_unknown',
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists placement_verification text not null default 'legacy_unverified',
  add column if not exists floor_verification text not null default 'legacy_unverified';

create table if not exists public.store_place_candidates (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_place_id text not null,
  name text not null,
  category text,
  phone text,
  source_url text,
  source_payload jsonb not null default '{}'::jsonb,
  suggested_building_id text references public.buildings(id) on delete set null,
  suggested_floor_label text,
  review_status text not null default 'pending'
    check (review_status in ('pending','verified','rejected','duplicate')),
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_place_id)
);

alter table public.store_place_candidates enable row level security;
grant all on public.store_place_candidates to service_role;

-- 기존 Kakao Local API 결과는 장소명·전화·분류 후보로만 보존합니다.
-- 반경 내 검색 결과를 특정 건물/1층으로 확정했던 연결은 검증되지 않았으므로 공개에서 제외합니다.
insert into public.store_place_candidates (
  source_type, source_place_id, name, category, phone, source_url, source_payload,
  suggested_building_id, suggested_floor_label, review_status
)
select distinct on ((regexp_match(s.id, '([0-9]{6,})$'))[1])
  'kakao_local_api',
  (regexp_match(s.id, '([0-9]{6,})$'))[1],
  s.name,
  s.category,
  s.phone,
  coalesce(s.extra_info->>'source_url', s.sns_kakao),
  jsonb_build_object(
    'legacy_store_id', s.id,
    'legacy_category', s.extra_info->>'kakao_category',
    'legacy_distance_m', s.extra_info->>'distance_m',
    'reason', 'nearby result; building and floor require independent verification'
  ),
  s.building_id,
  s.floor_label,
  'pending'
from public.stores s
where s.id like 'kakao\_%' escape '\'
  and s.id ~ '[0-9]{6,}$'
order by (regexp_match(s.id, '([0-9]{6,})$'))[1],
  case when (s.extra_info->>'distance_m') ~ '^[0-9]+([.][0-9]+)?$'
    then (s.extra_info->>'distance_m')::numeric end nulls last
on conflict (source_type, source_place_id) do update set
  name = excluded.name,
  category = excluded.category,
  phone = excluded.phone,
  source_url = excluded.source_url,
  source_payload = excluded.source_payload,
  updated_at = now();

update public.stores
set is_published = false,
    source_type = 'kakao_local_api',
    source_name = 'Kakao Local API',
    source_url = coalesce(extra_info->>'source_url', sns_kakao),
    placement_verification = 'unverified_nearby',
    floor_verification = 'unverified_default'
where id like 'kakao\_%' escape '\';

update public.buildings
set building_type = 'apartment_commerce',
    floor_verification = 'legacy_unverified'
where id like 'b_apt\_%' escape '\';

update public.buildings
set is_published = false,
    has_data = false,
    source_type = 'legacy_mock',
    floor_verification = 'unverified'
where id in ('b1','nb2','nb3','nb4','nb5','nb6','nb7','nb8');

update public.buildings b
set total_stores = (
  select count(*)::integer from public.stores s
  where s.building_id = b.id and s.is_published = true
);

create index if not exists buildings_public_idx on public.buildings (is_published, name);
create index if not exists stores_public_building_idx on public.stores (is_published, building_id, floor_label);
create index if not exists store_place_candidates_review_idx on public.store_place_candidates (review_status, created_at desc);

comment on table public.store_place_candidates is
  '공식 장소 API의 사실정보 후보. 건물 및 층 배치는 독립 출처 확인 후 stores로 승격한다.';
