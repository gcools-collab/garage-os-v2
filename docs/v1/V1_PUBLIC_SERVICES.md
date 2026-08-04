# Services publics par garage

La table `public.garage_services` est la source de vérité. Les propriétaires et administrateurs configurent les services depuis `/settings/services`; les membres disposent d’une lecture seule.

Le registre applicatif conserve les capacités disponibles, y compris celles qu’un garage n’utilise pas encore. Le site public lit uniquement la projection `public.public_live_garage_services`, qui ne révèle que les services activés des garages Live.

## Initialisation explicite de SAP

Après avoir vérifié l’identifiant du garage, exécuter explicitement cette requête si SAP doit recevoir sa configuration initiale :

```sql
insert into public.garage_services (garage_id, service_key, is_enabled, display_order)
select '363f2dc0-bfd3-48d6-a1cc-96e113e96094'::uuid, service_key, true, display_order
from (values
  ('VEHICLE_SALES', 0),
  ('CONSIGNMENT', 1),
  ('RENTAL', 2),
  ('ENGINE_CLEANING', 3),
  ('REGISTRATION', 4)
) as selected(service_key, display_order)
on conflict (garage_id, service_key) do update set
  is_enabled = excluded.is_enabled,
  display_order = excluded.display_order;
```

Cette requête n’est pas exécutée automatiquement par la migration et ne configure aucun autre garage.

## Capacités disponibles

- `VEHICLE_SALES`
- `CONSIGNMENT`
- `RENTAL`
- `REGISTRATION`
- `ENGINE_CLEANING`
- `WORKSHOP`
- `MAINTENANCE`
- `BODYWORK`
- `TYRES`
- `DIAGNOSTIC`
- `FINANCING`
- `INSURANCE`
- `EXTENDED_WARRANTY`

Une configuration absente reste vide et administrable. Aucun service n’est inféré depuis une variable d’environnement.
