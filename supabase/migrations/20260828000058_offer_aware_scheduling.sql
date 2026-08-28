-- GO-0090.6B: SAP catalog correction, shock options, offer-aware scheduling RPCs.

do $$
declare
  sap_garage_id uuid;
  under_offer_id uuid;
  plus_offer_id uuid;
  under_count integer;
  plus_count integer;
begin
  select g.id into sap_garage_id
  from public.garages g
  where g.live_slug = 'sap' and g.live_enabled;

  if sap_garage_id is null then
    raise exception 'GO-0090.6B: SAP live garage not found (live_slug = sap)';
  end if;

  select count(*) into under_count
  from public.service_offers o
  where o.garage_id = sap_garage_id and o.slug = 'engine-cleaning-under-2l';

  select count(*) into plus_count
  from public.service_offers o
  where o.garage_id = sap_garage_id and o.slug = 'engine-cleaning-2l-plus';

  if under_count <> 1 or plus_count <> 1 then
    raise exception 'GO-0090.6B: SAP decarbonization offers must resolve uniquely (under=%, plus=%)', under_count, plus_count;
  end if;

  select o.id into under_offer_id
  from public.service_offers o
  where o.garage_id = sap_garage_id and o.slug = 'engine-cleaning-under-2l';

  select o.id into plus_offer_id
  from public.service_offers o
  where o.garage_id = sap_garage_id and o.slug = 'engine-cleaning-2l-plus';

  if not exists (
    select 1 from public.service_offers o
    where o.id = under_offer_id
      and o.duration_minutes = 60
      and o.amount_cents = 3990
  ) then
    raise exception 'GO-0090.6B: SAP engine-cleaning-under-2l must be 60 min / 3990 cents';
  end if;

  update public.service_offers o
  set duration_minutes = 90, updated_at = now()
  where o.id = plus_offer_id
    and o.amount_cents = 4990
    and coalesce(o.duration_minutes, 0) <> 90;

  if not exists (
    select 1 from public.service_offers o
    where o.id = plus_offer_id
      and o.duration_minutes = 90
      and o.amount_cents = 4990
  ) then
    raise exception 'GO-0090.6B: SAP engine-cleaning-2l-plus must be 90 min / 4990 cents after correction';
  end if;

  insert into public.service_offer_options (
    garage_id, offer_id, name, is_active, is_public, amount_cents, duration_delta_minutes, display_order
  )
  select sap_garage_id, under_offer_id, 'Traitement choc double machine', true, true, 1990, 0, 10
  where not exists (
    select 1 from public.service_offer_options x
    where x.offer_id = under_offer_id
      and x.name = 'Traitement choc double machine'
      and x.amount_cents = 1990
  );

  insert into public.service_offer_options (
    garage_id, offer_id, name, is_active, is_public, amount_cents, duration_delta_minutes, display_order
  )
  select sap_garage_id, plus_offer_id, 'Traitement choc double machine', true, true, 2990, 0, 10
  where not exists (
    select 1 from public.service_offer_options x
    where x.offer_id = plus_offer_id
      and x.name = 'Traitement choc double machine'
      and x.amount_cents = 2990
  );

  if not exists (
    select 1 from public.appointment_type_settings t
    where t.garage_id = sap_garage_id and t.appointment_type = 'ENGINE_CLEANING'
  ) then
    raise exception 'GO-0090.6B: SAP ENGINE_CLEANING appointment_type_settings row missing';
  end if;

  update public.appointment_type_settings t
  set simultaneous_capacity = 1, updated_at = now()
  where t.garage_id = sap_garage_id
    and t.appointment_type = 'ENGINE_CLEANING'
    and t.simultaneous_capacity <> 1;
end $$;

drop function if exists public.book_public_appointment(
  text, text, uuid, text, timestamptz, text, text, text, jsonb, text
);

