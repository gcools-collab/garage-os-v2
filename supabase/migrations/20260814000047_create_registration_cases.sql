create sequence public.registration_case_reference_seq;

create table public.registration_procedures (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  procedure_type text not null check(procedure_type in('CHANGE_OF_OWNER','ADDRESS_CHANGE','DUPLICATE','REGISTRATION','OTHER')),
  title text not null check(length(trim(title)) between 2 and 120), description text,
  is_active boolean not null default false, is_public boolean not null default false, display_order integer not null default 0 check(display_order>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(garage_id,procedure_type)
);
create table public.registration_procedure_requirements (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  procedure_id uuid not null references public.registration_procedures(id) on delete cascade, requirement_key text not null,
  label text not null check(length(trim(label)) between 2 and 120), description text, is_required boolean not null default true,
  display_order integer not null default 0 check(display_order>=0), created_at timestamptz not null default now(), unique(procedure_id,requirement_key)
);
create table public.registration_cases (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null, appointment_id uuid unique references public.appointments(id) on delete set null,
  procedure_id uuid references public.registration_procedures(id) on delete set null,
  procedure_type text not null check(procedure_type in('CHANGE_OF_OWNER','ADDRESS_CHANGE','DUPLICATE','REGISTRATION','OTHER')),
  procedure_title text not null, public_reference text not null unique default ('CG-'||extract(year from now())::integer||'-'||lpad(nextval('public.registration_case_reference_seq')::text,6,'0')),
  public_token_hash text not null unique, public_token_expires_at timestamptz, public_token_revoked_at timestamptz,
  status text not null default 'NEW' check(status in('NEW','WAITING_FOR_DOCUMENTS','DOCUMENTS_RECEIVED','UNDER_REVIEW','INCOMPLETE','READY','IN_PROGRESS','COMPLETED','CANCELLED')),
  customer_name text not null, customer_email text, customer_phone text, registration_number text, brand text, model text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index registration_cases_garage_status_idx on public.registration_cases(garage_id,status,created_at desc);
create index registration_cases_search_idx on public.registration_cases(garage_id,public_reference,registration_number);
create table public.registration_case_requirements (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  case_id uuid not null references public.registration_cases(id) on delete cascade, source_requirement_id uuid references public.registration_procedure_requirements(id) on delete set null,
  requirement_key text not null, label text not null, description text, is_required boolean not null, display_order integer not null,
  status text not null default 'MISSING' check(status in('MISSING','UPLOADED','UNDER_REVIEW','ACCEPTED','REJECTED')),
  rejection_reason text, internal_note text, updated_at timestamptz not null default now(), unique(case_id,requirement_key)
);
create table public.registration_documents (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  case_id uuid not null references public.registration_cases(id) on delete cascade, case_requirement_id uuid not null references public.registration_case_requirements(id) on delete cascade,
  storage_path text not null unique, original_name text not null, mime_type text not null check(mime_type in('application/pdf','image/jpeg','image/png','image/webp')),
  file_size integer not null check(file_size between 1 and 10485760), status text not null default 'UPLOADED' check(status in('UPLOADED','UNDER_REVIEW','ACCEPTED','REJECTED','REPLACED')),
  rejection_reason text, uploaded_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id), replaced_by uuid references public.registration_documents(id)
);
create index registration_documents_case_idx on public.registration_documents(case_id,case_requirement_id,uploaded_at desc);
create table public.registration_case_events (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  case_id uuid not null references public.registration_cases(id) on delete cascade, actor_id uuid references auth.users(id),
  event_type text not null check(event_type in('CASE_CREATED','DOCUMENT_UPLOADED','DOCUMENT_ACCEPTED','DOCUMENT_REJECTED','DOCUMENT_REPLACED','STATUS_CHANGED','APPOINTMENT_LINKED','PAYMENT_RECEIVED','CASE_COMPLETED','CASE_CANCELLED','PUBLIC_LINK_REGENERATED')),
  old_status text, new_status text, metadata jsonb not null default '{}', created_at timestamptz not null default now(),
  check(jsonb_typeof(metadata)='object' and octet_length(metadata::text)<=4096)
);

create function public.registration_tenant_guard() returns trigger language plpgsql set search_path=public as $$ begin
  if tg_op='UPDATE' and new.garage_id<>old.garage_id then raise exception 'garage_id is immutable'; end if;
  if tg_table_name='registration_procedure_requirements' and not exists(select 1 from registration_procedures p where p.id=new.procedure_id and p.garage_id=new.garage_id) then raise exception 'procedure tenant mismatch'; end if;
  if tg_table_name in('registration_case_requirements','registration_documents','registration_case_events') and not exists(select 1 from registration_cases c where c.id=new.case_id and c.garage_id=new.garage_id) then raise exception 'case tenant mismatch'; end if;
  return new; end $$;
create trigger registration_procedure_requirement_guard before insert or update on public.registration_procedure_requirements for each row execute function public.registration_tenant_guard();
create trigger registration_case_requirement_guard before insert or update on public.registration_case_requirements for each row execute function public.registration_tenant_guard();
create trigger registration_document_guard before insert or update on public.registration_documents for each row execute function public.registration_tenant_guard();
create trigger registration_event_guard before insert or update on public.registration_case_events for each row execute function public.registration_tenant_guard();
create function public.prevent_registration_event_mutation() returns trigger language plpgsql as $$ begin raise exception 'registration events are immutable'; end $$;
create trigger registration_events_immutable before update or delete on public.registration_case_events for each row execute function public.prevent_registration_event_mutation();

alter table public.registration_procedures enable row level security; alter table public.registration_procedure_requirements enable row level security;
alter table public.registration_cases enable row level security; alter table public.registration_case_requirements enable row level security;
alter table public.registration_documents enable row level security; alter table public.registration_case_events enable row level security;
create policy "Members read registration procedures" on public.registration_procedures for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_procedures.garage_id and gm.user_id=auth.uid()));
create policy "Admins manage registration procedures" on public.registration_procedures for all to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_procedures.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin'))) with check(exists(select 1 from garage_members gm where gm.garage_id=registration_procedures.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin')));
create policy "Members read registration procedure requirements" on public.registration_procedure_requirements for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_procedure_requirements.garage_id and gm.user_id=auth.uid()));
create policy "Admins manage registration procedure requirements" on public.registration_procedure_requirements for all to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_procedure_requirements.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin'))) with check(exists(select 1 from garage_members gm where gm.garage_id=registration_procedure_requirements.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin')));
create policy "Members read registration cases" on public.registration_cases for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_cases.garage_id and gm.user_id=auth.uid()));
create policy "Members update registration cases" on public.registration_cases for update to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_cases.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from garage_members gm where gm.garage_id=registration_cases.garage_id and gm.user_id=auth.uid()));
create policy "Members read registration checklist" on public.registration_case_requirements for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_case_requirements.garage_id and gm.user_id=auth.uid()));
create policy "Members update registration checklist" on public.registration_case_requirements for update to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_case_requirements.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from garage_members gm where gm.garage_id=registration_case_requirements.garage_id and gm.user_id=auth.uid()));
create policy "Members read registration documents" on public.registration_documents for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_documents.garage_id and gm.user_id=auth.uid()));
create policy "Members manage registration documents" on public.registration_documents for all to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_documents.garage_id and gm.user_id=auth.uid())) with check(exists(select 1 from garage_members gm where gm.garage_id=registration_documents.garage_id and gm.user_id=auth.uid()));
create policy "Members read registration events" on public.registration_case_events for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=registration_case_events.garage_id and gm.user_id=auth.uid()));
create policy "Members create registration events" on public.registration_case_events for insert to authenticated with check(exists(select 1 from garage_members gm where gm.garage_id=registration_case_events.garage_id and gm.user_id=auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('registration-documents','registration-documents',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Members read registration storage" on storage.objects for select to authenticated using(bucket_id='registration-documents' and exists(select 1 from garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid()));
create policy "Members upload registration storage" on storage.objects for insert to authenticated with check(bucket_id='registration-documents' and exists(select 1 from garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid()));
create policy "Members delete registration storage" on storage.objects for delete to authenticated using(bucket_id='registration-documents' and exists(select 1 from garage_members gm where gm.garage_id::text=(storage.foldername(name))[1] and gm.user_id=auth.uid()));

create function public.transition_registration_case(p_case_id uuid,p_status text) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$ declare c registration_cases%rowtype; allowed boolean; begin
 select * into c from registration_cases where id=p_case_id and exists(select 1 from garage_members gm where gm.garage_id=registration_cases.garage_id and gm.user_id=auth.uid()) for update; if c.id is null then return false; end if;
 allowed:=case c.status when 'NEW' then p_status in('WAITING_FOR_DOCUMENTS','CANCELLED') when 'WAITING_FOR_DOCUMENTS' then p_status in('DOCUMENTS_RECEIVED','CANCELLED') when 'DOCUMENTS_RECEIVED' then p_status in('UNDER_REVIEW','WAITING_FOR_DOCUMENTS','CANCELLED') when 'UNDER_REVIEW' then p_status in('INCOMPLETE','READY','CANCELLED') when 'INCOMPLETE' then p_status in('DOCUMENTS_RECEIVED','CANCELLED') when 'READY' then p_status in('IN_PROGRESS','CANCELLED') when 'IN_PROGRESS' then p_status in('COMPLETED','CANCELLED') else false end;
 if not allowed then return false; end if; update registration_cases set status=p_status,updated_at=now() where id=c.id; insert into registration_case_events(garage_id,case_id,actor_id,event_type,old_status,new_status) values(c.garage_id,c.id,auth.uid(),case when p_status='COMPLETED' then 'CASE_COMPLETED' when p_status='CANCELLED' then 'CASE_CANCELLED' else 'STATUS_CHANGED' end,c.status,p_status); return true; end $$;
revoke all on function public.transition_registration_case(uuid,text) from public; grant execute on function public.transition_registration_case(uuid,text) to authenticated;

create function public.create_public_registration_case(p_garage_slug text,p_appointment_id uuid,p_lead_id uuid,p_fingerprint text,p_procedure text,p_registration text,p_brand text,p_model text)
returns table(case_id uuid,public_token text,public_reference text) language plpgsql security definer set search_path=public,extensions,pg_temp as $$ declare a appointments%rowtype;l leads%rowtype;p registration_procedures%rowtype;created uuid;token text;normalized text;begin
 select * into a from appointments where id=p_appointment_id and type='REGISTRATION'; select * into l from leads where id=p_lead_id and garage_id=a.garage_id and submission_fingerprint=p_fingerprint;
 if a.id is null or l.id is null or a.lead_id<>l.id then return; end if;
 normalized:=case p_procedure when 'CHANGE_OWNER' then 'CHANGE_OF_OWNER' when 'CHANGE_OF_OWNER' then 'CHANGE_OF_OWNER' when 'ADDRESS_CHANGE' then 'ADDRESS_CHANGE' when 'DUPLICATE' then 'DUPLICATE' when 'IMPORT' then 'REGISTRATION' when 'TEMPORARY_REGISTRATION' then 'REGISTRATION' when 'REGISTRATION' then 'REGISTRATION' else 'OTHER' end;
 select rp.* into p from registration_procedures rp join garages g on g.id=rp.garage_id where rp.garage_id=a.garage_id and g.live_slug=lower(trim(p_garage_slug)) and g.live_enabled and rp.procedure_type=normalized and rp.is_active and rp.is_public;
 if p.id is null then return; end if; token:=encode(gen_random_bytes(32),'hex');
 insert into registration_cases(garage_id,lead_id,appointment_id,procedure_id,procedure_type,procedure_title,public_token_hash,status,customer_name,customer_email,customer_phone,registration_number,brand,model)
 values(a.garage_id,l.id,a.id,p.id,p.procedure_type,p.title,encode(digest(token,'sha256'),'hex'),'NEW',a.customer_name,a.customer_email,a.customer_phone,nullif(trim(p_registration),''),nullif(trim(p_brand),''),nullif(trim(p_model),'')) returning id into created;
 insert into registration_case_requirements(garage_id,case_id,source_requirement_id,requirement_key,label,description,is_required,display_order) select r.garage_id,created,r.id,r.requirement_key,r.label,r.description,r.is_required,r.display_order from registration_procedure_requirements r where r.procedure_id=p.id;
 update registration_cases set status=case when exists(select 1 from registration_case_requirements where case_id=created and is_required) then 'WAITING_FOR_DOCUMENTS' else 'READY' end where id=created;
 insert into registration_case_events(garage_id,case_id,event_type,new_status,metadata) values(a.garage_id,created,'CASE_CREATED',(select status from registration_cases where id=created),jsonb_build_object('appointmentId',a.id));
 insert into notifications(garage_id,type,title,message,href,entity_type,entity_id) values(a.garage_id,'SYSTEM','Nouveau dossier carte grise',(select public_reference from registration_cases where id=created),'/registration/'||created,'registration_case',created);
 return query select created,token,(select c.public_reference from registration_cases c where c.id=created); end $$;
revoke all on function public.create_public_registration_case(text,uuid,uuid,text,text,text,text,text) from public; grant execute on function public.create_public_registration_case(text,uuid,uuid,text,text,text,text,text) to anon,authenticated;
create function public.get_public_registration_procedures(p_garage_slug text) returns table(procedure_type text,title text,description text,display_order integer) language sql stable security definer set search_path=public,pg_temp as $$ select p.procedure_type,p.title,p.description,p.display_order from registration_procedures p join garages g on g.id=p.garage_id where g.live_slug=lower(trim(p_garage_slug)) and g.live_enabled and p.is_active and p.is_public order by p.display_order,p.title $$;
revoke all on function public.get_public_registration_procedures(text) from public;grant execute on function public.get_public_registration_procedures(text) to anon,authenticated;

comment on table public.registration_documents is 'Private administrative files. A production RGPD retention policy must be defined before automatic deletion is enabled.';
