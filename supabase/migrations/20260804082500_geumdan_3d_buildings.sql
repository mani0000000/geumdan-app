create table if not exists public.map_building_features (
  id text primary key,
  name text,
  kind text not null check (kind in ('apartment', 'commerce', 'building')),
  height_m numeric(7,2) not null check (height_m > 0),
  floors integer check (floors is null or floors > 0),
  confidence text not null check (confidence in ('official', 'source', 'estimated')),
  commerce_id text,
  geometry jsonb not null,
  source_name text not null,
  source_updated_at timestamptz,
  dataset_version text not null,
  imported_at timestamptz not null default now()
);

create index if not exists map_building_features_kind_idx on public.map_building_features (kind);
create index if not exists map_building_features_commerce_idx on public.map_building_features (commerce_id) where commerce_id is not null;

create table if not exists public.map_building_dataset_runs (
  id bigint generated always as identity primary key,
  dataset_version text not null,
  source_name text not null,
  feature_count integer not null check (feature_count >= 0),
  apartment_count integer not null default 0,
  commerce_count integer not null default 0,
  measured_height_count integer not null default 0,
  status text not null default 'ready' check (status in ('building', 'ready', 'failed')),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.map_building_features enable row level security;
alter table public.map_building_dataset_runs enable row level security;

create policy "Public can read map building features" on public.map_building_features for select to anon, authenticated using (true);
create policy "Public can read ready map dataset status" on public.map_building_dataset_runs for select to anon, authenticated using (status = 'ready');

grant select on public.map_building_features to anon, authenticated;
grant select on public.map_building_dataset_runs to anon, authenticated;