create or replace function public.book_public_appointment(
  p_garage_slug text,
  p_vehicle_slug text,
  p_lead_id uuid,
  p_type text,
  p_starts_at timestamptz,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_details jsonb,
  p_fingerprint text,
  p_duration_minutes integer default null
)
returns table(appointment_id uuid, outcome text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g garages%rowtype;
  v vehicles%rowtype;
  t appointment_type_settings%rowtype;
  tz text;
  slot_end timestamptz;
  created uuid;
  initial_status text;
  capacity_count int;
  effective_duration integer;
begin
  select * into g from garages where live_slug = lower(trim(p_garage_slug)) and live_enabled;
  if g.id is null then
    return query select null::uuid, 'unavailable_garage', null::text;
    return;
  end if;

  select s.timezone into tz from garage_scheduling_settings s where s.garage_id = g.id;
  if tz is null then
    return query select null::uuid, 'schedule_unavailable', null::text;
    return;
  end if;

  select * into t from appointment_type_settings
  where garage_id = g.id and appointment_type = p_type and online_booking_enabled;
  if t.garage_id is null or not exists(
    select 1 from garage_services gs
    where gs.garage_id = g.id and gs.is_enabled
      and gs.service_key = case when p_type in ('TEST_DRIVE', 'TRADE_IN') then 'VEHICLE_SALES' else p_type end
  ) then
    return query select null::uuid, 'booking_disabled', null::text;
    return;
  end if;

  effective_duration := coalesce(p_duration_minutes, t.duration_minutes);
  if effective_duration is null or effective_duration < 10 or effective_duration > 480 then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  if p_type = 'TEST_DRIVE' then
    select * into v from vehicles
    where garage_id = g.id and live_slug = lower(trim(p_vehicle_slug))
      and publication_status = 'PUBLISHED'
      and status not in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED');
    if v.id is null then
      return query select null::uuid, 'unavailable_vehicle', null::text;
      return;
    end if;
  end if;

  if p_lead_id is not null and not exists(
    select 1 from leads l
    where l.id = p_lead_id and l.garage_id = g.id and l.submission_fingerprint = p_fingerprint
  ) then
    return query select null::uuid, 'invalid_lead', null::text;
    return;
  end if;

  slot_end := p_starts_at + make_interval(mins => effective_duration);
  perform pg_advisory_xact_lock(hashtextextended(g.id::text || p_type || p_starts_at::text, 0));

  if p_starts_at < now() + make_interval(mins => t.minimum_notice_minutes)
     or p_starts_at > now() + make_interval(days => t.booking_horizon_days) then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  select count(*) into capacity_count
  from appointments a
  where a.garage_id = g.id
    and a.is_historical = false
    and a.status in ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED')
    and a.starts_at < slot_end + make_interval(mins => t.buffer_after_minutes)
    and a.ends_at > p_starts_at - make_interval(mins => t.buffer_before_minutes);
  if capacity_count >= t.simultaneous_capacity then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  if not exists(
    select 1 from garage_business_hours h
    where h.garage_id = g.id
      and h.day_of_week = extract(dow from (p_starts_at at time zone tz))
      and h.opens_at <= (p_starts_at at time zone tz)::time
      and h.closes_at >= (slot_end at time zone tz)::time
  ) or exists(
    select 1 from garage_calendar_exceptions e
    where e.garage_id = g.id and e.kind <> 'OPEN'
      and e.starts_at < slot_end and e.ends_at > p_starts_at
  ) then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  initial_status := case
    when t.payment_required then 'AWAITING_PAYMENT'
    when t.auto_confirm then 'CONFIRMED'
    else 'PENDING'
  end;

  insert into appointments(
    garage_id, lead_id, vehicle_id, type, status, starts_at, ends_at, timezone,
    customer_name, customer_phone, customer_email, payment_required, details
  ) values (
    g.id, p_lead_id, v.id, p_type, initial_status, p_starts_at, slot_end, tz,
    trim(p_customer_name), nullif(trim(p_phone), ''), nullif(lower(trim(p_email)), ''),
    t.payment_required, coalesce(p_details, '{}')
  ) returning id into created;

  insert into appointment_events(garage_id, appointment_id, event_type, new_status, metadata)
  values (g.id, created, 'CREATED', initial_status, '{}');

  if initial_status = 'AWAITING_PAYMENT' then
    insert into appointment_events(garage_id, appointment_id, event_type, new_status, metadata)
    values (g.id, created, 'PAYMENT_REQUIRED', initial_status, '{}');
  elsif initial_status = 'CONFIRMED' then
    insert into appointment_events(garage_id, appointment_id, event_type, new_status, metadata)
    values (g.id, created, 'CONFIRMED', initial_status, '{}');
  end if;

  if p_lead_id is not null then
    insert into lead_events(lead_id, garage_id, event_type, metadata)
    values (p_lead_id, g.id, 'APPOINTMENT_BOOKED', jsonb_build_object('appointmentId', created));
    update leads set next_action_at = p_starts_at where id = p_lead_id;
  end if;

  insert into notifications(garage_id, type, title, message, href, entity_type, entity_id)
  values (
    g.id,
    case when initial_status = 'PENDING' then 'APPOINTMENT_TO_CONFIRM'::notification_type else 'SYSTEM'::notification_type end,
    case when initial_status = 'PENDING' then 'Rendez-vous à confirmer' else 'Nouveau rendez-vous' end,
    trim(p_customer_name),
    '/appointments/' || created,
    'appointment',
    created
  );

  return query select created, 'success', initial_status;
end $$;

revoke all on function public.book_public_appointment(
  text, text, uuid, text, timestamptz, text, text, text, jsonb, text, integer
) from public;
grant execute on function public.book_public_appointment(
  text, text, uuid, text, timestamptz, text, text, text, jsonb, text, integer
) to anon, authenticated;

create or replace function public.book_public_catalog_appointment(
  p_garage_slug text,
  p_vehicle_slug text,
  p_lead_id uuid,
  p_type text,
  p_starts_at timestamptz,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_details jsonb,
  p_fingerprint text,
  p_offer_slug text,
  p_option_ids uuid[] default '{}'
)
returns table(appointment_id uuid, outcome text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g garages%rowtype;
  o service_offers%rowtype;
  r record;
  invalid_options integer;
  options_total integer;
  options_duration_delta integer;
  total_amount integer;
  due_now integer;
  remaining integer;
  booking_duration integer;
  snapshot jsonb;
  final_status text;
  total_option_count integer;
  distinct_option_count integer;
begin
  select * into g from garages where live_slug = lower(trim(p_garage_slug)) and live_enabled;
  if g.id is null then
    return query select null::uuid, 'unavailable_garage', null::text;
    return;
  end if;

  select so.* into o
  from service_offers so
  join garage_services gs on gs.garage_id = so.garage_id and gs.service_key = so.service_key and gs.is_enabled
  where so.garage_id = g.id
    and so.slug = p_offer_slug
    and so.service_key = p_type
    and so.is_active
    and so.is_public;
  if o.id is null then
    return query select null::uuid, 'offer_unavailable', null::text;
    return;
  end if;

  select coalesce(count(*), 0), coalesce(count(distinct selected.id), 0)
  into total_option_count, distinct_option_count
  from unnest(coalesce(p_option_ids, '{}')) selected(id);
  if total_option_count <> distinct_option_count then
    return query select null::uuid, 'invalid_options', null::text;
    return;
  end if;

  select count(*) into invalid_options
  from unnest(coalesce(p_option_ids, '{}')) selected(id)
  where not exists(
    select 1 from service_offer_options x
    where x.id = selected.id
      and x.offer_id = o.id
      and x.garage_id = g.id
      and x.is_active
      and x.is_public
  );
  if invalid_options > 0 then
    return query select null::uuid, 'invalid_options', null::text;
    return;
  end if;

  if o.duration_minutes is null then
    return query select null::uuid, 'offer_unavailable', null::text;
    return;
  end if;

  select coalesce(sum(x.amount_cents), 0), coalesce(sum(x.duration_delta_minutes), 0)
  into options_total, options_duration_delta
  from service_offer_options x
  where x.id = any(coalesce(p_option_ids, '{}')) and x.offer_id = o.id;

  booking_duration := o.duration_minutes + options_duration_delta;
  if booking_duration < 10 or booking_duration > 480 then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  total_amount := case when o.amount_cents is null then null else o.amount_cents + options_total end;
  due_now := case
    when o.payment_strategy = 'FULL_PAYMENT' then total_amount
    when o.payment_strategy = 'DEPOSIT' then o.deposit_amount_cents
    else 0
  end;
  remaining := case
    when total_amount is null then null
    when o.payment_strategy = 'FULL_PAYMENT' then 0
    when o.payment_strategy = 'DEPOSIT' and due_now is not null then greatest(0, total_amount - due_now)
    else total_amount
  end;

  snapshot := jsonb_build_object(
    'offer_id', o.id,
    'offer_name', o.name,
    'offer_code', o.code,
    'service_key', o.service_key,
    'pricing_type', o.pricing_type,
    'base_amount_cents', o.amount_cents,
    'selected_options', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'amount_cents', x.amount_cents) order by x.display_order)
      from service_offer_options x
      where x.id = any(coalesce(p_option_ids, '{}')) and x.offer_id = o.id
    ), '[]'::jsonb),
    'options_amount_cents', options_total,
    'total_amount_cents', total_amount,
    'payment_strategy', o.payment_strategy,
    'amount_due_now_cents', due_now,
    'remaining_amount_cents', remaining,
    'currency', o.currency,
    'duration_minutes', booking_duration,
    'options_duration_delta_minutes', options_duration_delta
  );

  select * into r from public.book_public_appointment(
    p_garage_slug,
    p_vehicle_slug,
    p_lead_id,
    p_type,
    p_starts_at,
    p_customer_name,
    p_phone,
    p_email,
    p_details,
    p_fingerprint,
    booking_duration
  );
  if r.outcome <> 'success' then
    return query select r.appointment_id, r.outcome, r.status;
    return;
  end if;

  final_status := case
    when o.payment_strategy in ('FULL_PAYMENT', 'DEPOSIT') then 'AWAITING_PAYMENT'
    else r.status
  end;

  update appointments
  set offer_id = o.id,
      commercial_snapshot = snapshot,
      payment_required = o.payment_strategy in ('FULL_PAYMENT', 'DEPOSIT'),
      status = final_status
  where id = r.appointment_id and garage_id = g.id;

  if final_status = 'AWAITING_PAYMENT' and r.status <> 'AWAITING_PAYMENT' then
    insert into appointment_events(garage_id, appointment_id, event_type, old_status, new_status, metadata)
    values (g.id, r.appointment_id, 'PAYMENT_REQUIRED', r.status, final_status, jsonb_build_object('offerId', o.id));
  end if;

  return query select r.appointment_id, 'success', final_status;
