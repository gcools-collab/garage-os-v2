-- GO-0090.3C: close implicit PUBLIC execution on payment and billing mutations.
-- Provider reconciliation is service-role only. Billing mutations remain available
-- to authenticated garage members through guarded wrappers only.

revoke execute on function public.apply_verified_payment(
  uuid, text, text, integer, text, boolean, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.apply_verified_payment(
  uuid, text, text, integer, text, boolean, timestamptz, jsonb
) to service_role;

-- Preserve the existing billing implementations behind names that cannot be
-- invoked by API roles. The wrappers add authorization without changing money.
alter function public.create_billing_document_draft(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, date, text)
  rename to create_billing_document_draft_internal;
alter function public.upsert_billing_document_line(uuid, uuid, uuid, integer, text, integer, text, integer, integer, integer, uuid)
  rename to upsert_billing_document_line_internal;
alter function public.remove_billing_document_line(uuid, uuid, uuid)
  rename to remove_billing_document_line_internal;
alter function public.finalize_billing_document(uuid, uuid, text)
  rename to finalize_billing_document_internal;
alter function public.convert_quote_to_invoice(uuid, uuid)
  rename to convert_quote_to_invoice_internal;
alter function public.record_invoice_payment(uuid, uuid, integer, text, timestamptz, text, text)
  rename to record_invoice_payment_internal;

revoke all on function public.create_billing_document_draft_internal(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, date, text) from public, anon, authenticated, service_role;
revoke all on function public.upsert_billing_document_line_internal(uuid, uuid, uuid, integer, text, integer, text, integer, integer, integer, uuid) from public, anon, authenticated, service_role;
revoke all on function public.remove_billing_document_line_internal(uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.finalize_billing_document_internal(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.convert_quote_to_invoice_internal(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.record_invoice_payment_internal(uuid, uuid, integer, text, timestamptz, text, text) from public, anon, authenticated, service_role;

create function public.create_billing_document_draft(
  p_garage_id uuid, p_document_type text, p_customer_id uuid,
  p_appointment_id uuid default null, p_registration_case_id uuid default null,
  p_customer_vehicle_id uuid default null, p_vehicle_id uuid default null,
  p_source_invoice_id uuid default null, p_valid_until date default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.create_billing_document_draft_internal(p_garage_id, p_document_type, p_customer_id, p_appointment_id, p_registration_case_id, p_customer_vehicle_id, p_vehicle_id, p_source_invoice_id, p_valid_until, p_notes);
end $$;

create function public.upsert_billing_document_line(
  p_garage_id uuid, p_document_id uuid, p_line_id uuid, p_line_order integer,
  p_description text, p_quantity integer, p_unit text,
  p_unit_price_excl_vat_cents integer, p_vat_rate_bps integer,
  p_discount_bps integer, p_service_offer_id uuid default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.upsert_billing_document_line_internal(p_garage_id, p_document_id, p_line_id, p_line_order, p_description, p_quantity, p_unit, p_unit_price_excl_vat_cents, p_vat_rate_bps, p_discount_bps, p_service_offer_id);
end $$;

create function public.remove_billing_document_line(
  p_garage_id uuid, p_document_id uuid, p_line_id uuid
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.remove_billing_document_line_internal(p_garage_id, p_document_id, p_line_id);
end $$;

create function public.finalize_billing_document(
  p_garage_id uuid, p_document_id uuid, p_action text
) returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.finalize_billing_document_internal(p_garage_id, p_document_id, p_action);
end $$;

create function public.convert_quote_to_invoice(
  p_garage_id uuid, p_quote_id uuid
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from public.garage_members gm where gm.garage_id = p_garage_id and gm.user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.convert_quote_to_invoice_internal(p_garage_id, p_quote_id);
end $$;

create function public.record_invoice_payment(
  p_garage_id uuid, p_invoice_id uuid, p_amount_cents integer,
  p_payment_method text, p_paid_at timestamptz default now(),
  p_reference text default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare invoice_garage_id uuid;
begin
  -- Resolve ownership from the invoice row; caller input is never proof.
  select d.garage_id into invoice_garage_id from public.billing_documents d
  where d.id = p_invoice_id and d.document_type = 'INVOICE';
  if invoice_garage_id is null
    or invoice_garage_id is distinct from p_garage_id
    or auth.uid() is null
    or not exists (select 1 from public.garage_members gm where gm.garage_id = invoice_garage_id and gm.user_id = auth.uid())
  then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  return public.record_invoice_payment_internal(invoice_garage_id, p_invoice_id, p_amount_cents, p_payment_method, p_paid_at, p_reference, p_notes);
end $$;

revoke execute on function public.create_billing_document_draft(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, date, text) from public, anon;
revoke execute on function public.upsert_billing_document_line(uuid, uuid, uuid, integer, text, integer, text, integer, integer, integer, uuid) from public, anon;
revoke execute on function public.remove_billing_document_line(uuid, uuid, uuid) from public, anon;
revoke execute on function public.finalize_billing_document(uuid, uuid, text) from public, anon;
revoke execute on function public.convert_quote_to_invoice(uuid, uuid) from public, anon;
revoke execute on function public.record_invoice_payment(uuid, uuid, integer, text, timestamptz, text, text) from public, anon;

grant execute on function public.create_billing_document_draft(uuid, text, uuid, uuid, uuid, uuid, uuid, uuid, date, text) to authenticated;
grant execute on function public.upsert_billing_document_line(uuid, uuid, uuid, integer, text, integer, text, integer, integer, integer, uuid) to authenticated;
grant execute on function public.remove_billing_document_line(uuid, uuid, uuid) to authenticated;
grant execute on function public.finalize_billing_document(uuid, uuid, text) to authenticated;
grant execute on function public.convert_quote_to_invoice(uuid, uuid) to authenticated;
grant execute on function public.record_invoice_payment(uuid, uuid, integer, text, timestamptz, text, text) to authenticated;
