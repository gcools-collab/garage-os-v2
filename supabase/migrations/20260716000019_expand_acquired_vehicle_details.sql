alter table public.vehicles
add column body_type text,
add column upholstery text;

drop function public.create_acquired_vehicle(
  uuid,
  text,
  text,
  integer,
  integer,
  numeric,
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  smallint,
  smallint,
  text,
  text,
  text,
  timestamptz
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
    fiscal_power,
    color,
    doors,
    seats,
    first_registration_date,
    body_type,
    upholstery,
    crit_air,
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
    p_fiscal_power,
    p_color,
    p_doors,
    p_seats,
    p_first_registration_date,
    p_body_type,
    p_upholstery,
    p_crit_air,
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
