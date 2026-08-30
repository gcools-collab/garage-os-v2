-- GO-0097A: acquisition document paths are garage_id/opportunity_id/file_name.
-- storage.foldername(name) therefore contains exactly two folders.

drop policy if exists "Garage members upload acquisition documents"
on storage.objects;

create policy "Garage members upload acquisition documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'acquisition-documents'
  and array_length(storage.foldername(name), 1) = 2
  and exists (
    select 1
    from public.acquisition_opportunities ao
    join public.garage_members gm on gm.garage_id = ao.garage_id
    where ao.garage_id::text = (storage.foldername(name))[1]
      and ao.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);
