create or replace function public.execute_vehicle_publication_transition(
  p_vehicle_id uuid,
  p_garage_id uuid,
  p_expected_status text,
  p_target_status text,
  p_publication_status public.vehicle_publication_status,
  p_published_at timestamptz,
  p_event_database_type text,
  p_event_description text,
  p_event_metadata jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_id uuid;
  transition_allowed boolean;
begin
  if auth.uid() is null or not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = p_garage_id and gm.user_id = auth.uid()
  ) then
    raise exception 'publication_forbidden' using errcode = '42501';
  end if;

  transition_allowed := case
    when p_expected_status in ('PURCHASED', 'PREPARATION') and p_target_status = 'READY_TO_PUBLISH' then true
    when p_expected_status = 'READY_TO_PUBLISH' and p_target_status = 'PUBLISHED' then true
    when p_expected_status = 'PUBLISHED' and p_target_status in ('READY_TO_PUBLISH', 'RESERVED') then true
    when p_expected_status = 'RESERVED' and p_target_status = 'SOLD' then true
    when p_expected_status = 'SOLD' and p_target_status = 'ARCHIVED' then true
    else false
  end;

  if not transition_allowed then
    raise exception 'invalid_publication_transition' using errcode = '22023';
  end if;

  update public.vehicles
  set
    status = p_target_status::public.vehicle_status,
    publication_status = p_publication_status,
    published_at = p_published_at,
    updated_at = now()
  where id = p_vehicle_id
    and garage_id = p_garage_id
    and status::text = p_expected_status
  returning id into updated_id;

  if updated_id is null then
    return false;
  end if;

  insert into public.vehicle_events (vehicle_id, type, description, metadata)
  values (
    p_vehicle_id,
    p_event_database_type::public.vehicle_event_type,
    p_event_description,
    coalesce(p_event_metadata, '{}'::jsonb)
  );

  return true;
end;
$$;

revoke all on function public.execute_vehicle_publication_transition(
  uuid, uuid, text, text, public.vehicle_publication_status,
  timestamptz, text, text, jsonb
) from public, anon;

grant execute on function public.execute_vehicle_publication_transition(
  uuid, uuid, text, text, public.vehicle_publication_status,
  timestamptz, text, text, jsonb
) to authenticated;

comment on function public.execute_vehicle_publication_transition is
'Persiste atomiquement une transition de publication tenant-scopée et son événement métier.';
