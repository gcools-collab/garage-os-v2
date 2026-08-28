-- GO-0089: Billing documents (quotes, invoices, credit notes), lines, payments, events, numbering

create table public.billing_document_sequences (
  garage_id uuid not null references public.garages(id) on delete cascade,
  document_type text not null check (document_type in ('QUOTE', 'INVOICE', 'CREDIT_NOTE')),
  sequence_year integer not null check (sequence_year between 2000 and 2100),
  last_number integer not null default 0 check (last_number >= 0),
  primary key (garage_id, document_type, sequence_year)
);

create table public.billing_documents (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  document_type text not null check (document_type in ('QUOTE', 'INVOICE', 'CREDIT_NOTE')),
  status text not null,
  document_number text,
  customer_id uuid not null references public.customers(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  registration_case_id uuid references public.registration_cases(id) on delete set null,
  customer_vehicle_id uuid references public.customer_vehicles(id) on delete set null,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  source_quote_id uuid references public.billing_documents(id) on delete set null,
  source_invoice_id uuid references public.billing_documents(id) on delete set null,
  converted_invoice_id uuid references public.billing_documents(id) on delete set null,
  issue_date date,
  due_date date,
  valid_until date,
  customer_snapshot jsonb not null default '{}',
  issuer_snapshot jsonb not null default '{}',
  vehicle_context jsonb not null default '{}',
  subtotal_excl_vat_cents integer not null default 0 check (subtotal_excl_vat_cents >= 0),
  total_vat_cents integer not null default 0 check (total_vat_cents >= 0),
  total_incl_vat_cents integer not null default 0 check (total_incl_vat_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  amount_credited_cents integer not null default 0 check (amount_credited_cents >= 0),
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  credit_note_reason text,
  electronic_status text not null default 'NOT_REQUIRED'
    check (electronic_status in ('NOT_REQUIRED', 'NOT_SUBMITTED', 'READY', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR')),
  electronic_provider_ref text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  constraint billing_documents_status_valid check (
    (document_type = 'QUOTE' and status in ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED', 'CONVERTED'))
    or (document_type = 'INVOICE' and status in ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'))
    or (document_type = 'CREDIT_NOTE' and status in ('DRAFT', 'ISSUED'))
  ),
  constraint billing_documents_snapshot_bounded check (
    jsonb_typeof(customer_snapshot) = 'object'
    and jsonb_typeof(issuer_snapshot) = 'object'
    and jsonb_typeof(vehicle_context) = 'object'
    and octet_length(customer_snapshot::text) <= 8192
    and octet_length(issuer_snapshot::text) <= 8192
    and octet_length(vehicle_context::text) <= 4096
  ),
  constraint billing_documents_number_when_issued check (
    status = 'DRAFT' or document_number is not null
  ),
  constraint billing_documents_credit_note_link check (
    document_type <> 'CREDIT_NOTE' or source_invoice_id is not null
  ),
  constraint billing_documents_quote_conversion check (
    document_type <> 'QUOTE' or converted_invoice_id is null or status = 'CONVERTED'
  )
);

create unique index billing_documents_number_unique
  on public.billing_documents (garage_id, document_type, document_number)
  where document_number is not null;

create index billing_documents_garage_type_status_idx
  on public.billing_documents (garage_id, document_type, status, created_at desc);

create index billing_documents_customer_idx
  on public.billing_documents (garage_id, customer_id, created_at desc);

create table public.billing_document_lines (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  document_id uuid not null references public.billing_documents(id) on delete cascade,
  line_order integer not null check (line_order >= 0),
  description text not null check (char_length(trim(description)) between 1 and 500),
  quantity integer not null check (quantity > 0),
  unit text not null default 'unité' check (char_length(trim(unit)) between 1 and 40),
  unit_price_excl_vat_cents integer not null check (unit_price_excl_vat_cents >= 0),
  vat_rate_bps integer not null check (vat_rate_bps between 0 and 10000),
  discount_bps integer not null default 0 check (discount_bps between 0 and 10000),
  line_total_excl_vat_cents integer not null check (line_total_excl_vat_cents >= 0),
  vat_amount_cents integer not null check (vat_amount_cents >= 0),
  line_total_incl_vat_cents integer not null check (line_total_incl_vat_cents >= 0),
  service_offer_id uuid references public.service_offers(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, line_order)
);

create index billing_document_lines_document_idx
  on public.billing_document_lines (document_id, line_order);

create table public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  invoice_id uuid not null references public.billing_documents(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  payment_method text not null check (payment_method in ('CASH', 'CHECK', 'BANK_TRANSFER', 'CARD', 'OTHER')),
  paid_at timestamptz not null default now(),
  reference text,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index invoice_payments_invoice_idx on public.invoice_payments (invoice_id, paid_at desc);

create table public.billing_document_events (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  document_id uuid not null references public.billing_documents(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null check (event_type in (
    'DOCUMENT_CREATED', 'DOCUMENT_UPDATED', 'LINE_ADDED', 'LINE_UPDATED', 'LINE_REMOVED',
    'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_DECLINED', 'QUOTE_CONVERTED',
    'INVOICE_ISSUED', 'PAYMENT_RECORDED', 'CREDIT_NOTE_ISSUED',
    'STATUS_CHANGED', 'ELECTRONIC_STATUS_CHANGED'
  )),
  old_status text,
  new_status text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object' and octet_length(metadata::text) <= 4096)
);

create index billing_document_events_document_idx
  on public.billing_document_events (document_id, created_at desc);

-- Tenant guards
create function public.billing_tenant_guard() returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.garage_id is distinct from old.garage_id then
    raise exception 'garage_id is immutable';
  end if;
  if tg_table_name = 'billing_document_lines' then
    if not exists (select 1 from billing_documents d where d.id = new.document_id and d.garage_id = new.garage_id) then
      raise exception 'document tenant mismatch';
    end if;
  end if;
  if tg_table_name = 'billing_document_events' then
    if not exists (select 1 from billing_documents d where d.id = new.document_id and d.garage_id = new.garage_id) then
      raise exception 'document tenant mismatch';
    end if;
  end if;
  if tg_table_name = 'invoice_payments' then
    if not exists (select 1 from billing_documents d where d.id = new.invoice_id and d.garage_id = new.garage_id and d.document_type = 'INVOICE') then
      raise exception 'invoice tenant mismatch';
    end if;
  end if;
  return new;
end $$;

create trigger billing_document_line_guard before insert or update on public.billing_document_lines
for each row execute function public.billing_tenant_guard();
create trigger billing_document_event_guard before insert or update on public.billing_document_events
for each row execute function public.billing_tenant_guard();
create trigger invoice_payment_guard before insert or update on public.invoice_payments
for each row execute function public.billing_tenant_guard();

create function public.prevent_billing_event_mutation() returns trigger language plpgsql as $$
begin raise exception 'billing events are immutable'; end $$;
create trigger billing_events_immutable before update or delete on public.billing_document_events
for each row execute function public.prevent_billing_event_mutation();

-- Immutability: issued documents cannot have lines mutated
create function public.prevent_billing_line_mutation_after_issue() returns trigger language plpgsql set search_path = public as $$
declare doc_status text;
begin
  select status into doc_status from billing_documents where id = coalesce(new.document_id, old.document_id);
  if doc_status is distinct from 'DRAFT' then
    raise exception 'billing lines are immutable after document issuance';
  end if;
  return coalesce(new, old);
end $$;
create trigger billing_lines_immutable before insert or update or delete on public.billing_document_lines
for each row execute function public.prevent_billing_line_mutation_after_issue();

-- Immutability: protect financial fields on issued documents
create function public.protect_issued_billing_document() returns trigger language plpgsql set search_path = public as $$
begin
  if old.status <> 'DRAFT' then
    if new.document_number is distinct from old.document_number
      or new.customer_snapshot is distinct from old.customer_snapshot
      or new.issuer_snapshot is distinct from old.issuer_snapshot
      or new.subtotal_excl_vat_cents is distinct from old.subtotal_excl_vat_cents
      or new.total_vat_cents is distinct from old.total_vat_cents
      or new.total_incl_vat_cents is distinct from old.total_incl_vat_cents
      or new.customer_id is distinct from old.customer_id
      or new.document_type is distinct from old.document_type
    then
      raise exception 'issued billing document fields are immutable';
    end if;
  end if;
  return new;
end $$;
create trigger billing_document_immutable before update on public.billing_documents
for each row execute function public.protect_issued_billing_document();

alter table public.billing_document_sequences enable row level security;
alter table public.billing_documents enable row level security;
alter table public.billing_document_lines enable row level security;
alter table public.invoice_payments enable row level security;
alter table public.billing_document_events enable row level security;

create policy "Members read billing sequences" on public.billing_document_sequences for select to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_document_sequences.garage_id and gm.user_id = auth.uid()));

create policy "Members read billing documents" on public.billing_documents for select to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_documents.garage_id and gm.user_id = auth.uid()));

create policy "Members manage billing documents" on public.billing_documents for all to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_documents.garage_id and gm.user_id = auth.uid()))
with check (exists (select 1 from garage_members gm where gm.garage_id = billing_documents.garage_id and gm.user_id = auth.uid()));

create policy "Members read billing lines" on public.billing_document_lines for select to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_document_lines.garage_id and gm.user_id = auth.uid()));

