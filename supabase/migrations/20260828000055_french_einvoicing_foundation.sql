-- GO-0089.1: French e-invoicing data model (additive, tenant-scoped, no secrets)

alter table public.garage_fiscal_settings
  add column if not exists default_transaction_nature text not null default 'SERVICES'
    check (default_transaction_nature in ('GOODS', 'SERVICES', 'MIXED')),
  add column if not exists delivery_address_line1 text,
  add column if not exists delivery_address_line2 text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_city text,
  add column if not exists delivery_country_code text
    check (delivery_country_code is null or delivery_country_code ~ '^[A-Z]{2}$');

alter table public.customers
  add column if not exists company_name text,
  add column if not exists siren text check (siren is null or siren ~ '^\d{9}$'),
  add column if not exists vat_number text check (vat_number is null or char_length(trim(vat_number)) between 4 and 20),
  add column if not exists country_code text not null default 'FR' check (country_code ~ '^[A-Z]{2}$'),
  add column if not exists delivery_address_line text,
  add column if not exists delivery_postal_code text,
  add column if not exists delivery_city text;

create table public.garage_electronic_invoice_settings (
  garage_id uuid primary key references public.garages(id) on delete cascade,
  provider_name text not null default 'NONE'
    check (provider_name in ('NONE', 'B2BROUTER', 'TIIME', 'BILLIT')),
  provider_mode text not null default 'DISABLED'
    check (provider_mode in ('DISABLED', 'UNCONFIGURED', 'SANDBOX', 'PRODUCTION')),
  sandbox_account_id text check (sandbox_account_id is null or char_length(trim(sandbox_account_id)) between 1 and 80),
  production_account_id text check (production_account_id is null or char_length(trim(production_account_id)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_garage_electronic_invoice_settings_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger garage_electronic_invoice_settings_updated_at
before update on public.garage_electronic_invoice_settings
for each row execute function public.set_garage_electronic_invoice_settings_updated_at();

alter table public.garage_electronic_invoice_settings enable row level security;

create policy "Members read garage e-invoice settings"
on public.garage_electronic_invoice_settings for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_electronic_invoice_settings.garage_id and gm.user_id = auth.uid()
));

create policy "Admins manage garage e-invoice settings"
on public.garage_electronic_invoice_settings for all to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_electronic_invoice_settings.garage_id
    and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_electronic_invoice_settings.garage_id
    and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
));

alter table public.billing_documents
  add column if not exists electronic_provider_metadata jsonb not null default '{}',
  add column if not exists electronic_submission_errors jsonb not null default '[]',
  add column if not exists transaction_nature text
    check (transaction_nature is null or transaction_nature in ('GOODS', 'SERVICES', 'MIXED')),
  add column if not exists recipient_context text
    check (recipient_context is null or recipient_context in ('B2B_FR', 'B2C_FR', 'B2G_FR', 'INTERNATIONAL'));

alter table public.billing_documents
  add constraint billing_documents_electronic_metadata_bounded check (
    jsonb_typeof(electronic_provider_metadata) = 'object'
    and jsonb_typeof(electronic_submission_errors) = 'array'
    and octet_length(electronic_provider_metadata::text) <= 8192
    and octet_length(electronic_submission_errors::text) <= 4096
  );

create or replace function public.build_billing_customer_snapshot(p_customer_id uuid, p_garage_id uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare c customers%rowtype;
begin
  select * into c from customers where id = p_customer_id and garage_id = p_garage_id;
  if c.id is null then return '{}'::jsonb; end if;
  return jsonb_build_object(
    'customerId', c.id,
    'name', trim(coalesce(c.company_name, coalesce(c.first_name, '') || ' ' || coalesce(c.last_name, ''))),
    'companyName', c.company_name,
    'firstName', c.first_name,
    'lastName', c.last_name,
    'email', c.email,
    'phone', c.phone,
    'addressLine', c.address_line,
    'postalCode', c.postal_code,
    'city', c.city,
    'countryCode', c.country_code,
    'siren', c.siren,
    'vatNumber', c.vat_number,
    'deliveryAddressLine', c.delivery_address_line,
    'deliveryPostalCode', c.delivery_postal_code,
    'deliveryCity', c.delivery_city
  );
end $$;

comment on table public.garage_electronic_invoice_settings is
  'Non-secret PA configuration per garage. API keys remain in server environment only.';
comment on column public.billing_documents.electronic_provider_metadata is
  'Generic provider references (submission id, last poll, etc.). No secrets.';
