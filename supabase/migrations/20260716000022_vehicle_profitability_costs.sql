alter type public.vehicle_cost_type add value if not exists 'TECHNICAL_INSPECTION';
alter type public.vehicle_cost_type add value if not exists 'WARRANTY';
alter type public.vehicle_cost_type add value if not exists 'TIRES';

alter table public.vehicle_costs
add column incurred_at date;

update public.vehicle_costs
set incurred_at = created_at::date
where incurred_at is null;

alter table public.vehicle_costs
alter column incurred_at set default current_date,
alter column incurred_at set not null;

create policy "Members can create vehicle events"
on public.vehicle_events
for insert
with check (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = vehicle_events.vehicle_id
      and gm.user_id = auth.uid()
  )
);

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
  integer,
  text,
  smallint,
  smallint,
  date,
  text,
  text,
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
    selling_price,
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
    p_selling_price,
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
