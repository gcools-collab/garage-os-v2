create type public.vehicle_360_sequence_status as enum ('DRAFT','PROCESSING','READY','PUBLISHED','FAILED','ARCHIVED');
create type public.vehicle_360_frame_status as enum ('UPLOADING','READY','EXCLUDED','FAILED');

create table public.vehicle_360_sequences (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  status public.vehicle_360_sequence_status not null default 'DRAFT',
  frame_count integer not null default 0 check (frame_count between 0 and 48),
  start_frame_index integer check (start_frame_index is null or start_frame_index >= 0),
  is_public boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (id, garage_id, vehicle_id)
);

create unique index vehicle_360_one_active_sequence_per_vehicle
on public.vehicle_360_sequences(vehicle_id)
where status <> 'ARCHIVED';
create index vehicle_360_sequences_tenant_idx on public.vehicle_360_sequences(garage_id, updated_at desc);
create index vehicle_360_sequences_vehicle_idx on public.vehicle_360_sequences(vehicle_id, status);

create table public.vehicle_360_frames (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  sequence_id uuid not null,
  storage_path text not null unique,
  position integer not null check (position > 0),
  status public.vehicle_360_frame_status not null default 'UPLOADING',
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  file_size bigint check (file_size is null or file_size between 1 and 15728640),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_360_frames_sequence_position_key unique(sequence_id, position) deferrable initially deferred,
  foreign key (sequence_id, garage_id, vehicle_id)
    references public.vehicle_360_sequences(id, garage_id, vehicle_id) on delete cascade
);
create index vehicle_360_frames_tenant_idx on public.vehicle_360_frames(garage_id, vehicle_id);
create index vehicle_360_frames_sequence_idx on public.vehicle_360_frames(sequence_id, status, position);

create function public.sync_vehicle_360_sequence_frame_count()
returns trigger language plpgsql security invoker set search_path = public as $$
declare target_id uuid := coalesce(new.sequence_id, old.sequence_id);
begin
  update public.vehicle_360_sequences s set
    frame_count = (select count(*) from public.vehicle_360_frames f where f.sequence_id = target_id and f.status <> 'EXCLUDED'),
    updated_at = now()
  where s.id = target_id;
  return coalesce(new, old);
end; $$;
create trigger sync_vehicle_360_frame_count after insert or update or delete on public.vehicle_360_frames
for each row execute function public.sync_vehicle_360_sequence_frame_count();

create function public.reorder_vehicle_360_frames(p_sequence_id uuid, p_frame_ids uuid[])
returns boolean language plpgsql security invoker set search_path = public as $$
declare expected_count integer;
begin
  select count(*) into expected_count from public.vehicle_360_frames where sequence_id = p_sequence_id;
  if expected_count <> coalesce(array_length(p_frame_ids, 1), 0)
    or expected_count <> (select count(distinct ids.id) from unnest(p_frame_ids) as ids(id)) then
    raise exception 'vehicle_360_invalid_frame_order' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_frame_ids) as ordered(id) where not exists (select 1 from public.vehicle_360_frames f where f.id = ordered.id and f.sequence_id = p_sequence_id)) then
    raise exception 'vehicle_360_foreign_frame' using errcode = '42501';
  end if;
  set constraints vehicle_360_frames_sequence_position_key deferred;
  update public.vehicle_360_frames f set position = ordered.position, updated_at = now()
  from unnest(p_frame_ids) with ordinality as ordered(id, position)
  where f.id = ordered.id and f.sequence_id = p_sequence_id;
  return true;
end; $$;
revoke all on function public.reorder_vehicle_360_frames(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_vehicle_360_frames(uuid, uuid[]) to authenticated;

create function public.validate_vehicle_360_sequence()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'UPDATE' and (new.garage_id <> old.garage_id or new.vehicle_id <> old.vehicle_id) then
    raise exception 'vehicle_360_ownership_immutable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.vehicles v where v.id = new.vehicle_id and v.garage_id = new.garage_id) then
    raise exception 'vehicle_360_vehicle_tenant_mismatch' using errcode = '23514';
  end if;
  if new.start_frame_index is not null and new.start_frame_index >= new.frame_count then
    raise exception 'vehicle_360_invalid_start_frame' using errcode = '23514';
  end if;
  if new.status = 'PUBLISHED' and (new.frame_count < 12 or not new.is_public) then
    raise exception 'vehicle_360_not_ready_for_publication' using errcode = '23514';
  end if;
  return new;
end; $$;
create trigger validate_vehicle_360_sequence before insert or update on public.vehicle_360_sequences
for each row execute function public.validate_vehicle_360_sequence();

alter table public.vehicle_360_sequences enable row level security;
alter table public.vehicle_360_frames enable row level security;

create policy "Garage members can read 360 sequences" on public.vehicle_360_sequences for select to authenticated using (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_sequences.garage_id and gm.user_id = auth.uid())
);
create policy "Garage admins can create 360 sequences" on public.vehicle_360_sequences for insert to authenticated with check (
  created_by = auth.uid() and exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_sequences.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);
create policy "Garage admins can update 360 sequences" on public.vehicle_360_sequences for update to authenticated using (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_sequences.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_sequences.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);
create policy "Garage admins can delete 360 sequences" on public.vehicle_360_sequences for delete to authenticated using (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_sequences.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);
create policy "Garage members can read 360 frames" on public.vehicle_360_frames for select to authenticated using (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_frames.garage_id and gm.user_id = auth.uid())
);
create policy "Garage admins can manage 360 frames" on public.vehicle_360_frames for all to authenticated using (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_frames.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
) with check (
  exists (select 1 from public.garage_members gm where gm.garage_id = vehicle_360_frames.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('vehicle-360','vehicle-360',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Garage admins can upload 360 objects" on storage.objects for insert to authenticated with check (
  bucket_id = 'vehicle-360' and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid() and gm.role in ('owner','admin')
  )
);
create policy "Garage admins can update 360 objects" on storage.objects for update to authenticated using (
  bucket_id = 'vehicle-360' and exists (select 1 from public.garage_members gm where gm.garage_id::text = (storage.foldername(name))[1] and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
) with check (
  bucket_id = 'vehicle-360' and exists (select 1 from public.garage_members gm where gm.garage_id::text = (storage.foldername(name))[1] and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);
create policy "Garage admins can delete 360 objects" on storage.objects for delete to authenticated using (
  bucket_id = 'vehicle-360' and exists (select 1 from public.garage_members gm where gm.garage_id::text = (storage.foldername(name))[1] and gm.user_id = auth.uid() and gm.role in ('owner','admin'))
);

create view public.public_live_vehicle_360_frames with (security_invoker = false) as
select s.id as sequence_id, s.garage_id, s.vehicle_id, s.start_frame_index,
  f.id, f.position, f.storage_path, f.width, f.height, f.mime_type
from public.vehicle_360_sequences s
join public.vehicle_360_frames f on f.sequence_id = s.id
join public.vehicles v on v.id = s.vehicle_id and v.garage_id = s.garage_id
join public.garages g on g.id = s.garage_id
where s.status = 'PUBLISHED' and s.is_public = true and f.status = 'READY'
  and v.publication_status = 'PUBLISHED' and g.live_enabled = true;
revoke all on public.public_live_vehicle_360_frames from public;
grant select on public.public_live_vehicle_360_frames to anon, authenticated;

comment on view public.public_live_vehicle_360_frames is 'Projection publique restrictive des seules frames 360 publiées.';
