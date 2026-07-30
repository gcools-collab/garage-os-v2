create type public.commercial_task_type as enum (
  'CALL_PROSPECT',
  'SEND_EMAIL',
  'FOLLOW_UP',
  'CONFIRM_APPOINTMENT',
  'PREPARE_TEST_DRIVE',
  'REQUEST_DOCUMENTS',
  'UPDATE_LEAD',
  'OTHER'
);

create type public.commercial_task_status as enum (
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'SNOOZED',
  'CANCELLED'
);

create type public.commercial_priority as enum ('URGENT', 'HIGH', 'NORMAL', 'LOW');

create type public.notification_type as enum (
  'NEW_LEAD',
  'LEAD_ASSIGNED',
  'TASK_DUE',
  'TASK_OVERDUE',
  'APPOINTMENT_TO_CONFIRM',
  'FOLLOW_UP_DUE',
  'VEHICLE_UNAVAILABLE_FOR_LEAD',
  'SYSTEM'
);

create type public.lead_loss_reason as enum (
  'NO_RESPONSE',
  'VEHICLE_SOLD',
  'PRICE',
  'FINANCING',
  'VEHICLE_NOT_SUITABLE',
  'BOUGHT_ELSEWHERE',
  'DUPLICATE',
  'OTHER'
);

alter type public.lead_event_type add value 'ASSIGNED';
alter type public.lead_event_type add value 'NOTE_ADDED';
alter type public.lead_event_type add value 'CALL_LOGGED';
alter type public.lead_event_type add value 'EMAIL_LOGGED';
alter type public.lead_event_type add value 'FOLLOW_UP_SCHEDULED';
alter type public.lead_event_type add value 'TASK_CREATED';
alter type public.lead_event_type add value 'TASK_COMPLETED';
alter type public.lead_event_type add value 'TASK_SNOOZED';
alter type public.lead_event_type add value 'APPOINTMENT_CONFIRMED';
alter type public.lead_event_type add value 'LEAD_WON';
alter type public.lead_event_type add value 'LEAD_LOST';

alter table public.leads
  add column assigned_user_id uuid references auth.users(id) on delete set null,
  add column first_contacted_at timestamptz,
  add column last_contacted_at timestamptz,
  add column next_action_at timestamptz,
  add column loss_reason public.lead_loss_reason,
  add column loss_note text check (loss_note is null or char_length(loss_note) <= 1000),
  add constraint leads_loss_reason_check check (
    status <> 'LOST' or (
      loss_reason is not null
      and (loss_reason <> 'OTHER' or nullif(trim(loss_note), '') is not null)
    )
  );

create table public.commercial_tasks (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid references auth.users(id) on delete set null,
  type public.commercial_task_type not null,
  status public.commercial_task_status not null default 'OPEN',
  priority public.commercial_priority not null default 'NORMAL',
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 2000),
  due_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_user_id uuid not null references auth.users(id) on delete restrict,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) between 2 and 120),
  message text not null check (char_length(message) between 2 and 300),
  href text check (href is null or (href ~ '^/' and href !~ '^//') and char_length(href) <= 500),
  entity_type text check (entity_type is null or entity_type in ('lead', 'commercial_task', 'vehicle', 'system')),
  entity_id uuid,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create index commercial_tasks_garage_status_due_idx
  on public.commercial_tasks (garage_id, status, due_at);
create index commercial_tasks_garage_assignee_status_idx
  on public.commercial_tasks (garage_id, assigned_user_id, status);
create index commercial_tasks_lead_idx
  on public.commercial_tasks (lead_id) where lead_id is not null;
create index commercial_tasks_open_due_idx
  on public.commercial_tasks (due_at)
  where status in ('OPEN', 'IN_PROGRESS', 'SNOOZED');
create index notifications_garage_created_idx
  on public.notifications (garage_id, created_at desc);
create index notifications_user_unread_created_idx
  on public.notifications (user_id, read_at, created_at desc);
create index notifications_garage_unread_idx
  on public.notifications (garage_id, read_at);
create index lead_notes_lead_created_idx
  on public.lead_notes (lead_id, created_at);
