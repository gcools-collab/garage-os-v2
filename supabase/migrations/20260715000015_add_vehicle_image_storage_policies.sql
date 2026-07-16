-- Authorize authenticated garage members to manage vehicle images in Storage.
-- Expected object path: garage_id/vehicle_id/file_name

create policy "Garage members can upload vehicle storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vehicle-images'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.vehicles v
    join public.garage_members gm
      on gm.garage_id = v.garage_id
    where v.id::text = (storage.foldername(name))[2]
      and v.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can read vehicle storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'vehicle-images'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.vehicles v
    join public.garage_members gm
      on gm.garage_id = v.garage_id
    where v.id::text = (storage.foldername(name))[2]
      and v.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can delete vehicle storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-images'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.vehicles v
    join public.garage_members gm
      on gm.garage_id = v.garage_id
    where v.id::text = (storage.foldername(name))[2]
      and v.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
  )
);
