# GO-0089 — Billing / Quotes / Invoices / Credit Notes V1

**Date:** 2026-08-27
**Scope:** Devis, factures, avoirs, intégration Customer 360, PDF, facturation électronique (adaptateur non configuré)
**GO-0084:** non touché

---

## 1. Audit — état initial

| Domaine | Statut |
|---|---|
| Devis / factures / avoirs (module billing) | **MISSING** |
| Paiements PayPlug (dépôts RDV) | **REAL** — `payments`, `payment_events` |
| `historical_payments` (SAP) | **REAL** — lecture seule Customer 360 |
| Catalogue services (prix, centimes) | **REAL** — `service_offers` |
| Identité garage (branding) | **PARTIAL** — pas de SIRET/TVA |
| PDF billing | **MISSING** |
| Numérotation documents | **PARTIAL** — pattern `registration_case_reference_seq` réutilisé |
| Customer 360 financier | **PARTIAL** — paiements uniquement |

---

## 2. Architecture

Nouveau module `src/features/billing/` :

```
types/ → engines/ → repositories/ → actions/ → builders/ → components/ → tests/
```

Réutilisé :
- Tenant session + RLS `garage_members`
- Customer 360 (`customers`, snapshots)
- Catalogue services (`service_offers`)
- Pattern événements immuables (`billing_document_events`)
- Numérotation par séquence PostgreSQL (comme carte grise)

Non modifié :
- `payments` PayPlug (appointment-scoped)
- `historical_payments`
- GO-0084

---

## 3. Schéma / migrations (LOCAL — non appliquées)

### `20260828000053_create_garage_fiscal_settings.sql`

| Élément | Rôle |
|---|---|
| `garage_fiscal_settings` | SIREN, SIRET, TVA, forme juridique, TVA par défaut (bps), pied de page |
| RLS | Lecture membres, écriture owner/admin |

### `20260828000054_create_billing_documents.sql`

| Table / objet | Rôle |
|---|---|
| `billing_document_sequences` | Numérotation concurrent-safe par garage/type/année |
| `billing_documents` | Devis, factures, avoirs unifiés |
| `billing_document_lines` | Lignes HT/TVA/TTC en centimes |
| `invoice_payments` | Paiements manuels sur facture (distinct PayPlug) |
| `billing_document_events` | Audit immuable |
| `billing_line_totals()` | Calcul SQL déterministe |
| `allocate_billing_document_number()` | DEV/FAC/AV-YYYY-###### |
| `create_billing_document_draft()` | Création brouillon + contrôles tenant |
| `upsert/remove_billing_document_line()` | Édition brouillon uniquement |
| `finalize_billing_document()` | Envoi devis, émission facture/avoir |
| `convert_quote_to_invoice()` | Conversion idempotente |
| `record_invoice_payment()` | Paiement partiel/total |
| Triggers immutabilité | Lignes + champs financiers après émission |

**Numérotation :** `INSERT … ON CONFLICT DO UPDATE last_number + 1` — pas de `COUNT(*)+1`.

---

## 4. Modèle monétaire

- Montants persistés en **centimes entiers**
- TVA en **basis points** (2000 = 20 %)
- Moteur TypeScript `money-engine.ts` aligné sur SQL
- Totaux recalculés côté serveur (RPC), jamais depuis le navigateur

---

## 5. Cycle de vie

### Devis
`DRAFT → SENT → ACCEPTED/DECLINED → CONVERTED`

### Facture
`DRAFT → ISSUED → PARTIALLY_PAID → PAID`

### Avoir
`DRAFT → ISSUED` (lié à `source_invoice_id`, crédite le solde)

**Immutabilité :** après émission, snapshots client/émetteur, lignes, totaux et numéro protégés par triggers.

---

## 6. Snapshots

À l’envoi/émission :
- `customer_snapshot` — nom, adresse, email, téléphone
- `issuer_snapshot` — branding + fiscal settings

Modifier Customer 360 ou le branding **ne réécrit pas** les documents émis.

---

## 7. UI / navigation

- Sidebar : **Facturation** → `/billing`
- Sous-vues : Devis, Factures, Avoirs
- Création via Customer 360 : « Créer un devis », « Créer une facture »
- Détail : lignes, totaux, actions métier, PDF, paiements, historique
- Mobile : cartes empilées, boutons `min-h-11`

---

## 8. Customer 360

- Catégorie timeline **BILLING**
- KPIs : facturé, reste dû
- Section « Facturation » + historique financier (distinct historique SAP / PayPlug RDV)
- Actions rapides devis/facture

---

## 9. Intégrations contextuelles

