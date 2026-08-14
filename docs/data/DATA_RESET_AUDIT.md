# GO-0082 — Audit de remise à zéro des données

## Garde-fous

Le reset est **tenant-scopé par `garage_id`**, interdit en production et désactivé par défaut. Il ne doit jamais viser `auth.users`, un garage, ses membres ou sa configuration. Aucun reset n'a été exécuté pendant GO-0082.

L'exécution future exige simultanément `NODE_ENV != production`, `GARAGE_OS_ENABLE_TENANT_RESET=true`, un UUID de garage explicite et la confirmation exacte `RESET:<garage_id>`. Un dry-run et une sauvegarde validée sont obligatoires. Tout paiement `is_live=true` bloque l'opération.

## Inventaire

| Classification | Tables | Motif |
|---|---|---|
| KEEP | `garages`, `profiles`, `garage_members` | Identité, utilisateurs, rôles et isolation tenant |
| KEEP | `garage_branding`, `garage_services` | Branding et services activés |
| KEEP | `garage_scheduling_settings`, `garage_business_hours`, `garage_calendar_exceptions`, `appointment_type_settings` | Configuration du planning |
| KEEP | `service_offers`, `service_offer_options` | Catalogue et tarification |
| KEEP | `registration_procedures`, `registration_procedure_requirements` | Référentiel carte grise |
| RESET | `vehicles`, `vehicle_events`, `vehicle_costs`, `vehicle_images`, `vehicle_documents`, `vehicle_market_analyses`, `marketplace_links`, `vehicle_listing_versions` | Stock et données véhicule de démonstration |
| RESET | `vehicle_360_sequences`, `vehicle_360_frames`, `interior_tours`, `interior_tour_scenes`, `interior_tour_hotspots` | Médias immersifs liés au stock |
| RESET | `leads`, `lead_events`, `lead_notes`, `commercial_tasks`, `notifications` | Activité commerciale de démonstration |
| RESET | `appointments`, `appointment_events` | Rendez-vous créés, hors configuration |
| RESET | `registration_cases`, `registration_case_requirements`, `registration_documents`, `registration_case_events` | Dossiers clients, hors référentiel |
| RESET | `acquisition_sellers`, `acquisition_opportunities`, `acquisition_documents` | Opportunités et vendeurs de démonstration |
| RESET | `intelligence_recommendations`, `copilot_conversations`, `copilot_messages`, `copilot_action_logs` | Résultats dérivés et conversations de démonstration |
| REVIEW | `payments`, `payment_events` | Purge limitée aux paiements test; les paiements live sont protégés |

Les fonctions/RPC et vues sont du schéma, pas des données tenant : elles sont conservées. Les fonctions publiques d'import, publication, planning, paiement et carte grise ne sont donc jamais supprimées.

## Portée et dépendances

Presque toutes les tables récentes possèdent un `garage_id` direct. `vehicle_events`, `vehicle_costs` et `marketplace_links` sont historiquement rattachées indirectement via `vehicles`; le manifeste les marque explicitement `INDIRECT`. Les suppressions enfant précèdent les racines, même lorsque les contraintes `ON DELETE CASCADE` existent, afin de rendre le plan auditable.

Ordre synthétique : documents/dossiers carte grise → événements/paiements test → rendez-vous → Copilot → commercial → intelligence → acquisition → médias immersifs → documents/images/analyses/coûts/événements véhicule → véhicules. L'ordre exhaustif et versionné est dans `src/features/data-readiness/reset-manifest.ts`.

## Storage

Préfixe obligatoire : `<garage_id>/`. Buckets remis à zéro : `vehicle-images`, `vehicle-documents`, `acquisition-documents`, `vehicle-360`, `vehicle-interior-tours`, `registration-documents`. `garage-branding` est explicitement hors périmètre. Le dry-run doit compter les objets avant toute mutation; le rapport après exécution doit confirmer les restes et signaler chaque échec sans élargir le préfixe.

## Méthode future exacte

1. Exporter et archiver la base et les buckets du garage cible.
2. Exécuter le dry-run avec l'UUID explicite; faire valider les volumes et les éventuels bloqueurs.
3. Vérifier qu'aucun paiement live n'est présent et que le garage cible est le bon.
4. Activer temporairement le garde-fou DEV et fournir la confirmation exacte.
5. Exécuter dans l'ordre versionné, uniquement avec des filtres `garage_id`/relations tenant.
6. Rejouer le dry-run comme rapport après opération; vérifier séparément les tables KEEP et les autres tenants.

La couche livrée dans ce ticket prépare et teste le manifeste, la validation, le dry-run et les garde-fous. L'adaptateur destructif n'est volontairement pas exposé avant validation de l'export réel et de la stratégie de sauvegarde.

## Préparation import WordPress

Le contrat serveur utilise la clé stable `(garage_id, source, external_id)`, avec `source=WORDPRESS`, une empreinte SHA-256 du payload et les issues `CREATED`, `UPDATED`, `SKIPPED`, `CONFLICT`, `FAILED`. Le cycle prévu est `IMPORT → PARSE → VALIDATE → PREVIEW → RESOLVE_CONFLICTS → COMMIT`. Zod refuse les sources inconnues et les identifiants invalides; le payload est limité à 256 Ko. Aucun secret, mot de passe WordPress ou contenu brut ne doit être journalisé.

Sans export WordPress réel, restent à confirmer : format (WXR/REST/CSV), identifiants stables, taxonomies, URLs médias, auteurs, encodage, volumes et règles de mapping. Aucune table de staging persistante ni migration n'est créée avant ces réponses; les contrats purs permettent de brancher le parseur sans changer l'idempotence.

## Volumes SAP

Les volumes distants ne sont pas inscrits dans le dépôt : ils doivent provenir d'un dry-run authentifié au moment de l'opération. Aucun accès distant ni reset du garage SAP n'a été effectué dans ce ticket.

