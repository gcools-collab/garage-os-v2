# État de la V1

Garage OS couvre les parcours de démonstration suivants : authentification et sélection du garage, tableau de bord, stock, fiche véhicule, acquisition, analyse de marché, médias, visites 360°, génération d'annonces, publication, site public, demandes clients et suivi commercial.

## Parcours validables

- L'accès privé commence sur `/login`, puis résout le garage autorisé.
- Le tableau de bord est accessible sur `/dashboard`.
- Le stock est consultable sur `/stock`; la création manuelle et l'import disposent de routes dédiées.
- Les espaces médias, visite 360°, visite intérieure, annonces et publication sont accessibles depuis la fiche véhicule.
- La vitrine d'un garage utilise `/g/[garageSlug]`, avec le stock, le contact et les fiches `/g/[garageSlug]/vehicules/[vehicleSlug]`.
- Les demandes publiques alimentent les modules Demandes clients et Boîte commerciale.

Les données affichées proviennent du garage actif. Les modules dépendant d'un service externe présentent un état indisponible explicite lorsque leur configuration manque.
