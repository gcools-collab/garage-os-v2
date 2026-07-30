-- À exécuter avec `supabase test db` après la migration GO-0061.3.
-- Les vues publiques n'exposent que leur projection explicite et conservent
-- les tables métier sous leurs policies RLS existantes.
set local role anon;
select garage_id, live_slug from public.public_live_garages;
select id, garage_id, live_slug from public.public_live_vehicles;
select id, vehicle_id, garage_id, storage_path from public.public_live_vehicle_images;

do $$
begin
  if exists (
    select 1
    from public.public_live_vehicles
    where publication_status <> 'PUBLISHED'
       or status in ('SOLD', 'DELIVERED', 'ARCHIVED', 'CANCELLED')
  ) then
    raise exception 'La projection Live expose une ligne privée';
  end if;
end
$$;
