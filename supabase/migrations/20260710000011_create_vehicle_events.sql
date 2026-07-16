create type vehicle_event_type as enum (

'PURCHASED',
'PREPARATION',
'PUBLISHED',
'PRICE_DROP',
'MODIFIED',
'SOLD'

);



create table public.vehicle_events (

id uuid primary key default gen_random_uuid(),


vehicle_id uuid not null

references public.vehicles(id)

on delete cascade,


type vehicle_event_type not null,


description text,


created_at timestamptz default now()

);



alter table public.vehicle_events
enable row level security;



create policy "Members can view vehicle events"

on public.vehicle_events

for select

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_events.vehicle_id

and gm.user_id = auth.uid()

)

);