-- =========================
-- PROFILES
-- =========================

create policy "Users can view own profile"
on public.profiles
for select
using (
  auth.uid() = id
);


create policy "Users can update own profile"
on public.profiles
for update
using (
  auth.uid() = id
);



-- =========================
-- GARAGES
-- =========================

create policy "Members can view their garages"
on public.garages
for select
using (

  exists (

    select 1
    from public.garage_members gm

    where gm.garage_id = garages.id
    and gm.user_id = auth.uid()

  )

);



create policy "Owners can update garage"
on public.garages
for update
using (

  exists (

    select 1
    from public.garage_members gm

    where gm.garage_id = garages.id
    and gm.user_id = auth.uid()
    and gm.role = 'owner'

  )

);



-- =========================
-- GARAGE MEMBERS
-- =========================

create policy "Members can view garage members"
on public.garage_members
for select
using (

  exists (

    select 1
    from public.garage_members gm

    where gm.garage_id = garage_members.garage_id
    and gm.user_id = auth.uid()

  )

);