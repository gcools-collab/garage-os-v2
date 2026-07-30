create type public.copilot_action_type as enum (
  'OPEN_ENTITY', 'CREATE_TASK', 'CHANGE_PRICE', 'CHANGE_STATUS', 'MARK_CONTACTED'
);
create type public.copilot_action_status as enum (
  'PROPOSED', 'EXECUTED', 'CANCELLED', 'REJECTED'
);
create type public.copilot_action_confidence as enum ('LOW', 'MEDIUM', 'HIGH');
create type public.copilot_action_target_type as enum ('VEHICLE', 'LEAD', 'COMMERCIAL_TASK');

create table public.copilot_action_logs (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  conversation_id uuid not null,
  action public.copilot_action_type not null,
  target_type public.copilot_action_target_type not null,
  target_id uuid not null,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and pg_column_size(payload) <= 16384
  ),
  target_snapshot jsonb not null check (
    jsonb_typeof(target_snapshot) = 'object' and pg_column_size(target_snapshot) <= 16384
  ),
  explanation text not null check (char_length(explanation) between 3 and 500),
  confidence public.copilot_action_confidence not null,
  status public.copilot_action_status not null default 'PROPOSED',
  result_message text check (result_message is null or char_length(result_message) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint copilot_action_conversation_scope_fk
    foreign key (conversation_id, garage_id, user_id)
    references public.copilot_conversations (id, garage_id, created_by_user_id)
    on delete restrict,
  constraint copilot_action_resolution_check check (
    (status = 'PROPOSED' and resolved_at is null)
    or (status <> 'PROPOSED' and resolved_at is not null)
  )
);

create index copilot_action_logs_conversation_created_idx
  on public.copilot_action_logs (conversation_id, created_at);
create index copilot_action_logs_garage_user_status_idx
  on public.copilot_action_logs (garage_id, user_id, status);
create index copilot_action_logs_target_idx
  on public.copilot_action_logs (garage_id, target_type, target_id);

create function public.validate_copilot_action_log()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'PROPOSED' or new.resolved_at is not null then
      raise exception 'A Copilot action must start as proposed' using errcode = '42501';
    end if;
    if not exists (
      select 1 from public.garage_members gm
      where gm.garage_id = new.garage_id and gm.user_id = new.user_id
    ) then
      raise exception 'Copilot action user is not a garage member' using errcode = '42501';
    end if;
  else
    if (
      new.garage_id is distinct from old.garage_id
      or new.user_id is distinct from old.user_id
      or new.conversation_id is distinct from old.conversation_id
      or new.action is distinct from old.action
      or new.target_type is distinct from old.target_type
      or new.target_id is distinct from old.target_id
      or new.payload is distinct from old.payload
      or new.target_snapshot is distinct from old.target_snapshot
      or new.explanation is distinct from old.explanation
      or new.confidence is distinct from old.confidence
      or new.created_at is distinct from old.created_at
    ) then
      raise exception 'Copilot action audit fields are immutable' using errcode = '42501';
    end if;
    if old.status <> 'PROPOSED' or new.status = 'PROPOSED' then
      raise exception 'Copilot action status transition is invalid' using errcode = '42501';
    end if;
    if new.resolved_at is null then
      raise exception 'Resolved Copilot action requires a timestamp' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger validate_copilot_action_log_trigger
before insert or update on public.copilot_action_logs
for each row execute function public.validate_copilot_action_log();

alter table public.copilot_action_logs enable row level security;

create policy "Users read their private copilot action logs"
on public.copilot_action_logs for select to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_action_logs.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Users create their private copilot action proposals"
on public.copilot_action_logs for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'PROPOSED'
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_action_logs.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Users resolve their private copilot action proposals"
on public.copilot_action_logs for update to authenticated
using (user_id = auth.uid() and status = 'PROPOSED')
with check (
  user_id = auth.uid()
  and status in ('EXECUTED', 'CANCELLED', 'REJECTED')
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_action_logs.garage_id and gm.user_id = auth.uid()
  )
);

revoke all on table public.copilot_action_logs from anon;
grant select, insert, update on table public.copilot_action_logs to authenticated;
