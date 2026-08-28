# GO-0083 — Mapping SAP legacy vers Garage OS

## Principes

Le pipeline reste celui de GO-0082 : `IMPORT → PARSE → VALIDATE → PREVIEW → RESOLVE_CONFLICTS → COMMIT`. GO-0083 s'arrête à `PREVIEW`. La clé d'idempotence est `(garage_id, WORDPRESS, external_id)` et aucun fichier source réel n'est versionné.

| Source legacy | Cible Garage OS | Décision par défaut | Règle |
|---|---|---|---|
| Posts WordPress véhicule publiés | `vehicles` | Automatique après validation | Prix, kilométrage, date, puissance et statut explicitement normalisés |
| Posts `trash` | aucune | Ignoré | Conservés uniquement dans la source |
| Posts brouillon/inconnus | `vehicles` | Review | Pas de publication implicite |
| Attachments et galeries | `vehicle_images` / Media Platform | Pending | Relation et ordre seulement; aucun téléchargement/upload |
| WordPress users / Woo customers | `customers` | Matching puis create/review | Email fort; téléphone + identité cohérente; jamais le nom seul |
| Véhicules appartenant aux clients | `customer_vehicles` | Review | Domaine indépendant du stock marchand |
| YITH paid/confirmed/completed | historique `appointments` | Automatique après validation | Ne crée aucun paiement natif |
| YITH unpaid/cancelled/unconfirmed | aucune | Ignoré | Ne devient ni rendez-vous réalisé ni lead dans GO-0083 |
| WooCommerce / PayPlug historique | futur historique de paiement | Review | `historical=true`; jamais inséré dans `payments`, aucun webhook/capture/remboursement |
| Elementor renseignement/service/location | `leads` | Auto si formulaire reconnu, sinon review | Aucune sémantique inventée |
| Prestations legacy | `service_offers` | Review | Mapping manuel vers le catalogue, sans dupliquer les plugins |
| Plugins, caches, SEO, sécurité, logs, Action Scheduler | aucune | Ignoré | Données techniques WordPress non métier |

## Clients et déduplication

`customers` porte une identité tenant-scopée. `customer_vehicles` décrit les véhicules du client sans les confondre avec `vehicles`, qui reste le stock marchand. `leads`, `appointments` et `registration_cases` reçoivent un lien optionnel et tenant-validé vers `customers` tout en conservant leurs snapshots historiques existants.

Décisions :

- `MATCH` : email normalisé unique et identité cohérente, ou téléphone français identique avec prénom/nom cohérents.
- `REVIEW` : email contradictoire, email non unique, téléphone partagé ou identité insuffisante.
- `CREATE` : aucun signal fort dans le garage courant.
- `IGNORE` : aucune identité exploitable.

Le nom seul ne fusionne jamais. Une identité d'un autre garage n'est jamais candidate.

Dans le manifeste de reset, `customers` et `customer_vehicles` sont classés `REVIEW`, et non `RESET`. Toute ligne présente dans ces tables devient un bloqueur du reset automatique : une validation humaine explicite et une procédure dédiée seront nécessaires pour supprimer de vraies données clients.

## Normalisations véhicules

- prix : extraction indépendante HT/TTC; aucune TVA calculée;
- kilométrage : suppression des séparateurs et unités;
- première mise en circulation : précision `DAY` pour `jj/mm/aaaa`, `MONTH` pour `mm/aaaa`;
- puissance : séparation fiscale/DIN;
- HTML : source conservée et texte neutralisé, jamais exécuté;
- vendu/réservé : uniquement si un champ ou titre le dit explicitement.

## SQL et confidentialité

La découverte SQL ne reproduit pas WordPress. Elle repère uniquement les familles users/customers/orders, YITH Booking, paiements et formulaires Elementor. Les tables techniques sont exclues. Les modèles ne contiennent ni credentials, ni hash de mot de passe, ni token, ni donnée bancaire. Le rapport n'affiche que des compteurs.

## Ambiguïtés à valider avec les exports réels

- nom exact du post type véhicule et encodage des galeries ACF sérialisées;
- tables/versions exactes WooCommerce HPOS, YITH et Elementor;
- sémantique précise des statuts YITH installés chez SAP;
- distinction acompte/paiement total et provider historique;
- identifiants stables des formulaires Elementor;
- disponibilité future de `wp-content/uploads` et correspondance attachment/chemin.
