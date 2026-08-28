# GO-0087 — Customer 360 V1 — Complete Premium CRM Experience

Ticket GO-0087 — 27 août 2026. Implémente l’expérience CRM Customer 360 pour la démo V1. **Aucun commit automatique.** GO-0084 (import SAP legacy) n’a pas été modifié.

---

## Readiness report

| Critère | Statut |
|---|---|
| **CUSTOMER DIRECTORY READY** | **YES** |
| **CUSTOMER DETAIL READY** | **YES** |
| **CUSTOMER TIMELINE READY** | **YES** |
| **CUSTOMER VEHICLES READY** | **YES** |
| **CUSTOMER APPOINTMENTS READY** | **YES** |
| **CUSTOMER COMMERCIAL HISTORY READY** | **YES** |
| **CUSTOMER FINANCIAL HISTORY READY** | **YES** |
| **CUSTOMER REGISTRATION HISTORY READY** | **YES** |
| **CUSTOMER CREATE/EDIT READY** | **YES** |
| **CUSTOMER MOBILE UX READY** | **YES** *(responsive/touch ; validation manuelle appareil recommandée)* |
| **CUSTOMER TENANT SECURITY REVIEW** | **PASS** |
| **SAP LEGACY CUSTOMER COMPATIBILITY** | **PASS** |
| **CUSTOMER TESTS** | **PASS** |
| **CUSTOMER 360 V1 DEMO READY** | **YES** |

---

## Phase 1 — Audit (état avant GO-0087)

### Déjà en place (fondation)

| Élément | État |
|---|---|
| Tables `customers`, `customer_vehicles` | Migration `20260817000048` — RLS, indexes, contraintes tenant |
| FK `customer_id` | Sur `leads`, `appointments`, `registration_cases`, `historical_payments` |
| Import legacy | `legacy-import/customer-matcher.ts` — matching CREATE/MATCH/REVIEW (GO-0084) |
| CRM opérationnel | Leads, commercial, agenda, carte grise, paiements PayPlug (via RDV) |
| Workflows publics | Demandes, réservation, dossier carte grise |

### Manquant avant GO-0087

- Aucun module `src/features/customers/`
- Aucune route `/customers`
- Aucune requête applicative vers `customers` / `customer_vehicles` / `historical_payments`
- Pas de timeline unifiée
- Pas d’entrée navigation « Clients »
- Pas de liens retour Lead → Client / RDV → Client / Dossier → Client
- Flux live (leads/RDV publics) ne peuvent pas encore lier automatiquement `customer_id`

---

## Phase 2–16 — Implémentations

### Module `src/features/customers/`

| Couche | Fichiers |
|---|---|
| Types | `types/customer.ts`, `types/customer-timeline.ts` |
| Normalisation | `normalization.ts` (email, téléphone FR, recherche) |
| Repository | `repositories/customer-repository.ts` — annuaire, bundle 360 parallèle, doublons |
| Engine | `engine/customer-timeline-engine.ts` — agrégation chronologique, KPIs, filtres |
| Builders | `builders/customer-view-models.ts` — annuaire + fiche premium |
| Actions | `actions/customer-actions.ts` — CRUD client, lead lié, véhicule client |
| UI | `components/Customer360View.tsx`, `components/CustomerForm.tsx` |

### Routes

| Route | Rôle |
|---|---|
| `/customers` | Annuaire — recherche, tri, pagination, recherche immatriculation |
| `/customers/new` | Création client (source MANUAL) |
| `/customers/[customerId]` | Fiche Customer 360 complète |
| `/customers/[customerId]/edit` | Édition identité |

### Fiche Customer 360

- **Identité** — nom, contacts, adresse, source, date de création
- **Actions rapides** — appeler, e-mail, créer demande commerciale, prochain RDV
- **KPIs** — RDV, demandes, véhicules, encaissements (historique + Garage OS)
- **Timeline unifiée** — filtre par catégorie, badge « Historique importé »
- **Sections** — véhicules, RDV, commercial, carte grise, finances
- **Formulaires** — nouvelle demande commerciale, ajout véhicule client

### Timeline — sources agrégées

Uniquement via **`customer_id` explicite** (jamais par nom seul) :

- Client créé/importé
- Leads + événements + notes + tâches commerciales
- Rendez-vous + événements (historiques marqués, sans lien si anonymes)
- Dossiers carte grise + événements
- Paiements historiques (lecture seule) + paiements Garage OS (via RDV)
- Véhicules client (+ lien stock si `stock_vehicle_id` explicite)

