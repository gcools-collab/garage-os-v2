-- Keep exactly one primary image per vehicle and allow garage members to
-- manage the gallery through authenticated Server Actions.

update public.vehicle_images
set is_primary = false
where is_primary is null;

alter table public.vehicle_images
alter column is_primary set default false,
alter column is_primary set not null;

with ranked_images as (
  select
    id,
    row_number() over (
      partition by vehicle_id
      order by is_primary desc, created_at asc, id asc
    ) as position
  from public.vehicle_images
)
update public.vehicle_images vi
set is_primary = ranked_images.position = 1
from ranked_images
where ranked_images.id = vi.id
  and vi.is_primary is distinct from (ranked_images.position = 1);

create unique index vehicle_images_one_primary_per_vehicle
on public.vehicle_images (vehicle_id)
where is_primary;

create or replace function public.set_vehicle_primary_image(p_image_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_vehicle_id uuid;
begin
  select vi.vehicle_id
  into target_vehicle_id
  from public.vehicle_images vi
  join public.vehicles v on v.id = vi.vehicle_id
  join public.garage_members gm on gm.garage_id = v.garage_id
  where vi.id = p_image_id
    and gm.user_id = auth.uid();

  if target_vehicle_id is null then
    raise exception 'Vehicle image not found or inaccessible'
      using errcode = '42501';
  end if;

  update public.vehicle_images
  set is_primary = false
  where vehicle_id = target_vehicle_id
    and is_primary;

  update public.vehicle_images
  set is_primary = true
  where id = p_image_id;
end;
$$;

revoke all on function public.set_vehicle_primary_image(uuid) from public;
grant execute on function public.set_vehicle_primary_image(uuid) to authenticated;

create or replace function public.promote_vehicle_image_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_primary then
    update public.vehicle_images
    set is_primary = true
    where id = (
      select vi.id
      from public.vehicle_images vi
      where vi.vehicle_id = old.vehicle_id
      order by vi.created_at asc, vi.id asc
      limit 1
    );
  end if;

  return old;
end;
$$;

create trigger promote_vehicle_image_after_delete
after delete on public.vehicle_images
for each row
execute function public.promote_vehicle_image_after_delete();

revoke all on function public.promote_vehicle_image_after_delete() from public;
