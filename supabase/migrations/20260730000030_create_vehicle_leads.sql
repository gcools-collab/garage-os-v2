create type public.lead_type as enum (
  'GENERAL_INQUIRY',
  'CALLBACK_REQUEST',
  'APPOINTMENT_REQUEST',
  'TEST_DRIVE_REQUEST',
  'VEHICLE_QUESTION',
  'PRICE_INQUIRY'
);

create type public.lead_source as enum (
  'LIVE_VEHICLE_PAGE',
  'LIVE_HOMEPAGE',
  'LIVE_CATALOG',
  'PHONE_CTA',
  'EMAIL_CTA',
  'MANUAL'
);

create type public.lead_status as enum (
  'NEW',
  'TO_CONTACT',
  'CONTACTED',
  'APPOINTMENT_PLANNED',
  'QUALIFIED',
  'LOST',
  'WON',
  'ARCHIVED'
);

create type public.lead_event_type as enum (
  'CREATED',
  'STATUS_CHANGED',
  'CONTACTED',
  'APPOINTMENT_PLANNED',
  'ARCHIVED'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  source public.lead_source not null,
  type public.lead_type not null,
  status public.lead_status not null default 'NEW',
  customer_name text not null check (char_length(customer_name) between 2 and 100),
  customer_phone text check (customer_phone is null or char_length(customer_phone) between 6 and 30),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  preferred_date date,
  preferred_time text check (preferred_time is null or char_length(preferred_time) <= 50),
  message text check (message is null or char_length(message) <= 2000),
  public_page_url text check (public_page_url is null or char_length(public_page_url) <= 500),
  public_vehicle_slug text,
  public_garage_slug text not null,
  consent_contact boolean not null,
  consent_marketing boolean not null default false,
  submission_fingerprint text check (
    submission_fingerprint is null or submission_fingerprint ~ '^[a-f0-9]{64}$'
  ),
  vehicle_title_snapshot text,
  vehicle_price_snapshot_cents bigint check (
    vehicle_price_snapshot_cents is null or vehicle_price_snapshot_cents >= 0
  ),
  vehicle_brand_snapshot text,
  vehicle_model_snapshot text,
  vehicle_year_snapshot integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  contacted_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  constraint leads_contact_method_check check (
    customer_phone is not null or customer_email is not null
  ),
  constraint leads_contact_consent_check check (consent_contact),
  constraint leads_preferred_date_check check (
    preferred_date is null or preferred_date >= created_at::date
  )
);

create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  garage_id uuid not null references public.garages(id) on delete cascade,
  event_type public.lead_event_type not null,
  from_status public.lead_status,
  to_status public.lead_status,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index leads_garage_created_idx on public.leads (garage_id, created_at desc);
create index leads_garage_status_created_idx on public.leads (garage_id, status, created_at desc);
create index leads_vehicle_idx on public.leads (vehicle_id) where vehicle_id is not null;
create index leads_duplicate_window_idx
  on public.leads (garage_id, vehicle_id, submission_fingerprint, type, created_at desc)
  where submission_fingerprint is not null;
create index lead_events_lead_created_idx on public.lead_events (lead_id, created_at);

create function public.set_lead_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_lead_updated_at_trigger
before update on public.leads
for each row execute function public.set_lead_updated_at();

create function public.prevent_lead_tenant_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.garage_id is distinct from old.garage_id then
    raise exception 'Lead garage cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prevent_lead_tenant_change_trigger
before update on public.leads
for each row execute function public.prevent_lead_tenant_change();

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

create policy "Garage members can read leads"
on public.leads for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = leads.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can update leads"
on public.leads for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = leads.garage_id and gm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = leads.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can read lead events"
on public.lead_events for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = lead_events.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can create lead events"
on public.lead_events for insert to authenticated
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = lead_events.garage_id and gm.user_id = auth.uid()
));

create function public.create_public_vehicle_lead(
  p_garage_slug text,
  p_vehicle_slug text,
  p_type public.lead_type,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_preferred_date date,
  p_preferred_time text,
  p_message text,
  p_public_page_url text,
  p_consent_contact boolean,
  p_consent_marketing boolean,
  p_submission_fingerprint text
)
returns table (lead_id uuid, outcome text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_garage public.garages%rowtype;
  target_vehicle public.vehicles%rowtype;
  created_lead_id uuid;
begin
  select g.* into target_garage
  from public.garages g
  where g.live_slug = lower(trim(p_garage_slug))
    and g.live_enabled;
  if target_garage.id is null then
    return query select null::uuid, 'unavailable_garage'::text;
    return;
  end if;

  select v.* into target_vehicle
  from public.vehicles v
  where v.garage_id = target_garage.id
    and v.live_slug = lower(trim(p_vehicle_slug))
    and v.publication_status = 'PUBLISHED'
    and v.status not in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED')
    and v.published_at <= now();
  if target_vehicle.id is null then
    return query select null::uuid, 'unavailable_vehicle'::text;
    return;
  end if;

  if (
    select count(*) from public.leads l
    where l.garage_id = target_garage.id
      and l.submission_fingerprint = p_submission_fingerprint
      and l.created_at >= now() - interval '1 hour'
  ) >= 5 then
    return query select null::uuid, 'rate_limited'::text;
    return;
  end if;

  if exists (
    select 1 from public.leads l
    where l.garage_id = target_garage.id
      and l.vehicle_id = target_vehicle.id
      and l.type = p_type
      and l.submission_fingerprint = p_submission_fingerprint
      and l.created_at >= now() - interval '10 minutes'
  ) then
    return query select null::uuid, 'duplicate_submission'::text;
    return;
  end if;

  insert into public.leads (
    garage_id, vehicle_id, source, type, status, customer_name,
    customer_phone, customer_email, preferred_date, preferred_time, message,
    public_page_url, public_vehicle_slug, public_garage_slug,
    consent_contact, consent_marketing, submission_fingerprint,
    vehicle_title_snapshot, vehicle_price_snapshot_cents,
    vehicle_brand_snapshot, vehicle_model_snapshot, vehicle_year_snapshot
  ) values (
    target_garage.id, target_vehicle.id, 'LIVE_VEHICLE_PAGE', p_type, 'NEW',
    trim(p_customer_name), nullif(trim(p_customer_phone), ''),
    nullif(lower(trim(p_customer_email)), ''), p_preferred_date,
    nullif(trim(p_preferred_time), ''), nullif(trim(p_message), ''),
    nullif(trim(p_public_page_url), ''), target_vehicle.live_slug,
    target_garage.live_slug, p_consent_contact, p_consent_marketing,
    p_submission_fingerprint,
    concat_ws(' ', target_vehicle.brand, target_vehicle.model, coalesce(target_vehicle.trim, target_vehicle.version)),
    case when target_vehicle.selling_price is null then null else round(target_vehicle.selling_price * 100)::bigint end,
    target_vehicle.brand, target_vehicle.model, target_vehicle.year
  ) returning id into created_lead_id;

  insert into public.lead_events (lead_id, garage_id, event_type, to_status)
  values (created_lead_id, target_garage.id, 'CREATED', 'NEW');

  return query select created_lead_id, 'success'::text;
end;
$$;

revoke all on table public.leads from anon;
revoke all on table public.lead_events from anon;
revoke all on function public.create_public_vehicle_lead(
  text, text, public.lead_type, text, text, text, date, text, text, text,
  boolean, boolean, text
) from public;
grant execute on function public.create_public_vehicle_lead(
  text, text, public.lead_type, text, text, text, date, text, text, text,
  boolean, boolean, text
) to anon, authenticated;
