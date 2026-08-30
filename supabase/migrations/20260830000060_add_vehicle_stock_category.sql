create type public.vehicle_stock_category as enum (
  'PARTICULIER',
  'UTILITAIRE'
);

alter table public.vehicles
  add column stock_category public.vehicle_stock_category;

comment on column public.vehicles.stock_category is
  'Catégorie métier du stock public. Null conserve les véhicules existants non classés.';

drop view if exists public.public_live_vehicles;

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
  v.stock_category,
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

revoke all on public.public_live_vehicles from public;
grant select on public.public_live_vehicles to anon, authenticated;

comment on view public.public_live_vehicles is
'Projection publique restrictive. Inclut stock_category pour les filtres particuliers / utilitaires.';
