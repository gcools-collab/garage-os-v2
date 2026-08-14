alter type public.lead_event_type add value if not exists 'APPOINTMENT_BOOKED';

create table public.garage_scheduling_settings (
  garage_id uuid primary key references public.garages(id) on delete cascade,
  timezone text,
  updated_at timestamptz not null default now(),
  constraint scheduling_timezone_valid check (timezone is null or length(timezone) between 3 and 64)
);
create table public.garage_business_hours (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  day_of_week smallint not null check(day_of_week between 0 and 6), opens_at time not null, closes_at time not null,
  created_at timestamptz not null default now(), constraint business_period_valid check(opens_at < closes_at),
  unique(garage_id,day_of_week,opens_at,closes_at)
);
create table public.garage_calendar_exceptions (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  kind text not null check(kind in ('CLOSED','UNAVAILABLE','OPEN')), starts_at timestamptz not null, ends_at timestamptz not null,
  label text, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  constraint calendar_exception_period_valid check(starts_at < ends_at)
);
create table public.appointment_type_settings (
  garage_id uuid not null references public.garages(id) on delete cascade,
  appointment_type text not null check(appointment_type in ('TEST_DRIVE','ENGINE_CLEANING','REGISTRATION','CONSIGNMENT','TRADE_IN','WORKSHOP','MAINTENANCE','BODYWORK','DIAGNOSTIC','TYRES','RENTAL','OTHER')),
  online_booking_enabled boolean not null default false, duration_minutes integer not null check(duration_minutes between 10 and 480),
  minimum_notice_minutes integer not null check(minimum_notice_minutes between 0 and 43200), booking_horizon_days integer not null check(booking_horizon_days between 1 and 365),
  buffer_before_minutes integer not null default 0 check(buffer_before_minutes between 0 and 240), buffer_after_minutes integer not null default 0 check(buffer_after_minutes between 0 and 240),
  auto_confirm boolean not null default false, payment_required boolean not null default false,
  simultaneous_capacity integer not null default 1 check(simultaneous_capacity between 1 and 20), updated_at timestamptz not null default now(),
  primary key(garage_id,appointment_type)
);
create table public.appointments (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null, vehicle_id uuid references public.vehicles(id) on delete set null,
  type text not null check(type in ('TEST_DRIVE','ENGINE_CLEANING','REGISTRATION','CONSIGNMENT','TRADE_IN','WORKSHOP','MAINTENANCE','BODYWORK','DIAGNOSTIC','TYRES','RENTAL','OTHER')),
  status text not null check(status in ('PENDING','AWAITING_PAYMENT','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW')),
  starts_at timestamptz not null, ends_at timestamptz not null, timezone text not null,
  customer_name text not null check(length(trim(customer_name)) between 2 and 160), customer_phone text, customer_email text,
  payment_required boolean not null default false, details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint appointment_period_valid check(starts_at < ends_at), constraint appointment_contact_present check(customer_phone is not null or customer_email is not null),
  constraint appointment_details_bounded check(jsonb_typeof(details)='object' and octet_length(details::text)<=8192)
);
create index appointments_garage_start_idx on public.appointments(garage_id,starts_at);
create index appointments_garage_status_idx on public.appointments(garage_id,status,starts_at);
create table public.appointment_events (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade, actor_id uuid references auth.users(id),
  event_type text not null check(event_type in ('CREATED','CONFIRMED','RESCHEDULED','CANCELLED','COMPLETED','NO_SHOW','PAYMENT_REQUIRED')),
  old_status text, new_status text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint appointment_event_metadata_bounded check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=4096)
);