create index lead_notes_garage_created_idx
  on public.lead_notes (garage_id, created_at);
create index leads_garage_assignee_status_idx
  on public.leads (garage_id, assigned_user_id, status);
create index leads_garage_next_action_idx
  on public.leads (garage_id, next_action_at)
  where next_action_at is not null;

create function public.set_commercial_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_commercial_task_updated_at
before update on public.commercial_tasks
for each row execute function public.set_commercial_updated_at();

create function public.validate_commercial_task_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.garage_id is distinct from old.garage_id then
    raise exception 'Commercial task garage cannot be changed' using errcode = '42501';
  end if;
  if new.lead_id is not null and not exists (
    select 1 from public.leads l where l.id = new.lead_id and l.garage_id = new.garage_id
  ) then
    raise exception 'Lead is not part of the task garage' using errcode = '42501';
  end if;
  if new.vehicle_id is not null and not exists (
    select 1 from public.vehicles v where v.id = new.vehicle_id and v.garage_id = new.garage_id
  ) then
    raise exception 'Vehicle is not part of the task garage' using errcode = '42501';
  end if;
  if new.assigned_user_id is not null and not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.assigned_user_id
  ) then
    raise exception 'Assignee is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_commercial_task_scope_trigger
before insert or update on public.commercial_tasks
for each row execute function public.validate_commercial_task_scope();

create function public.validate_lead_commercial_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.assigned_user_id is not null and not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.assigned_user_id
  ) then
    raise exception 'Assignee is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_lead_commercial_scope_trigger
before update of assigned_user_id on public.leads
for each row execute function public.validate_lead_commercial_scope();

create function public.validate_lead_note_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.garage_id is distinct from old.garage_id
    or new.lead_id is distinct from old.lead_id
    or new.author_user_id is distinct from old.author_user_id
  ) then
    raise exception 'Lead note ownership cannot be changed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.leads l where l.id = new.lead_id and l.garage_id = new.garage_id
  ) then
    raise exception 'Lead is not part of the note garage' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.author_user_id
  ) then
    raise exception 'Note author is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_lead_note_scope_trigger
before insert or update on public.lead_notes
for each row execute function public.validate_lead_note_scope();

create function public.validate_notification_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.garage_id is distinct from old.garage_id
    or new.user_id is distinct from old.user_id
  ) then
    raise exception 'Notification ownership cannot be changed' using errcode = '42501';
  end if;
  if new.user_id is not null and not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.user_id
  ) then
    raise exception 'Notification user is not a garage member' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_notification_scope_trigger
before insert or update on public.notifications
for each row execute function public.validate_notification_scope();

alter table public.commercial_tasks enable row level security;
alter table public.lead_notes enable row level security;
alter table public.notifications enable row level security;

create policy "Garage members can read commercial tasks"
on public.commercial_tasks for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = commercial_tasks.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can create commercial tasks"
on public.commercial_tasks for insert to authenticated
with check (
  exists (
    select 1 from public.garage_members gm
    where gm.garage_id = commercial_tasks.garage_id and gm.user_id = auth.uid()
  )
  and (created_by_user_id is null or created_by_user_id = auth.uid())
);

create policy "Garage members can update commercial tasks"
on public.commercial_tasks for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = commercial_tasks.garage_id and gm.user_id = auth.uid()
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = commercial_tasks.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can read lead notes"
on public.lead_notes for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = lead_notes.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can create lead notes"
on public.lead_notes for insert to authenticated
with check (
  author_user_id = auth.uid()
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = lead_notes.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Authors and admins can update lead notes"
on public.lead_notes for update to authenticated
using (
  author_user_id = auth.uid()
  or exists (
    select 1 from public.garage_members gm
    where gm.garage_id = lead_notes.garage_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'admin')
  )
)
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = lead_notes.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can read visible notifications"
on public.notifications for select to authenticated
using (
  exists (
    select 1 from public.garage_members gm
    where gm.garage_id = notifications.garage_id and gm.user_id = auth.uid()
  )
  and (
    notifications.user_id is null
    or notifications.user_id = auth.uid()
    or exists (
      select 1 from public.garage_members gm
      where gm.garage_id = notifications.garage_id
        and gm.user_id = auth.uid()
        and gm.role in ('owner', 'admin')
    )
  )
);

