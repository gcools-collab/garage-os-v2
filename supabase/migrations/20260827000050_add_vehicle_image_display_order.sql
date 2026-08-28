-- GO-0086: ordre d'affichage déterministe pour la galerie photos véhicule

alter table public.vehicle_images
add column if not exists display_order integer not null default 0;

with ranked as (
  select
    id,
    row_number() over (
      partition by vehicle_id
      order by is_primary desc, created_at asc, id asc
    ) as ord
  from public.vehicle_images
)
update public.vehicle_images vi
set display_order = ranked.ord
from ranked
where ranked.id = vi.id;

create unique index if not exists vehicle_images_display_order_per_vehicle
on public.vehicle_images (vehicle_id, display_order);

create or replace function public.reorder_vehicle_images(p_vehicle_id uuid, p_image_ids uuid[])
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  expected_count integer;
begin
  select count(*) into expected_count from public.vehicle_images where vehicle_id = p_vehicle_id;
  if expected_count <> coalesce(array_length(p_image_ids, 1), 0)
    or expected_count <> (select count(distinct ids.id) from unnest(p_image_ids) as ids(id)) then
    raise exception 'vehicle_images_invalid_order' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(p_image_ids) as ordered(id)
    where not exists (
      select 1 from public.vehicle_images vi
      where vi.id = ordered.id and vi.vehicle_id = p_vehicle_id
    )
  ) then
    raise exception 'vehicle_images_foreign_image' using errcode = '42501';
  end if;
  set constraints vehicle_images_display_order_per_vehicle deferred;
  update public.vehicle_images vi
  set display_order = ordered.position
  from unnest(p_image_ids) with ordinality as ordered(id, position)
  where vi.id = ordered.id and vi.vehicle_id = p_vehicle_id;
  return true;
end;
$$;

revoke all on function public.reorder_vehicle_images(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_vehicle_images(uuid, uuid[]) to authenticated;

drop view if exists public.public_live_vehicle_images;

create view public.public_live_vehicle_images
with (security_barrier = true)
as
select
  vi.id,
  vi.vehicle_id,
  v.garage_id,
  vi.storage_path,
  vi.is_primary,
  vi.display_order,
  vi.created_at
from public.vehicle_images vi
join public.vehicles v on v.id = vi.vehicle_id
join public.garages g on g.id = v.garage_id
where g.live_enabled
  and v.publication_status = 'PUBLISHED'
  and v.status not in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED')
  and vi.type <> 'DOCUMENT';

revoke all on public.public_live_vehicle_images from public;
grant select on public.public_live_vehicle_images to anon, authenticated;

comment on view public.public_live_vehicle_images is
'Projection publique restrictive des images non documentaires, ordonnées par display_order.';
