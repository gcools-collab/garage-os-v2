create table public.garage_branding (
  garage_id uuid primary key references public.garages(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  legal_name text check (legal_name is null or char_length(trim(legal_name)) between 1 and 160),
  logo_path text,
  favicon_path text,
  phone text,
  email text check (email is null or email = lower(email)),
  website_url text check (website_url is null or website_url ~* '^https?://'),
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  short_description text check (short_description is null or char_length(short_description) <= 500),
  facebook_url text check (facebook_url is null or facebook_url ~* '^https?://'),
  instagram_url text check (instagram_url is null or instagram_url ~* '^https?://'),
  theme_key text not null default 'default' check (theme_key ~ '^[a-z0-9][a-z0-9-]{0,49}$'),
  primary_color text check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color text check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_garage_branding_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_garage_branding_updated_at_trigger
before update on public.garage_branding
for each row execute function public.set_garage_branding_updated_at();

alter table public.garage_branding enable row level security;

create policy "Garage members can read garage branding"
on public.garage_branding for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_branding.garage_id
    and gm.user_id = auth.uid()
));

create policy "Garage owners and admins can create garage branding"
on public.garage_branding for insert to authenticated
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_branding.garage_id
    and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

create policy "Garage owners and admins can update garage branding"
on public.garage_branding for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_branding.garage_id
    and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_branding.garage_id
    and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

create policy "Garage owners can delete garage branding"
on public.garage_branding for delete to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_branding.garage_id
    and gm.user_id = auth.uid()
    and gm.role = 'owner'
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'garage-branding',
  'garage-branding',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Garage members can read branding objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'garage-branding'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage owners and admins can upload branding objects"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'garage-branding'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

create policy "Garage owners and admins can update branding objects"
on storage.objects for update to authenticated
using (
  bucket_id = 'garage-branding'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
)
with check (
  bucket_id = 'garage-branding'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);

create policy "Garage owners and admins can delete branding objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'garage-branding'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
);
