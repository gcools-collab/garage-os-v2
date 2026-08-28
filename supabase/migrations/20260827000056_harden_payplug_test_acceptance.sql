-- GO-0090.3: additive safety constraints required before PayPlug TEST acceptance.
-- This migration must be applied only after checking that no appointment already
-- owns more than one active operational payment.

create unique index if not exists payments_one_active_per_appointment
  on public.payments (appointment_id)
  where status in ('CREATED', 'PENDING', 'PAID');

grant execute on function public.apply_verified_payment(uuid, text, text, integer, text, boolean, timestamptz, jsonb)
  to service_role;

alter table public.notifications drop constraint if exists notifications_entity_type_check;
alter table public.notifications add constraint notifications_entity_type_check check (
  entity_type is null or entity_type in (
    'lead', 'commercial_task', 'vehicle', 'system', 'appointment', 'registration_case', 'payment'
  )
);
