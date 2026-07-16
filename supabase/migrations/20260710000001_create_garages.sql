create table public.garages (

  id uuid primary key default gen_random_uuid(),

  name text not null,

  created_at timestamptz
  default now()

);


alter table public.garages
enable row level security;