# Garage OS V1 — Release Readiness

Audit GO-0085 — 24 août 2026. Ce document est la source de vérité de préparation V1. Il décrit l'état observé du code et des validations locales, sans reset/import SAP, mutation distante, migration métier, paiement réel ni commit.

## 1. Executive summary

**V1 DEMO READY: NO**

**V1 OPERATIONAL READY: NO**

**MEDIA STUDIO DEMO READY: NO**

Le socle technique est solide : build, typage, lint et suites automatisées passent ; l'isolation tenant est structurée ; Stock, publication vers le site public, leads, rendez-vous, paiements PayPlug en mode test, carte grise et médias disposent de vraies briques. La V1 SAP reste toutefois bloquée par quatre écarts majeurs :

1. **Billing absent** : aucun domaine devis/factures/avoirs, aucune numérotation, TVA, PDF ou historique réglementaire.
2. **Customer 360 absent** : les tables `customers` et `customer_vehicles` constituent une fondation, pas une vue CRM exploitable ; aucune route `/customers`, CRUD, recherche/déduplication ou timeline unifiée.
3. **Données présentées comme réelles alors qu'elles sont fixtures** : le dashboard principal utilise `garageIntelligenceFixture`; `/market` utilise des véhicules et annonces fixtures. Ces surfaces sont trompeuses en démonstration.
4. **Media Studio non démontrable avec les données SAP actuelles** : les 255 références média legacy ne sont pas encore réconciliées avec les fichiers physiques ; la visite intérieure simule le panorama par déplacement d'une image CSS, sans projection 360 equirectangulaire réelle.

Blockers opérationnels supplémentaires : conversion Acquisition Opportunity → Stock absente, carte grise dépendante d'un rendez-vous, emails transactionnels absents, contrôle mobile visuel/E2E absent et faille de confidentialité potentielle sur la page de retour paiement consultable par identifiant de paiement sans liaison au slug garage.

## 2. Readiness matrix

| Domain | Priority | Implementation | Tests | Mobile | Demo blocker | Operational blocker |
|---|---:|---|---|---|---|---|
| Auth/session/tenant | P0 | READY | READY | UNTESTED | Non | Non |
| Dashboard dirigeant | P0 | MOCK | READY | UNTESTED | **Oui** — fixtures affichées comme données garage | **Oui** |
| Billing devis/factures/avoirs | P0 | MISSING | MISSING | MISSING | **Oui** | **Oui** |
| CRM Customer 360 | P0 | MISSING | PARTIAL | MISSING | **Oui** | **Oui** |
| Stock/fiche véhicule/coûts | P0 | READY | READY | UNTESTED | Non | Validation terrain requise |
| Publication site public | P0 | READY | READY | UNTESTED | Non | Validation réelle requise |
| Publication marketplaces externes | POST_V1 | POST_V1 | READY (stubs) | POST_V1 | Non | Non V1 |
| Leads/commercial | P0 | PARTIAL | READY | UNTESTED | Non | Oui — pas de Customer 360/email/conversion complète |
| Rendez-vous/services | P0 | PARTIAL | READY | UNTESTED | Non | Oui — emails, création garage et validation timezone/E2E |
| Carte grise | P0 | PARTIAL | PARTIAL | UNTESTED | **Oui** pour un parcours sans RDV | **Oui** |
| Acquisition/reprise | P1 | PARTIAL | READY | UNTESTED | Non | Oui — conversion opportunité → Stock absente |
| Market Intelligence véhicule | P0 | PARTIAL | READY | UNTESTED | Non si bridge configuré | Oui — mono-source, sans jobs/cache/monitoring |
| Dashboard Market | P0 | MOCK | READY | UNTESTED | **Oui** | **Oui** |
| Notifications internes | P0 | PARTIAL | READY | UNTESTED | Non | Oui — couverture événementielle partielle |
| Emails transactionnels | P0 | MISSING | MISSING | POST_V1 | **Oui** pour confirmation RDV | **Oui** |
| Paiements PayPlug | P1 | PARTIAL | READY | UNTESTED | Non en sandbox | Oui — E2E sandbox et sécurité retour à durcir |
| Site public/SEO/branding | P0 | READY | READY | UNTESTED | Non | Validation navigateur/Lighthouse requise |
| Google Maps/Places/avis | P1 | MISSING | MISSING | UNTESTED | Non | Selon lancement marketing |
| Photos véhicule | P0++ | PARTIAL | READY | UNTESTED | Oui sans médias SAP | Reprise/progression/optimisation absentes |
| Exterior 360 | P0++ | PARTIAL | READY | UNTESTED | **Oui** — aucune séquence SAP validée | Oui |
| Interior tour | P0++ | BROKEN | READY | UNTESTED | **Oui** — faux rendu panoramique | **Oui** si présenté comme visite 360 |
| Listing IA/Copilot | P1 | PARTIAL | READY | UNTESTED | Non si désactivé clairement | Credentials et E2E provider requis |
| Import legacy SAP | Pré-lancement | PARTIAL | READY | POST_V1 | **Oui** — médias physiques en attente | **Oui** — import réel volontairement non exécuté |