end $$;

revoke all on function public.book_public_catalog_appointment(
  text, text, uuid, text, timestamptz, text, text, text, jsonb, text, text, uuid[]
) from public;
grant execute on function public.book_public_catalog_appointment(
  text, text, uuid, text, timestamptz, text, text, text, jsonb, text, text, uuid[]
) to anon, authenticated;

drop function if exists public.get_public_appointment_availability(text, text, date, date);

create or replace function public.get_public_appointment_availability(
  p_garage_slug text,
  p_type text,
  p_from date,
  p_to date,
  p_offer_slug text default null
)
returns table(starts_at timestamptz, ends_at timestamptz, local_date date, local_time time)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with resolved_offer as (
  select so.garage_id, so.duration_minutes
  from public.garages g
  join public.service_offers so on so.garage_id = g.id
  join public.garage_services gs on gs.garage_id = so.garage_id and gs.service_key = so.service_key and gs.is_enabled
  where g.live_slug = lower(trim(p_garage_slug))
    and g.live_enabled
    and p_offer_slug is not null
    and so.slug = p_offer_slug
    and so.service_key = p_type
    and so.is_active
    and so.is_public
),
context as (
  select
    g.id garage_id,
    s.timezone,
    case when p_offer_slug is not null then ro.duration_minutes else t.duration_minutes end duration_minutes,
    t.minimum_notice_minutes,
    t.booking_horizon_days,
    t.buffer_before_minutes,
    t.buffer_after_minutes,
    t.simultaneous_capacity
  from public.garages g
  join public.garage_scheduling_settings s on s.garage_id = g.id
  join public.appointment_type_settings t on t.garage_id = g.id and t.appointment_type = p_type
  left join resolved_offer ro on ro.garage_id = g.id
  where g.live_slug = lower(trim(p_garage_slug))
    and g.live_enabled
    and t.online_booking_enabled
    and s.timezone is not null
    and p_to >= p_from
    and p_to - p_from <= 31
    and (p_offer_slug is null or ro.duration_minutes is not null)
    and exists(
      select 1 from public.garage_services gs
      where gs.garage_id = g.id and gs.is_enabled
        and gs.service_key = case when p_type in ('TEST_DRIVE', 'TRADE_IN') then 'VEHICLE_SALES' else p_type end
    )
),
days as (
  select d::date service_day, c.*
  from context c
  cross join generate_series(p_from, p_to, interval '1 day') d
),
candidates as (
  select
    ((d.service_day + h.opens_at) at time zone d.timezone) + make_interval(mins => n) starts_at,
    d.*,
    h.closes_at
  from days d
  join public.garage_business_hours h on h.garage_id = d.garage_id and h.day_of_week = extract(dow from d.service_day)
  cross join lateral generate_series(0, 1440, d.duration_minutes) n
),
slots as (
  select
    c.*,
    c.starts_at + make_interval(mins => c.duration_minutes) ends_at
  from candidates c
  where c.starts_at + make_interval(mins => c.duration_minutes) <= ((c.service_day + c.closes_at) at time zone c.timezone)
    and c.starts_at >= now() + make_interval(mins => c.minimum_notice_minutes)
    and c.starts_at <= now() + make_interval(days => c.booking_horizon_days)
    and c.duration_minutes between 10 and 480
)
select s.starts_at, s.ends_at, (s.starts_at at time zone s.timezone)::date, (s.starts_at at time zone s.timezone)::time
from slots s
where not exists(
  select 1 from public.garage_calendar_exceptions e
  where e.garage_id = s.garage_id
    and e.kind <> 'OPEN'
    and e.starts_at < s.ends_at
    and e.ends_at > s.starts_at
)
and (
  select count(*)
  from public.appointments a
  where a.garage_id = s.garage_id
    and a.is_historical = false
    and a.status in ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED')
    and a.starts_at < s.ends_at + make_interval(mins => s.buffer_after_minutes)
    and a.ends_at > s.starts_at - make_interval(mins => s.buffer_before_minutes)
) < s.simultaneous_capacity
order by s.starts_at
$$;