create policy "Members manage billing lines" on public.billing_document_lines for all to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_document_lines.garage_id and gm.user_id = auth.uid()))
with check (exists (select 1 from garage_members gm where gm.garage_id = billing_document_lines.garage_id and gm.user_id = auth.uid()));

create policy "Members read invoice payments" on public.invoice_payments for select to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = invoice_payments.garage_id and gm.user_id = auth.uid()));

create policy "Members manage invoice payments" on public.invoice_payments for all to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = invoice_payments.garage_id and gm.user_id = auth.uid()))
with check (exists (select 1 from garage_members gm where gm.garage_id = invoice_payments.garage_id and gm.user_id = auth.uid()));

create policy "Members read billing events" on public.billing_document_events for select to authenticated
using (exists (select 1 from garage_members gm where gm.garage_id = billing_document_events.garage_id and gm.user_id = auth.uid()));

create policy "Members create billing events" on public.billing_document_events for insert to authenticated
with check (exists (select 1 from garage_members gm where gm.garage_id = billing_document_events.garage_id and gm.user_id = auth.uid()));

-- Money helpers (integer centimes, deterministic rounding)
create function public.billing_line_totals(
  p_quantity integer,
  p_unit_price_excl_vat_cents integer,
  p_vat_rate_bps integer,
  p_discount_bps integer
) returns table (
  line_total_excl_vat_cents integer,
  vat_amount_cents integer,
  line_total_incl_vat_cents integer
) language sql immutable as $$
  with base as (
    select round((p_quantity::numeric * p_unit_price_excl_vat_cents) * (1 - p_discount_bps::numeric / 10000))::integer as excl
  )
  select
    excl,
    round(excl::numeric * p_vat_rate_bps / 10000)::integer,
    excl + round(excl::numeric * p_vat_rate_bps / 10000)::integer
  from base;
