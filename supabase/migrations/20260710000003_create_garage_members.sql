create table public.garage_members (

id uuid primary key default gen_random_uuid(),

garage_id uuid references public.garages(id)
on delete cascade,

user_id uuid references public.profiles(id)
on delete cascade,


role text default 'member',


created_at timestamptz
default now()

);


alter table public.garage_members
enable row level security;