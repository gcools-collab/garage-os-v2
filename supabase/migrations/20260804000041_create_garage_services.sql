create table public.garage_services (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  service_key text not null,
  is_enabled boolean not null default false,
  public_title text,
  public_description text,
  public_cta_label text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint garage_services_garage_service_unique unique (garage_id, service_key),
  constraint garage_services_service_key_check check (service_key in (
    'VEHICLE_SALES', 'CONSIGNMENT', 'RENTAL', 'ENGINE_CLEANING',
    'REGISTRATION', 'WORKSHOP', 'MAINTENANCE', 'BODYWORK', 'TYRES',
    'DIAGNOSTIC', 'FINANCING', 'INSURANCE', 'EXTENDED_WARRANTY'
  )),
  constraint garage_services_display_order_check check (display_order >= 0)
);

create index garage_services_enabled_order_idx
on public.garage_services (garage_id, is_enabled, display_order, service_key);

create function public.set_garage_service_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.prevent_garage_service_tenant_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.garage_id is distinct from old.garage_id then
    raise exception 'garage_id is immutable';
  end if;
  return new;
end;
$$;

create trigger set_garage_service_updated_at_trigger
before update on public.garage_services
for each row execute function public.set_garage_service_updated_at();

create trigger prevent_garage_service_tenant_change_trigger
before update on public.garage_services
for each row execute function public.prevent_garage_service_tenant_change();

alter table public.garage_services enable row level security;

create policy "Garage members read service configuration"
on public.garage_services for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_services.garage_id and gm.user_id = auth.uid()
));

create policy "Garage admins create service configuration"
on public.garage_services for insert to authenticated
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_services.garage_id and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

create policy "Garage admins update service configuration"
on public.garage_services for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_services.garage_id and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_services.garage_id and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

create policy "Garage admins delete service configuration"
on public.garage_services for delete to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_services.garage_id and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

create view public.public_live_garage_services
with (security_barrier = true) as
select
  g.live_slug as garage_slug,
  gs.service_key,
  gs.public_title,
  gs.public_description,
  gs.public_cta_label,
  gs.display_order
from public.garage_services gs
join public.garages g on g.id = gs.garage_id
where g.live_enabled and gs.is_enabled;

revoke all on public.public_live_garage_services from public;
grant select on public.public_live_garage_services to anon, authenticated;

comment on view public.public_live_garage_services is
'Projection publique restrictive des seuls services actifs des garages Live.';

