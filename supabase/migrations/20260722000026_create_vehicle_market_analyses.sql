create table public.vehicle_market_analyses (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  provider text not null,
  criteria jsonb not null,
  comparable_count integer not null check (comparable_count >= 0),
  minimum_price numeric,
  maximum_price numeric,
  average_price numeric,
  median_price numeric,
  average_mileage numeric,
  average_listing_age_days numeric,
  current_vehicle_price numeric,
  price_difference numeric,
  price_difference_percent numeric,
  positioning text check (positioning in ('BELOW_MARKET', 'IN_MARKET', 'ABOVE_MARKET')),
  analyzed_at timestamptz not null default now(),
  raw_summary jsonb
);

create index vehicle_market_analyses_vehicle_date_idx
  on public.vehicle_market_analyses (vehicle_id, analyzed_at desc);

alter table public.vehicle_market_analyses enable row level security;

create policy "Garage members can view vehicle market analyses"
on public.vehicle_market_analyses for select
using (exists (
  select 1 from public.vehicles v
  join public.garage_members gm on gm.garage_id = v.garage_id
  where v.id = vehicle_market_analyses.vehicle_id and gm.user_id = auth.uid()
));

create policy "Garage members can create vehicle market analyses"
on public.vehicle_market_analyses for insert
with check (exists (
  select 1 from public.vehicles v
  join public.garage_members gm on gm.garage_id = v.garage_id
  where v.id = vehicle_market_analyses.vehicle_id and gm.user_id = auth.uid()
));
