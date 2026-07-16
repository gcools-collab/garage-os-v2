-- =====================================
-- GARAGES RLS
-- =====================================


drop policy if exists "Members can view their garages"
on public.garages;


drop policy if exists "Members can view their garages"
on public.garages;


drop policy if exists "Owners can update garage"
on public.garages;



-- Lecture :
-- un utilisateur voit uniquement ses garages

create policy "Users can view their garages"

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



-- Création :
-- un utilisateur connecté peut créer son garage

create policy "Users can create garages"

on public.garages

for insert

with check (

  auth.uid() is not null

);



-- Modification :
-- seul le owner peut modifier

create policy "Owners can update garages"

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