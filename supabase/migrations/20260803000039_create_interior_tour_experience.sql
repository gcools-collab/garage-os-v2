create type public.interior_tour_status as enum ('DRAFT','READY','PUBLISHED','FAILED','ARCHIVED');
create type public.interior_scene_status as enum ('UPLOADING','READY','EXCLUDED','FAILED');

create table public.interior_tours (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade, status public.interior_tour_status not null default 'DRAFT',
  start_scene_id uuid, is_public boolean not null default false, created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
  unique (id, garage_id, vehicle_id)
);
create unique index interior_tours_one_active_per_vehicle on public.interior_tours(vehicle_id) where status <> 'ARCHIVED';
create index interior_tours_tenant_vehicle_idx on public.interior_tours(garage_id, vehicle_id, updated_at desc);

create table public.interior_tour_scenes (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade, tour_id uuid not null, name text not null default '',
  storage_path text not null unique, position integer not null check (position > 0), status public.interior_scene_status not null default 'UPLOADING',
  width integer check (width is null or width > 0), height integer check (height is null or height > 0),
  file_size bigint check (file_size is null or file_size between 1 and 20971520), mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  initial_yaw numeric check (initial_yaw is null or initial_yaw between -180 and 180), initial_pitch numeric check (initial_pitch is null or initial_pitch between -90 and 90),
  initial_fov numeric check (initial_fov is null or initial_fov between 30 and 120), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint interior_scenes_position_key unique(tour_id, position) deferrable initially deferred,
  unique (id, tour_id, garage_id), foreign key (tour_id, garage_id, vehicle_id) references public.interior_tours(id, garage_id, vehicle_id) on delete cascade
);
create index interior_tour_scenes_tenant_idx on public.interior_tour_scenes(garage_id, vehicle_id, tour_id, position);

alter table public.interior_tours add constraint interior_tours_start_scene_fk foreign key (start_scene_id, id, garage_id) references public.interior_tour_scenes(id, tour_id, garage_id) deferrable initially deferred;

create table public.interior_tour_hotspots (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  tour_id uuid not null, source_scene_id uuid not null, target_scene_id uuid not null, label text not null check (char_length(trim(label)) between 1 and 80),
  yaw numeric not null check (yaw between -180 and 180), pitch numeric not null check (pitch between -90 and 90),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (source_scene_id <> target_scene_id),
  foreign key (source_scene_id, tour_id, garage_id) references public.interior_tour_scenes(id, tour_id, garage_id) on delete cascade,
  foreign key (target_scene_id, tour_id, garage_id) references public.interior_tour_scenes(id, tour_id, garage_id) on delete cascade
);
create index interior_hotspots_tour_idx on public.interior_tour_hotspots(garage_id, tour_id, source_scene_id);

create function public.reorder_interior_tour_scenes(p_tour_id uuid, p_scene_ids uuid[]) returns boolean language plpgsql security invoker set search_path = public as $$
declare expected_count integer;
begin
  select count(*) into expected_count from public.interior_tour_scenes where tour_id = p_tour_id;
  if expected_count <> coalesce(array_length(p_scene_ids, 1), 0) or expected_count <> (select count(distinct x.id) from unnest(p_scene_ids) x(id)) then raise exception 'interior_tour_invalid_scene_order' using errcode = '22023'; end if;
  if exists (select 1 from unnest(p_scene_ids) x(id) where not exists (select 1 from public.interior_tour_scenes s where s.id = x.id and s.tour_id = p_tour_id)) then raise exception 'interior_tour_foreign_scene' using errcode = '42501'; end if;
  set constraints interior_scenes_position_key deferred;
  update public.interior_tour_scenes s set position = x.position, updated_at = now() from unnest(p_scene_ids) with ordinality x(id, position) where s.id = x.id and s.tour_id = p_tour_id;
  return true;
