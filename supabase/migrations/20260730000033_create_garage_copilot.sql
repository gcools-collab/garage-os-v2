create type public.copilot_conversation_status as enum ('ACTIVE', 'ARCHIVED');
create type public.copilot_message_role as enum ('USER', 'ASSISTANT', 'SYSTEM');
create type public.copilot_message_status as enum ('PENDING', 'COMPLETED', 'FAILED', 'BLOCKED');

create table public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  title text check (title is null or char_length(title) between 1 and 120),
  status public.copilot_conversation_status not null default 'ACTIVE',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  retention_until timestamptz not null default (now() + interval '90 days'),
  unique (id, garage_id),
  unique (id, garage_id, created_by_user_id)
);

create table public.copilot_messages (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  conversation_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  role public.copilot_message_role not null,
  status public.copilot_message_status not null,
  content text not null check (char_length(content) between 1 and 6000),
  structured_payload jsonb check (
    structured_payload is null
    or (
      jsonb_typeof(structured_payload) = 'object'
      and pg_column_size(structured_payload) <= 32768
    )
  ),
  provider text check (provider is null or char_length(provider) <= 80),
  model text check (model is null or char_length(model) <= 120),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 100),
  created_at timestamptz not null default now(),
  constraint copilot_message_conversation_scope_fk
    foreign key (conversation_id, garage_id)
    references public.copilot_conversations (id, garage_id)
    deferrable initially immediate,
  constraint copilot_message_user_role_check check (
    (role = 'USER' and user_id is not null)
    or (role in ('ASSISTANT', 'SYSTEM') and user_id is null)
  )
);

create index copilot_conversations_user_recent_idx
  on public.copilot_conversations (created_by_user_id, last_message_at desc);
create index copilot_conversations_garage_user_status_idx
  on public.copilot_conversations (garage_id, created_by_user_id, status);
create index copilot_conversations_garage_updated_idx
  on public.copilot_conversations (garage_id, updated_at desc);
create index copilot_messages_conversation_created_idx
  on public.copilot_messages (conversation_id, created_at);
create index copilot_messages_garage_created_idx
  on public.copilot_messages (garage_id, created_at);
create index copilot_messages_user_created_idx
  on public.copilot_messages (user_id, created_at) where user_id is not null;

create function public.validate_copilot_conversation_scope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    new.garage_id is distinct from old.garage_id
    or new.created_by_user_id is distinct from old.created_by_user_id
  ) then
    raise exception 'Copilot conversation ownership cannot be changed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.garage_members gm
    where gm.garage_id = new.garage_id and gm.user_id = new.created_by_user_id
  ) then
    raise exception 'Copilot conversation owner is not a garage member' using errcode = '42501';
  end if;
  if new.status = 'ARCHIVED' and new.archived_at is null then new.archived_at := now(); end if;
  if new.status = 'ACTIVE' then new.archived_at := null; end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger validate_copilot_conversation_scope_trigger
before insert or update on public.copilot_conversations
for each row execute function public.validate_copilot_conversation_scope();

create function public.validate_copilot_message_scope()
returns trigger
language plpgsql
set search_path = public
as $$
declare owner_id uuid;
begin
  if tg_op = 'UPDATE' and (
    new.garage_id is distinct from old.garage_id
    or new.conversation_id is distinct from old.conversation_id
    or new.user_id is distinct from old.user_id
    or new.role is distinct from old.role
  ) then
    raise exception 'Copilot message ownership cannot be changed' using errcode = '42501';
  end if;
  select c.created_by_user_id into owner_id
  from public.copilot_conversations c
  where c.id = new.conversation_id and c.garage_id = new.garage_id and c.status = 'ACTIVE';
  if owner_id is null then
    raise exception 'Copilot conversation is unavailable' using errcode = '42501';
  end if;
  if new.role = 'USER' and new.user_id is distinct from owner_id then
    raise exception 'Copilot user message owner is invalid' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_copilot_message_scope_trigger
before insert or update on public.copilot_messages
for each row execute function public.validate_copilot_message_scope();

alter table public.copilot_conversations enable row level security;
alter table public.copilot_messages enable row level security;

create policy "Users manage their private copilot conversations"
on public.copilot_conversations for select to authenticated
using (
  created_by_user_id = auth.uid()
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_conversations.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Users create their private copilot conversations"
on public.copilot_conversations for insert to authenticated
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_conversations.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Users update their private copilot conversations"
on public.copilot_conversations for update to authenticated
using (created_by_user_id = auth.uid())
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1 from public.garage_members gm
    where gm.garage_id = copilot_conversations.garage_id and gm.user_id = auth.uid()
  )
);

create policy "Users read messages from their private copilot conversations"
on public.copilot_messages for select to authenticated
using (
  exists (
    select 1 from public.copilot_conversations c
    where c.id = copilot_messages.conversation_id
      and c.garage_id = copilot_messages.garage_id
      and c.created_by_user_id = auth.uid()
  )
);

create policy "Users create messages in their private copilot conversations"
on public.copilot_messages for insert to authenticated
with check (
  (role <> 'USER' or user_id = auth.uid())
  and exists (
    select 1 from public.copilot_conversations c
    where c.id = copilot_messages.conversation_id
      and c.garage_id = copilot_messages.garage_id
      and c.created_by_user_id = auth.uid()
      and c.status = 'ACTIVE'
  )
);

revoke all on table public.copilot_conversations from anon;
revoke all on table public.copilot_messages from anon;
grant select, insert, update on table public.copilot_conversations to authenticated;
grant select, insert on table public.copilot_messages to authenticated;
