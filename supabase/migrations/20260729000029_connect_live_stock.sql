create type public.vehicle_publication_status as enum (
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED'
);

alter table public.garages
add column live_slug text,
add column live_enabled boolean not null default false;

update public.garages
set live_slug = 'garage-' || substr(replace(id::text, '-', ''), 1, 12)
where live_slug is null;

alter table public.garages
alter column live_slug set not null,
add constraint garages_live_slug_format_check
  check (live_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index garages_live_slug_unique on public.garages (live_slug);

alter table public.vehicles
add column live_slug text,
add column publication_status public.vehicle_publication_status not null default 'DRAFT',
add column published_at timestamptz;

update public.vehicles
set
  live_slug = lower(trim(both '-' from regexp_replace(
    concat_ws('-', brand, model, coalesce(trim, version), year::text)
      || '-' || substr(replace(id::text, '-', ''), 1, 8),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  ))),
  publication_status = case
    when status = 'PUBLISHED' then 'PUBLISHED'::public.vehicle_publication_status
    else 'DRAFT'::public.vehicle_publication_status
  end,
  published_at = case when status = 'PUBLISHED' then coalesce(updated_at, created_at) end
where live_slug is null;

alter table public.vehicles
alter column live_slug set not null,
add constraint vehicles_live_slug_format_check
  check (live_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

create unique index vehicles_garage_live_slug_unique
on public.vehicles (garage_id, live_slug);

create index vehicles_public_catalog_idx
on public.vehicles (garage_id, publication_status, published_at desc, id);

create function public.assign_live_identifiers()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'garages' and new.live_slug is null then
    new.live_slug := 'garage-' || substr(replace(new.id::text, '-', ''), 1, 12);
  elsif tg_table_name = 'vehicles' and new.live_slug is null then
    new.live_slug := lower(trim(both '-' from regexp_replace(
      concat_ws('-', new.brand, new.model, coalesce(new.trim, new.version), new.year::text)
        || '-' || substr(replace(new.id::text, '-', ''), 1, 8),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )));
  end if;
  return new;
end;
$$;

create trigger assign_garage_live_identifier
before insert on public.garages
for each row execute function public.assign_live_identifiers();

create trigger assign_vehicle_live_identifier
before insert on public.vehicles
for each row execute function public.assign_live_identifiers();

create function public.sync_vehicle_publication_from_lifecycle()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'PUBLISHED' and (
    tg_op = 'INSERT'
    or old.status is distinct from new.status
  ) then
    new.publication_status := 'PUBLISHED';
    new.published_at := coalesce(new.published_at, now());
  elsif new.status in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED') then
    new.publication_status := 'UNPUBLISHED';
  end if;
  return new;
end;
$$;

create trigger sync_vehicle_publication_from_lifecycle_trigger
before insert or update of status, publication_status on public.vehicles
for each row execute function public.sync_vehicle_publication_from_lifecycle();

create view public.public_live_garages
with (security_barrier = true)
as
select
  g.id as garage_id,
  g.live_slug,
  g.live_enabled,
  coalesce(nullif(trim(gb.display_name), ''), g.name) as display_name,
  gb.logo_path,
  gb.favicon_path,
  gb.phone,
  gb.email,
  gb.website_url,
  gb.address_line1,
  gb.address_line2,
  gb.postal_code,
  gb.city,
  coalesce(gb.country_code, 'FR') as country_code,
  gb.short_description,
  gb.facebook_url,
  gb.instagram_url,
  coalesce(gb.theme_key, 'default') as theme_key,
  gb.primary_color,
  gb.secondary_color,
  gb.accent_color
from public.garages g
left join public.garage_branding gb on gb.garage_id = g.id
where g.live_enabled;

create view public.public_live_vehicles
with (security_barrier = true)
as
select
  v.id,
  v.garage_id,
  v.live_slug,
  v.brand,
  v.model,
  coalesce(v.trim, v.version) as version,
  v.year,
  v.mileage,
  v.fuel,
  v.gearbox,
  v.body_type,
  v.power_din,
  v.fiscal_power,
  v.doors,
  v.seats,
  v.color,
  v.first_registration_date,
  v.selling_price,
  v.description,
  v.status,
  v.publication_status,
  v.published_at,
  v.created_at,
  v.updated_at,
  v.co2_emissions,
  v.crit_air,
  v.euro_standard,
  v.owners_count
from public.vehicles v
join public.garages g on g.id = v.garage_id
where g.live_enabled
  and v.publication_status = 'PUBLISHED'
  and v.status not in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED');

create view public.public_live_vehicle_images
with (security_barrier = true)
as
select
  vi.id,
  vi.vehicle_id,
  v.garage_id,
  vi.storage_path,
  vi.is_primary,
  vi.created_at
from public.vehicle_images vi
join public.vehicles v on v.id = vi.vehicle_id
join public.garages g on g.id = v.garage_id
where g.live_enabled
  and v.publication_status = 'PUBLISHED'
  and v.status not in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED')
  and vi.type <> 'DOCUMENT';

revoke all on public.public_live_garages from public;
revoke all on public.public_live_vehicles from public;
revoke all on public.public_live_vehicle_images from public;
grant select on public.public_live_garages to anon, authenticated;
grant select on public.public_live_vehicles to anon, authenticated;
grant select on public.public_live_vehicle_images to anon, authenticated;

comment on view public.public_live_vehicles is
'Projection publique restrictive. La vue propriétaire expose uniquement les colonnes Live et applique activation garage, publication et cycle de vie.';

comment on view public.public_live_vehicle_images is
'Projection publique restrictive des images non documentaires appartenant aux véhicules visibles.';
