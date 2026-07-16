-- Création du bucket Storage

insert into storage.buckets
(
id,
name,
public
)

values

(
'vehicle-images',
'vehicle-images',
true
)

on conflict (id) do nothing;



-- Type des images

create type vehicle_image_type as enum (

'EXTERIOR',
'INTERIOR',
'ENGINE',
'DOCUMENT',
'OTHER'

);



-- Table images véhicules

create table public.vehicle_images (

id uuid primary key default gen_random_uuid(),


vehicle_id uuid not null

references public.vehicles(id)

on delete cascade,


storage_path text not null,


url text,


type vehicle_image_type not null default 'EXTERIOR',


is_primary boolean default false,


created_at timestamptz default now()

);



alter table public.vehicle_images

enable row level security;

create policy "Members can view vehicle images"

on public.vehicle_images

for select

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_images.vehicle_id

and gm.user_id = auth.uid()

)

);



create policy "Members can insert vehicle images"

on public.vehicle_images

for insert

with check (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_images.vehicle_id

and gm.user_id = auth.uid()

)

);



create policy "Members can delete vehicle images"

on public.vehicle_images

for delete

using (

exists (

select 1

from public.vehicles v

join public.garage_members gm

on gm.garage_id = v.garage_id

where v.id = vehicle_images.vehicle_id

and gm.user_id = auth.uid()

)

);

