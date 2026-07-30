create table public.acquisition_sellers (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  type text not null check (type in ('PRIVATE', 'PROFESSIONAL')),
  name text not null check (char_length(trim(name)) between 1 and 120),
  phone text,
  email text,
  city text,
  internal_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, garage_id)
);

create table public.acquisition_opportunities (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null,
  status text not null default 'NEW' check (status in (
    'NEW', 'IN_REVIEW', 'NEGOTIATING', 'ACCEPTED', 'PURCHASED',
    'REJECTED', 'EXPIRED'
  )),
  provenance text not null check (provenance in (
    'LEBONCOIN', 'LA_CENTRALE', 'MARKETPLACE', 'CUSTOMER_TRADE_IN',
    'WALK_IN', 'PROFESSIONAL_NETWORK', 'DEALER', 'AUCTION', 'REFERRER', 'OTHER'
  )),
  confidence_level text not null default 'MEDIUM'
    check (confidence_level in ('LOW', 'MEDIUM', 'HIGH')),
  registration text,
  vin text check (vin is null or vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  brand text not null check (char_length(trim(brand)) between 1 and 80),
  model text not null check (char_length(trim(model)) between 1 and 80),
  trim text,
  year integer check (year is null or year between 1900 and 2200),
  fuel text,
  gearbox text,
  mileage integer check (mileage is null or mileage >= 0),
  color text,
  options text[] not null default '{}',
  general_condition text not null default 'UNKNOWN'
    check (general_condition in ('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'UNKNOWN')),
  asking_price numeric(12,2) check (asking_price is null or asking_price >= 0),
  repair_estimate numeric(12,2) check (repair_estimate is null or repair_estimate >= 0),
  comments text,
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, garage_id),
  constraint acquisition_opportunity_seller_scope_fk
    foreign key (seller_id, garage_id)
    references public.acquisition_sellers(id, garage_id) on delete restrict
);

create table public.acquisition_documents (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  opportunity_id uuid not null,
  uploaded_by_user_id uuid not null references auth.users(id) on delete restrict,
  category text not null check (category in (
    'REGISTRATION_CERTIFICATE', 'TECHNICAL_INSPECTION', 'SERVICE_BOOK',
    'INVOICE', 'PHOTO', 'OTHER'
  )),
  label text not null check (char_length(trim(label)) between 1 and 120),
  original_filename text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint acquisition_document_opportunity_scope_fk
    foreign key (opportunity_id, garage_id)
    references public.acquisition_opportunities(id, garage_id) on delete cascade
);

create index acquisition_sellers_garage_idx
  on public.acquisition_sellers(garage_id, created_at desc);
create index acquisition_opportunities_garage_status_idx
  on public.acquisition_opportunities(garage_id, status, created_at desc);
create index acquisition_opportunities_seller_idx
  on public.acquisition_opportunities(seller_id);
create index acquisition_documents_opportunity_idx
  on public.acquisition_documents(opportunity_id, created_at desc);
create index acquisition_documents_garage_category_idx
  on public.acquisition_documents(garage_id, category);

create function public.validate_acquisition_actor_scope()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id
      and gm.user_id = coalesce(
        nullif(to_jsonb(new)->>'creator_user_id', '')::uuid,
        nullif(to_jsonb(new)->>'created_by_user_id', '')::uuid
      )
  ) then
    raise exception 'Acquisition actor is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_acquisition_seller_actor
before insert on public.acquisition_sellers
for each row execute function public.validate_acquisition_actor_scope();
create trigger validate_acquisition_opportunity_actor
before insert on public.acquisition_opportunities
for each row execute function public.validate_acquisition_actor_scope();

create function public.validate_acquisition_document_actor_scope()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.uploaded_by_user_id
  ) then
    raise exception 'Document uploader is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger validate_acquisition_document_actor
before insert on public.acquisition_documents
for each row execute function public.validate_acquisition_document_actor_scope();