$$;

create function public.billing_document_prefix(p_document_type text) returns text language sql immutable as $$
  select case p_document_type
    when 'QUOTE' then 'DEV'
    when 'INVOICE' then 'FAC'
    when 'CREDIT_NOTE' then 'AV'
    else 'DOC'
  end;
$$;

create function public.allocate_billing_document_number(
  p_garage_id uuid,
  p_document_type text,
  p_issue_date date default current_date
) returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  seq_year integer;
  next_num integer;
  prefix text;
begin
  seq_year := extract(year from coalesce(p_issue_date, current_date))::integer;
  prefix := billing_document_prefix(p_document_type);
  insert into billing_document_sequences (garage_id, document_type, sequence_year, last_number)
  values (p_garage_id, p_document_type, seq_year, 1)
  on conflict (garage_id, document_type, sequence_year)
  do update set last_number = billing_document_sequences.last_number + 1
  returning last_number into next_num;
  return prefix || '-' || seq_year::text || '-' || lpad(next_num::text, 6, '0');
end $$;

create function public.build_billing_customer_snapshot(p_customer_id uuid, p_garage_id uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare c customers%rowtype;
begin
  select * into c from customers where id = p_customer_id and garage_id = p_garage_id;
  if c.id is null then return '{}'::jsonb; end if;
  return jsonb_build_object(
    'customerId', c.id,
    'name', trim(coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, '')),
    'email', c.email,
    'phone', c.phone,
    'addressLine', c.address_line,
    'postalCode', c.postal_code,
    'city', c.city
  );
