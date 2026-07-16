create type marketplace_link_status as enum (
  'ACTIVE',
  'REMOVED',
  'UNKNOWN'
);

alter table public.vehicles
add column description text,
add column notes text;

create table public.marketplace_links (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  provider text not null,
  url text not null,
  external_id text not null,
  imported_at timestamptz not null default now(),
  published_at timestamptz,
  last_seen_at timestamptz not null default now(),
  status marketplace_link_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  constraint marketplace_links_provider_check
    check (char_length(trim(provider)) between 1 and 50),
  constraint marketplace_links_url_check
    check (url ~ '^https://'),
  constraint marketplace_links_external_id_check
    check (char_length(trim(external_id)) > 0),
  constraint marketplace_links_vehicle_provider_unique
    unique (vehicle_id, provider)
);

create index marketplace_links_provider_external_id_idx
on public.marketplace_links (provider, external_id);

alter table public.marketplace_links enable row level security;

create policy "Garage members can view marketplace links"
on public.marketplace_links
for select
using (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = marketplace_links.vehicle_id
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can create marketplace links"
on public.marketplace_links
for insert
with check (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = marketplace_links.vehicle_id
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can update marketplace links"
on public.marketplace_links
for update
using (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = marketplace_links.vehicle_id
      and gm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = marketplace_links.vehicle_id
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can delete marketplace links"
on public.marketplace_links
for delete
using (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = marketplace_links.vehicle_id
      and gm.user_id = auth.uid()
  )
);

create function public.create_acquired_vehicle(
  p_garage_id uuid,
  p_brand text,
  p_model text,
  p_year integer,
  p_mileage integer,
  p_purchase_price numeric,
  p_description text,
  p_notes text,
  p_trim text,
  p_fuel text,
  p_gearbox text,
  p_power_din integer,
  p_color text,
  p_doors smallint,
  p_seats smallint,
  p_provider text,
  p_url text,
  p_external_id text,
  p_published_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_vehicle_id uuid;
begin
  insert into public.vehicles (
    garage_id,
    brand,
    model,
    year,
    mileage,
    purchase_price,
    description,
    notes,
    trim,
    fuel,
    gearbox,
    power_din,
    color,
    doors,
    seats,
    status
  )
  values (
    p_garage_id,
    p_brand,
    p_model,
    p_year,
    p_mileage,
    p_purchase_price,
    p_description,
    p_notes,
    p_trim,
    p_fuel,
    p_gearbox,
    p_power_din,
    p_color,
    p_doors,
    p_seats,
    'PURCHASED'
  )
  returning id into new_vehicle_id;

  insert into public.marketplace_links (
    vehicle_id,
    provider,
    url,
    external_id,
    published_at,
    status
  )
  values (
    new_vehicle_id,
    p_provider,
    p_url,
    p_external_id,
    p_published_at,
    'ACTIVE'
  );

  return new_vehicle_id;
end;
$$;
