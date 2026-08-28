-- GO-0089: Garage fiscal identity for billing documents (additive, tenant-scoped)

create table public.garage_fiscal_settings (
  garage_id uuid primary key references public.garages(id) on delete cascade,
  siren text check (siren is null or siren ~ '^\d{9}$'),
  siret text check (siret is null or siret ~ '^\d{14}$'),
  vat_number text check (vat_number is null or char_length(trim(vat_number)) between 4 and 20),
  legal_form text check (legal_form is null or char_length(trim(legal_form)) between 2 and 80),
  default_vat_rate_bps integer not null default 2000 check (default_vat_rate_bps between 0 and 10000),
  invoice_footer_text text check (invoice_footer_text is null or char_length(invoice_footer_text) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_garage_fiscal_settings_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger garage_fiscal_settings_updated_at
before update on public.garage_fiscal_settings
for each row execute function public.set_garage_fiscal_settings_updated_at();

alter table public.garage_fiscal_settings enable row level security;

create policy "Members read garage fiscal settings"
on public.garage_fiscal_settings for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_fiscal_settings.garage_id and gm.user_id = auth.uid()
));

create policy "Admins manage garage fiscal settings"
on public.garage_fiscal_settings for all to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_fiscal_settings.garage_id
    and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
))
with check (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = garage_fiscal_settings.garage_id
    and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')
));

comment on table public.garage_fiscal_settings is
  'Issuer fiscal identity for billing. Missing SIRET/VAT must be surfaced in UI before production invoicing.';
