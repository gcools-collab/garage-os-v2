create type vehicle_status as enum (

'PURCHASED',
'PREPARATION',
'PUBLISHED',
'PRICE_DROP',
'MODIFIED',
'SOLD'

);



create table public.vehicles (

id uuid primary key default gen_random_uuid(),


garage_id uuid not null
references public.garages(id)
on delete cascade,


brand text not null,

model text not null,

version text,


year integer,


fuel text,


gearbox text,


mileage integer,


purchase_price numeric default 0,


purchase_date date,


selling_price numeric,


sale_date date,


prep_cost numeric default 0,


mechanic_cost numeric default 0,


bodywork_cost numeric default 0,


cleaning_cost numeric default 0,


transport_cost numeric default 0,


status vehicle_status default 'PURCHASED',


created_at timestamptz default now(),


updated_at timestamptz default now()

);



alter table public.vehicles
enable row level security;

create policy "Garage members can view vehicles"

on public.vehicles

for select

using (

exists (

select 1

from public.garage_members gm

where gm.garage_id = vehicles.garage_id

and gm.user_id = auth.uid()

)

);



create policy "Garage members can create vehicles"

on public.vehicles

for insert

with check (

exists (

select 1

from public.garage_members gm

where gm.garage_id = vehicles.garage_id

and gm.user_id = auth.uid()

)

);



create policy "Garage members can update vehicles"

on public.vehicles

for update

using (

exists (

select 1

from public.garage_members gm

where gm.garage_id = vehicles.garage_id

and gm.user_id = auth.uid()

)

);