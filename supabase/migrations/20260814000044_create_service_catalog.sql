create table public.service_offers (
  id uuid primary key default gen_random_uuid(), garage_id uuid not null references public.garages(id) on delete cascade,
  service_key text not null, code text not null, name text not null, slug text not null,
  short_description text, description text, is_active boolean not null default false, is_public boolean not null default false,
  display_order integer not null default 0 check(display_order>=0), duration_minutes integer check(duration_minutes between 10 and 480),
  pricing_type text not null check(pricing_type in('FIXED','FROM','QUOTE','VARIABLE')), amount_cents integer check(amount_cents>=0), currency text not null default 'EUR' check(currency~'^[A-Z]{3}$'),
  payment_strategy text not null check(payment_strategy in('NO_PAYMENT','FULL_PAYMENT','DEPOSIT','PAY_ON_SITE')), deposit_amount_cents integer check(deposit_amount_cents>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(garage_id,code),unique(garage_id,slug),
  check(pricing_type not in('FIXED','FROM') or amount_cents is not null),
  check(payment_strategy<>'DEPOSIT' or deposit_amount_cents is not null)
);
create table public.service_offer_options (
  id uuid primary key default gen_random_uuid(),garage_id uuid not null references public.garages(id) on delete cascade,
  offer_id uuid not null references public.service_offers(id) on delete cascade,name text not null,is_active boolean not null default false,is_public boolean not null default false,
  amount_cents integer check(amount_cents>=0),duration_delta_minutes integer not null default 0 check(duration_delta_minutes between -240 and 480),display_order integer not null default 0 check(display_order>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index service_offers_public_idx on public.service_offers(garage_id,service_key,is_active,is_public,display_order);
create index service_offer_options_offer_idx on public.service_offer_options(garage_id,offer_id,is_active,is_public,display_order);

alter table public.appointments add column offer_id uuid references public.service_offers(id) on delete set null;
alter table public.appointments add column commercial_snapshot jsonb;
alter table public.appointments add constraint appointments_commercial_snapshot_valid check(commercial_snapshot is null or (jsonb_typeof(commercial_snapshot)='object' and octet_length(commercial_snapshot::text)<=16384));

create function public.prevent_service_catalog_tenant_change() returns trigger language plpgsql set search_path=public as $$begin if new.garage_id is distinct from old.garage_id then raise exception 'garage_id is immutable';end if;return new;end$$;
create trigger prevent_service_offer_tenant_change before update on public.service_offers for each row execute function public.prevent_service_catalog_tenant_change();
create trigger prevent_service_option_tenant_change before update on public.service_offer_options for each row execute function public.prevent_service_catalog_tenant_change();
create function public.enforce_service_option_tenant() returns trigger language plpgsql set search_path=public as $$begin if not exists(select 1 from service_offers o where o.id=new.offer_id and o.garage_id=new.garage_id) then raise exception 'offer tenant mismatch';end if;return new;end$$;
create trigger enforce_service_option_tenant before insert or update on public.service_offer_options for each row execute function public.enforce_service_option_tenant();

alter table public.service_offers enable row level security;alter table public.service_offer_options enable row level security;
create policy "Members read service offers" on public.service_offers for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=service_offers.garage_id and gm.user_id=auth.uid()));
create policy "Admins manage service offers" on public.service_offers for all to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=service_offers.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin'))) with check(exists(select 1 from garage_members gm where gm.garage_id=service_offers.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin')));
create policy "Members read service options" on public.service_offer_options for select to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=service_offer_options.garage_id and gm.user_id=auth.uid()));
create policy "Admins manage service options" on public.service_offer_options for all to authenticated using(exists(select 1 from garage_members gm where gm.garage_id=service_offer_options.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin'))) with check(exists(select 1 from garage_members gm where gm.garage_id=service_offer_options.garage_id and gm.user_id=auth.uid() and gm.role in('owner','admin')));

create view public.public_live_service_offers with(security_barrier=true) as select g.live_slug garage_slug,o.id,o.service_key,o.name,o.slug,o.short_description,o.duration_minutes,o.pricing_type,o.amount_cents,o.currency,o.payment_strategy,o.deposit_amount_cents,o.display_order from service_offers o join garages g on g.id=o.garage_id join garage_services gs on gs.garage_id=o.garage_id and gs.service_key=o.service_key and gs.is_enabled where g.live_enabled and o.is_active and o.is_public;
revoke all on public.public_live_service_offers from public;grant select on public.public_live_service_offers to anon,authenticated;
create view public.public_live_service_offer_options with(security_barrier=true) as select o.garage_id,x.offer_id,x.id,x.name,x.amount_cents,x.duration_delta_minutes,x.display_order from service_offer_options x join service_offers o on o.id=x.offer_id join garages g on g.id=o.garage_id join garage_services gs on gs.garage_id=o.garage_id and gs.service_key=o.service_key and gs.is_enabled where g.live_enabled and o.is_active and o.is_public and x.is_active and x.is_public;
revoke all on public.public_live_service_offer_options from public;grant select on public.public_live_service_offer_options to anon,authenticated;

insert into public.service_offers(garage_id,service_key,code,name,slug,short_description,is_active,is_public,display_order,duration_minutes,pricing_type,amount_cents,currency,payment_strategy,deposit_amount_cents)
select g.id,v.service_key,v.code,v.name,v.slug,v.short_description,true,true,v.display_order,v.duration_minutes,v.pricing_type,v.amount_cents,'EUR',v.payment_strategy,v.deposit_amount_cents
from public.garages g cross join(values
('ENGINE_CLEANING','ENGINE_CLEANING_UNDER_2L','Décalaminage -2L','engine-cleaning-under-2l','Pour les motorisations inférieures à 2 litres.',10,60,'FIXED',3990,'FULL_PAYMENT',null::integer),
('ENGINE_CLEANING','ENGINE_CLEANING_2L_PLUS','Décalaminage +2L','engine-cleaning-2l-plus','Pour les motorisations de 2 litres et plus.',20,60,'FIXED',4990,'FULL_PAYMENT',null::integer),
('REGISTRATION','REGISTRATION_APPOINTMENT','Rendez-vous carte grise','registration-appointment','Acompte de réservation. Le montant final dépend de la démarche.',30,30,'VARIABLE',null::integer,'DEPOSIT',2000)
)as v(service_key,code,name,slug,short_description,display_order,duration_minutes,pricing_type,amount_cents,payment_strategy,deposit_amount_cents)
where g.id='363f2dc0-bfd3-48d6-a1cc-96e113e96094'
on conflict(garage_id,code) do nothing;
