-- Generic metro-* seed rows were presentation fixtures, not verified tenant records.
-- Preserve them for audit history, but never expose them as current stores.
update public.stores
set is_published = false,
    source_type = 'legacy_mock',
    source_name = 'legacy presentation fixture',
    source_url = null,
    placement_verification = 'unverified',
    floor_verification = 'unverified',
    updated_at = now()
where id like 'metro-%';

update public.buildings b
set total_stores = (
  select count(*)::integer
  from public.stores s
  where s.building_id = b.id
    and s.is_published = true
),
has_data = exists (
  select 1
  from public.stores s
  where s.building_id = b.id
    and s.is_published = true
);

