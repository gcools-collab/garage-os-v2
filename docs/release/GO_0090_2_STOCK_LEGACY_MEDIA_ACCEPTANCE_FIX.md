# GO-0090.2A — Stock tenant et médias legacy

Date : 2026-08-27

## Baseline autoritative

- Garage SAP : `363f2dc0-bfd3-48d6-a1cc-96e113e96094`
- Véhicules SAP : 18 (`PUBLISHED` 16, `RESERVED` 1, `SOLD` 1)
- Véhicule préservé hors SAP : 1, rattaché au garage `cf8cb6ee-7cd3-4141-9c99-32f8fdc7248f`
- Relations médias legacy : 243
- `vehicle_images` SAP : 242
- Objets Storage SAP : 242, soit 58 681 664 octets

## Causes identifiées

### Agrégation inter-garages

`StockService` chargeait toutes les appartenances de l'utilisateur puis utilisait
`.in("garage_id", garageIds)` pour la liste et les compteurs. La RLS fonctionnait,
mais autorisait normalement les deux garages dont l'utilisateur est membre. Le
service contournait donc le contexte de garage actif au niveau applicatif.

La liste et ses compteurs utilisent désormais exclusivement le `garageId` résolu
par la session active. La fiche applique aussi ce garage à sa requête avant de
retourner `notFound()` pour un véhicule étranger.

### Médias importés invisibles

Les 242 lignes importées ont un `storage_path` tenant-scopé, mais un champ `url`
NULL. L'import contrôlé avait correctement séparé la relation persistée du chemin
Storage ; les composants Stock et détail ne savaient toutefois afficher que
`vehicle_images.url`.

La présentation résout maintenant l'URL publique depuis `storage_path` lorsque
`url` est absent, après validation du préfixe `garage_id/vehicle_id/`. La valeur
persistée reste prioritaire pour les uploads récents.

## Contrôles distants en lecture seule

- Contrat PostgREST complet de la fiche : 18/18 véhicules SAP lisibles.
- Accès explicite du véhicule étranger avec le garage SAP : aucune ligne.
- Couverture média : 18/18 véhicules avec images et exactement une principale.
- Ordre : 242/242 lignes avec un `display_order` unique par véhicule.
- Correspondance DB / Storage : 242/242 chemins présents, 0 objet orphelin,
  0 ligne `vehicle_images` sans objet.
- Les 243 relations pour 242 fichiers correspondent au partage historique d'un
  fichier physique ; aucune relation supplémentaire n'est matérialisée en image.

## Sémantique et intégrations

- Le kilométrage NULL du véhicule legacy `43878` reste NULL et s'affiche
  « Kilométrage non renseigné ».
- Les données Leboncoin visibles proviennent uniquement de `marketplace_links`.
  Dans l'état distant contrôlé, le lien actif appartient au véhicule préservé du
  garage étranger, pas au stock SAP. L'interface précise qu'il s'agit de la
  dernière observation enregistrée et qu'aucune synchronisation automatique
  n'est effectuée.
- Le Studio média consomme les mêmes URLs résolues que le Hero et la galerie.
- La mutation de catégorie vérifie désormais le garage actif avant l'UPDATE.

## Limite de validation

Le navigateur applicatif n'était pas connecté pendant cette intervention. La
validation couvre les contrats distants, les builders, TypeScript, ESLint, le
build et les suites automatisées ; le dernier contrôle visuel authentifié reste
à effectuer dans le plan d'acceptation humaine.

## Sécurité et mutations

- Mutation base distante : 0
- Mutation Storage : 0
- Replay GO-0084 : 0
- Appel PayPlug : 0
- Commit : 0

## GO-0090.2B — Correctif runtime des fiches

### Reproduction et cause exacte

Le cas humain `/stock/60ecded3-55ea-5e3c-a470-fcd266771ea3` correspond au
Renault Trafic legacy `7179`, appartenant bien au garage SAP. La requête véhicule,
ses 11 images et toutes ses relations principales réussissaient.

L'opération défaillante était `getInteriorTour()`. Son embedding PostgREST
`interior_tours -> interior_tour_scenes` était ambigu : le schéma contient la FK
de collection des scènes et la FK inverse de la scène de départ. PostgREST
retournait `PGRST201`. Une fois cette relation qualifiée, l'embedding direct des
hotspots révélait également qu'aucune FK directe n'existe entre tours et hotspots.
Le `Promise.all` de la page propageait cette erreur optionnelle vers l'error boundary.

### Correctif

- La collection utilise explicitement
  `interior_tour_scenes_tour_id_garage_id_vehicle_id_fkey`.
- Les hotspots sont lus séparément par `garage_id` et `tour_id` uniquement quand
  un tour existe.
- Une absence de visite reste un état normal `null` ; une erreur PostgREST réelle
  reste levée et produit un log serveur structuré sans payload ni secret.
- Aucun fallback inter-tenant et aucune donnée fictive n'ont été ajoutés.

### Vérification runtime des données

- Contrats complets SAP : 18/18.
- Renault Trafic `60ecded3-55ea-5e3c-a470-fcd266771ea3` : 11 images, détail prêt.
- MG MGB `4d5c4b7e-3f56-5e4f-b4e3-9a9f05196cc0` : 13 490 EUR,
  kilométrage NULL présenté « Kilométrage non renseigné », 11 images.
- Réservé : Volkswagen Crafter `7c4ee5a3-c3a6-5ae0-a932-faaa8128623a`.
- Vendu : Mercedes Sprinter `a0c4a85e-ddc9-5f56-b93f-e1a9ed506c8e`.
- Publié standard : BMW M3 `00cccfd1-39f0-511b-ab46-fb25f2157683`.

### Navigation Stock

Chaque carte possède maintenant un lien de surface, sibling des actions. Les
boutons Voir, Modifier et Supprimer ne sont donc pas imbriqués dans ce lien et
conservent leur comportement indépendant. Le lien de surface est focalisable et
possède un libellé accessible ; toute la zone principale reste tactile.

La validation visuelle authentifiée finale reste volontairement à réaliser par
le testeur humain sur les URLs ci-dessus.
