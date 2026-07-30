create type public.intelligence_recommendation_status as enum (
  'ACTIVE',
  'COMPLETED',
  'DISMISSED',
  'SNOOZED',
  'RESOLVED'
);

create type public.intelligence_recommendation_category as enum (
  'COMMERCIAL',
  'STOCK',
  'PRICING',
  'PUBLICATION',
  'APPOINTMENT',
  'ACQUISITION',
  'PROFITABILITY',
  'DATA_QUALITY'
);

create table public.intelligence_recommendations (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  recommendation_key text not null check (
    char_length(recommendation_key) between 3 and 240
    and recommendation_key ~ '^[a-z0-9:_-]+$'
  ),
  type text not null check (type in (
    'CONTACT_LEAD',
    'FOLLOW_UP_LEAD',
    'CONFIRM_APPOINTMENT',
    'COMPLETE_TASK',
    'REVIEW_VEHICLE_PRICE',
    'REDUCE_VEHICLE_PRICE',
    'COMPLETE_VEHICLE_LISTING',
    'PUBLISH_VEHICLE',
    'REVIEW_AGING_VEHICLE',
    'REVIEW_LOW_MARGIN_VEHICLE',
    'REVIEW_ACQUISITION_OPPORTUNITY',
    'VERIFY_VEHICLE_AVAILABILITY'
  )),
  category public.intelligence_recommendation_category not null,
  entity_type text check (
    entity_type is null or entity_type in ('lead', 'commercial_task', 'vehicle', 'acquisition_opportunity')
  ),
  entity_id uuid,
  status public.intelligence_recommendation_status not null default 'ACTIVE',
  score integer not null check (score between 0 and 100),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and pg_column_size(payload) <= 32768
  ),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  dismissed_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint intelligence_recommendation_entity_check check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null)
  ),
  constraint intelligence_recommendation_state_dates_check check (
    (status <> 'RESOLVED' or resolved_at is not null)
    and (status <> 'DISMISSED' or dismissed_at is not null)
    and (status <> 'SNOOZED' or snoozed_until is not null)
  ),
  unique (garage_id, recommendation_key)
);

create index intelligence_recommendations_garage_status_score_idx
  on public.intelligence_recommendations (garage_id, status, score desc);
create index intelligence_recommendations_garage_category_status_idx
  on public.intelligence_recommendations (garage_id, category, status);
create index intelligence_recommendations_entity_idx
  on public.intelligence_recommendations (entity_type, entity_id)
  where entity_id is not null;
create index intelligence_recommendations_snoozed_idx
  on public.intelligence_recommendations (snoozed_until)
  where status = 'SNOOZED';
create index intelligence_recommendations_last_detected_idx
  on public.intelligence_recommendations (garage_id, last_detected_at desc);

create function public.set_intelligence_recommendation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_intelligence_recommendation_updated_at_trigger
before update on public.intelligence_recommendations
for each row execute function public.set_intelligence_recommendation_updated_at();

create function public.prevent_intelligence_recommendation_tenant_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.garage_id is distinct from old.garage_id then
    raise exception 'Recommendation garage cannot be changed' using errcode = '42501';
  end if;
  if new.recommendation_key is distinct from old.recommendation_key then
    raise exception 'Recommendation key cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger prevent_intelligence_recommendation_tenant_change_trigger
before update on public.intelligence_recommendations
for each row execute function public.prevent_intelligence_recommendation_tenant_change();

alter table public.intelligence_recommendations enable row level security;

create policy "Garage members can read intelligence recommendations"
on public.intelligence_recommendations for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = intelligence_recommendations.garage_id
    and gm.user_id = auth.uid()
));

create policy "Garage members can create intelligence recommendations"
on public.intelligence_recommendations for insert to authenticated
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = intelligence_recommendations.garage_id
    and gm.user_id = auth.uid()
));

create policy "Garage members can update intelligence recommendations"
on public.intelligence_recommendations for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = intelligence_recommendations.garage_id
    and gm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = intelligence_recommendations.garage_id
    and gm.user_id = auth.uid()
));

create policy "Garage admins can delete intelligence recommendations"
on public.intelligence_recommendations for delete to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = intelligence_recommendations.garage_id
    and gm.user_id = auth.uid()
    and gm.role in ('owner', 'admin')
));

revoke all on table public.intelligence_recommendations from anon;
