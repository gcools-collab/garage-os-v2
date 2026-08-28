create table public.legacy_import_records (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  source text not null check (source in ('WORDPRESS','WOOCOMMERCE','YITH','ELEMENTOR')),
  entity_type text not null check (entity_type in ('CUSTOMER','CUSTOMER_VEHICLE','VEHICLE','APPOINTMENT','HISTORICAL_PAYMENT','LEAD','MEDIA_REFERENCE')),
  external_id text not null check (char_length(trim(external_id)) between 1 and 200),
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  target_table text not null check (target_table in ('customers','customer_vehicles','vehicles','appointments','historical_payments','leads','legacy_media_references')),
  target_id uuid,
  outcome text not null check (outcome in ('CREATED','UPDATED','SKIPPED','CONFLICT','FAILED')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, source, entity_type, external_id)
);
create index legacy_import_records_garage_outcome_idx on public.legacy_import_records(garage_id,outcome,updated_at desc);

create table public.historical_payments (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  customer_id uuid,
  source text not null check (source in ('WOOCOMMERCE','WORDPRESS','OTHER')),
  external_order_id text not null,
  external_payment_id text,
  provider text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  source_status text not null,
  occurred_at timestamptz,
  historical boolean not null default true check (historical = true),
  import_fingerprint text not null check (import_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, garage_id) references public.customers(id, garage_id) on delete set null (customer_id),
  unique (garage_id, source, external_order_id)
);
create index historical_payments_garage_date_idx on public.historical_payments(garage_id,occurred_at desc);
create index historical_payments_customer_idx on public.historical_payments(garage_id,customer_id);

create table public.legacy_media_references (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  source text not null check (source = 'WORDPRESS'),
  external_attachment_id text not null,
  legacy_url text,
  relative_path text,
  position integer not null check (position >= 0),
  role text not null check (role in ('COVER','GALLERY')),
  status text not null default 'PENDING' check (status = 'PENDING'),
  import_fingerprint text not null check (import_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, vehicle_id, source, external_attachment_id)
);
create index legacy_media_references_vehicle_idx on public.legacy_media_references(garage_id,vehicle_id,position);

alter table public.vehicles add column legacy_source text;
alter table public.vehicles add column legacy_external_id text;
alter table public.vehicles add column legacy_import_fingerprint text check (legacy_import_fingerprint is null or legacy_import_fingerprint ~ '^[a-f0-9]{64}$');
create unique index vehicles_legacy_identity_unique on public.vehicles(garage_id,legacy_source,legacy_external_id) where legacy_source is not null and legacy_external_id is not null;

alter table public.appointments add column is_historical boolean not null default false;
alter table public.appointments add column legacy_source text;
alter table public.appointments add column legacy_external_id text;
alter table public.appointments add column legacy_import_fingerprint text check (legacy_import_fingerprint is null or legacy_import_fingerprint ~ '^[a-f0-9]{64}$');
create unique index appointments_legacy_identity_unique on public.appointments(garage_id,legacy_source,legacy_external_id) where legacy_source is not null and legacy_external_id is not null;

alter table public.leads add column legacy_source text;
alter table public.leads add column legacy_external_id text;
alter table public.leads add column legacy_import_fingerprint text check (legacy_import_fingerprint is null or legacy_import_fingerprint ~ '^[a-f0-9]{64}$');
create unique index leads_legacy_identity_unique on public.leads(garage_id,legacy_source,legacy_external_id) where legacy_source is not null and legacy_external_id is not null;

create function public.enforce_legacy_media_tenant() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.vehicles v where v.id=new.vehicle_id and v.garage_id=new.garage_id) then
    raise exception 'legacy media tenant mismatch';
  end if;
  return new;
end $$;
create trigger enforce_legacy_media_tenant_trigger before insert or update on public.legacy_media_references for each row execute function public.enforce_legacy_media_tenant();

alter table public.legacy_import_records enable row level security;
alter table public.historical_payments enable row level security;
alter table public.legacy_media_references enable row level security;

create policy "Members read legacy import records" on public.legacy_import_records for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_import_records.garage_id and gm.user_id=auth.uid()));
create policy "Members manage legacy import records" on public.legacy_import_records for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_import_records.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_import_records.garage_id and gm.user_id=auth.uid()));
create policy "Members read historical payments" on public.historical_payments for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=historical_payments.garage_id and gm.user_id=auth.uid()));
create policy "Members manage historical payments" on public.historical_payments for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=historical_payments.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from public.garage_members gm where gm.garage_id=historical_payments.garage_id and gm.user_id=auth.uid()));
create policy "Members read legacy media" on public.legacy_media_references for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_media_references.garage_id and gm.user_id=auth.uid()));
create policy "Members manage legacy media" on public.legacy_media_references for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_media_references.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from public.garage_members gm where gm.garage_id=legacy_media_references.garage_id and gm.user_id=auth.uid()));
