-- GO-0088: création RDV et dossier carte grise par le garage (sans dépendre du flux public)

create or replace function public.create_staff_appointment(
  p_garage_id uuid,
  p_customer_id uuid,
  p_type text,
  p_starts_at timestamptz,
  p_details jsonb default '{}'::jsonb,
  p_vehicle_id uuid default null,
  p_lead_id uuid default null
)
returns table(appointment_id uuid, outcome text, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cust customers%rowtype;
  t appointment_type_settings%rowtype;
  tz text;
  slot_end timestamptz;
  created uuid;
  initial_status text;
  capacity_count int;
begin
  if not exists (
    select 1 from garage_members gm
    where gm.garage_id = p_garage_id and gm.user_id = auth.uid()
  ) then
    return query select null::uuid, 'forbidden', null::text;
    return;
  end if;

  select * into cust from customers
  where id = p_customer_id and garage_id = p_garage_id;
  if cust.id is null then
    return query select null::uuid, 'invalid_customer', null::text;
    return;
  end if;

  select s.timezone into tz from garage_scheduling_settings s where s.garage_id = p_garage_id;
  if tz is null then
    return query select null::uuid, 'schedule_unavailable', null::text;
    return;
  end if;

  select * into t from appointment_type_settings
  where garage_id = p_garage_id and appointment_type = p_type;
  if t.garage_id is null then
    return query select null::uuid, 'booking_disabled', null::text;
    return;
  end if;

  if p_vehicle_id is not null and not exists (
    select 1 from vehicles v where v.id = p_vehicle_id and v.garage_id = p_garage_id
  ) then
    return query select null::uuid, 'invalid_vehicle', null::text;
    return;
  end if;

  if p_lead_id is not null and not exists (
    select 1 from leads l where l.id = p_lead_id and l.garage_id = p_garage_id
  ) then
    return query select null::uuid, 'invalid_lead', null::text;
    return;
  end if;

  slot_end := p_starts_at + make_interval(mins => t.duration_minutes);
  perform pg_advisory_xact_lock(hashtextextended(p_garage_id::text || p_type || p_starts_at::text, 0));

  select count(*) into capacity_count from appointments a
  where a.garage_id = p_garage_id
    and a.is_historical = false
    and a.status in ('PENDING', 'AWAITING_PAYMENT', 'CONFIRMED')
    and a.starts_at < slot_end + make_interval(mins => t.buffer_after_minutes)
    and a.ends_at > p_starts_at - make_interval(mins => t.buffer_before_minutes);
  if capacity_count >= t.simultaneous_capacity then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  if not exists (
    select 1 from garage_business_hours h
    where h.garage_id = p_garage_id
      and h.day_of_week = extract(dow from (p_starts_at at time zone tz))
      and h.opens_at <= (p_starts_at at time zone tz)::time
      and h.closes_at >= (slot_end at time zone tz)::time
  ) or exists (
    select 1 from garage_calendar_exceptions e
    where e.garage_id = p_garage_id
      and e.kind <> 'OPEN'
      and e.starts_at < slot_end
      and e.ends_at > p_starts_at
  ) then
    return query select null::uuid, 'slot_unavailable', null::text;
    return;
  end if;

  initial_status := case
    when t.payment_required then 'AWAITING_PAYMENT'
    else 'CONFIRMED'
  end;

  insert into appointments (
    garage_id, lead_id, vehicle_id, customer_id, type, status,
    starts_at, ends_at, timezone,
    customer_name, customer_phone, customer_email,
    payment_required, details, is_historical
  ) values (
    p_garage_id, p_lead_id, p_vehicle_id, cust.id, p_type, initial_status,
    p_starts_at, slot_end, tz,
    trim(coalesce(cust.first_name, '') || ' ' || coalesce(cust.last_name, '')),
    cust.phone, cust.email,
    t.payment_required, coalesce(p_details, '{}'::jsonb), false
  ) returning id into created;

  insert into appointment_events (garage_id, appointment_id, actor_id, event_type, new_status, metadata)
  values (p_garage_id, created, auth.uid(), 'CREATED', initial_status, jsonb_build_object('source', 'staff'));

  if initial_status = 'AWAITING_PAYMENT' then
    insert into appointment_events (garage_id, appointment_id, actor_id, event_type, new_status)
    values (p_garage_id, created, auth.uid(), 'PAYMENT_REQUIRED', initial_status);
  elsif initial_status = 'CONFIRMED' then
    insert into appointment_events (garage_id, appointment_id, actor_id, event_type, new_status)
    values (p_garage_id, created, auth.uid(), 'CONFIRMED', initial_status);
  end if;

  insert into notifications (garage_id, type, title, message, href, entity_type, entity_id)
  values (
    p_garage_id, 'SYSTEM', 'Rendez-vous créé',
    trim(coalesce(cust.first_name, '') || ' ' || coalesce(cust.last_name, '')),
    '/appointments/' || created, 'appointment', created
  );

  return query select created, 'success', initial_status;
end;
$$;

revoke all on function public.create_staff_appointment(uuid, uuid, text, timestamptz, jsonb, uuid, uuid) from public;
grant execute on function public.create_staff_appointment(uuid, uuid, text, timestamptz, jsonb, uuid, uuid) to authenticated;

create or replace function public.create_staff_registration_case(
  p_garage_id uuid,
  p_customer_id uuid,
  p_procedure_type text,
  p_registration text default null,
  p_brand text default null,
  p_model text default null,
  p_appointment_id uuid default null
)
returns table(case_id uuid, public_reference text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  cust customers%rowtype;
  proc registration_procedures%rowtype;
  appt appointments%rowtype;
  created uuid;
  token text;
  customer_name text;
begin
  if not exists (
    select 1 from garage_members gm
    where gm.garage_id = p_garage_id and gm.user_id = auth.uid()
  ) then
    return;
  end if;

  select * into cust from customers
  where id = p_customer_id and garage_id = p_garage_id;
  if cust.id is null then
    return;
  end if;

  select * into proc from registration_procedures
  where garage_id = p_garage_id
    and procedure_type = p_procedure_type
    and is_active;
  if proc.id is null then
    return;
  end if;

  if p_appointment_id is not null then
    select * into appt from appointments
    where id = p_appointment_id and garage_id = p_garage_id;
    if appt.id is null then
      return;
    end if;
  end if;

  customer_name := trim(coalesce(cust.first_name, '') || ' ' || coalesce(cust.last_name, ''));
  if customer_name = '' then
    customer_name := 'Client';
  end if;

  token := encode(gen_random_bytes(32), 'hex');

  insert into registration_cases (
    garage_id, lead_id, appointment_id, customer_id, procedure_id,
    procedure_type, procedure_title, public_token_hash, status,
    customer_name, customer_email, customer_phone,
    registration_number, brand, model, created_by
  ) values (
    p_garage_id, null, p_appointment_id, cust.id, proc.id,
    proc.procedure_type, proc.title, encode(digest(token, 'sha256'), 'hex'), 'NEW',
    customer_name, cust.email, cust.phone,
    nullif(trim(p_registration), ''), nullif(trim(p_brand), ''), nullif(trim(p_model), ''),
    auth.uid()
  ) returning id into created;

  insert into registration_case_requirements (
    garage_id, case_id, source_requirement_id, requirement_key, label, description, is_required, display_order
  )
  select r.garage_id, created, r.id, r.requirement_key, r.label, r.description, r.is_required, r.display_order
  from registration_procedure_requirements r
  where r.procedure_id = proc.id;

  update registration_cases
  set status = case
    when exists (select 1 from registration_case_requirements where case_id = created and is_required)
    then 'WAITING_FOR_DOCUMENTS'
    else 'READY'
  end
  where id = created;

  insert into registration_case_events (garage_id, case_id, actor_id, event_type, new_status, metadata)
  values (
    p_garage_id, created, auth.uid(), 'CASE_CREATED',
    (select status from registration_cases where id = created),
    jsonb_build_object('source', 'staff', 'customerId', cust.id, 'appointmentId', p_appointment_id)
  );

  insert into notifications (garage_id, type, title, message, href, entity_type, entity_id)
  values (
    p_garage_id, 'SYSTEM', 'Nouveau dossier carte grise',
    (select c.public_reference from registration_cases c where c.id = created),
    '/registration/' || created, 'registration_case', created
  );

  return query select created, (select c.public_reference from registration_cases c where c.id = created);
end;
$$;

revoke all on function public.create_staff_registration_case(uuid, uuid, text, text, text, text, uuid) from public;
grant execute on function public.create_staff_registration_case(uuid, uuid, text, text, text, text, uuid) to authenticated;