create function public.validate_acquisition_status_transition()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'NEW' and new.status in ('IN_REVIEW', 'REJECTED', 'EXPIRED'))
    or (old.status = 'IN_REVIEW' and new.status in ('NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED'))
    or (old.status = 'NEGOTIATING' and new.status in ('ACCEPTED', 'REJECTED', 'EXPIRED'))
    or (old.status = 'ACCEPTED' and new.status in ('PURCHASED', 'REJECTED'))
  ) then
    raise exception 'Invalid acquisition status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger validate_acquisition_status_transition_trigger
before update of status on public.acquisition_opportunities
for each row execute function public.validate_acquisition_status_transition();

create function public.protect_acquisition_scope()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.garage_id is distinct from old.garage_id then
    raise exception 'Acquisition garage cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger protect_acquisition_seller_scope before update on public.acquisition_sellers
for each row execute function public.protect_acquisition_scope();
create trigger protect_acquisition_opportunity_scope before update on public.acquisition_opportunities
for each row execute function public.protect_acquisition_scope();

create function public.touch_acquisition_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger touch_acquisition_seller before update on public.acquisition_sellers
for each row execute function public.touch_acquisition_updated_at();
create trigger touch_acquisition_opportunity before update on public.acquisition_opportunities
for each row execute function public.touch_acquisition_updated_at();

alter table public.acquisition_sellers enable row level security;
alter table public.acquisition_opportunities enable row level security;
alter table public.acquisition_documents enable row level security;

create policy "Garage members manage acquisition sellers"
on public.acquisition_sellers for all to authenticated
using (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_sellers.garage_id and gm.user_id = auth.uid()))
with check (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_sellers.garage_id and gm.user_id = auth.uid()));

create policy "Garage members read acquisition opportunities"
on public.acquisition_opportunities for select to authenticated
using (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_opportunities.garage_id and gm.user_id = auth.uid()));

create policy "Garage members create acquisition opportunities"
on public.acquisition_opportunities for insert to authenticated
with check (
  creator_user_id = auth.uid()
  and exists (select 1 from public.garage_members gm
    where gm.garage_id = acquisition_opportunities.garage_id and gm.user_id = auth.uid())
);

create policy "Garage members update acquisition opportunities"
on public.acquisition_opportunities for update to authenticated
using (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_opportunities.garage_id and gm.user_id = auth.uid()))
with check (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_opportunities.garage_id and gm.user_id = auth.uid()));

create policy "Garage members delete acquisition opportunities"
on public.acquisition_opportunities for delete to authenticated
using (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_opportunities.garage_id and gm.user_id = auth.uid()));

create policy "Garage members manage acquisition documents"
on public.acquisition_documents for all to authenticated
using (exists (select 1 from public.garage_members gm
  where gm.garage_id = acquisition_documents.garage_id and gm.user_id = auth.uid()))
with check (
  uploaded_by_user_id = auth.uid()
  and exists (select 1 from public.garage_members gm
    where gm.garage_id = acquisition_documents.garage_id and gm.user_id = auth.uid())
);

revoke all on public.acquisition_sellers from anon;
revoke all on public.acquisition_opportunities from anon;
revoke all on public.acquisition_documents from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'acquisition-documents', 'acquisition-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
  public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Garage members upload acquisition documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'acquisition-documents'
  and array_length(storage.foldername(name), 1) = 3
  and exists (
    select 1 from public.acquisition_opportunities ao
    join public.garage_members gm on gm.garage_id = ao.garage_id
    where ao.garage_id::text = (storage.foldername(name))[1]
      and ao.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members read acquisition documents"
on storage.objects for select to authenticated
using (
  bucket_id = 'acquisition-documents'
  and exists (
    select 1 from public.acquisition_opportunities ao
    join public.garage_members gm on gm.garage_id = ao.garage_id
    where ao.garage_id::text = (storage.foldername(name))[1]
      and ao.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members delete acquisition documents"
on storage.objects for delete to authenticated
using (
  bucket_id = 'acquisition-documents'
  and exists (
    select 1 from public.acquisition_opportunities ao
    join public.garage_members gm on gm.garage_id = ao.garage_id
    where ao.garage_id::text = (storage.foldername(name))[1]
      and ao.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);
