create table public.vehicle_listing_versions(
 id uuid primary key default gen_random_uuid(),garage_id uuid not null references public.garages(id) on delete cascade,vehicle_id uuid not null references public.vehicles(id) on delete cascade,
 created_by uuid not null references auth.users(id),provider text not null,model text not null,prompt_id text not null,prompt_version text not null,content_hash text not null check(content_hash~'^[a-f0-9]{64}$'),
 format text not null default 'BUNDLE' check(format='BUNDLE'),content jsonb not null,validation jsonb not null,source_version_id uuid references public.vehicle_listing_versions(id) on delete set null,created_at timestamptz not null default now(),
 unique(id,garage_id,vehicle_id)
);
create index vehicle_listing_versions_vehicle_idx on public.vehicle_listing_versions(garage_id,vehicle_id,created_at desc);
alter table public.vehicle_listing_versions enable row level security;
create policy "Garage members read listing versions" on public.vehicle_listing_versions for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=vehicle_listing_versions.garage_id and gm.user_id=auth.uid()));
create policy "Garage members create listing versions" on public.vehicle_listing_versions for insert to authenticated with check(created_by=auth.uid() and exists(select 1 from public.garage_members gm where gm.garage_id=vehicle_listing_versions.garage_id and gm.user_id=auth.uid()));
comment on table public.vehicle_listing_versions is 'Historique immuable des annonces générées et validées à partir de faits tenant-scopés.';
