# GO-0088 — Appointments + Services + Registration V1

Ticket GO-0088 — 27 août 2026. Rend les flux Rendez-vous / Services / Carte grise cohérents, exploitables en démo V1 et intégrés à Customer 360. **Aucun commit automatique.** GO-0084 non modifié.

---

## Final readiness report

| Critère | Statut |
|---|---|
| **APPOINTMENT PUBLIC BOOKING READY** | **YES** |
| **APPOINTMENT BACKOFFICE READY** | **YES** *(après migration `20260827000052`)* |
| **APPOINTMENT AGENDA READY** | **YES** |
| **APPOINTMENT STATE MACHINE READY** | **YES** |
| **SERVICE CATALOG READY** | **YES** |
| **SERVICE BOOKING INTEGRATION READY** | **YES** |
| **CUSTOMER 360 APPOINTMENT INTEGRATION READY** | **YES** |
| **REGISTRATION DIRECT CASE READY** | **YES** *(après migration `20260827000052`)* |
| **REGISTRATION APPOINTMENT CASE READY** | **YES** |
| **REGISTRATION DOCUMENT CHECKLIST READY** | **YES** |
| **REGISTRATION CUSTOMER 360 INTEGRATION READY** | **YES** |
| **PUBLIC REGISTRATION EXPERIENCE READY** | **YES** |
| **MOBILE APPOINTMENT UX READY** | **YES** |
| **MOBILE REGISTRATION UX READY** | **YES** |
| **TENANT SECURITY REVIEW** | **PASS** |
| **APPOINTMENT TESTS** | **PASS** |
| **REGISTRATION TESTS** | **PASS** |
| **GO-0088 V1 DEMO READY** | **YES** *(migration staff RPC appliquée + procédures carte grise actives)* |

---

## 1. Existing implementation discovered

### Appointments — REAL
- Schéma complet (`appointments`, `appointment_events`, settings, business hours, exceptions)
- RPC publics : disponibilité, réservation, catalogue, replanification
- Moteur disponibilité + transitions d'état
- Pages agenda + détail + paramètres
- Intégration paiements PayPlug (test/live via config existante)
- RDV historiques importés (`is_historical`) — GO-0084 compatible

### Services — REAL
- `garage_services` + `service_offers` + `appointment_type_settings`
- UI paramètres : `/settings/services`, `/settings/services/catalog`, `/settings/appointments`
- Booking public consomme le catalogue réel (ENGINE_CLEANING, REGISTRATION, etc.)
- Offres SAP seed conservées (ENGINE_CLEANING -2L / +2L)

### Registration — PARTIAL → REAL après GO-0088
- Schéma complet, procédures, exigences, documents, événements
- Flux public via RDV REGISTRATION + portail token
- **Manquait** : création dossier back-office sans RDV, création RDV back-office, INSERT RLS staff

### Customer 360 — REAL (GO-0087)
- Timeline RDV/dossiers via `customer_id`
- **Manquait** : actions « Créer un RDV » / « Créer un dossier »

---

## 2. Problems found