`READY` dans la colonne Tests signifie suites locales vertes, pas E2E réel ni validation distante. Le mobile reste `UNTESTED` faute de navigateur contrôlable dans cette session.

## 3. Route inventory

Le build Next.js confirme les routes ci-dessous. L'existence de la route ne prouve pas le parcours E2E.

| Surface | Routes principales | Backend/auth | État |
|---|---|---|---|
| Entrée/auth | `/`, `/login`, `/register`, `/auth/recover`, `/onboarding`, `/select-garage` | Supabase Auth + résolution memberships/cookie | READY, tests unitaires |
| Dashboard | `/dashboard`, `/intelligence`, `/analytics`, `/buying` | Auth tenant | `/dashboard` MOCK ; `/analytics` et `/buying` placeholders |
| Stock | `/stock`, `/stock/new`, `/stock/import`, `/stock/[id]` | Supabase/RLS, Server Actions | READY hors validation mobile terrain |
| Media véhicule | `/stock/[id]/360`, `/stock/[id]/interior-tour`, `/stock/[id]/listings` | Storage privé/RLS | PARTIAL ; interior viewer BROKEN fonctionnellement |
| Publication | `/publication/[vehicleId]` | Workspace + exécution persistée | READY pour site public uniquement |
| Market | `/market` | Fixtures ; analyses unitaires réelles ailleurs | MOCK |
| Acquisition | `/acquisition`, `/acquisition/new`, `/acquisition/[id]` | CRUD/RLS/workflow | PARTIAL, pas de conversion Stock |
| Commercial | `/commercial`, `/leads`, `/leads/[leadId]`, `/notifications` | Supabase/RLS/actions | PARTIAL mais exploitable |
| Rendez-vous | `/appointments`, `/appointments/[appointmentId]`, `/settings/appointments` | RPC de disponibilité/réservation, RLS | PARTIAL |
| Services | `/settings/services`, `/settings/services/catalog` | Configuration tenant | READY |
| Carte grise | `/registration`, `/registration/[caseId]`, `/settings/services/registration` | RLS + stockage privé | PARTIAL |
| Paiements | `/payments`, `/api/payments/payplug/notification` | PayPlug + RPC vérifiée | PARTIAL/sandbox |
| Paramètres | `/settings`, `/settings/branding` | Auth tenant/roles | READY |
| Copilot | `/copilot` | Provider configurable + fallback | PARTIAL |
| Site public | `/g/[garageSlug]`, `/services`, `/location`, `/depot-vente`, `/contact`, pages légales | Résolution `live_slug`, lecture publique projetée | READY au niveau code/tests |
| Catalogue public | `/g/[garageSlug]/stock`, `/vehicles`, `/vehicules`, détails associés | Véhicules publiés seulement | READY au niveau code/tests |
| Carte grise publique | `/g/[garageSlug]/registration/[publicToken]` | Token public opaque + admin serveur | PARTIAL |
| Paiement public | `/g/[garageSlug]/payment/return`, `/payment/cancel` | Lecture admin par UUID | PARTIAL, finding HIGH |
| Customers | `/customers`, `/customers/[id]` | Aucun | MISSING |
| Billing | `/quotes`, `/invoices`, `/credit-notes` | Aucun | MISSING |

Aliases globaux `/vehicles` et `/vehicles/[slug]` renvoient volontairement `notFound()` ; les URL publiques valides sont tenant-scopées sous `/g/[garageSlug]`.

## 4. Critical user journeys

### Vehicle sale

