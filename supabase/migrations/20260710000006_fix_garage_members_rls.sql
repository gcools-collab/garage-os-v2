drop policy if exists "Members can view garage members"
on public.garage_members;


create policy "Users can view own memberships"
on public.garage_members
for select
using (
  user_id = auth.uid()
);



create policy "Users can create own membership"
on public.garage_members
for insert
with check (
  user_id = auth.uid()
);