| Problème | Impact |
|---|---|
| Pas de création RDV employé | Impossible de planifier depuis le garage |
| Carte grise bloquée sans RDV public | Walk-in / comptoir non couverts |
| Pas de RPC staff + pas de policy INSERT cases | Back-office ne pouvait pas créer de dossiers |
| RDV historiques modifiables | Risque opérationnel sur import SAP |
| Agenda peu lisible (pas de « aujourd'hui », pas de lien client) | UX employé faible |
| Détail RDV incomplet (dossier lié, paiement, historique) | Parcours fragmenté |
| Customer 360 sans action RDV/dossier | Intégration incomplète |

---

## 3. Architecture reused

- `AppointmentStatusEngine`, `AppointmentAvailabilityEngine`, RPC publics existants
- `registration-case-engine`, `transition_registration_case`, checklist procédures
- `service-catalog`, `commercial_snapshot`, PayPlug abstraction (non modifiée)
- Customer 360 repository/timeline (GO-0087)
- Notifications existantes (`notifications` table)

---

## 4. Changes implemented

### Migration (additive, non appliquée)

`supabase/migrations/20260827000052_staff_appointment_registration.sql`

| RPC | Rôle |
|---|---|
| `create_staff_appointment` | RDV back-office lié à `customer_id`, validation créneau/concurrence, `is_historical=false` |
| `create_staff_registration_case` | Dossier carte grise direct ou lié à un RDV, checklist procédure, notification |

Sécurité : `security definer` + vérification `garage_members` + ownership customer/vehicle.

### Appointments
- **`createStaffAppointment`** action + `/appointments/new?customerId=`
- **`StaffAppointmentForm`** composant
- Agenda enrichi : tri chronologique, badge « Aujourd'hui », historique importé, liens client/RDV
- Détail RDV refondu : source, notes, paiement, dossier lié, création dossier si REGISTRATION
- Protection historique : pas de reschedule/status change si `is_historical`

### Registration
- **`createStaffRegistrationCase`** action + `/registration/new?customerId=`
- **`StaffRegistrationCaseForm`** composant
- Lien depuis RDV REGISTRATION vers création dossier

### Customer 360
- Actions rapides : **Créer un rendez-vous**, **Créer un dossier carte grise**
- Préservation timeline (via `customer_id` sur entités créées)

### Pages
- `/appointments/new`, `/registration/new`
- CTAs agenda/dossiers → annuaire clients

---

## 5. Appointment lifecycle

```
Public: Service → créneau → contact → (acompte?) → PENDING|AWAITING_PAYMENT|CONFIRMED
Staff:  Client → prestation → date/heure → CONFIRMED (ou AWAITING_PAYMENT si requis)

Transitions: PENDING/AWAITING_PAYMENT → CONFIRMED|CANCELLED
             CONFIRMED → COMPLETED|CANCELLED|NO_SHOW
Historique importé: lecture seule opérationnelle
```

---

## 6. Service model

Un seul modèle cohérent :
- **`garage_services`** — activation service garage
- **`appointment_type_settings`** — durée, buffers, capacité, booking en ligne
- **`service_offers`** — prix, acompte, options (ENGINE_CLEANING, REGISTRATION)
- Booking public via `book_public_catalog_appointment` quand offre sélectionnée

Pas de second catalogue parallèle introduit.

---

## 7. Registration lifecycle

```
Chemin A — RDV REGISTRATION (public existant)
  Contact → RDV → create_public_registration_case → portail documents

Chemin B — Direct back-office (GO-0088)
  Customer 360 → create_staff_registration_case (sans RDV)

Statuts: NEW → WAITING_FOR_DOCUMENTS → … → COMPLETED (+ CANCELLED)
Checklist: exigences copiées depuis registration_procedure_requirements
```

---

## 8. Customer 360 integration

| Action | Route |
|---|---|
| Créer RDV | `/appointments/new?customerId=` |
| Créer dossier CG | `/registration/new?customerId=` |
| Ouvrir RDV/dossier existants | Timeline + sections existantes |

Les RDV/dossiers créés reçoivent `customer_id` → visibles immédiatement dans Customer 360.

---

## 9. Public flows

- **Booking** : `/g/[slug]/contact` — inchangé, fonctionnel
- **Carte grise publique** : procédures via RPC + dossier post-RDV + portail token
- Pas d'intégration ANTS/gouvernementale inventée

---

## 10. Mobile considerations

- Formulaires staff : `min-h-11`, grilles responsives, pas de hover requis
- Agenda : cartes empilées, liens explicites
- Détail RDV/dossier : sections empilées, boutons larges

Validation manuelle sur appareils réels : **UNTESTED** (layout responsive implémenté).

---

## 11. Tenant / security review — PASS

- RPC staff vérifient `garage_members` + ownership entités
- Actions serveur utilisent `getActiveGarageSession().garageId`
- RDV historiques non mutables côté actions
- PayPlug live non appelé ; `historical_payments` non touchés
- GO-0084 artifacts non modifiés

---

## 12. Tests

| Suite | Résultat |
|---|---|
| `npm run test:scheduling` | **PASS** (13 tests, +3 staff/historique) |
| `npm run test:registration` | **PASS** (6 tests, +2 staff) |
| `npm run test:customers` | **PASS** (9 tests) |
| `npm test` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

---

## 13. Remaining human / provider blockers

1. **Appliquer migration `20260827000052`** sur l'environnement cible
2. **Procédures carte grise actives** avec exigences configurées (`/settings/services/registration`)
3. **Horaires d'ouverture** configurés (`/settings/appointments`) pour validation créneaux staff
4. **Liaison `customer_id` flux public live** — les formulaires publics ne résolvent pas encore automatiquement le client (hors scope minimal GO-0088 ; RDV staff ou import SAP couvrent la démo)
5. **PayPlug test** — acomptes REGISTRATION/ENGINE_CLEANING nécessitent config sandbox
6. **E-mails transactionnels** — notifications internes créées ; envoi email externe non implémenté

---

## Fichiers principaux

```
supabase/migrations/20260827000052_staff_appointment_registration.sql
src/features/scheduling/actions/scheduling-actions.ts
src/features/scheduling/components/StaffAppointmentForm.tsx
src/features/scheduling/components/AppointmentList.tsx
src/features/scheduling/builders/scheduling-builders.ts
src/features/registration/actions/registration-actions.ts
src/features/registration/components/StaffRegistrationCaseForm.tsx
src/app/(dashboard)/appointments/new/page.tsx
src/app/(dashboard)/appointments/[appointmentId]/page.tsx
src/app/(dashboard)/registration/new/page.tsx
src/features/customers/builders/customer-view-models.ts
```

---

## Parcours démo recommandé

1. Ouvrir un **client** (importé ou créé manuellement)
2. **Créer un RDV** décalaminage → voir dans agenda + Customer 360
3. **Créer un dossier carte grise** sans RDV → checklist documents
4. Montrer **RDV REGISTRATION public** (contact) → dossier + portail client
5. Ouvrir un **RDV historique importé** → badge, pas d'actions opérationnelles

---

*Fin du rapport GO-0088.*