alter table public.garage_scheduling_settings enable row level security; alter table public.garage_business_hours enable row level security;
alter table public.garage_calendar_exceptions enable row level security; alter table public.appointment_type_settings enable row level security;
alter table public.appointments enable row level security; alter table public.appointment_events enable row level security;
create policy "Garage members read scheduling settings" on public.garage_scheduling_settings for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_scheduling_settings.garage_id and gm.user_id=auth.uid()));
create policy "Garage admins manage scheduling settings" on public.garage_scheduling_settings for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_scheduling_settings.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin'))) with check(exists(select 1 from public.garage_members gm where gm.garage_id=garage_scheduling_settings.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read business hours" on public.garage_business_hours for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_business_hours.garage_id and gm.user_id=auth.uid()));
create policy "Garage admins manage business hours" on public.garage_business_hours for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_business_hours.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin'))) with check(exists(select 1 from public.garage_members gm where gm.garage_id=garage_business_hours.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read calendar exceptions" on public.garage_calendar_exceptions for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_calendar_exceptions.garage_id and gm.user_id=auth.uid()));
create policy "Garage admins manage calendar exceptions" on public.garage_calendar_exceptions for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=garage_calendar_exceptions.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin'))) with check(exists(select 1 from public.garage_members gm where gm.garage_id=garage_calendar_exceptions.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read appointment type settings" on public.appointment_type_settings for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=appointment_type_settings.garage_id and gm.user_id=auth.uid()));
create policy "Garage admins manage appointment type settings" on public.appointment_type_settings for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=appointment_type_settings.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin'))) with check(exists(select 1 from public.garage_members gm where gm.garage_id=appointment_type_settings.garage_id and gm.user_id=auth.uid() and gm.role in ('owner','admin')));
create policy "Garage members read appointments" on public.appointments for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=appointments.garage_id and gm.user_id=auth.uid()));
create policy "Garage members manage appointments" on public.appointments for all to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=appointments.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from public.garage_members gm where gm.garage_id=appointments.garage_id and gm.user_id=auth.uid()));
create policy "Garage members read appointment events" on public.appointment_events for select to authenticated using(exists(select 1 from public.garage_members gm where gm.garage_id=appointment_events.garage_id and gm.user_id=auth.uid()));
create policy "Garage members create appointment events" on public.appointment_events for insert to authenticated with check(exists(select 1 from public.garage_members gm where gm.garage_id=appointment_events.garage_id and gm.user_id=auth.uid()));

create or replace function public.get_public_appointment_availability(p_garage_slug text,p_type text,p_from date,p_to date)
returns table(starts_at timestamptz,ends_at timestamptz,local_date date,local_time time) language sql stable security definer set search_path=public,pg_temp as $$
with context as(select g.id garage_id,s.timezone,t.duration_minutes,t.minimum_notice_minutes,t.booking_horizon_days,t.buffer_before_minutes,t.buffer_after_minutes,t.simultaneous_capacity from garages g join garage_scheduling_settings s on s.garage_id=g.id join appointment_type_settings t on t.garage_id=g.id and t.appointment_type=p_type where g.live_slug=lower(trim(p_garage_slug)) and g.live_enabled and t.online_booking_enabled and s.timezone is not null and p_to>=p_from and p_to-p_from<=31 and exists(select 1 from garage_services gs where gs.garage_id=g.id and gs.is_enabled and gs.service_key=case when p_type in('TEST_DRIVE','TRADE_IN') then 'VEHICLE_SALES' else p_type end)), days as(select d::date service_day,c.* from context c cross join generate_series(p_from,p_to,interval '1 day') d), candidates as(select ((d.service_day+h.opens_at) at time zone d.timezone)+make_interval(mins=>n) starts_at,d.*,h.closes_at from days d join garage_business_hours h on h.garage_id=d.garage_id and h.day_of_week=extract(dow from d.service_day) cross join lateral generate_series(0,1440,d.duration_minutes) n), slots as(select c.*,c.starts_at+make_interval(mins=>c.duration_minutes) ends_at from candidates c where c.starts_at+make_interval(mins=>c.duration_minutes)<=((c.service_day+c.closes_at) at time zone c.timezone) and c.starts_at>=now()+make_interval(mins=>c.minimum_notice_minutes) and c.starts_at<=now()+make_interval(days=>c.booking_horizon_days)) select s.starts_at,s.ends_at,(s.starts_at at time zone s.timezone)::date,(s.starts_at at time zone s.timezone)::time from slots s where not exists(select 1 from garage_calendar_exceptions e where e.garage_id=s.garage_id and e.kind<>'OPEN' and e.starts_at<s.ends_at and e.ends_at>s.starts_at) and (select count(*) from appointments a where a.garage_id=s.garage_id and a.status in('PENDING','AWAITING_PAYMENT','CONFIRMED') and a.starts_at<s.ends_at+make_interval(mins=>s.buffer_after_minutes) and a.ends_at>s.starts_at-make_interval(mins=>s.buffer_before_minutes))<s.simultaneous_capacity order by s.starts_at $$;
revoke all on function public.get_public_appointment_availability(text,text,date,date) from public; grant execute on function public.get_public_appointment_availability(text,text,date,date) to anon,authenticated;

