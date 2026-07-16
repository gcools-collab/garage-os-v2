create table public.profiles (

id uuid primary key references auth.users(id)
on delete cascade,

full_name text,

created_at timestamptz
default now()

);


alter table public.profiles
enable row level security;