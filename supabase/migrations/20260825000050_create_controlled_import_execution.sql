create table public.legacy_import_checkpoints (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  execution_id text not null check (char_length(trim(execution_id)) between 1 and 120),
  checkpoint text not null check (checkpoint in (
    'PREFLIGHT_OK','RESET_DB_DONE','RESET_STORAGE_DONE','DATA_IMPORT_DONE',
    'MEDIA_UPLOAD_DONE','MEDIA_RELATIONS_DONE','IMPORT_VERIFIED'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (garage_id, execution_id)
);

alter table public.legacy_import_checkpoints enable row level security;

alter table public.vehicles
  add constraint vehicles_id_garage_id_key unique (id, garage_id);

alter table public.customer_vehicles
  drop constraint customer_vehicles_stock_vehicle_id_fkey;

alter table public.customer_vehicles
  add constraint customer_vehicles_stock_vehicle_tenant_fk
  foreign key (stock_vehicle_id, garage_id)
  references public.vehicles(id, garage_id)
  on delete set null (stock_vehicle_id);

create function public.execute_controlled_tenant_reset(p_garage_id uuid,p_tables jsonb,p_expected_total integer)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare item jsonb; table_name text; table_scope text; expected_count integer; actual_count integer; affected integer; total integer:=0;
declare allowed constant jsonb := '{
  "registration_documents":"DIRECT","registration_case_events":"DIRECT","registration_case_requirements":"DIRECT","registration_cases":"DIRECT",
  "payment_events":"DIRECT","appointment_events":"DIRECT","appointments":"DIRECT",
  "copilot_action_logs":"DIRECT","copilot_messages":"DIRECT","copilot_conversations":"DIRECT",
  "lead_notes":"DIRECT","commercial_tasks":"DIRECT","lead_events":"DIRECT","notifications":"DIRECT","leads":"DIRECT",
  "intelligence_recommendations":"DIRECT","acquisition_documents":"DIRECT","acquisition_opportunities":"DIRECT","acquisition_sellers":"DIRECT",
  "interior_tour_hotspots":"DIRECT","interior_tour_scenes":"DIRECT","interior_tours":"DIRECT",
  "vehicle_360_frames":"DIRECT","vehicle_360_sequences":"DIRECT","vehicle_listing_versions":"DIRECT","vehicle_documents":"DIRECT",
  "vehicle_images":"INDIRECT","vehicle_market_analyses":"INDIRECT","marketplace_links":"INDIRECT","vehicle_costs":"INDIRECT","vehicle_events":"INDIRECT",
  "vehicles":"DIRECT"
}'::jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if not exists(select 1 from public.garages where id=p_garage_id) then raise exception 'target garage missing'; end if;
  if jsonb_typeof(p_tables)<>'array' or jsonb_array_length(p_tables)>100 or p_expected_total is null or p_expected_total<0 then raise exception 'invalid reset table plan'; end if;
  for item in select value from jsonb_array_elements(p_tables) loop
    if jsonb_typeof(item)<>'object' or jsonb_typeof(item->'expected')<>'number' then raise exception 'invalid reset table item'; end if;
    table_name:=item->>'table';table_scope:=item->>'scope';expected_count:=(item->>'expected')::integer;
    if table_name is null or not (allowed ? table_name) or allowed->>table_name is distinct from table_scope then raise exception 'reset resource forbidden: %',coalesce(table_name,'NULL'); end if;
    if expected_count<0 then raise exception 'invalid reset expected count'; end if;
    if table_scope='DIRECT' then
      execute format('select count(*) from public.%I where garage_id=$1',table_name) into actual_count using p_garage_id;
    elsif table_scope='INDIRECT' then
      execute format('select count(*) from public.%I where vehicle_id in(select id from public.vehicles where garage_id=$1)',table_name) into actual_count using p_garage_id;
    else raise exception 'invalid reset scope'; end if;
    if actual_count<>expected_count then raise exception 'reset count drift for %: %/%',table_name,actual_count,expected_count; end if;
  end loop;
  for item in select value from jsonb_array_elements(p_tables) loop
    table_name:=item->>'table';table_scope:=item->>'scope';
    if table_scope='DIRECT' then execute format('delete from public.%I where garage_id=$1',table_name) using p_garage_id;
    else execute format('delete from public.%I where vehicle_id in(select id from public.vehicles where garage_id=$1)',table_name) using p_garage_id; end if;
    get diagnostics affected=row_count;total:=total+affected;
  end loop;
  if total<>p_expected_total then raise exception 'reset total mismatch: %/%',total,p_expected_total; end if;
  return total;
end $$;

create function public.advance_legacy_import_checkpoint(
  p_garage_id uuid, p_execution_id text, p_expected text, p_next text
) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare current_value text;
declare checkpoints constant text[] := array[
  'PREFLIGHT_OK','RESET_DB_DONE','RESET_STORAGE_DONE','DATA_IMPORT_DONE',
  'MEDIA_UPLOAD_DONE','MEDIA_RELATIONS_DONE','IMPORT_VERIFIED'
];
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if not exists(select 1 from public.garages where id=p_garage_id) then raise exception 'target garage missing'; end if;
  if p_execution_id is null or char_length(trim(p_execution_id)) not between 1 and 120 then raise exception 'invalid execution id'; end if;
  if array_position(checkpoints,p_next) is null then raise exception 'invalid checkpoint'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_garage_id::text||':'||p_execution_id,0));
  select checkpoint into current_value from public.legacy_import_checkpoints
    where garage_id=p_garage_id and execution_id=p_execution_id for update;
  if current_value is null then
    if p_expected is not null or p_next<>'PREFLIGHT_OK' then raise exception 'checkpoint initial state invalid'; end if;
    insert into public.legacy_import_checkpoints(garage_id,execution_id,checkpoint) values(p_garage_id,p_execution_id,p_next);
    return;
  end if;
  if current_value=p_next and ((current_value='PREFLIGHT_OK' and p_expected is null) or array_position(checkpoints,p_expected)=array_position(checkpoints,current_value)-1) then return; end if;
  if current_value is distinct from p_expected then raise exception 'checkpoint compare-and-set failed'; end if;
  if array_position(checkpoints,p_next) <> array_position(checkpoints,current_value)+1 then
    raise exception 'checkpoint order invalid';
  end if;
  update public.legacy_import_checkpoints set checkpoint=p_next,updated_at=now()
    where garage_id=p_garage_id and execution_id=p_execution_id;
