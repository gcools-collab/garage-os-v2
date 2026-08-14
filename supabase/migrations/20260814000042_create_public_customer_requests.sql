alter type public.lead_type add value if not exists 'VEHICLE_INQUIRY';
alter type public.lead_type add value if not exists 'TEST_DRIVE';
alter type public.lead_type add value if not exists 'TRADE_IN';
alter type public.lead_type add value if not exists 'CONSIGNMENT';
alter type public.lead_type add value if not exists 'REGISTRATION';
alter type public.lead_type add value if not exists 'ENGINE_CLEANING';
alter type public.lead_type add value if not exists 'GENERAL_CONTACT';
alter type public.lead_type add value if not exists 'RENTAL';
alter type public.lead_type add value if not exists 'WORKSHOP';
alter type public.lead_type add value if not exists 'BODYWORK';

alter type public.lead_source add value if not exists 'PUBLIC_WEBSITE';
alter type public.lead_source add value if not exists 'VEHICLE_DETAIL';
alter type public.lead_source add value if not exists 'CONTACT_CENTER';
alter type public.lead_source add value if not exists 'SERVICE_PAGE';
alter type public.lead_source add value if not exists 'CONSIGNMENT_PAGE';

create or replace function public.create_public_customer_request(
  p_garage_slug text,
  p_vehicle_slug text,
  p_request_type text,
  p_source text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_preferred_date date,
  p_preferred_time text,
  p_message text,
  p_payload jsonb,
  p_public_page_url text,
  p_consent_contact boolean,
  p_consent_marketing boolean,
  p_submission_fingerprint text
)
returns table (lead_id uuid, outcome text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_garage public.garages%rowtype;
  target_vehicle public.vehicles%rowtype;
  required_service text;
  created_lead_id uuid;
  task_title text;
  task_type public.commercial_task_type;
  task_priority public.commercial_priority;
  due_at timestamptz := now() + interval '2 hours';
  notification_title text;
begin
  if p_request_type not in ('VEHICLE_INQUIRY','TEST_DRIVE','TRADE_IN','CONSIGNMENT','REGISTRATION','ENGINE_CLEANING','GENERAL_CONTACT','RENTAL','WORKSHOP','BODYWORK')
    or p_source not in ('PUBLIC_WEBSITE','VEHICLE_DETAIL','CONTACT_CENTER','SERVICE_PAGE','CONSIGNMENT_PAGE')
    or not p_consent_contact
    or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_payload, '{}'::jsonb)::text) > 8192 then
    return query select null::uuid, 'invalid_request'::text; return;
  end if;

  select g.* into target_garage from public.garages g
  where g.live_slug = lower(trim(p_garage_slug)) and g.live_enabled;
  if target_garage.id is null then return query select null::uuid, 'unavailable_garage'::text; return; end if;

  required_service := case
    when p_request_type in ('VEHICLE_INQUIRY','TEST_DRIVE','TRADE_IN') then 'VEHICLE_SALES'
    when p_request_type = 'CONSIGNMENT' then 'CONSIGNMENT'
    when p_request_type = 'REGISTRATION' then 'REGISTRATION'
    when p_request_type = 'ENGINE_CLEANING' then 'ENGINE_CLEANING'
    when p_request_type = 'RENTAL' then 'RENTAL'
    when p_request_type = 'WORKSHOP' then 'WORKSHOP'
    when p_request_type = 'BODYWORK' then 'BODYWORK'
    else null end;
  if required_service is not null and not exists (
    select 1 from public.garage_services gs where gs.garage_id = target_garage.id
      and gs.service_key = required_service and gs.is_enabled
  ) then return query select null::uuid, 'service_unavailable'::text; return; end if;

  if nullif(trim(coalesce(p_vehicle_slug, '')), '') is not null then
    select v.* into target_vehicle from public.vehicles v
    where v.garage_id = target_garage.id and v.live_slug = lower(trim(p_vehicle_slug))
      and v.publication_status = 'PUBLISHED'
      and v.status not in ('SOLD','DELIVERED','ARCHIVED','CANCELLED');
    if target_vehicle.id is null then return query select null::uuid, 'unavailable_vehicle'::text; return; end if;
  elsif p_request_type = 'TEST_DRIVE' then
    return query select null::uuid, 'unavailable_vehicle'::text; return;
  end if;

  if (select count(*) from public.leads l where l.garage_id = target_garage.id
    and l.submission_fingerprint = p_submission_fingerprint and l.created_at >= now() - interval '1 hour') >= 5
    then return query select null::uuid, 'rate_limited'::text; return; end if;
  if exists (select 1 from public.leads l where l.garage_id = target_garage.id
    and l.submission_fingerprint = p_submission_fingerprint and l.type::text = p_request_type
    and l.created_at >= now() - interval '10 minutes')
    then return query select null::uuid, 'duplicate_submission'::text; return; end if;

  insert into public.leads (
    garage_id, vehicle_id, source, type, status, customer_name, customer_phone,
    customer_email, preferred_date, preferred_time, message, public_page_url,
    public_vehicle_slug, public_garage_slug, consent_contact, consent_marketing,
    submission_fingerprint, vehicle_title_snapshot, vehicle_price_snapshot_cents,
    vehicle_brand_snapshot, vehicle_model_snapshot, vehicle_year_snapshot, metadata
  ) values (
    target_garage.id, target_vehicle.id, p_source::public.lead_source,
    p_request_type::public.lead_type, 'NEW', trim(p_customer_name),
    nullif(trim(p_customer_phone), ''), nullif(lower(trim(p_customer_email)), ''),
    p_preferred_date, nullif(trim(p_preferred_time), ''), nullif(trim(p_message), ''),
    nullif(trim(p_public_page_url), ''), target_vehicle.live_slug, target_garage.live_slug,
    p_consent_contact, p_consent_marketing, p_submission_fingerprint,
    case when target_vehicle.id is null then null else concat_ws(' ', target_vehicle.brand, target_vehicle.model, coalesce(target_vehicle.trim, target_vehicle.version)) end,
    case when target_vehicle.selling_price is null then null else round(target_vehicle.selling_price * 100)::bigint end,
    target_vehicle.brand, target_vehicle.model, target_vehicle.year, p_payload
  ) returning id into created_lead_id;

  task_title := case p_request_type
    when 'TEST_DRIVE' then 'Contacter le client pour convenir d''un essai'
    when 'TRADE_IN' then 'Qualifier la demande de reprise'
    when 'CONSIGNMENT' then 'Qualifier le véhicule en dépôt-vente'
    when 'REGISTRATION' then 'Contacter le client pour préparer le dossier carte grise'
    when 'ENGINE_CLEANING' then 'Contacter le client pour organiser le décalaminage'
    when 'VEHICLE_INQUIRY' then 'Répondre à la demande d''achat'
    else 'Traiter la demande client' end;
  task_type := case when p_request_type = 'TEST_DRIVE' then 'PREPARE_TEST_DRIVE'::public.commercial_task_type
    when p_request_type = 'REGISTRATION' then 'REQUEST_DOCUMENTS'::public.commercial_task_type
    else 'CALL_PROSPECT'::public.commercial_task_type end;
  task_priority := case when p_request_type in ('TEST_DRIVE','TRADE_IN') then 'HIGH'::public.commercial_priority else 'NORMAL'::public.commercial_priority end;
  notification_title := case p_request_type
    when 'TEST_DRIVE' then 'Nouvelle demande d''essai'
    when 'TRADE_IN' then 'Nouvelle demande de reprise'
    when 'CONSIGNMENT' then 'Nouvelle demande de dépôt-vente'
    when 'REGISTRATION' then 'Nouvelle demande de carte grise'
    when 'ENGINE_CLEANING' then 'Nouvelle demande de décalaminage'
    when 'VEHICLE_INQUIRY' then 'Nouvelle demande d''achat'
    else 'Nouvelle demande client' end;

  insert into public.lead_events (lead_id, garage_id, event_type, to_status, metadata)
  values (created_lead_id, target_garage.id, 'CREATED', 'NEW', jsonb_build_object('requestType', p_request_type, 'source', p_source));
  insert into public.commercial_tasks (garage_id, lead_id, vehicle_id, type, priority, title, due_at)
  values (target_garage.id, created_lead_id, target_vehicle.id, task_type, task_priority, task_title, due_at);
  update public.leads set next_action_at = due_at where id = created_lead_id;
  insert into public.notifications (garage_id, type, title, message, href, entity_type, entity_id)
  values (target_garage.id, 'NEW_LEAD', notification_title || case when target_vehicle.id is null then '' else ' — ' || concat_ws(' ', target_vehicle.brand, target_vehicle.model) end,
    coalesce('Demande de ' || nullif(trim(p_customer_name), ''), 'Nouvelle demande à traiter'),
    '/leads/' || created_lead_id, 'lead', created_lead_id);
  insert into public.lead_events (lead_id, garage_id, event_type, metadata)
  values (created_lead_id, target_garage.id, 'TASK_CREATED', jsonb_build_object('title', task_title, 'dueAt', due_at));
  return query select created_lead_id, 'success'::text;
end;
$$;

revoke all on function public.create_public_customer_request(text,text,text,text,text,text,text,date,text,text,jsonb,text,boolean,boolean,text) from public;
grant execute on function public.create_public_customer_request(text,text,text,text,text,text,text,date,text,text,jsonb,text,boolean,boolean,text) to anon, authenticated;