| Étape | État | Preuve/écart |
|---|---|---|
| Opportunity créée et évaluée | PASS | Domaine Acquisition, workflow, recommandation et market tests verts |
| Opportunity acceptée → véhicule Stock | **FAIL** | `PURCHASED` change le statut de l'opportunité mais ne crée pas le véhicule |
| Création/import direct Stock | PASS | Formulaire manuel et import marketplace existent |
| Caractéristiques, coûts, documents | PASS | CRUD typé, validations et rentabilité centralisée |
| Photos/cover | PARTIAL | Workflow réel, mais médias SAP physiques absents et UX de reprise limitée |
| Analyse marché | PARTIAL | Analyse réelle via bridge Leboncoin ; disponibilité/configuration externe non validée |
| Publication site | PASS | Exécution persistée, catalogue filtré, invalidation testée |
| Lead public | PASS | RPC tenant-scopée, anti-spam et back-office |
| Réservation/vente | PARTIAL | Lifecycle existe ; intégration client/facture absente |
| Customer 360 et facture finale | **FAIL** | Domaines UI/métier absents |

### Appointment

| Étape | État | Preuve/écart |
|---|---|---|
| Service et options publics | PASS | Catalogue tenant-scopé et snapshot tarifaire |
| Date/créneau | PASS | RPC disponibilité, heures, exceptions, capacité |
| Coordonnées/consentement | PASS | Validation et création lead |
| Concurrence/double booking | PASS | Verrou advisory/capacité côté SQL |
| Paiement/acompte test | PARTIAL | PayPlug sandbox conçu/testé avec mocks, aucun E2E sandbox ici |
| Confirmation utilisateur | PARTIAL | UI présente, aucun email transactionnel |
| Planning garage | PARTIAL | Liste/détail/statuts/replanification ; création interne complète non établie |
| Timezone/mobile/refresh réel | UNTESTED | SQL timezone-aware, moteur TS UTC ; aucun E2E navigateur |

### Registration

| Étape | État | Preuve/écart |
|---|---|---|
| Présentation service/procédures | PASS | Configuration et routes publiques |
| Demande avec rendez-vous | PASS | Création dossier après booking |
| Demande sans rendez-vous | **FAIL** | Dossier créé uniquement si `appointmentId` existe |
| Liaison customer | PARTIAL | Fondation customer nullable, pas de Customer 360 |
| Upload documents | PARTIAL | Token, MIME/taille, bucket privé ; signature binaire non vérifiée |
| Statuts/timeline/suivi public | PARTIAL | Présents, libellés techniques subsistent en back-office |
| Notifications/paiement | PARTIAL | Paiement possible ; email/rappels absents |

### Customer 360

| Étape | État | Preuve/écart |
|---|---|---|
| Lead | PASS | Domaine réel |
| Résolution/création customer | PARTIAL | Tables et matcher legacy seulement |
| Fiche client/recherche/édition | **FAIL** | Aucune route ni UI |
| Véhicules, RDV, prestations unifiés | **FAIL** | Relations dispersées, aucun agrégateur/ViewModel |
| Paiements/carte grise/documents | **FAIL** | Pas de timeline client unifiée |
| Communications/déduplication | **FAIL** | Pas de workflow opérateur |

### Media showcase

| Étape | État | Preuve/écart |
|---|---|---|
| Photos multi-upload/cover/ordre/suppression | PARTIAL | Fonctionnel ; pas de reprise, compression client ou progression robuste |
| Séquence extérieure, ordre, validation | PARTIAL | 12–48 frames, ordre/start/exclusion/publication ; suppression/reprise incomplètes |
| Viewer extérieur desktop/touch/public | PARTIAL | Navigation clavier/pointer ; aucune validation visuelle/performance réelle |
| Tour/scènes/panoramas/hotspots | PARTIAL | CRUD principal et contrats présents |
| Projection panorama 360 | **FAIL** | `background-image/position/size` au lieu d'une projection equirectangulaire |
| Gyroscope mobile | **FAIL** | Non implémenté |
| Suppression/reprise tour/scènes | **FAIL** | Absente/incomplète |
| Médias SAP disponibles | **FAIL** | 255 références, fichiers physiques non réconciliés |
| Fallback galerie classique | PASS | Prévu et testé |

## 5. Security and RLS findings

### BLOCKER