end $$;

create function public.execute_controlled_legacy_import_batch(p_garage_id uuid,p_operations jsonb)
returns table(ordinal integer,outcome text,target_id uuid)
language plpgsql security definer set search_path=public,pg_temp as $$
declare op jsonb; existing public.legacy_import_records%rowtype; created_id uuid; n integer:=0;
declare src text; kind text; ext text; fp text; target text; payload jsonb;
begin
  if auth.role() <> 'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if not exists(select 1 from public.garages where id=p_garage_id) then raise exception 'target garage missing'; end if;
  if jsonb_typeof(p_operations)<>'array' or jsonb_array_length(p_operations)>1000 then raise exception 'invalid operation batch'; end if;
  for op in select value from jsonb_array_elements(p_operations) loop
    n:=n+1; src:=op->>'source'; kind:=op->>'entity_type'; ext:=op->>'external_id'; fp:=op->>'fingerprint'; target:=op->>'target_table'; payload:=op->'payload';
    if src not in ('WORDPRESS','WOOCOMMERCE','YITH','ELEMENTOR') or kind not in ('CUSTOMER','CUSTOMER_VEHICLE','VEHICLE','APPOINTMENT','HISTORICAL_PAYMENT','LEAD') or fp !~ '^[a-f0-9]{64}$' then raise exception 'invalid import operation'; end if;
    select * into existing from public.legacy_import_records where garage_id=p_garage_id and source=src and entity_type=kind and external_id=ext for update;
    if existing.id is not null then
      ordinal:=n; target_id:=existing.target_id; outcome:=case when existing.fingerprint=fp then 'SKIPPED' else 'CONFLICT' end; return next; continue;
    end if;
    created_id:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
    if kind='CUSTOMER' and target='customers' then
      insert into public.customers(id,garage_id,first_name,last_name,email,normalized_email,phone,normalized_phone,address_line,postal_code,city,source,external_id,import_fingerprint,notes,created_at,updated_at)
      values(created_id,p_garage_id,payload->>'first_name',payload->>'last_name',payload->>'email',payload->>'normalized_email',payload->>'phone',payload->>'normalized_phone',payload->>'address_line',payload->>'postal_code',payload->>'city',coalesce(payload->>'source',src),ext,fp,payload->>'notes',coalesce((payload->>'created_at')::timestamptz,now()),coalesce((payload->>'updated_at')::timestamptz,now()));
    elsif kind='CUSTOMER_VEHICLE' and target='customer_vehicles' then
      if not exists(select 1 from public.customers where id=(payload->>'customer_id')::uuid and garage_id=p_garage_id) then raise exception 'cross tenant customer vehicle'; end if;
      if nullif(payload->>'stock_vehicle_id','') is not null and not exists(select 1 from public.vehicles where id=(payload->>'stock_vehicle_id')::uuid and garage_id=p_garage_id) then raise exception 'cross tenant stock vehicle'; end if;
      insert into public.customer_vehicles(id,garage_id,customer_id,stock_vehicle_id,registration_number,vin,brand,model,version,first_registration_date,source,external_id,import_fingerprint)
      values(created_id,p_garage_id,(payload->>'customer_id')::uuid,nullif(payload->>'stock_vehicle_id','')::uuid,payload->>'registration_number',payload->>'vin',payload->>'brand',payload->>'model',payload->>'version',nullif(payload->>'first_registration_date','')::date,coalesce(payload->>'source',src),ext,fp);
    elsif kind='VEHICLE' and target='vehicles' then
      insert into public.vehicles(id,garage_id,brand,model,version,year,fuel,gearbox,mileage,purchase_price,selling_price,status,vin,registration_number,color,doors,seats,power_din,fiscal_power,trim,first_registration_date,description,notes,created_at,updated_at,legacy_source,legacy_external_id,legacy_import_fingerprint)
      values(created_id,p_garage_id,payload->>'brand',payload->>'model',payload->>'version',nullif(payload->>'year','')::integer,payload->>'fuel',payload->>'gearbox',nullif(payload->>'mileage','')::integer,coalesce(nullif(payload->>'purchase_price','')::numeric,0),nullif(payload->>'selling_price','')::numeric,coalesce(payload->>'status','PURCHASED')::public.vehicle_status,payload->>'vin',payload->>'registration_number',payload->>'color',nullif(payload->>'doors','')::smallint,nullif(payload->>'seats','')::smallint,nullif(payload->>'power_din','')::integer,nullif(payload->>'fiscal_power','')::integer,payload->>'trim',nullif(payload->>'first_registration_date','')::date,payload->>'description',payload->>'notes',coalesce((payload->>'created_at')::timestamptz,now()),coalesce((payload->>'updated_at')::timestamptz,now()),src,ext,fp);
    elsif kind='APPOINTMENT' and target='appointments' then
      if nullif(payload->>'customer_id','') is not null and not exists(select 1 from public.customers where id=(payload->>'customer_id')::uuid and garage_id=p_garage_id) then raise exception 'cross tenant appointment customer'; end if;
      insert into public.appointments(id,garage_id,type,status,starts_at,ends_at,timezone,customer_name,customer_phone,customer_email,payment_required,details,created_at,updated_at,customer_id,is_historical,legacy_source,legacy_external_id,legacy_import_fingerprint)
      values(created_id,p_garage_id,coalesce(payload->>'type','OTHER'),coalesce(payload->>'status','COMPLETED'),(payload->>'starts_at')::timestamptz,(payload->>'ends_at')::timestamptz,coalesce(payload->>'timezone','Europe/Paris'),payload->>'customer_name',payload->>'customer_phone',payload->>'customer_email',false,coalesce(payload->'details','{}'::jsonb),coalesce((payload->>'created_at')::timestamptz,now()),coalesce((payload->>'updated_at')::timestamptz,now()),nullif(payload->>'customer_id','')::uuid,true,src,ext,fp);
    elsif kind='HISTORICAL_PAYMENT' and target='historical_payments' then
      if nullif(payload->>'customer_id','') is not null and not exists(select 1 from public.customers where id=(payload->>'customer_id')::uuid and garage_id=p_garage_id) then raise exception 'cross tenant historical payment customer'; end if;
      insert into public.historical_payments(id,garage_id,customer_id,source,external_order_id,external_payment_id,provider,amount_cents,currency,source_status,occurred_at,historical,import_fingerprint)
      values(created_id,p_garage_id,nullif(payload->>'customer_id','')::uuid,'WOOCOMMERCE',ext,payload->>'external_payment_id',payload->>'provider',(payload->>'amount_cents')::integer,coalesce(payload->>'currency','EUR'),payload->>'source_status',nullif(payload->>'occurred_at','')::timestamptz,true,fp);
    elsif kind='LEAD' and target='leads' then
      insert into public.leads(id,garage_id,source,type,status,customer_name,customer_phone,customer_email,message,public_page_url,public_garage_slug,consent_contact,consent_marketing,metadata,created_at,updated_at,customer_id,legacy_source,legacy_external_id,legacy_import_fingerprint)
      values(created_id,p_garage_id,coalesce(payload->>'source','MANUAL')::public.lead_source,coalesce(payload->>'type','GENERAL_INQUIRY')::public.lead_type,coalesce(payload->>'status','NEW')::public.lead_status,payload->>'customer_name',payload->>'customer_phone',payload->>'customer_email',payload->>'message',payload->>'public_page_url',coalesce(payload->>'public_garage_slug','sap'),true,false,coalesce(payload->'metadata','{}'::jsonb),coalesce((payload->>'created_at')::timestamptz,now()),coalesce((payload->>'updated_at')::timestamptz,now()),nullif(payload->>'customer_id','')::uuid,src,ext,fp);
    else raise exception 'unsupported entity/target pair: %/%',kind,target;
    end if;
    insert into public.legacy_import_records(garage_id,source,entity_type,external_id,fingerprint,target_table,target_id,outcome)
    values(p_garage_id,src,kind,ext,fp,target,created_id,'CREATED');
    ordinal:=n;outcome:='CREATED';target_id:=created_id;return next;
  end loop;
