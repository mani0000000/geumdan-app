grant select on table public.marts to authenticated;

drop policy if exists marts_authenticated_select_active on public.marts;
create policy marts_authenticated_select_active
  on public.marts
  for select
  to authenticated
  using (active = true);
