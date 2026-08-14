create or replace function public.book_public_catalog_appointment(p_garage_slug text,p_vehicle_slug text,p_lead_id uuid,p_type text,p_starts_at timestamptz,p_customer_name text,p_phone text,p_email text,p_details jsonb,p_fingerprint text,p_offer_slug text,p_option_ids uuid[] default '{}')
returns table(appointment_id uuid,outcome text,status text) language plpgsql security definer set search_path=public,pg_temp as $$
declare g garages%rowtype;o service_offers%rowtype;r record;invalid_options integer;options_total integer;total_amount integer;due_now integer;remaining integer;snapshot jsonb;final_status text;
begin
 select * into g from garages where live_slug=lower(trim(p_garage_slug)) and live_enabled;
 if g.id is null then return query select null::uuid,'unavailable_garage',null::text;return;end if;
 select so.* into o from service_offers so join garage_services gs on gs.garage_id=so.garage_id and gs.service_key=so.service_key and gs.is_enabled where so.garage_id=g.id and so.slug=p_offer_slug and so.service_key=p_type and so.is_active and so.is_public;
 if o.id is null then return query select null::uuid,'offer_unavailable',null::text;return;end if;
 select count(*) into invalid_options from unnest(coalesce(p_option_ids,'{}')) selected(id) where not exists(select 1 from service_offer_options x where x.id=selected.id and x.offer_id=o.id and x.garage_id=g.id and x.is_active and x.is_public);
 if invalid_options>0 then return query select null::uuid,'invalid_options',null::text;return;end if;
 select coalesce(sum(x.amount_cents),0) into options_total from service_offer_options x where x.id=any(coalesce(p_option_ids,'{}')) and x.offer_id=o.id;
 total_amount:=case when o.amount_cents is null then null else o.amount_cents+options_total end;
 due_now:=case when o.payment_strategy='FULL_PAYMENT' then total_amount when o.payment_strategy='DEPOSIT' then o.deposit_amount_cents else 0 end;
 remaining:=case when total_amount is null then null when o.payment_strategy='FULL_PAYMENT' then 0 when o.payment_strategy='DEPOSIT' and due_now is not null then greatest(0,total_amount-due_now) else total_amount end;
 snapshot:=jsonb_build_object('offer_id',o.id,'offer_name',o.name,'offer_code',o.code,'service_key',o.service_key,'pricing_type',o.pricing_type,'base_amount_cents',o.amount_cents,'selected_options',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'name',x.name,'amount_cents',x.amount_cents) order by x.display_order) from service_offer_options x where x.id=any(coalesce(p_option_ids,'{}')) and x.offer_id=o.id),'[]'::jsonb),'options_amount_cents',options_total,'total_amount_cents',total_amount,'payment_strategy',o.payment_strategy,'amount_due_now_cents',due_now,'remaining_amount_cents',remaining,'currency',o.currency);
 select * into r from public.book_public_appointment(p_garage_slug,p_vehicle_slug,p_lead_id,p_type,p_starts_at,p_customer_name,p_phone,p_email,p_details,p_fingerprint);
 if r.outcome<>'success' then return query select r.appointment_id,r.outcome,r.status;return;end if;
 final_status:=case when o.payment_strategy in('FULL_PAYMENT','DEPOSIT') then 'AWAITING_PAYMENT' else r.status end;
 update appointments set offer_id=o.id,commercial_snapshot=snapshot,payment_required=o.payment_strategy in('FULL_PAYMENT','DEPOSIT'),status=final_status where id=r.appointment_id and garage_id=g.id;
 if final_status='AWAITING_PAYMENT' and r.status<>'AWAITING_PAYMENT' then insert into appointment_events(garage_id,appointment_id,event_type,old_status,new_status,metadata) values(g.id,r.appointment_id,'PAYMENT_REQUIRED',r.status,final_status,jsonb_build_object('offerId',o.id));end if;
 return query select r.appointment_id,'success',final_status;
end$$;
revoke all on function public.book_public_catalog_appointment(text,text,uuid,text,timestamptz,text,text,text,jsonb,text,text,uuid[]) from public;
grant execute on function public.book_public_catalog_appointment(text,text,uuid,text,timestamptz,text,text,text,jsonb,text,text,uuid[]) to anon,authenticated;
