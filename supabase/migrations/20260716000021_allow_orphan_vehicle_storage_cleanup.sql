drop policy "Garage members can delete vehicle storage objects"
on storage.objects;

create policy "Garage members can delete vehicle storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vehicle-images'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.garage_members gm
    where gm.garage_id::text = (storage.foldername(name))[1]
      and gm.user_id = auth.uid()
  )
);
