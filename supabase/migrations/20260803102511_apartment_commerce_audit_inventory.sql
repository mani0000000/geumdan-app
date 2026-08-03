create table if not exists public.apartment_commerce_audit (
  apartment_id text primary key references public.apartments(id) on delete cascade,
  apartment_name text not null,
  dong text,
  commerce_status text not null default 'pending'
    check (commerce_status in ('pending','confirmed','none','not_applicable')),
  building_id text references public.buildings(id) on delete set null,
  location_verified boolean not null default false,
  floor_verified boolean not null default false,
  store_inventory_verified boolean not null default false,
  source_name text,
  source_url text,
  source_checked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.apartment_commerce_audit (apartment_id, apartment_name, dong)
select id, name, dong from public.apartments
on conflict (apartment_id) do update set
  apartment_name = excluded.apartment_name,
  dong = excluded.dong,
  updated_at = now();

update public.apartment_commerce_audit audit
set commerce_status = 'confirmed',
    building_id = building.id,
    location_verified = building.lat is not null and building.lng is not null,
    source_name = coalesce(building.source_name, '기존 관리자 데이터'),
    source_url = building.source_url,
    source_checked_at = building.source_checked_at,
    updated_at = now()
from public.buildings building
where building.id = 'b_apt_' || regexp_replace(audit.apartment_id, '[^a-zA-Z0-9가-힣]+', '_', 'g') || '_shops';

alter table public.apartment_commerce_audit enable row level security;
grant all on public.apartment_commerce_audit to service_role;
create index if not exists apartment_commerce_audit_status_idx on public.apartment_commerce_audit (commerce_status, dong, apartment_name);

comment on table public.apartment_commerce_audit is
  '검단권 아파트 전수 목록의 단지상가 존재·건물·층·매장 검증 진행 상태';
