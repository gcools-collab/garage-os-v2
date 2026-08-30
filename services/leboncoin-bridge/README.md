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

`/search` renvoie une liste et `/listing` une annonce au format camelCase du port TypeScript `LeboncoinListing` : identifiant, titre, description, marque, URL, prix, images, attributs, localisation, date de publication et nombre facultatif de favoris. Le type de vendeur est actuellement `unknown`, car le modèle public de `lbc` ne l'expose pas directement.

Le client `lbc` expose `Ad.favorites`, alimenté depuis `counters.favorites`. Cette valeur est disponible sur les annonces de détail chargées par `get_ad`, donc sur `/listing`, mais la bibliothèque indique qu'elle n'est pas disponible sur les objets issus de la recherche. Le bridge renvoie alors `favoriteCount: null` et ne simule jamais de valeur.

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

### Pourquoi ce n'est pas branché sur Vercel

`vercel_app.py` reste dans ce dossier comme adaptateur ASGI utilisable par n'importe quelle plateforme (Vercel Functions Python, un conteneur, etc.), mais **le `vercel.json` racine ne le déploie plus automatiquement**. Une tentative précédente y déclarait un bloc `services`/`bindings` qui aurait injecté `LEBONCOIN_BRIDGE_URL` tout seul dans le projet frontend — ce ne sont pas des clés reconnues par la configuration Vercel actuelle (pas de déploiement multi-service ni de binding d'URL inter-services dans `vercel.json`), donc rien n'était réellement déployé ni injecté : le bridge n'a jamais été joignable en production via ce mécanisme, ce qui produit le message applicatif « Le service d'analyse du marché n'est pas configuré. ».

Tant que ce bridge doit rester sans exposition publique (recommandation ci-dessus), le déployer sur une plateforme purement serverless publique comme Vercel est de toute façon discutable. Concrètement, pour le rendre joignable :

1. Déployez `services/leboncoin-bridge` où vous le souhaitez (conteneur privé, VM, ou une éventuelle fonction Python séparée) — c'est un choix d'infrastructure qui n'est pas fixé par ce dépôt.
2. Notez l'URL de base résultante (ex. `https://leboncoin-bridge.internal.example.com`) et la valeur de `LEBONCOIN_BRIDGE_API_KEY` que vous lui avez injectée.
3. Sur le projet Vercel du frontend Next.js : Project → Settings → Environment Variables, ajoutez **manuellement** :
   - `LEBONCOIN_BRIDGE_URL` = cette URL de base (sans slash final), pour les environnements Production **et** Preview si vous voulez tester avant merge.
   - `LEBONCOIN_BRIDGE_API_KEY` = le même secret que celui configuré côté bridge.
4. Redéployez le frontend (une variable d'environnement Vercel n'est prise en compte qu'au prochain build/déploiement, jamais à chaud).
5. Pour vérifier que les deux variables sont bien exposées au runtime sans jamais afficher leur valeur : `vercel env ls` liste les noms de variables configurées par environnement, ou en local `node -e "console.log(!!process.env.LEBONCOIN_BRIDGE_URL, !!process.env.LEBONCOIN_BRIDGE_API_KEY)"` doit afficher `true true`.

En local, la même logique s'applique : `LEBONCOIN_BRIDGE_URL`/`LEBONCOIN_BRIDGE_API_KEY` dans `.env.local` (voir `.env.example` à la racine) ne suffisent pas seuls — le bridge doit aussi être réellement lancé (`uvicorn app.main:create_app --factory --host 127.0.0.1 --port 8080`, section « Lancement local » ci-dessus) et l'URL configurée doit correspondre exactement à son adresse et son port. Sinon l'application affiche « Analyse impossible : fetch failed » (ou, avec les messages introduits par GO-0100, une explication indiquant que le bridge est injoignable à l'adresse configurée).