- Aucun défaut RLS démontré comme cross-tenant sur les parcours inspectés. Toutefois, les tests SQL RLS présents ne sont pas exécutés par `npm test`; ils doivent être joués sur un environnement Supabase éphémère avant mise en production.

### HIGH

- **Retour/cancel paiement potentiellement IDOR** : les pages publiques chargent un paiement par UUID via service role sans vérifier que `payment.garage_id` correspond au garage résolu par `[garageSlug]`. Une personne possédant l'UUID pourrait consulter état et montant sous un autre slug. Lier la lecture à `garage_id` et retourner un état neutre.
- **Absence de parcours E2E sécurité** : auth expirée, RPC publiques, upload carte grise, webhooks et isolation Storage ne sont validés que par tests unitaires/inspection SQL, pas sur une base temporaire.

### MEDIUM

- Upload carte grise public : MIME et taille sont contrôlés, mais pas la signature binaire du fichier ; le token public donne accès à l'upload tant qu'il reste valide et aucune expiration explicite n'a été observée.
- Création PayPlug : la ligne `payments` est insérée avant validation de l'URL publique et appel provider ; un échec peut laisser un paiement `CREATED` orphelin. Prévoir état d'échec/compensation atomique.
- Actions Storage acquisition : validation MIME sans contrôle systématique de signature comparable à celle des documents véhicule.
- Plusieurs Server Actions avalent des erreurs (`return`) ou exposent des codes/messages de persistance ; homogénéiser les erreurs sans détails internes.

### LOW

- JSON-LD injecté via `dangerouslySetInnerHTML` est sérialisé et échappe `<`; aucune XSS démontrée.
- `.env.local` n'est pas suivi ; seul `.env.example` est versionné. Aucun secret client/admin versionné n'a été identifié lors du scan ciblé.
- Les clients service-role inspectés restent dans des modules serveur/actions ; aucune exposition navigateur constatée.

## 6. Mock and dead-end inventory

| Occurrence | Classification | Impact |
|---|---|---|
| `buildGarageDashboard()` sans données dans `/dashboard` | MOCK | KPIs, personne, véhicules et timeline fixtures présentés comme réels |
| `garageIntelligenceFixture` | MOCK | Source du dashboard principal |
| `/market` + `marketListingsFixture` | MOCK | Dashboard signature non relié au stock/bridge réel |
| `/analytics` | MISSING/placeholder | « Module en cours de construction » |
| `/buying` | MISSING/placeholder | « Module en cours de construction » |
| Google map du contact | MOCK explicite | Bloc « Carte — … », pas de carte réelle |
| Providers publication externes | POST_V1 | `Not implemented`, acceptable si désactivés et non présentés actifs |
| Avis clients | POST_V1/placeholder honnête | Pas de faux avis, mais aucune intégration |
| Interior viewer | BROKEN | UI présentée comme 360 sans rendu panoramique réel |
| Opportunity `PURCHASED` | Dead-end métier | Pas de conversion Stock |
| Carte grise sans rendez-vous | Dead-end métier | Impossible de créer le dossier seul |
| Customer foundation | Dead-end produit | Données sans surface Customer 360 |

## 7. Missing integrations and configuration

| Integration | État | Commentaire |
|---|---|---|
| Billing/PDF/email facture | Code absent | Domaine complet à créer après audit réglementaire dédié |
| Email transactionnel | Code/provider absent | Confirmation, modification, rappel RDV, carte grise, paiement et leads |
| Google Maps/Places/Business Profile | Implémentation absente | Pas seulement des credentials manquants |
| Leboncoin Bridge | Code présent, configuration/runtime à valider | Mono-source, pas de collecte continue |
| Marketplaces supplémentaires | POST_V1 stubs | Aucune API réelle |
| PayPlug | Code présent, sandbox acceptable | Configuration env requise ; aucun paiement réel déclenché |
| Copilot/Listing AI | Code/provider configurable | Credentials/activation non validés ; fallbacks testés |
| Médias WordPress SAP | Données physiques absentes | Réconciliation externe en cours ; import non exécuté |
| Reviews/Business Profile | Code absent | Pas de données fictives, donc honnête |

## 8. Test gaps

