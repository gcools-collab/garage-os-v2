alter table public.garage_branding
add column latitude double precision,
add column longitude double precision,
add constraint garage_branding_latitude_check
  check (latitude is null or latitude between -90 and 90),
add constraint garage_branding_longitude_check
  check (longitude is null or longitude between -180 and 180),
add constraint garage_branding_coordinates_pair_check
  check ((latitude is null) = (longitude is null));

comment on column public.garage_branding.latitude is
'Latitude du garage utilisée pour les analyses de marché géographiques.';

comment on column public.garage_branding.longitude is
'Longitude du garage utilisée pour les analyses de marché géographiques.';