revoke all on function public.get_public_appointment_availability(text, text, date, date, text) from public;
grant execute on function public.get_public_appointment_availability(text, text, date, date, text) to anon, authenticated;

create or replace function public.reschedule_appointment(p_appointment_id uuid, p_starts_at timestamptz)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a appointments%rowtype;
  t appointment_type_settings%rowtype;
  new_end timestamptz;
  old_start timestamptz;
begin
  select * into a
  from appointments
  where id = p_appointment_id
    and exists(
      select 1 from garage_members gm
      where gm.garage_id = appointments.garage_id and gm.user_id = auth.uid()
    );
  if a.id is null then
    return false;
  end if;

  select * into t from appointment_type_settings
  where garage_id = a.garage_id and appointment_type = a.type;

  new_end := p_starts_at + make_interval(mins => extract(epoch from (a.ends_at - a.starts_at))::int / 60);
  perform pg_advisory_xact_lock(hashtextextended(a.garage_id::text || a.type || p_starts_at::text, 0));

  if exists(
    select 1 from appointments x
    where x.garage_id = a.garage_id
      and x.id <> a.id
      and x.is_historical = false
      and x.status in ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED')
      and x.starts_at < new_end + make_interval(mins => coalesce(t.buffer_after_minutes, 0))
      and x.ends_at > p_starts_at - make_interval(mins => coalesce(t.buffer_before_minutes, 0))
  ) then
    return false;
  end if;

  old_start := a.starts_at;
  update appointments
  set starts_at = p_starts_at, ends_at = new_end, updated_at = now()
  where id = a.id;

  insert into appointment_events(garage_id, appointment_id, actor_id, event_type, old_status, new_status, metadata)
  values (
    a.garage_id, a.id, auth.uid(), 'RESCHEDULED', a.status, a.status,
    jsonb_build_object('oldStartsAt', old_start, 'newStartsAt', p_starts_at)
  );

  insert into notifications(garage_id, type, title, message, href, entity_type, entity_id)
  values (a.garage_id, 'NEW_LEAD', 'Rendez-vous déplacé', a.customer_name, '/appointments/' || a.id, 'appointment', a.id);

  return true;
end $$;

revoke all on function public.reschedule_appointment(uuid, timestamptz) from public;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;