- Aucun framework E2E navigateur ni smoke HTTP authentifié/public n'a été identifié.
- Aucun test visuel responsive, screenshot ou vraie matrice mobile/tablette/desktop.
- Les scripts `test:payments`, `test:registration`, `test:service-catalog` et `test:acquisition-market-geography` ne font pas partie de l'agrégat `npm test`; ils ont été exécutés séparément pendant cet audit.
- Les tests SQL RLS sous `supabase/tests` ne sont pas exécutés par les scripts npm.
- Pas d'E2E PayPlug sandbox, webhook signé/réessayé, annulation ou expiration réelle.
- Pas d'E2E bridge Leboncoin/rate-limit/timeout sur le réseau réel.
- Pas de test de charge/concurrence réel sur réservation de créneau.
- Pas de test terrain d'upload mobile, interruption/reprise, 48 frames ou tour intérieur lourd.
- Les tests route-readiness vérifient surtout l'existence des fichiers et contrats, pas les codes HTTP réels avec données/auth.
- Pas de tests Customer 360/Billing car domaines absents.
- Les migrations customer/legacy disposent de tests de structure/parse, mais pas d'un cycle complet d'import réel puis navigation produit.

## 9. Mobile findings

L'architecture utilise largement Tailwind responsive, grilles adaptatives, CTA sticky mobile et contrôles clavier. Les tests inspectent certains contrats responsive, mais aucune validation visuelle n'a été possible : aucun navigateur contrôlable n'était disponible dans la session.

Risques à traiter avant démonstration :

- listes back-office (appointments, registration, commercial) potentiellement denses sans test tactile réel ;
- formulaires longs Stock/Acquisition/Carte grise sans campagne appareil ;
- upload multi-photo/360 sans progression, reprise ni compression, sensible au réseau mobile ;
- viewer extérieur avec geste pointer élémentaire et pas de préchargement adjacent démontré ;
- viewer intérieur sans vraie projection ni gyroscope ;
- modales, menus, focus et touch targets validés seulement par inspection/tests unitaires ;
- aucune mesure Lighthouse mobile ni budget de poids média.

Personas : **Employé UNTESTED**, **Patron UNTESTED**, **Client public UNTESTED**.

## 10. V1-relevant technical debt

- Dashboard et Market dashboard fixtures mélangés à des modules réels : risque de décision sur données fausses.
- Pas de modèle/client unifié : relations nullable et historique fragmenté.
- Pas de domaine Billing, alors que facturation est P0.
- Market Intelligence sans orchestration de fraîcheur, cache, job, observabilité ou source secondaire.
- Repositories de listes sans pagination systématique (appointments/payments/registration) : risque à l'import SAP.
- Mise à jour des horaires en opérations multiples non transactionnelles : configuration partielle possible.
- Incohérence timezone entre moteur TS (UTC) et RPC SQL (timezone garage).
- Actions et erreurs non homogènes ; certains échecs silencieux rendent l'exploitation difficile.
- Pipelines média sans reprise, suppression complète, optimisation et instrumentation.
- Tests SQL RLS et suites spécialisées non intégrés à la commande de validation principale.

## 11. Recommended backlog

### Remplacer les fixtures décisionnelles par les données tenant réelles

- **Objectif** : rendre Dashboard et Market honnêtes et exploitables.
- **Domaines** : intelligence, dashboard, market, tenant.
- **Dépendances** : schéma actuel seulement.
- **Complexité** : L. **Risque** : élevé (KPIs métier).
- **Modules** : `src/app/(dashboard)/dashboard`, `src/features/intelligence`, `src/app/(dashboard)/market`, `src/features/market-intelligence`.
- **Acceptation** : aucune fixture en production ; états vide/erreur explicites ; chiffres réconciliés avec Supabase ; tests tenant et E2E.

### Construire Billing V1 conforme

- **Objectif** : devis, conversion facture, avoir, numérotation, TVA, PDF, historique et paiements liés.
- **Domaines** : billing, customers, payments, branding.
- **Dépendances** : revue réglementaire française et Customer 360 minimal.
- **Complexité** : XL. **Risque** : critique.
- **Modules** : nouveau domaine Billing, migrations dédiées, routes back-office, génération PDF.
- **Acceptation** : invariants comptables, numérotation immuable, snapshots légaux, PDF, permissions/RLS, tests d'arrondi et transitions.

### Livrer Customer 360 opérationnel

