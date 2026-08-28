# GO-0089.1 — French E-Invoicing Compliance + PA Provider Foundation

**Date:** 2026-08-27
**Scope:** Préparation réforme facturation électronique FR, abstraction PA, adaptateur B2Brouter sandbox
**Garage OS reste l'application métier — n'est PAS une Plateforme Agréée**

---

## 1. Audit GO-0089 — suffisant / gaps

| Élément GO-0089 | Évaluation |
|---|---|
| Schéma billing + snapshots | **Suffisant** — base étendue (nature transaction, contexte destinataire, metadata PA générique) |
| Fiscal settings (SIRET/TVA) | **Partiel** — émetteur OK ; acheteur B2B étendu via `customers` |
| ElectronicInvoiceProvider | **Partiel** → **Étendu** en GO-0089.1 |
| Statuts transmission vs paiement | **Suffisant** — séparés (`electronic_status` vs `status` facture) |
| PDF | **Suffisant comme document commercial** — explicitement NON facture électronique conforme |
| Identifiants B2B | **Gap comblé** — SIREN/TVA client, classification centralisée |

---

## 2. Architecture

```
src/features/billing/
  types/e-invoicing.ts                    — modèle réglementaire
  engines/french-regulatory-classifier.ts — B2B/B2C/e-reporting
  engines/e-invoicing-readiness-engine.ts — validation readiness
  builders/canonical-invoice-builder.ts   — modèle structuré provider-neutral
  builders/e-invoicing-view-models.ts
  adapters/electronic-invoice-provider.ts — contrat + factory
  adapters/provider-config.ts             — secrets env serveur
  adapters/b2brouter/                     — mapper + provider sandbox
  actions/e-invoicing-actions.ts
  components/ElectronicInvoiceSection.tsx
  components/ElectronicInvoiceSettingsPanel.tsx
```

**Principe :** Garage OS produit un **CanonicalStructuredInvoice** ; la PA (B2Brouter, Tiime, Billit) mappe vers son format (JSON/XML/Factur-X).

---

## 3. Migration locale (non poussée)

`20260828000055_french_einvoicing_foundation.sql`

| Ajout | Rôle |
|---|---|
| `customers.company_name/siren/vat_number/country_code` | Identité acheteur B2B |
| `garage_fiscal_settings.default_transaction_nature` | GOODS/SERVICES/MIXED |
| `garage_electronic_invoice_settings` | Config PA **sans secrets** |
| `billing_documents.electronic_provider_metadata` | Références génériques PA |
| `billing_documents.recipient_context` | B2B_FR, B2C_FR, etc. |
| Snapshot client enrichi | SIREN/TVA/adresse livraison |

---

## 4. Classification réglementaire (centralisée)

| Contexte | Route | PA B2B |
|---|---|---|
| B2B_FR | E_INVOICE_PA | Éligible |
| B2G_FR | E_INVOICE_PA | Éligible (Chorus via PA) |
| B2C_FR | E_REPORTING_ONLY | Non |
| INTERNATIONAL | E_REPORTING_ONLY | Non |

Pas d'interprétation juridique dispersée dans l'UI.

---

## 5. Contrat ElectronicInvoiceProvider

Méthodes :
- `validateReadiness(context)`
- `submitInvoice(context)`
- `getSubmissionStatus(ref)`
- `receiveStatusUpdate(ref)` — webhook/polling futur

Modes : `DISABLED | UNCONFIGURED | SANDBOX | PRODUCTION`

**Production bloquée** sans `ELECTRONIC_INVOICE_ALLOW_PRODUCTION=true` + clé non-`test_`.

---

## 6. B2Brouter adapter

- Base sandbox : `https://api-staging.b2brouter.net` (doc officielle)
- Headers : `X-B2B-API-Key`, `X-B2B-API-Version`
- Endpoint : `POST /accounts/{id}/invoices`
- **Pas de faux succès** — erreurs HTTP → `ERROR`
- Clés via `B2BROUTER_API_KEY` (env serveur uniquement)