end; $$;
revoke all on function public.reorder_interior_tour_scenes(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_interior_tour_scenes(uuid, uuid[]) to authenticated;

alter table public.interior_tours enable row level security;
alter table public.interior_tour_scenes enable row level security;
alter table public.interior_tour_hotspots enable row level security;
create policy "Garage members read interior tours" on public.interior_tours for select to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tours.garage_id and gm.user_id = auth.uid()));
create policy "Garage admins create interior tours" on public.interior_tours for insert to authenticated with check (created_by = auth.uid() and exists (select 1 from public.garage_members gm where gm.garage_id = interior_tours.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin')));
create policy "Garage admins update interior tours" on public.interior_tours for update to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tours.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))) with check (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tours.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin')));
create policy "Garage admins delete interior tours" on public.interior_tours for delete to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tours.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read interior scenes" on public.interior_tour_scenes for select to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_scenes.garage_id and gm.user_id = auth.uid()));
create policy "Garage admins manage interior scenes" on public.interior_tour_scenes for all to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_scenes.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))) with check (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_scenes.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read interior hotspots" on public.interior_tour_hotspots for select to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_hotspots.garage_id and gm.user_id = auth.uid()));
create policy "Garage admins manage interior hotspots" on public.interior_tour_hotspots for all to authenticated using (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_hotspots.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin'))) with check (exists (select 1 from public.garage_members gm where gm.garage_id = interior_tour_hotspots.garage_id and gm.user_id = auth.uid() and gm.role in ('owner','admin')));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('vehicle-interior-tours','vehicle-interior-tours',false,20971520,array['image/jpeg','image/png','image/webp']) on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Garage admins upload interior panoramas" on storage.objects for insert to authenticated with check (bucket_id='vehicle-interior-tours' and exists (select 1 from public.garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage admins update interior panoramas" on storage.objects for update to authenticated using (bucket_id='vehicle-interior-tours' and exists (select 1 from public.garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid() and gm.role in ('owner','admin'))) with check (bucket_id='vehicle-interior-tours' and exists (select 1 from public.garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage admins delete interior panoramas" on storage.objects for delete to authenticated using (bucket_id='vehicle-interior-tours' and exists (select 1 from public.garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create function public.is_public_interior_panorama(p_storage_path text) returns boolean language sql stable security definer set search_path=public as $$ select exists (select 1 from public.interior_tour_scenes s join public.interior_tours t on t.id=s.tour_id join public.vehicles v on v.id=t.vehicle_id and v.garage_id=t.garage_id join public.garages g on g.id=t.garage_id where s.storage_path=p_storage_path and s.status='READY' and t.status='PUBLISHED' and t.is_public=true and v.publication_status='PUBLISHED' and g.live_enabled=true) $$;
revoke all on function public.is_public_interior_panorama(text) from public;
grant execute on function public.is_public_interior_panorama(text) to anon,authenticated;
create policy "Published interior panoramas are readable" on storage.objects for select to anon,authenticated using (bucket_id='vehicle-interior-tours' and public.is_public_interior_panorama(name));

create view public.public_live_interior_tours with (security_invoker=false) as select t.id as tour_id,t.garage_id,t.vehicle_id,t.start_scene_id,t.published_at,s.id as scene_id,s.name,s.storage_path,s.position,s.width,s.height,s.mime_type,s.initial_yaw,s.initial_pitch,s.initial_fov from public.interior_tours t join public.interior_tour_scenes s on s.tour_id=t.id join public.vehicles v on v.id=t.vehicle_id and v.garage_id=t.garage_id join public.garages g on g.id=t.garage_id where t.status='PUBLISHED' and t.is_public=true and s.status='READY' and v.publication_status='PUBLISHED' and g.live_enabled=true;
create view public.public_live_interior_hotspots with (security_invoker=false) as select h.id,h.garage_id,h.tour_id,h.source_scene_id,h.target_scene_id,h.label,h.yaw,h.pitch,h.created_at,h.updated_at from public.interior_tour_hotspots h join public.interior_tours t on t.id=h.tour_id join public.vehicles v on v.id=t.vehicle_id join public.garages g on g.id=t.garage_id where t.status='PUBLISHED' and t.is_public=true and v.publication_status='PUBLISHED' and g.live_enabled=true;
revoke all on public.public_live_interior_tours,public.public_live_interior_hotspots from public;
grant select on public.public_live_interior_tours,public.public_live_interior_hotspots to anon,authenticated;
