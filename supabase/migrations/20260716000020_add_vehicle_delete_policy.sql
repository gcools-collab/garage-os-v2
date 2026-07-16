create policy "Garage members can delete vehicles"
on public.vehicles
for delete
using (
  exists (
    select 1
    from public.garage_members gm
    where gm.garage_id = vehicles.garage_id
      and gm.user_id = auth.uid()
  )
);