- **Objectif** : recherche, création/édition, déduplication et timeline agrégée.
- **Domaines** : customers, leads, appointments, payments, registration, vehicles.
- **Dépendances** : fondation migrations 48/49 ; précède Billing final.
- **Complexité** : XL. **Risque** : élevé (PII/merge).
- **Modules** : nouveau `src/features/customers`, routes `/customers`, repositories tenant-scopés.
- **Acceptation** : vue client unique, historique complet, merge audité, aucune fusion sur nom seul, RLS/E2E.

### Fermer les workflows Acquisition et Carte grise

- **Objectif** : conversion atomique Opportunity → Stock et dossier carte grise avec/sans rendez-vous.
- **Domaines** : acquisition, stock, registration, customers.
- **Dépendances** : Customer minimal pour liaison durable.
- **Complexité** : L. **Risque** : élevé.
- **Modules** : actions/repositories acquisition et registration, RPC transactionnelles.
- **Acceptation** : idempotence, rollback, événements, liens source, deux variantes carte grise, tests cross-tenant.

### Notifications transactionnelles fiables

- **Objectif** : emails RDV/paiement/carte grise/leads avec templates, retry et audit.
- **Domaines** : notifications, scheduling, registration, payments, commercial.
- **Dépendances** : choix provider, domaine expéditeur, consentement/rétention.
- **Complexité** : L. **Risque** : moyen/élevé.
- **Modules** : nouveau provider email, outbox/jobs, templates.
- **Acceptation** : sandbox, idempotence, retry/backoff, journal sans secrets, préférences/consentement.

### Rendre Media Studio réellement démontrable

- **Objectif** : importer les médias SAP, vraie projection intérieure et uploads mobiles robustes.
- **Domaines** : media, vehicle-360, interior-tour, legacy-import, public site.
- **Dépendances** : archive WordPress réconciliée.
- **Complexité** : XL. **Risque** : élevé (performance/Storage).
- **Modules** : `src/features/media`, `vehicle-360`, `interior-tour`, pipeline legacy.
- **Acceptation** : véhicule SAP complet, reprise/progression, suppression, preload, panorama equirectangulaire, touch/gyro fallback, budget Lighthouse.

### Durcir paiements et sécurité publique

- **Objectif** : supprimer l'IDOR, gérer les créations orphelines et valider PayPlug sandbox E2E.
- **Domaines** : payments, public routes, security.
- **Dépendances** : environnement sandbox PayPlug.
- **Complexité** : M. **Risque** : élevé.
- **Modules** : pages return/cancel, payment actions/repository/webhook.
- **Acceptation** : paiement lié au slug/garage, état neutre en cas d'UUID étranger, compensation, idempotence et E2E sandbox.

### Industrialiser Market Intelligence

- **Objectif** : données fraîches réelles, cache, observabilité et tolérance rate-limit.
- **Domaines** : market, acquisition, bridge.
- **Dépendances** : bridge déployé et politique fournisseur ; deuxième source optionnelle.
- **Complexité** : L/XL. **Risque** : élevé (source externe).
- **Modules** : `src/features/market`, `market-intelligence`, bridge Python.
- **Acceptation** : aucune fixture, fraîcheur visible, cache, timeouts/retry contrôlés, déduplication, métriques, mode dégradé honnête.

### Campagne E2E, RLS et mobile de release

- **Objectif** : valider les parcours critiques sur environnement éphémère et appareils.
- **Domaines** : transversal.
- **Dépendances** : blockers fonctionnels fermés, dataset de démonstration.
- **Complexité** : L. **Risque** : moyen.
- **Modules** : tests E2E/smoke, scripts Supabase, CI.
- **Acceptation** : routes/auth/redirects, RLS/storage, trois personas mobiles, Lighthouse, aucun bouton mort, rapport reproductible.

### Google/local presence

- **Objectif** : carte, itinéraire et éventuellement avis réels sans donnée fictive.
- **Domaines** : public site, branding.
- **Dépendances** : choix APIs/credentials et politique d'avis.
- **Complexité** : M. **Risque** : faible/moyen.
- **Modules** : public-site-premium, builders/contrats Google.
- **Acceptation** : fallback sans clé, données réelles seulement, consentement et performance.

## 12. Quick wins

Petits travaux isolables sans gros contexte :