create or replace function public.book_public_appointment(p_garage_slug text,p_vehicle_slug text,p_lead_id uuid,p_type text,p_starts_at timestamptz,p_customer_name text,p_phone text,p_email text,p_details jsonb,p_fingerprint text)
returns table(appointment_id uuid,outcome text,status text) language plpgsql security definer set search_path=public,pg_temp as $$ declare g garages%rowtype;v vehicles%rowtype;t appointment_type_settings%rowtype;tz text;slot_end timestamptz;created uuid;initial_status text;capacity_count int;begin
select * into g from garages where live_slug=lower(trim(p_garage_slug)) and live_enabled;if g.id is null then return query select null::uuid,'unavailable_garage',null::text;return;end if;
select s.timezone into tz from garage_scheduling_settings s where s.garage_id=g.id;if tz is null then return query select null::uuid,'schedule_unavailable',null::text;return;end if;
select * into t from appointment_type_settings where garage_id=g.id and appointment_type=p_type and online_booking_enabled;if t.garage_id is null or not exists(select 1 from garage_services gs where gs.garage_id=g.id and gs.is_enabled and gs.service_key=case when p_type in('TEST_DRIVE','TRADE_IN') then 'VEHICLE_SALES' else p_type end) then return query select null::uuid,'booking_disabled',null::text;return;end if;
if p_type='TEST_DRIVE' then select * into v from vehicles where garage_id=g.id and live_slug=lower(trim(p_vehicle_slug)) and publication_status='PUBLISHED' and status not in('SOLD','DELIVERED','ARCHIVED','CANCELLED');if v.id is null then return query select null::uuid,'unavailable_vehicle',null::text;return;end if;end if;
if p_lead_id is not null and not exists(select 1 from leads l where l.id=p_lead_id and l.garage_id=g.id and l.submission_fingerprint=p_fingerprint) then return query select null::uuid,'invalid_lead',null::text;return;end if;
slot_end:=p_starts_at+make_interval(mins=>t.duration_minutes);perform pg_advisory_xact_lock(hashtextextended(g.id::text||p_type||p_starts_at::text,0));
if p_starts_at<now()+make_interval(mins=>t.minimum_notice_minutes) or p_starts_at>now()+make_interval(days=>t.booking_horizon_days) then return query select null::uuid,'slot_unavailable',null::text;return;end if;
select count(*) into capacity_count from appointments a where a.garage_id=g.id and a.status in('PENDING','AWAITING_PAYMENT','CONFIRMED') and a.starts_at<slot_end+make_interval(mins=>t.buffer_after_minutes) and a.ends_at>p_starts_at-make_interval(mins=>t.buffer_before_minutes);if capacity_count>=t.simultaneous_capacity then return query select null::uuid,'slot_unavailable',null::text;return;end if;
if not exists(select 1 from garage_business_hours h where h.garage_id=g.id and h.day_of_week=extract(dow from (p_starts_at at time zone tz)) and h.opens_at<=(p_starts_at at time zone tz)::time and h.closes_at>=(slot_end at time zone tz)::time) or exists(select 1 from garage_calendar_exceptions e where e.garage_id=g.id and e.kind<>'OPEN' and e.starts_at<slot_end and e.ends_at>p_starts_at) then return query select null::uuid,'slot_unavailable',null::text;return;end if;
initial_status:=case when t.payment_required then 'AWAITING_PAYMENT' when t.auto_confirm then 'CONFIRMED' else 'PENDING' end;
insert into appointments(garage_id,lead_id,vehicle_id,type,status,starts_at,ends_at,timezone,customer_name,customer_phone,customer_email,payment_required,details) values(g.id,p_lead_id,v.id,p_type,initial_status,p_starts_at,slot_end,tz,trim(p_customer_name),nullif(trim(p_phone),''),nullif(lower(trim(p_email)),''),t.payment_required,coalesce(p_details,'{}')) returning id into created;
insert into appointment_events(garage_id,appointment_id,event_type,new_status,metadata) values(g.id,created,'CREATED',initial_status,'{}');if initial_status='AWAITING_PAYMENT' then insert into appointment_events(garage_id,appointment_id,event_type,new_status,metadata) values(g.id,created,'PAYMENT_REQUIRED',initial_status,'{}');elsif initial_status='CONFIRMED' then insert into appointment_events(garage_id,appointment_id,event_type,new_status,metadata) values(g.id,created,'CONFIRMED',initial_status,'{}');end if;
if p_lead_id is not null then insert into lead_events(lead_id,garage_id,event_type,metadata) values(p_lead_id,g.id,'APPOINTMENT_BOOKED',jsonb_build_object('appointmentId',created));update leads set next_action_at=p_starts_at where id=p_lead_id;end if;
insert into notifications(garage_id,type,title,message,href,entity_type,entity_id) values(g.id,case when initial_status='PENDING' then 'APPOINTMENT_TO_CONFIRM'::notification_type else 'SYSTEM'::notification_type end,case when initial_status='PENDING' then 'Rendez-vous à confirmer' else 'Nouveau rendez-vous' end,trim(p_customer_name),'/appointments/'||created,'appointment',created);
return query select created,'success',initial_status;end $$;
revoke all on function public.book_public_appointment(text,text,uuid,text,timestamptz,text,text,text,jsonb,text) from public;grant execute on function public.book_public_appointment(text,text,uuid,text,timestamptz,text,text,text,jsonb,text) to anon,authenticated;