- **Services :** ajout ligne depuis `service_offers` (prix initial, ligne snapshot indépendante)
- **Registration :** `registrationCaseId` optionnel à la création
- **RDV / véhicule :** FK optionnelles avec garde tenant

---

## 10. PDF

- Bibliothèque : `pdf-lib` (server-side)
- Route : `GET /api/billing/[documentId]/pdf`
- Contenu : émetteur, client, lignes, TVA, totaux, pied de page si configuré

---

## 11. Facturation électronique (France)

**Séparé du statut de paiement.**

Adaptateur `ElectronicInvoiceProvider` :
- Mode par défaut : `UNCONFIGURED`
- `submitInvoice()` retourne `NOT_SUBMITTED` — **pas de faux succès**
- Statuts : `NOT_REQUIRED`, `NOT_SUBMITTED`, `READY`, `SUBMITTED`, `ACCEPTED`, `REJECTED`, `ERROR`

### Hypothèses réglementaires encodées (domaine Garage OS)

1. Numéro unique par document émis
2. Identité émetteur (SIRET/TVA) recommandée avant production
3. Snapshot client à l’émission
4. Avoir = document distinct, pas modification de facture
5. Garage OS **n’est pas** une plateforme agréée — transport à brancher plus tard

---

## 12. Paiements

| Source | Usage billing V1 |
|---|---|
| `invoice_payments` | Encaissement manuel facture (démo V1) |
| `payments` (PayPlug) | Dépôts RDV — **non fusionné** |
| `historical_payments` | Lecture seule Customer 360 |

---

## 13. Sécurité tenant

- Toutes les RPC vérifient `garage_members`
- FK + triggers `billing_tenant_guard`
- Pas d’accès public aux documents (PDF authentifié membre garage)
- Tests : isolation migration, pas de lien `payments` altéré

---

## 14. Tests

`npm run test:billing` — 10 tests :
- Arrondis TVA, multi-taux, soldes
- Immutabilité draft vs issued
- Adaptateur e-facture non configuré
- Invariants migrations (numérotation, séparation PayPlug)

---

## 15. Validation

```
npx tsc --noEmit  → PASS
npm run lint      → PASS
npm run build     → PASS
npm run test:billing → PASS (10/10)
npm run test:customers → PASS (9/9)
git diff --check  → PASS
```

---

## 16. Blockers humains

1. **Appliquer migrations** `20260828000053` et `20260828000054` sur la cible
2. **Renseigner** `garage_fiscal_settings` (SIRET, TVA) pour factures production
3. **Plateforme e-facture** — choix provider + branchement adaptateur
4. **PayPlug live** — hors scope ; liaison automatique facture↔PayPlug future
5. **UI paramètres fiscaux** — table créée ; écran dédié settings à compléter si souhaité

---

## 17. Readiness report

| Critère | Statut |
|---|---|
| BILLING SCHEMA READY | **YES** |
| MONEY / VAT ENGINE READY | **YES** |
| QUOTE WORKFLOW READY | **YES** |
| QUOTE TO INVOICE READY | **YES** |
| INVOICE WORKFLOW READY | **YES** |
| INVOICE IMMUTABILITY READY | **YES** |
| CREDIT NOTE WORKFLOW READY | **YES** |
| DOCUMENT NUMBERING READY | **YES** |
| PDF DOCUMENTS READY | **YES** |
| PAYMENT RECONCILIATION READY | **PARTIAL** (manuel OK ; PayPlug facture non lié) |
| CUSTOMER 360 BILLING READY | **YES** |
| SERVICE TO BILLING READY | **YES** |
| REGISTRATION TO BILLING READY | **PARTIAL** (FK contextuelle ; pas de CTA dossier) |
| E-INVOICING ADAPTER READY | **YES** (UNCONFIGURED) |
| FRENCH BILLING DOMAIN REVIEW | **PASS** |
| BILLING TENANT SECURITY REVIEW | **PASS** |
| MOBILE BILLING UX READY | **YES** |
| BILLING TESTS | **PASS** |
| **GO-0089 V1 DEMO READY** | **YES** |
| **GO-0089 V1 OPERATIONAL READY** | **PARTIAL** (migrations + fiscal + e-facture provider) |

---

## 18. Démo recommandée

1. Customer 360 → Créer un devis
2. Ajouter ligne catalogue + ligne manuelle
3. Marquer envoyé → Accepter
4. Convertir en facture → Émettre (numéro FAC-…)
5. Télécharger PDF
6. Enregistrer paiement partiel puis total
7. Créer avoir lié
8. Vérifier timeline + KPIs Customer 360