---

## 7. Secrets

| Stockage | Contenu |
|---|---|
| Env serveur | `B2BROUTER_API_KEY`, `B2BROUTER_API_VERSION`, `B2BROUTER_API_BASE_URL`, `ELECTRONIC_INVOICE_ALLOW_PRODUCTION` |
| DB garage | provider, mode, account_id public — **jamais** la clé API |

---

## 8. Factur-X / sortie structurée

GO-0089 générait un **PDF commercial normal**.

GO-0089.1 ajoute **CanonicalStructuredInvoice** :
- parties vendeur/acheteur/livraison
- lignes HT/TVA/TTC
- nature transaction + route réglementaire
- statuts métier vs transmission séparés

Mappable vers JSON B2Brouter, UBL, CII, Factur-X par adaptateur PA — **sans modifier** le modèle billing.

---

## 9. Réception factures entrantes (POST-V1)

Architecture prévue :
- `IncomingElectronicInvoiceEvent` type
- `listIncomingEvents?()` sur provider
- Webhook handler futur `/api/e-invoicing/webhook`

**Non implémenté V1 :** module comptabilité fournisseur, rapprochement, écritures.

---

## 10. UI

- Facture émise → section **Facturation électronique** (statut, blocages, transmission sandbox)
- Paramètres → `/settings/billing/e-invoicing`
- Jamais « conforme/transmise » sans preuve provider (`electronic_provider_ref`)

---

## 11. Tests

`src/features/billing/tests/e-invoicing.test.ts` — 14 tests
`src/features/billing/tests/billing.test.ts` — 10 tests
`npm run test:billing` — **24/24 PASS**

Couverture : B2B/B2C, SIREN manquant, provider disabled/unconfigured, sandbox error, séparation statuts, swap provider, migration sans secrets.

---

## 12. Validation

```
npm run test:billing → PASS (24/24)
npm test             → PASS
npx tsc --noEmit     → PASS
npm run lint         → PASS
npm run build        → PASS
git diff --check     → PASS
```

Aucune migration distante poussée. Aucun appel API production. Aucune soumission réelle.

---

## 13. Readiness report

| Critère | Statut |
|---|---|
| FRENCH E-INVOICE DATA MODEL READY | **YES** |
| B2B/B2C ROUTING READY | **YES** |
| PROVIDER ABSTRACTION READY | **YES** |
| B2BROUTER SANDBOX ADAPTER READY | **PARTIAL** (boundary + mapper + sandbox fetch ; credentials humains requis pour E2E réel) |
| PROVIDER SWITCHABILITY READY | **YES** |
| TRANSMISSION STATUS UX READY | **YES** |
| SECRET HANDLING REVIEW | **PASS** |
| FACTUR-X / STRUCTURED OUTPUT READY | **PARTIAL** (canonical model ; pas de génération Factur-X binaire) |
| E-REPORTING ARCHITECTURE READY | **PARTIAL** (classification ; pas d'envoi e-reporting) |
| INCOMING E-INVOICE ARCHITECTURE READY | **PARTIAL** (types + hook ; pas de réception live) |
| TENANT SECURITY REVIEW | **PASS** |
| E-INVOICING TESTS | **PASS** |
| **GO-0089.1 DEMO READY** | **YES** (readiness + UI + classification sans envoi réel) |
| **GO-0089.1 OPERATIONAL READY** | **PARTIAL** (migration + credentials B2Brouter + fiscal complet) |

---

## 14. Blockers humains

1. Appliquer migration `20260828000055`
2. Renseigner fiscal garage + clients B2B (SIREN/TVA)
3. Créer compte B2Brouter sandbox + `B2BROUTER_API_KEY=test_...` en env serveur
4. Choisir PA production et activer `ELECTRONIC_INVOICE_ALLOW_PRODUCTION` quand prêt