end $$;

create function public.resolve_legacy_vehicle_id(p_garage_id uuid,p_external_id text) returns uuid
language sql stable security definer set search_path=public as $$
  select id from public.vehicles where garage_id=p_garage_id and legacy_external_id=p_external_id and legacy_source='WORDPRESS'
$$;

create function public.persist_legacy_media_relation(
  p_garage_id uuid,p_vehicle_id uuid,p_legacy_vehicle_external_id text,p_external_attachment_id text,p_legacy_url text,p_relative_path text,
  p_position integer,p_role text,p_storage_path text,p_create_vehicle_image boolean,p_sha256 text
) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare ledger public.legacy_import_records%rowtype; reference_id uuid; image_id uuid;
begin
  if auth.role()<>'service_role' then raise exception 'service role required' using errcode='42501'; end if;
  if not exists(select 1 from public.vehicles where id=p_vehicle_id and garage_id=p_garage_id) then raise exception 'cross tenant media relation'; end if;
  if p_storage_path is null or p_storage_path<>btrim(p_storage_path) or p_storage_path~'[[:cntrl:]]' or p_storage_path like '/%' or position(chr(92) in p_storage_path)>0 or position('%' in p_storage_path)>0 or p_storage_path like '%//%' or p_storage_path~'(^|/)\.{1,2}(/|$)' or not starts_with(p_storage_path,p_garage_id::text||'/'||p_vehicle_id::text||'/') or char_length(p_storage_path)<=char_length(p_garage_id::text||'/'||p_vehicle_id::text||'/') then raise exception 'storage path tenant boundary violation'; end if;
  select * into ledger from public.legacy_import_records where garage_id=p_garage_id and source='WORDPRESS' and entity_type='MEDIA_REFERENCE' and external_id=p_legacy_vehicle_external_id||':'||p_external_attachment_id for update;
  if ledger.id is not null then return case when ledger.fingerprint=p_sha256 then 'SKIPPED' else 'CONFLICT' end; end if;
  insert into public.legacy_media_references(garage_id,vehicle_id,source,external_attachment_id,legacy_url,relative_path,position,role,status,import_fingerprint)
  values(p_garage_id,p_vehicle_id,'WORDPRESS',p_external_attachment_id,p_legacy_url,p_relative_path,p_position,p_role,'PENDING',p_sha256) returning id into reference_id;
  if p_create_vehicle_image then
    insert into public.vehicle_images(vehicle_id,storage_path,type,is_primary)
    values(p_vehicle_id,p_storage_path,'UNCLASSIFIED',p_role='COVER') returning id into image_id;
  end if;
  insert into public.legacy_import_records(garage_id,source,entity_type,external_id,fingerprint,target_table,target_id,outcome)
  values(p_garage_id,'WORDPRESS','MEDIA_REFERENCE',p_legacy_vehicle_external_id||':'||p_external_attachment_id,p_sha256,'legacy_media_references',reference_id,'CREATED');
  return 'CREATED';
end $$;

revoke all on function public.advance_legacy_import_checkpoint(uuid,text,text,text) from public;
revoke all on function public.execute_controlled_tenant_reset(uuid,jsonb,integer) from public;
revoke all on function public.execute_controlled_legacy_import_batch(uuid,jsonb) from public;
revoke all on function public.resolve_legacy_vehicle_id(uuid,text) from public;
revoke all on function public.persist_legacy_media_relation(uuid,uuid,text,text,text,text,integer,text,text,boolean,text) from public;
grant execute on function public.advance_legacy_import_checkpoint(uuid,text,text,text) to service_role;
grant execute on function public.execute_controlled_tenant_reset(uuid,jsonb,integer) to service_role;
grant execute on function public.execute_controlled_legacy_import_batch(uuid,jsonb) to service_role;
grant execute on function public.resolve_legacy_vehicle_id(uuid,text) to service_role;
grant execute on function public.persist_legacy_media_relation(uuid,uuid,text,text,text,text,integer,text,text,boolean,text) to service_role;
