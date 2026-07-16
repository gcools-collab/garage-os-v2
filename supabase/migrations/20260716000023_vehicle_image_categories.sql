create type public.vehicle_image_category as enum (
  'EXTERIOR',
  'INTERIOR',
  'ENGINE',
  'DETAIL',
  'DOCUMENT',
  'UNCLASSIFIED',
  'OTHER'
);

alter table public.vehicle_images
alter column type drop default;

alter table public.vehicle_images
alter column type type public.vehicle_image_category
using type::text::public.vehicle_image_category;

alter table public.vehicle_images
alter column type set default 'UNCLASSIFIED'::public.vehicle_image_category;

create policy "Members can update vehicle images"
on public.vehicle_images
for update
using (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = vehicle_images.vehicle_id
      and gm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = vehicle_images.vehicle_id
      and gm.user_id = auth.uid()
  )
);
