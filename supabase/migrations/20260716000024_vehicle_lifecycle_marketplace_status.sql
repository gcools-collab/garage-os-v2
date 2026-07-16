alter type public.vehicle_status rename to vehicle_status_legacy;

create type public.vehicle_status as enum (
  'PURCHASED',
  'PREPARATION',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'RESERVED',
  'SOLD',
  'DELIVERED',
  'ARCHIVED',
  'CANCELLED'
);

alter table public.vehicles alter column status drop default;
alter table public.vehicles
alter column status type public.vehicle_status
using (
  case
    when status::text in ('PRICE_DROP', 'MODIFIED') then 'PUBLISHED'
    else status::text
  end
)::public.vehicle_status;
alter table public.vehicles alter column status set default 'PURCHASED';
drop type public.vehicle_status_legacy;

alter type public.vehicle_event_type rename to vehicle_event_type_legacy;

create type public.vehicle_event_type as enum (
  'PURCHASED',
  'PREPARATION',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'RESERVED',
  'SOLD',
  'DELIVERED',
  'ARCHIVED',
  'CANCELLED',
  'PRICE_DROP',
  'MODIFIED'
);

alter table public.vehicle_events
alter column type type public.vehicle_event_type
using type::text::public.vehicle_event_type;

alter table public.vehicle_events
add column metadata jsonb not null default '{}'::jsonb;

drop type public.vehicle_event_type_legacy;

alter type public.marketplace_link_status rename to marketplace_link_status_legacy;

create type public.marketplace_link_status as enum (
  'ACTIVE',
  'INACTIVE',
  'REMOVED',
  'UNKNOWN'
);

alter table public.marketplace_links alter column status drop default;
alter table public.marketplace_links
alter column status type public.marketplace_link_status
using status::text::public.marketplace_link_status;
alter table public.marketplace_links alter column status set default 'UNKNOWN';
drop type public.marketplace_link_status_legacy;

alter table public.marketplace_links
add column advertised_price numeric,
add column favorite_count integer,
add constraint marketplace_links_advertised_price_check
  check (advertised_price is null or advertised_price >= 0),
add constraint marketplace_links_favorite_count_check
  check (favorite_count is null or favorite_count >= 0);

update public.marketplace_links ml
set advertised_price = v.selling_price
from public.vehicles v
where v.id = ml.vehicle_id
  and ml.advertised_price is null;

drop function public.create_acquired_vehicle(
  uuid, text, text, integer, integer, numeric, numeric, text, text, text,
  text, text, integer, integer, text, smallint, smallint, date, text, text,
  smallint, text, text, text, timestamptz
);

create function public.create_acquired_vehicle(
  p_garage_id uuid,
  p_brand text,
  p_model text,
  p_year integer,
  p_mileage integer,
  p_purchase_price numeric,
  p_selling_price numeric,
  p_description text,
  p_notes text,
  p_trim text,
  p_fuel text,
  p_gearbox text,
  p_power_din integer,
  p_fiscal_power integer,
  p_color text,
  p_doors smallint,
  p_seats smallint,
  p_first_registration_date date,
  p_body_type text,
  p_upholstery text,
  p_crit_air smallint,
  p_provider text,
  p_url text,
  p_external_id text,
  p_published_at timestamptz,
  p_favorite_count integer
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
    garage_id, brand, model, year, mileage, purchase_price, selling_price,
    description, notes, trim, fuel, gearbox, power_din, fiscal_power, color,
    doors, seats, first_registration_date, body_type, upholstery, crit_air,
    status
  )
  values (
    p_garage_id, p_brand, p_model, p_year, p_mileage, p_purchase_price,
    p_selling_price, p_description, p_notes, p_trim, p_fuel, p_gearbox,
    p_power_din, p_fiscal_power, p_color, p_doors, p_seats,
    p_first_registration_date, p_body_type, p_upholstery, p_crit_air,
    'PUBLISHED'
  )
  returning id into new_vehicle_id;

  insert into public.marketplace_links (
    vehicle_id, provider, url, external_id, advertised_price, favorite_count,
    published_at, status
  )
  values (
    new_vehicle_id, p_provider, p_url, p_external_id, p_selling_price,
    p_favorite_count, p_published_at, 'ACTIVE'
  );

  return new_vehicle_id;
end;
$$;