create policy "Users can update visible notifications"
on public.notifications for update to authenticated
using (
  exists (
    select 1 from public.garage_members gm
    where gm.garage_id = notifications.garage_id and gm.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
)
with check (
  exists (
    select 1 from public.garage_members gm
    where gm.garage_id = notifications.garage_id and gm.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
);

create policy "Garage members can create notifications"
on public.notifications for insert to authenticated
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = notifications.garage_id and gm.user_id = auth.uid()
));

revoke all on table public.commercial_tasks from anon;
revoke all on table public.lead_notes from anon;
revoke all on table public.notifications from anon;

create or replace function public.create_public_vehicle_lead(
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
  initial_task_type public.commercial_task_type;
  initial_task_title text;
  initial_task_priority public.commercial_priority;
  initial_due_at timestamptz;
begin
  select g.* into target_garage
  from public.garages g
  where g.live_slug = lower(trim(p_garage_slug)) and g.live_enabled;
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

  initial_task_type := case p_type
    when 'CALLBACK_REQUEST' then 'CALL_PROSPECT'
    when 'APPOINTMENT_REQUEST' then 'CONFIRM_APPOINTMENT'
    when 'TEST_DRIVE_REQUEST' then 'PREPARE_TEST_DRIVE'
    when 'VEHICLE_QUESTION' then 'SEND_EMAIL'
    when 'PRICE_INQUIRY' then 'FOLLOW_UP'
    else 'UPDATE_LEAD'
  end;
  initial_task_title := case p_type
    when 'CALLBACK_REQUEST' then 'Appeler le prospect'
    when 'APPOINTMENT_REQUEST' then 'Confirmer le rendez-vous'
    when 'TEST_DRIVE_REQUEST' then 'Organiser l''essai'
    when 'VEHICLE_QUESTION' then 'Répondre à la demande'
    when 'PRICE_INQUIRY' then 'Recontacter le prospect'
    else 'Traiter la demande'
  end;
  initial_task_priority := case
    when p_type in ('APPOINTMENT_REQUEST', 'TEST_DRIVE_REQUEST') then 'HIGH'
    else 'NORMAL'
  end;
  initial_due_at := case
    when extract(isodow from now() at time zone 'Europe/Paris') between 1 and 5
      and (now() at time zone 'Europe/Paris')::time between time '08:00' and time '17:30'
      then now() + interval '2 hours'
    when extract(isodow from now() at time zone 'Europe/Paris') = 5
      then date_trunc('day', now() at time zone 'Europe/Paris') + interval '3 days 9 hours'
    when extract(isodow from now() at time zone 'Europe/Paris') = 6
      then date_trunc('day', now() at time zone 'Europe/Paris') + interval '2 days 9 hours'
    else date_trunc('day', now() at time zone 'Europe/Paris') + interval '1 day 9 hours'
  end;

  insert into public.commercial_tasks (
    garage_id, lead_id, vehicle_id, type, priority, title, due_at
  ) values (
    target_garage.id, created_lead_id, target_vehicle.id,
    initial_task_type, initial_task_priority, initial_task_title, initial_due_at
  );

  update public.leads set next_action_at = initial_due_at where id = created_lead_id;

  insert into public.notifications (
    garage_id, type, title, message, href, entity_type, entity_id
  ) values (
    target_garage.id,
    'NEW_LEAD',
    'Nouveau prospect',
    concat('Une nouvelle demande concerne ', concat_ws(' ', target_vehicle.brand, target_vehicle.model), '.'),
    concat('/leads/', created_lead_id),
    'lead',
    created_lead_id
  );

  insert into public.lead_events (
    lead_id, garage_id, event_type, metadata
  ) values (
    created_lead_id, target_garage.id, 'TASK_CREATED',
    jsonb_build_object('taskType', initial_task_type, 'dueAt', initial_due_at)
  );

  return query select created_lead_id, 'success'::text;
end;
$$;
