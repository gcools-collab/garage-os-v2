-- À exécuter avec `supabase test db`.
set local role anon;

do $$
begin
  begin
    perform 1 from public.leads;
    raise exception 'anon must not read leads';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.leads set status = 'WON';
    raise exception 'anon must not update leads';
  exception when insufficient_privilege then null;
  end;
end
$$;

-- La RPC est le seul point d'entrée anonyme. Elle résout les slugs,
-- impose NEW/LIVE_VEHICLE_PAGE et refuse garages ou véhicules privés.