create or replace function public.reschedule_appointment(p_appointment_id uuid,p_starts_at timestamptz) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$ declare a appointments%rowtype;t appointment_type_settings%rowtype;new_end timestamptz;old_start timestamptz;begin select * into a from appointments where id=p_appointment_id and exists(select 1 from garage_members gm where gm.garage_id=appointments.garage_id and gm.user_id=auth.uid());if a.id is null then return false;end if;select * into t from appointment_type_settings where garage_id=a.garage_id and appointment_type=a.type;new_end:=p_starts_at+make_interval(mins=>extract(epoch from(a.ends_at-a.starts_at))::int/60);perform pg_advisory_xact_lock(hashtextextended(a.garage_id::text||a.type||p_starts_at::text,0));if exists(select 1 from appointments x where x.garage_id=a.garage_id and x.id<>a.id and x.status in('PENDING','AWAITING_PAYMENT','CONFIRMED') and x.starts_at<new_end+make_interval(mins=>coalesce(t.buffer_after_minutes,0)) and x.ends_at>p_starts_at-make_interval(mins=>coalesce(t.buffer_before_minutes,0))) then return false;end if;old_start:=a.starts_at;update appointments set starts_at=p_starts_at,ends_at=new_end,updated_at=now() where id=a.id;insert into appointment_events(garage_id,appointment_id,actor_id,event_type,old_status,new_status,metadata) values(a.garage_id,a.id,auth.uid(),'RESCHEDULED',a.status,a.status,jsonb_build_object('oldStartsAt',old_start,'newStartsAt',p_starts_at));insert into notifications(garage_id,type,title,message,href,entity_type,entity_id) values(a.garage_id,'NEW_LEAD','Rendez-vous déplacé',a.customer_name,'/appointments/'||a.id,'appointment',a.id);return true;end $$;
revoke all on function public.reschedule_appointment(uuid,timestamptz) from public;grant execute on function public.reschedule_appointment(uuid,timestamptz) to authenticated;
