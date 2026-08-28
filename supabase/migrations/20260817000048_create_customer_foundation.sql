create table public.customers (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  normalized_email text,
  phone text,
  normalized_phone text,
  address_line text,
  postal_code text,
  city text,
  source text not null check (source in ('GARAGE_OS','WORDPRESS','WOOCOMMERCE','YITH','ELEMENTOR','MANUAL','OTHER')),
  external_id text,
  import_fingerprint text check (import_fingerprint is null or import_fingerprint ~ '^[a-f0-9]{64}$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_identity_present check (
    normalized_email is not null or normalized_phone is not null or
    first_name is not null or last_name is not null
  ),
  constraint customers_email_normalized check (
    normalized_email is null or normalized_email = lower(trim(normalized_email))
  ),
  unique (id, garage_id),
  unique (garage_id, source, external_id)
);

create unique index customers_garage_email_unique
  on public.customers (garage_id, normalized_email)
  where normalized_email is not null;
create index customers_garage_phone_idx on public.customers (garage_id, normalized_phone);
create index customers_garage_name_idx on public.customers (garage_id, last_name, first_name);

create table public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  customer_id uuid not null,
  stock_vehicle_id uuid references public.vehicles(id) on delete set null,
  registration_number text,
  vin text,
  brand text,
  model text,
  version text,
  first_registration_date date,
  source text not null check (source in ('GARAGE_OS','WORDPRESS','WOOCOMMERCE','YITH','ELEMENTOR','MANUAL','OTHER')),
  external_id text,
  import_fingerprint text check (import_fingerprint is null or import_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (customer_id, garage_id) references public.customers(id, garage_id) on delete cascade,
  unique (garage_id, source, external_id)
);

create index customer_vehicles_customer_idx on public.customer_vehicles (garage_id, customer_id);
create index customer_vehicles_registration_idx on public.customer_vehicles (garage_id, registration_number);
create index customer_vehicles_vin_idx on public.customer_vehicles (garage_id, vin);

alter table public.leads add column customer_id uuid;
alter table public.appointments add column customer_id uuid;
alter table public.registration_cases add column customer_id uuid;
alter table public.leads add constraint leads_customer_tenant_fk foreign key (customer_id, garage_id) references public.customers(id, garage_id) on delete set null (customer_id);
alter table public.appointments add constraint appointments_customer_tenant_fk foreign key (customer_id, garage_id) references public.customers(id, garage_id) on delete set null (customer_id);
alter table public.registration_cases add constraint registration_cases_customer_tenant_fk foreign key (customer_id, garage_id) references public.customers(id, garage_id) on delete set null (customer_id);
create index leads_customer_idx on public.leads (garage_id, customer_id);
create index appointments_customer_idx on public.appointments (garage_id, customer_id);
create index registration_cases_customer_idx on public.registration_cases (garage_id, customer_id);

alter table public.customers enable row level security;
alter table public.customer_vehicles enable row level security;

create policy "Garage members read customers" on public.customers for select to authenticated
  using (exists (select 1 from public.garage_members gm where gm.garage_id=customers.garage_id and gm.user_id=auth.uid()));
create policy "Garage members manage customers" on public.customers for all to authenticated
  using (exists (select 1 from public.garage_members gm where gm.garage_id=customers.garage_id and gm.user_id=auth.uid()))
  with check (exists (select 1 from public.garage_members gm where gm.garage_id=customers.garage_id and gm.user_id=auth.uid()));
create policy "Garage members read customer vehicles" on public.customer_vehicles for select to authenticated
  using (exists (select 1 from public.garage_members gm where gm.garage_id=customer_vehicles.garage_id and gm.user_id=auth.uid()));
create policy "Garage members manage customer vehicles" on public.customer_vehicles for all to authenticated
  using (exists (select 1 from public.garage_members gm where gm.garage_id=customer_vehicles.garage_id and gm.user_id=auth.uid()))
  with check (exists (select 1 from public.garage_members gm where gm.garage_id=customer_vehicles.garage_id and gm.user_id=auth.uid()));