### Finances

- **Paiements historiques** — affichage read-only, statuts remboursés/annulés exclus des KPIs
- **Paiements Garage OS** — via `payments.appointment_id`, aucune modification PayPlug
- Distinction visuelle « Historique importé » vs « Garage OS »

### Navigation & intégration

- Sidebar : entrée **Clients** (`/customers`)
- Liens croisés ajoutés :
  - `/leads/[leadId]` → fiche client si `customer_id`
  - `/appointments/[appointmentId]` → fiche client si `customer_id`
  - `/registration/[caseId]` → fiche client si `customer_id`

### Sécurité tenant

- Toutes les lectures/écritures via `getActiveGarageSession()` + `garage_id`
- Vérification propriété client avant mutation
- Véhicule stock lié validé côté serveur (`vehicles.garage_id`)
- Détection doublon email/téléphone → **avertissement**, pas de fusion automatique
- Aucun service-role côté navigateur ; aucun appel PayPlug dans Customer 360

### Compatibilité SAP (GO-0084 — lecture seule)

| Attendu post-import | Compatible |
|---|---|
| Clients importés dans `customers` | **Oui** — annuaire + fiche |
| RDV historiques avec `customer_id` | **Oui** — timeline + section RDV |
| RDV historiques anonymes (`customer_id` NULL) | **Oui** — exclus de Customer 360 (comportement voulu) |
| Paiements historiques | **Oui** — section financière |
| Leads importés | **Oui** — si `customer_id` renseigné |
| `customer_vehicles` initialement vides | **Oui** — empty state propre |
| Métadonnées legacy | **Non exposées** — libellé « Historique importé » |

**Aucune modification GO-0084** effectuée.

---

## Migrations créées

**Aucune.** Les indexes et RLS existants (`20260817000048`) suffisent pour V1.

---

## Tests ajoutés

`src/features/customers/tests/customers.test.ts` — **9 tests** :

- Normalisation email/téléphone/recherche
- Ordre timeline + libellés import
- Requêtes strictes sur `customer_id` (pas d’attribution par nom)
- Paiements historiques read-only + exclusion remboursements KPI
- Actions tenant + absence PayPlug
- Builders annuaire/détail
- Filtres timeline
- Troncature messages leads longs
- Migration foundation RLS/indexes

Script npm : `test:customers` (intégré à `npm test`).

---

## Validation exécutée

```text
npx tsc --noEmit     → PASS
npm run lint         → PASS
npm run build        → PASS (routes /customers/* générées)
npm test             → PASS (suite complète, 0 fail)
npm run test:customers → PASS (9/9)
git diff --check     → PASS (avertissements CRLF uniquement)
```

---

## Blockers restants (humain / post-V1)

1. **Migration `20260817000048`** doit être appliquée sur l’environnement cible (tables customers + FK).
2. **Flux live** (formulaires publics, booking) ne renseignent pas encore `customer_id` — les nouveaux contacts restent visibles via Leads jusqu’à liaison manuelle ou évolution future.
3. **Création RDV depuis la fiche client** — pas de parcours back-office de création RDV ; action « Prochain rendez-vous » uniquement si RDV existant.
4. **Validation mobile physique** — layout responsive implémenté, non testé sur appareils réels dans ce ticket.
5. **Données SAP** — Customer 360 affiche ce qui est importé ; l’import lui-même reste GO-0084.

---

## Fichiers principaux

```
src/features/customers/                    (nouveau module)
src/app/(dashboard)/customers/             (4 pages)
src/components/layout/sidebar.tsx          (+ Clients)
src/features/leads/data/garage-lead-repository.ts  (+ customer_id)
src/features/leads/types/lead.ts           (+ customer_id)
src/features/scheduling/                   (+ customer_id colonne/type)
src/features/registration/                 (+ customerId)
src/app/(dashboard)/leads/[leadId]/page.tsx
src/app/(dashboard)/appointments/[appointmentId]/page.tsx
src/app/(dashboard)/registration/[caseId]/page.tsx
package.json                               (+ test:customers)
```

---

## Parcours démo recommandé

1. **Annuaire vide** → empty state + créer un client manuellement.
2. **Post-import SAP** → ouvrir un client importé → timeline riche (RDV, paiements, leads).
3. **Appel téléphonique** → fiche mobile : identité, KPIs, prochain RDV, appeler en 1 clic.
4. **Navigation croisée** → depuis un lead lié, ouvrir la fiche client.

---

*Fin du rapport GO-0087.*
