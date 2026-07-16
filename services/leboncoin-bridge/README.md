# Garage OS — Leboncoin Bridge (spike)

Microservice interne FastAPI qui isole l'accès non officiel à Leboncoin du monolithe Next.js. Il n'est appelé par aucune UI à ce stade.

## Choix technique

Le bridge utilise `lbc`, le client Python sur lequel repose `lbc-finder`. `lbc-finder` est une application complète de surveillance et de notification, pas une bibliothèque d'intégration adaptée à ce service. Le client reste non officiel et peut cesser de fonctionner si Leboncoin modifie son API ou sa protection anti-bot.

Les appels utilisent un timeout configurable, une seule tentative, aucun proxy et aucun mécanisme de contournement agressif.

## Installation

Python 3.10 ou plus récent est requis.

```bash
cd services/leboncoin-bridge
python -m venv .venv
# PowerShell
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

## Configuration

Copier `.env.example` vers un fichier local non versionné ou injecter les variables par l'environnement d'exécution :

```text
LEBONCOIN_BRIDGE_API_KEY=<secret interne long et aléatoire>
LEBONCOIN_REQUEST_TIMEOUT_SECONDS=20
```

Le fichier `.env` n'est pas chargé automatiquement : en production, les secrets doivent venir du gestionnaire de secrets de la plateforme. Toutes les routes exigent le header `X-Internal-Api-Key`.

## Lancement local

```bash
uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8080
```

## API

Santé :

```bash
curl http://127.0.0.1:8080/health \
  -H "X-Internal-Api-Key: $LEBONCOIN_BRIDGE_API_KEY"
```

Recherche :

```bash
curl -X POST http://127.0.0.1:8080/search \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: $LEBONCOIN_BRIDGE_API_KEY" \
  -d '{"brand":"Peugeot","model":"308","min_price":5000,"max_price":20000,"min_year":2018,"max_mileage":120000}'
```

Annonce :

```bash
curl -X POST http://127.0.0.1:8080/listing \
  -H "Content-Type: application/json" \
  -H "X-Internal-Api-Key: $LEBONCOIN_BRIDGE_API_KEY" \
  -d '{"url":"https://www.leboncoin.fr/ad/voitures/1234567890"}'
```

`/search` renvoie une liste et `/listing` une annonce au format camelCase du port TypeScript `LeboncoinListing` : identifiant, titre, description, marque, URL, prix, images, attributs, localisation et date de publication. Le type de vendeur est actuellement `unknown`, car le modèle public de `lbc` ne l'expose pas directement.

## Tests

```bash
python -m pytest
```

Les tests injectent un faux gateway : aucun appel à Leboncoin n'est effectué.

## Limites connues

- `lbc` utilise une API Leboncoin non documentée et non garantie ; des réponses 403 ou des challenges Datadome restent possibles.
- Le filtre texte, le prix, le kilométrage et l'année sont transmis. Les valeurs exactes acceptées pour carburant et boîte doivent être validées sur un environnement de spike ; leur taxonomie peut évoluer.
- La localisation par simple nom de ville n'est pas exposée ici : le client attend des coordonnées structurées.
- L'identifiant est extrait de l'URL avant `get_ad`; les anciennes formes d'URL sans identifiant ne sont pas prises en charge.
- Aucun proxy, cache, rate limiting distribué, file d'attente ou observabilité avancée n'est inclus dans ce spike.
- L'authentification par secret partagé convient uniquement à un trafic service-à-service sur réseau privé avec TLS.

## Recommandation de déploiement

Déployer dans un conteneur séparé, sans exposition Internet publique, sur le même réseau privé que Garage OS. Injecter la clé via un gestionnaire de secrets, terminer TLS au niveau de l'ingress, limiter les ressources et le nombre de workers, puis ajouter avant production : rate limiting, métriques, traces, cache court, circuit breaker et tests contractuels réguliers contre le modèle TypeScript. Une validation juridique et des conditions d'utilisation de Leboncoin est indispensable avant tout usage SaaS réel.
