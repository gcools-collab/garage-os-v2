create policy "Authenticated users can create garages"

on public.garages

for insert

with check (

  auth.uid() is not null

);