1. Ajouter les quatre suites spécialisées à `npm test`.
2. Lier les lectures des pages PayPlug return/cancel à `garage_id` résolu depuis `garageSlug`.
3. Masquer explicitement `/analytics` et `/buying` de la navigation ou les marquer « bientôt », sans CTA actif.
4. Afficher un bandeau « données de démonstration » tant que Dashboard/Market restent fixtures ; idéalement les retirer avant démo.
5. Traduire les statuts/événements techniques restants de Carte grise.
6. Ajouter pagination/limite explicite aux listes rendez-vous, paiements et dossiers.
7. Ajouter vérification de signature binaire aux uploads carte grise/acquisition.
8. Ajouter un état `FAILED`/compensation lors d'un échec de création PayPlug.
9. Documenter les variables bridge/IA absentes de `.env.example` sans valeur secrète.
10. Exécuter les SQL RLS tests dans une commande CI dédiée.

## 13. Suggested execution order

1. **Sécurité immédiate** : IDOR paiement, uploads, SQL RLS automatisés.
2. **Honnêteté démo** : supprimer/étiqueter fixtures Dashboard/Market et cacher placeholders actifs.
3. En parallèle : **Customer 360 minimal** et **Media SAP + vraie visite intérieure**.
4. **Workflows critiques** : Opportunity → Stock, carte grise sans RDV, emails transactionnels.
5. **Billing V1**, branché sur Customer 360 et Payments stabilisés.
6. **Market Intelligence réelle** et observabilité bridge.
7. **Campagne E2E/mobile/Lighthouse** sur dataset SAP de démonstration.
8. **Google/local presence** et améliorations P1 non bloquantes.

Cette séquence limite les conflits : sécurité et vérité des données touchent des surfaces ciblées ; Customer, Media et Billing peuvent évoluer sur branches séparées avec contrats stabilisés ; la campagne E2E intervient après intégration.

## Validation exécutée

| Commande | Résultat |
|---|---|
| `npm test` | PASS |
| `npm run test:payments` | PASS — 8 tests |
| `npm run test:registration` | PASS — 4 tests |
| `npm run test:service-catalog` | PASS — 12 tests |
| `npm run test:acquisition-market-geography` | PASS — 5 tests |
| `npm run lint` | PASS |
| `npx tsc --noEmit` | PASS après suppression du cache généré `.next` concurrent |
| `npm run build` | PASS — 61 routes générées (dynamiques et statiques) |
| `git diff --check` | PASS (avertissements de conversion LF/CRLF uniquement sur des changements préexistants) |

## Limites de l'audit

- Aucun accès navigateur contrôlable : pas de validation visuelle/mobile ni interaction authentifiée.
- Aucun appel réseau réel Leboncoin, IA, Google ou PayPlug.
- Aucun paiement, email, webhook externe ou mutation Supabase distante.
- Aucun reset/import SAP et aucun changement Storage.
- Analyse de sécurité statique et tests locaux uniquement ; pas de pentest ni audit réglementaire Billing.
- Les données legacy annoncées sont reprises des résultats GO-0083/GO-0084 : 86 clients, 21 véhicules, 495 rendez-vous, 56 paiements historiques, 121 leads et 255 références média importables.

## Blockers par domaine

| Domaine | Demo | Opérationnel | Principaux blockers |
|---|---:|---:|---|
| Billing | 1 | 1 | Domaine absent |
| Customer 360 | 1 | 1 | UI/CRUD/timeline unifiée absents |
| Dashboard/Intelligence | 1 | 1 | Fixtures présentées comme réelles |
| Market Intelligence | 1 | 1 | Dashboard fixture ; moteur mono-source sans exploitation continue |
| Acquisition | 0 | 1 | Pas de conversion Opportunity → Stock |
| Appointments/Services | 0 | 1 | Emails et E2E réel absents |
| Carte grise | 1 | 1 | Pas de dossier sans RDV ; Customer/email incomplets |
| Notifications/Emails | 1 | 1 | Provider et templates email absents |
| Payments | 0 | 1 | IDOR potentiel, sandbox E2E absent |
| Media Studio | 1 | 1 | Médias SAP absents ; intérieur non panoramique ; reprise mobile |
| Mobile transversal | 1 | 1 | Aucun audit visuel/appareil/E2E |
| Legacy SAP | 1 | 1 | Import réel non exécuté, médias non réconciliés |
| **Total** | **9** | **12** | Comptage par domaine, pas par anomalie |