end $$;

create function public.build_billing_issuer_snapshot(p_garage_id uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  b garage_branding%rowtype;
  f garage_fiscal_settings%rowtype;
  g garages%rowtype;
begin
  select * into g from garages where id = p_garage_id;
  select * into b from garage_branding where garage_id = p_garage_id;
  select * into f from garage_fiscal_settings where garage_id = p_garage_id;
  return jsonb_build_object(
    'garageId', p_garage_id,
    'displayName', coalesce(b.display_name, g.name),
    'legalName', b.legal_name,
    'addressLine1', b.address_line1,
    'addressLine2', b.address_line2,
    'postalCode', b.postal_code,
    'city', b.city,
    'countryCode', coalesce(b.country_code, 'FR'),
    'phone', b.phone,
    'email', b.email,
    'siren', f.siren,
    'siret', f.siret,
    'vatNumber', f.vat_number,
    'legalForm', f.legal_form,
    'invoiceFooterText', f.invoice_footer_text
  );
end $$;

create function public.recalculate_billing_document_totals(p_document_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  doc billing_documents%rowtype;
  subtotal integer;
  vat_total integer;
  incl_total integer;
begin
  select * into doc from billing_documents where id = p_document_id for update;
  if doc.id is null or doc.status <> 'DRAFT' then return; end if;
  select coalesce(sum(line_total_excl_vat_cents), 0),
         coalesce(sum(vat_amount_cents), 0),
         coalesce(sum(line_total_incl_vat_cents), 0)
    into subtotal, vat_total, incl_total
  from billing_document_lines where document_id = p_document_id;
  update billing_documents set
    subtotal_excl_vat_cents = subtotal,
    total_vat_cents = vat_total,
    total_incl_vat_cents = incl_total,
    updated_at = now()
  where id = p_document_id;
end $$;

create function public.create_billing_document_draft(
  p_garage_id uuid,
  p_document_type text,
  p_customer_id uuid,
  p_appointment_id uuid default null,
  p_registration_case_id uuid default null,
  p_customer_vehicle_id uuid default null,
  p_vehicle_id uuid default null,
  p_source_invoice_id uuid default null,
  p_valid_until date default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  created uuid;
  default_vat integer;
begin
  if not exists (select 1 from garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if not exists (select 1 from customers c where c.id = p_customer_id and c.garage_id = p_garage_id) then
    raise exception 'customer tenant mismatch';
  end if;
  if p_appointment_id is not null and not exists (
    select 1 from appointments a where a.id = p_appointment_id and a.garage_id = p_garage_id and a.customer_id = p_customer_id
  ) then raise exception 'appointment tenant mismatch'; end if;
  if p_registration_case_id is not null and not exists (
    select 1 from registration_cases r where r.id = p_registration_case_id and r.garage_id = p_garage_id
  ) then raise exception 'registration tenant mismatch'; end if;
  if p_customer_vehicle_id is not null and not exists (
    select 1 from customer_vehicles v where v.id = p_customer_vehicle_id and v.garage_id = p_garage_id and v.customer_id = p_customer_id
  ) then raise exception 'vehicle tenant mismatch'; end if;
  if p_vehicle_id is not null and not exists (
    select 1 from vehicles v where v.id = p_vehicle_id and v.garage_id = p_garage_id
  ) then raise exception 'stock vehicle tenant mismatch'; end if;
  if p_document_type = 'CREDIT_NOTE' then
    if p_source_invoice_id is null or not exists (
      select 1 from billing_documents i where i.id = p_source_invoice_id and i.garage_id = p_garage_id
        and i.document_type = 'INVOICE' and i.status in ('ISSUED', 'PARTIALLY_PAID', 'PAID')
    ) then raise exception 'invalid source invoice'; end if;
  elsif p_source_invoice_id is not null then
    raise exception 'source invoice only for credit notes';
  end if;

  insert into billing_documents (
    garage_id, document_type, status, customer_id,
    appointment_id, registration_case_id, customer_vehicle_id, vehicle_id,
    source_invoice_id, valid_until, notes, created_by
  ) values (
    p_garage_id, p_document_type, 'DRAFT', p_customer_id,
    p_appointment_id, p_registration_case_id, p_customer_vehicle_id, p_vehicle_id,
    p_source_invoice_id, p_valid_until, nullif(trim(p_notes), ''), auth.uid()
  ) returning id into created;

  insert into billing_document_events (garage_id, document_id, actor_id, event_type, new_status)
  values (p_garage_id, created, auth.uid(), 'DOCUMENT_CREATED', 'DRAFT');

  return created;
end $$;

create function public.upsert_billing_document_line(
  p_garage_id uuid,
  p_document_id uuid,
  p_line_id uuid,
  p_line_order integer,
  p_description text,
  p_quantity integer,
  p_unit text,
  p_unit_price_excl_vat_cents integer,
  p_vat_rate_bps integer,
  p_discount_bps integer,
  p_service_offer_id uuid default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  doc billing_documents%rowtype;
  totals record;
  result_id uuid;
begin
  select * into doc from billing_documents where id = p_document_id and garage_id = p_garage_id for update;
  if doc.id is null or doc.status <> 'DRAFT' then raise exception 'document not editable'; end if;
  if p_service_offer_id is not null and not exists (
    select 1 from service_offers o where o.id = p_service_offer_id and o.garage_id = p_garage_id
  ) then raise exception 'service offer tenant mismatch'; end if;

  select * into totals from billing_line_totals(p_quantity, p_unit_price_excl_vat_cents, p_vat_rate_bps, coalesce(p_discount_bps, 0));

  if p_line_id is null then
    insert into billing_document_lines (
      garage_id, document_id, line_order, description, quantity, unit,
      unit_price_excl_vat_cents, vat_rate_bps, discount_bps,
      line_total_excl_vat_cents, vat_amount_cents, line_total_incl_vat_cents, service_offer_id
    ) values (
      p_garage_id, p_document_id, p_line_order, trim(p_description), p_quantity, coalesce(nullif(trim(p_unit), ''), 'unité'),
      p_unit_price_excl_vat_cents, p_vat_rate_bps, coalesce(p_discount_bps, 0),
      totals.line_total_excl_vat_cents, totals.vat_amount_cents, totals.line_total_incl_vat_cents, p_service_offer_id
    ) returning id into result_id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, metadata)
    values (p_garage_id, p_document_id, auth.uid(), 'LINE_ADDED', jsonb_build_object('lineId', result_id));
  else
    update billing_document_lines set
      line_order = p_line_order,
      description = trim(p_description),
      quantity = p_quantity,
      unit = coalesce(nullif(trim(p_unit), ''), 'unité'),
      unit_price_excl_vat_cents = p_unit_price_excl_vat_cents,
      vat_rate_bps = p_vat_rate_bps,
      discount_bps = coalesce(p_discount_bps, 0),
      line_total_excl_vat_cents = totals.line_total_excl_vat_cents,
      vat_amount_cents = totals.vat_amount_cents,
      line_total_incl_vat_cents = totals.line_total_incl_vat_cents,
      service_offer_id = p_service_offer_id
    where id = p_line_id and document_id = p_document_id and garage_id = p_garage_id
    returning id into result_id;
    if result_id is null then raise exception 'line not found'; end if;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, metadata)
    values (p_garage_id, p_document_id, auth.uid(), 'LINE_UPDATED', jsonb_build_object('lineId', result_id));
  end if;

  perform recalculate_billing_document_totals(p_document_id);
  return result_id;
end $$;

create function public.remove_billing_document_line(
  p_garage_id uuid,
  p_document_id uuid,
  p_line_id uuid
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare doc billing_documents%rowtype;
begin
  select * into doc from billing_documents where id = p_document_id and garage_id = p_garage_id for update;
  if doc.id is null or doc.status <> 'DRAFT' then return false; end if;
  delete from billing_document_lines where id = p_line_id and document_id = p_document_id and garage_id = p_garage_id;
  if not found then return false; end if;
  insert into billing_document_events (garage_id, document_id, actor_id, event_type, metadata)
  values (p_garage_id, p_document_id, auth.uid(), 'LINE_REMOVED', jsonb_build_object('lineId', p_line_id));
  perform recalculate_billing_document_totals(p_document_id);
  return true;
end $$;

create function public.finalize_billing_document(
  p_garage_id uuid,
  p_document_id uuid,
  p_action text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare
  doc billing_documents%rowtype;
  doc_num text;
  inv billing_documents%rowtype;
begin
  select * into doc from billing_documents where id = p_document_id and garage_id = p_garage_id for update;
  if doc.id is null then return false; end if;

  if p_action = 'SEND_QUOTE' then
    if doc.document_type <> 'QUOTE' or doc.status <> 'DRAFT' then return false; end if;
    if not exists (select 1 from billing_document_lines where document_id = doc.id) then return false; end if;
    update billing_documents set status = 'SENT', sent_at = now(), updated_at = now(),
      customer_snapshot = build_billing_customer_snapshot(doc.customer_id, doc.garage_id),
      issuer_snapshot = build_billing_issuer_snapshot(doc.garage_id),
      subtotal_excl_vat_cents = (select coalesce(sum(line_total_excl_vat_cents), 0) from billing_document_lines where document_id = doc.id),
      total_vat_cents = (select coalesce(sum(vat_amount_cents), 0) from billing_document_lines where document_id = doc.id),
      total_incl_vat_cents = (select coalesce(sum(line_total_incl_vat_cents), 0) from billing_document_lines where document_id = doc.id)
    where id = doc.id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status)
    values (doc.garage_id, doc.id, auth.uid(), 'QUOTE_SENT', 'DRAFT', 'SENT');
    return true;
  end if;

  if p_action = 'ACCEPT_QUOTE' then
    if doc.document_type <> 'QUOTE' or doc.status <> 'SENT' then return false; end if;
    update billing_documents set status = 'ACCEPTED', accepted_at = now(), updated_at = now() where id = doc.id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status)
    values (doc.garage_id, doc.id, auth.uid(), 'QUOTE_ACCEPTED', 'SENT', 'ACCEPTED');
    return true;
  end if;

  if p_action = 'DECLINE_QUOTE' then
    if doc.document_type <> 'QUOTE' or doc.status not in ('SENT', 'ACCEPTED') then return false; end if;
    update billing_documents set status = 'DECLINED', updated_at = now() where id = doc.id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status)
    values (doc.garage_id, doc.id, auth.uid(), 'QUOTE_DECLINED', doc.status, 'DECLINED');
    return true;
  end if;

  if p_action = 'ISSUE_INVOICE' then
    if doc.document_type <> 'INVOICE' or doc.status <> 'DRAFT' then return false; end if;
    if not exists (select 1 from billing_document_lines where document_id = doc.id) then return false; end if;
    doc_num := allocate_billing_document_number(doc.garage_id, 'INVOICE', current_date);
    update billing_documents set
      status = 'ISSUED',
      document_number = doc_num,
      issue_date = current_date,
      issued_at = now(),
      updated_at = now(),
      customer_snapshot = build_billing_customer_snapshot(doc.customer_id, doc.garage_id),
      issuer_snapshot = build_billing_issuer_snapshot(doc.garage_id),
      subtotal_excl_vat_cents = (select coalesce(sum(line_total_excl_vat_cents), 0) from billing_document_lines where document_id = doc.id),
      total_vat_cents = (select coalesce(sum(vat_amount_cents), 0) from billing_document_lines where document_id = doc.id),
      total_incl_vat_cents = (select coalesce(sum(line_total_incl_vat_cents), 0) from billing_document_lines where document_id = doc.id),
      electronic_status = 'NOT_SUBMITTED'
    where id = doc.id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status, metadata)
    values (doc.garage_id, doc.id, auth.uid(), 'INVOICE_ISSUED', 'DRAFT', 'ISSUED', jsonb_build_object('documentNumber', doc_num));
    return true;
  end if;

  if p_action = 'ISSUE_CREDIT_NOTE' then
    if doc.document_type <> 'CREDIT_NOTE' or doc.status <> 'DRAFT' then return false; end if;
    if not exists (select 1 from billing_document_lines where document_id = doc.id) then return false; end if;
    select * into inv from billing_documents where id = doc.source_invoice_id for update;
    doc_num := allocate_billing_document_number(doc.garage_id, 'CREDIT_NOTE', current_date);
    update billing_documents set
      status = 'ISSUED',
      document_number = doc_num,
      issue_date = current_date,
      issued_at = now(),
      updated_at = now(),
      customer_snapshot = build_billing_customer_snapshot(doc.customer_id, doc.garage_id),
      issuer_snapshot = build_billing_issuer_snapshot(doc.garage_id),
      subtotal_excl_vat_cents = (select coalesce(sum(line_total_excl_vat_cents), 0) from billing_document_lines where document_id = doc.id),
      total_vat_cents = (select coalesce(sum(vat_amount_cents), 0) from billing_document_lines where document_id = doc.id),
      total_incl_vat_cents = (select coalesce(sum(line_total_incl_vat_cents), 0) from billing_document_lines where document_id = doc.id),
      electronic_status = 'NOT_SUBMITTED'
    where id = doc.id;
    update billing_documents set
      amount_credited_cents = amount_credited_cents + (select total_incl_vat_cents from billing_documents where id = doc.id),
      updated_at = now()
    where id = inv.id;
    insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status, metadata)
    values (doc.garage_id, doc.id, auth.uid(), 'CREDIT_NOTE_ISSUED', 'DRAFT', 'ISSUED', jsonb_build_object('documentNumber', doc_num, 'sourceInvoiceId', inv.id));
    return true;
  end if;

  return false;
