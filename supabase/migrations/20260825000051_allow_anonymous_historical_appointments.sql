alter table public.appointments
  alter column customer_name drop not null;

alter table public.appointments
  drop constraint if exists appointments_customer_name_check,
  drop constraint if exists appointment_contact_present;

alter table public.appointments
  add constraint appointment_customer_name_present
    check (
      is_historical
      or (
        customer_name is not null
        and length(trim(customer_name)) between 2 and 160
      )
    ),
  add constraint appointment_contact_present
    check (
      is_historical
      or customer_phone is not null
      or customer_email is not null
    );

comment on constraint appointment_customer_name_present on public.appointments is
  'Operational appointments require a meaningful customer name; explicitly historical records may preserve an unavailable identity as NULL.';

comment on constraint appointment_contact_present on public.appointments is
  'Operational appointments require an email or phone; explicitly historical records may preserve unavailable contact data as NULL.';

create or replace function public.execute_controlled_legacy_import_batch(p_garage_id uuid,p_operations jsonb)
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
      if (payload->>'is_historical')::boolean is distinct from true then raise exception 'controlled import appointment must be historical'; end if;
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
