create type vehicle_cost_type as enum (

'MECHANIC',
'BODYWORK',
'CLEANING',
'TRANSPORT',
'PARTS',
'ADMIN',
'OTHER'

);



create table public.vehicle_costs (

id uuid primary key default gen_random_uuid(),


vehicle_id uuid not null

references public.vehicles(id)

on delete cascade,


type vehicle_cost_type not null,


label text not null,


amount numeric not null default 0,


notes text,


created_at timestamptz default now()

);



alter table public.vehicle_costs

enable row level security;

create policy "Members can view vehicle costs"

on public.vehicle_costs

for select

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_costs.vehicle_id

and gm.user_id = auth.uid()

)

);



create policy "Members can create vehicle costs"

on public.vehicle_costs

for insert

with check (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_costs.vehicle_id

and gm.user_id = auth.uid()

)

);



create policy "Members can update vehicle costs"

on public.vehicle_costs

for update

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_costs.vehicle_id

and gm.user_id = auth.uid()

)

);



create policy "Members can delete vehicle costs"

on public.vehicle_costs

for delete

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_costs.vehicle_id

and gm.user_id = auth.uid()

)

);