end $$;

create function public.convert_quote_to_invoice(p_garage_id uuid, p_quote_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  quote billing_documents%rowtype;
  invoice_id uuid;
  line record;
begin
  select * into quote from billing_documents where id = p_quote_id and garage_id = p_garage_id for update;
  if quote.id is null or quote.document_type <> 'QUOTE' or quote.status <> 'ACCEPTED' then
    raise exception 'quote not convertible';
  end if;
  if quote.converted_invoice_id is not null then
    return quote.converted_invoice_id;
  end if;

  insert into billing_documents (
    garage_id, document_type, status, customer_id,
    appointment_id, registration_case_id, customer_vehicle_id, vehicle_id,
    source_quote_id, customer_snapshot, issuer_snapshot, vehicle_context,
    subtotal_excl_vat_cents, total_vat_cents, total_incl_vat_cents, currency, notes, created_by
  ) values (
    quote.garage_id, 'INVOICE', 'DRAFT', quote.customer_id,
    quote.appointment_id, quote.registration_case_id, quote.customer_vehicle_id, quote.vehicle_id,
    quote.id, quote.customer_snapshot, quote.issuer_snapshot, quote.vehicle_context,
    quote.subtotal_excl_vat_cents, quote.total_vat_cents, quote.total_incl_vat_cents, quote.currency, quote.notes, auth.uid()
  ) returning id into invoice_id;

  for line in select * from billing_document_lines where document_id = quote.id order by line_order loop
    insert into billing_document_lines (
      garage_id, document_id, line_order, description, quantity, unit,
      unit_price_excl_vat_cents, vat_rate_bps, discount_bps,
      line_total_excl_vat_cents, vat_amount_cents, line_total_incl_vat_cents, service_offer_id
    ) values (
      line.garage_id, invoice_id, line.line_order, line.description, line.quantity, line.unit,
      line.unit_price_excl_vat_cents, line.vat_rate_bps, line.discount_bps,
      line.line_total_excl_vat_cents, line.vat_amount_cents, line.line_total_incl_vat_cents, line.service_offer_id
    );
  end loop;

  update billing_documents set status = 'CONVERTED', converted_invoice_id = invoice_id, updated_at = now()
  where id = quote.id;

  insert into billing_document_events (garage_id, document_id, actor_id, event_type, old_status, new_status, metadata)
  values (quote.garage_id, quote.id, auth.uid(), 'QUOTE_CONVERTED', 'ACCEPTED', 'CONVERTED', jsonb_build_object('invoiceId', invoice_id));
  insert into billing_document_events (garage_id, document_id, actor_id, event_type, new_status, metadata)
  values (quote.garage_id, invoice_id, auth.uid(), 'DOCUMENT_CREATED', 'DRAFT', jsonb_build_object('sourceQuoteId', quote.id));

  return invoice_id;
end $$;

create function public.record_invoice_payment(
  p_garage_id uuid,
  p_invoice_id uuid,
  p_amount_cents integer,
  p_payment_method text,
  p_paid_at timestamptz default now(),
  p_reference text default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  inv billing_documents%rowtype;
  payment_id uuid;
  new_paid integer;
  new_status text;
begin
  select * into inv from billing_documents where id = p_invoice_id and garage_id = p_garage_id for update;
  if inv.id is null or inv.document_type <> 'INVOICE' or inv.status not in ('ISSUED', 'PARTIALLY_PAID') then
    raise exception 'invoice not payable';
  end if;
  if p_amount_cents <= 0 then raise exception 'invalid amount'; end if;

  insert into invoice_payments (garage_id, invoice_id, amount_cents, currency, payment_method, paid_at, reference, notes, created_by)
  values (p_garage_id, p_invoice_id, p_amount_cents, inv.currency, p_payment_method, coalesce(p_paid_at, now()), nullif(trim(p_reference), ''), nullif(trim(p_notes), ''), auth.uid())
  returning id into payment_id;

  new_paid := inv.amount_paid_cents + p_amount_cents;
  new_status := case
    when new_paid >= inv.total_incl_vat_cents then 'PAID'
    when new_paid > 0 then 'PARTIALLY_PAID'
    else inv.status
  end;

  update billing_documents set amount_paid_cents = new_paid, status = new_status, updated_at = now()
  where id = inv.id;

  insert into billing_document_events (garage_id, document_id, actor_id, event_type, metadata)
  values (p_garage_id, p_invoice_id, auth.uid(), 'PAYMENT_RECORDED', jsonb_build_object('paymentId', payment_id, 'amountCents', p_amount_cents));

  return payment_id;
end $$;

revoke all on function public.allocate_billing_document_number(uuid, text, date) from public;
revoke all on function public.recalculate_billing_document_totals(uuid) from public;
revoke all on function public.build_billing_customer_snapshot(uuid, uuid) from public;
revoke all on function public.build_billing_issuer_snapshot(uuid) from public;

grant execute on function public.create_billing_document_draft(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, date, text) to authenticated;
grant execute on function public.upsert_billing_document_line(uuid, uuid, uuid, integer, text, integer, text, integer, integer, integer, uuid) to authenticated;
grant execute on function public.remove_billing_document_line(uuid, uuid, uuid) to authenticated;
grant execute on function public.finalize_billing_document(uuid, uuid, text) to authenticated;
grant execute on function public.convert_quote_to_invoice(uuid, uuid) to authenticated;
grant execute on function public.record_invoice_payment(uuid, uuid, integer, text, timestamptz, text, text) to authenticated;

comment on table public.billing_documents is 'Tenant-scoped quotes, invoices and credit notes. Issued documents are immutable except payment/credit balances.';
comment on table public.invoice_payments is 'Manual invoice settlements. Distinct from PayPlug appointment payments and historical_payments.';
