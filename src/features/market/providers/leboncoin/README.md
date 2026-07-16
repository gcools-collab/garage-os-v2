# Leboncoin Connector Spike

## Décision d'architecture

`lbc-finder` est une application Python 3.10+ de surveillance périodique. Elle
dépend du client Python non officiel `lbc`; ce n'est pas un paquet JavaScript
importable dans Garage OS. Le provider TypeScript utilise donc un port
`LeboncoinClient` injecté. Une intégration exécutable nécessitera un sidecar
Python qui utilise `lbc-finder`/`lbc` et expose ce contrat à Garage OS.

Sources vérifiées :

- https://github.com/etienne-hd/lbc-finder
- https://github.com/etienne-hd/lbc

Le provider ne dépend ni de Next.js, ni d'une page, ni d'un transport. Il expose
`search(criteria)` et `getListing(url)`. Le mapper est le seul endroit qui
connaît la forme des données Leboncoin.

## Données disponibles

Le modèle `Ad` du client `lbc` fournit notamment : identifiant, titre,
description, URL, prix, images, date de première publication, localisation,
catégorie et attributs structurés. Pour les véhicules, les attributs peuvent
contenir marque, modèle, année de mise en circulation, kilométrage, carburant,
boîte de vitesses, version et puissance DIN.

## Données manquantes ou non garanties

- Les clés d'attributs automobiles ne sont pas documentées comme un contrat
  stable et peuvent varier selon l'annonce.
- VIN, immatriculation, historique, nombre de propriétaires, état mécanique et
  équipements ne sont pas garantis.
- Le type de vendeur doit être enrichi par le bridge : le modèle `Ad` de base
  ne l'expose pas directement.
- Les résultats de recherche ne contiennent pas toutes les données de détail.
- Les valeurs absentes nécessaires au modèle commun sont normalisées avec une
  chaîne vide ou `0`; elles doivent être exclues ou qualifiées avant pricing.

## Limites techniques

- Runtime Python séparé obligatoire ; aucune intégration directe dans le
  processus Next.js.
- API Leboncoin non officielle et sans garantie de compatibilité.
- Protection Datadome, réponses 403, blocage d'IP et changements de fingerprint.
- `lbc-finder` est conçu pour des recherches planifiées avec callbacks, pas pour
  une API SaaS multi-tenant à faible latence.
- `getListing(url)` n'est pas une API de `lbc-finder`; le client sous-jacent
  `lbc` fournit `get_ad(id)`, d'où l'extraction de l'identifiant dans ce provider.
- Pas de test réseau dans ce spike et aucune garantie sur les volumes, la
  pagination, la fraîcheur ou l'exhaustivité.

## Adéquation SaaS

La librairie est utile pour un prototype et pour valider le mapping, mais elle
n'est pas adaptée telle quelle à une production SaaS. Son usage repose sur des
endpoints non officiels, l'impersonation de navigateur et éventuellement des
proxies. Les risques opérationnels, contractuels et de conformité doivent être
validés avant toute collecte réelle.

## Pré-requis avant production

1. Valider juridiquement les conditions d'utilisation, la réutilisation des
   annonces, des photos et des données personnelles.
2. Isoler le connecteur Python dans un worker/sidecar avec une API versionnée.
3. Ajouter timeouts, quotas par tenant, limitation de concurrence, backoff,
   circuit breaker, observabilité et rotation contrôlée des proxies.
4. Versionner et valider le schéma du bridge à l'entrée du mapper.
5. Ajouter pagination, déduplication, cache, persistance et suivi de fraîcheur.
6. Construire des tests de contrat à partir de fixtures anonymisées.
7. Prévoir un provider officiel ou partenaire comme voie de production.
