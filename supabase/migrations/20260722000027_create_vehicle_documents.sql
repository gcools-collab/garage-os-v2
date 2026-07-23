create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  garage_id uuid not null references public.garages(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  category text not null,
  label text not null check (char_length(trim(label)) between 1 and 120),
  original_filename text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_documents_category_check check (category in (
    'purchase_invoice', 'registration_certificate', 'technical_inspection',
    'maintenance_invoice', 'repair_invoice', 'quotation', 'sales_document',
    'warranty', 'administrative', 'insurance', 'other'
  ))
);

create index vehicle_documents_vehicle_id_idx on public.vehicle_documents(vehicle_id);
create index vehicle_documents_garage_id_idx on public.vehicle_documents(garage_id);
create index vehicle_documents_category_idx on public.vehicle_documents(category);

create function public.validate_vehicle_document_ownership()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.vehicles v
    where v.id = new.vehicle_id and v.garage_id = new.garage_id
  ) then
    raise exception 'Document garage and vehicle do not match';
  end if;
  return new;
end;
$$;

create trigger validate_vehicle_document_ownership_trigger
before insert or update of garage_id, vehicle_id on public.vehicle_documents
for each row execute function public.validate_vehicle_document_ownership();

create function public.set_vehicle_document_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_vehicle_document_updated_at_trigger
before update on public.vehicle_documents
for each row execute function public.set_vehicle_document_updated_at();

create function public.protect_vehicle_document_file_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.garage_id is distinct from old.garage_id
    or new.vehicle_id is distinct from old.vehicle_id
    or new.storage_path is distinct from old.storage_path
    or new.original_filename is distinct from old.original_filename
    or new.mime_type is distinct from old.mime_type
    or new.size_bytes is distinct from old.size_bytes
    or new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'Vehicle document file metadata is immutable';
  end if;
  return new;
end;
$$;

create trigger protect_vehicle_document_file_metadata_trigger
before update on public.vehicle_documents
for each row execute function public.protect_vehicle_document_file_metadata();

alter table public.vehicle_documents enable row level security;

create policy "Garage members can read vehicle documents"
on public.vehicle_documents for select to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = vehicle_documents.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can create vehicle documents"
on public.vehicle_documents for insert to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.id = vehicle_documents.vehicle_id
      and v.garage_id = vehicle_documents.garage_id
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can update vehicle documents"
on public.vehicle_documents for update to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = vehicle_documents.garage_id and gm.user_id = auth.uid()
));

create policy "Garage members can delete vehicle documents"
on public.vehicle_documents for delete to authenticated
using (exists (
  select 1 from public.garage_members gm
  where gm.garage_id = vehicle_documents.garage_id and gm.user_id = auth.uid()
));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-documents', 'vehicle-documents', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Garage members can upload vehicle documents"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'vehicle-documents'
  and array_length(storage.foldername(name), 1) = 3
  and exists (
    select 1 from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.garage_id::text = (storage.foldername(name))[1]
      and v.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can read vehicle document objects"
on storage.objects for select to authenticated
using (
  bucket_id = 'vehicle-documents'
  and exists (
    select 1 from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.garage_id::text = (storage.foldername(name))[1]
      and v.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);

create policy "Garage members can delete vehicle document objects"
on storage.objects for delete to authenticated
using (
  bucket_id = 'vehicle-documents'
  and exists (
    select 1 from public.vehicles v
    join public.garage_members gm on gm.garage_id = v.garage_id
    where v.garage_id::text = (storage.foldername(name))[1]
      and v.id::text = (storage.foldername(name))[2]
      and gm.user_id = auth.uid()
  )
);
