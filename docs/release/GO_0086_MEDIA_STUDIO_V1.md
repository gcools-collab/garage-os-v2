# GO-0086 — Media Studio / 360 / Interior Tour — V1 Production Completion

Ticket GO-0086 — 27 août 2026. Complète le workflow média véhicule pour la démo V1 : photos, 360° extérieur, visite intérieure immersive, expérience publique et robustesse mobile. **Aucun commit automatique.** GO-0084 (import SAP legacy) n’a pas été modifié par ce ticket.

---

## Readiness report

| Critère | Statut |
|---|---|
| **MEDIA PHOTO WORKFLOW READY** | **YES** *(après application migration `20260827000050`)* |
| **EXTERIOR 360 CAPTURE READY** | **YES** |
| **EXTERIOR 360 VIEWER READY** | **YES** |
| **INTERIOR PANORAMA READY** | **YES** |
| **INTERIOR HOTSPOTS READY** | **YES** *(V1 minimal — marqueurs cliquables + navigation entre scènes)* |
| **PUBLIC MEDIA EXPERIENCE READY** | **YES** |
| **MOBILE MEDIA WORKFLOW READY** | **YES** *(implémentation responsive/touch ; validation manuelle sur appareils réels recommandée)* |
| **TENANT SECURITY REVIEW** | **PASS** |
| **MEDIA TESTS** | **PASS** |
| **MEDIA STUDIO V1 DEMO READY** | **YES** *(avec migration DB appliquée et images equirectangulaires 2:1 pour l’intérieur)* |

---

## Phase 1 — Audit (état initial)

### Déjà fonctionnel

| Domaine | État observé |
|---|---|
| `vehicle_images` | Upload, suppression, photo principale, catégories, chemins Storage tenant-scopés |
| Media Platform | Registre d’assets, gallery builder, provider Supabase, ordre par position |
| `vehicle_360_sequences` / `vehicle_360_frames` | Création séquence, upload frames, réordonnancement, validation lifecycle (≥12 frames), publication |
| `interior_tours` / `interior_tour_scenes` / `interior_tour_hotspots` | CRUD scènes, hotspots, publication, builders public/back-office |
| Viewers publics | Composants 360 et intérieur branchés sur la fiche véhicule publique |
| RLS / tenant | Repositories et actions vérifiant `garage_id` et appartenance véhicule |
| Publication checklist | Intégration qualité média dans le flux de publication |

### Lacunes identifiées (corrigées par GO-0086)

| Lacune | Impact |
|---|---|
| Pas de réordonnancement photos persisté | Ordre galerie non contrôlé par l’employé |
| UX upload photos basique | Pas de progression mobile, pas de `capture="environment"` |
| Pas de suppression frame 360 individuelle | Impossible de corriger une prise avant finalisation |
| Visite intérieure en CSS (image plate déplacée) | Pas de vraie projection equirectangulaire |
| Pas de suppression scène intérieure | Impossible de nettoyer une visite incomplète |
| Pas d’UX unifiée « Studio média » | Sections dispersées, jargon technique |
| Contrat public `threeSixty: "PLACEHOLDER"` | Bouton 360 affiché même sans données |
| Rollback upload incomplet | Risque d’orphelins Storage/DB sur échec |

---

## Phase 2–12 — Implémentations

### Photos (Phase 2)

- **`src/features/vehicles/image-actions.ts`** — `assertVehicleAccess`, upload avec rollback Storage+DB, `display_order` à l’insertion, action `reorderVehicleImages` via RPC.
- **`src/features/vehicles/components/vehicle-image-upload-client.tsx`** — Upload client multi-fichiers, progression, `capture="environment"` mobile, messages d’erreur.
- **`src/features/vehicles/components/vehicle-image-gallery-client.tsx`** — Réordonnancement (↑/↓), photo principale, suppression, cibles tactiles ≥44px.
- Migration **`20260827000050_add_vehicle_image_display_order.sql`** — Colonne `display_order`, index unique par véhicule, RPC `reorder_vehicle_images`, vue `public_live_vehicle_images` recréée avec ordre.

### 360° extérieur — capture (Phase 3)

- **`src/features/vehicle-360/actions/vehicle-360-actions.ts`** — `deleteVehicle360Frame`, retour structuré `{ uploaded, skipped, errors }` sur upload.
- **`src/features/vehicle-360/components/Vehicle360UploadClient.tsx`** — Feedback upload, compteur de frames.
- **`src/app/(dashboard)/stock/[id]/360/page.tsx`** — Page réécrite : instructions, vignettes, suppression frame, reprise brouillon, UI mobile.

### 360° extérieur — viewer (Phase 4)

- **`src/features/vehicle-360/components/Vehicle360ViewerClient.tsx`** — Préchargement frames adjacentes, `touchAction: none`, navigation clavier, rotation circulaire.
- Fonctionne en back-office (`/stock/[id]/360`) et sur la fiche publique (via builders existants).

### Visite intérieure — panorama (Phase 5)

- **Dépendances ajoutées** (voir section Dependencies) — `@photo-sphere-viewer/core` + `@photo-sphere-viewer/markers-plugin`.
- **`src/features/interior-tour/components/InteriorPanoramaViewer.tsx`** — Viewer equirectangulaire réel, chargement dynamique (code-split), états loading/erreur, `touchAction: none`.
- **`src/features/interior-tour/components/InteriorTourViewerClient.tsx`** — Intégration panorama, sélection scènes, plein écran, hotspots via marqueurs.

### Scènes + hotspots (Phase 6)

- **`src/features/interior-tour/actions/interior-tour-actions.ts`** — `deleteInteriorScene` (Storage + hotspots liés).
- Hotspots avec `yaw`/`pitch` dans types et builders ; navigation inter-scènes au clic marqueur.
- **`src/app/(dashboard)/stock/[id]/interior-tour/page.tsx`** — Upload client, édition/suppression scènes, gestion hotspots V1.

### Media Studio UX (Phase 7)

- **Nouveau module `src/features/media-studio/`** — `buildMediaStudioSummary`, `MediaStudioPanel` avec onglets **Photos / 360° extérieur / Visite intérieure**, cartes de statut en français (comptages, état brouillon/prêt/publié).
- **`src/app/(dashboard)/stock/[id]/page.tsx`** — Remplace les sections média dispersées par le panneau unifié.

### Expérience publique (Phase 8)

- **`vehicle-detail-page-builder.ts`** — `threeSixty: "CONTRACT"` uniquement si séquence 360 publiée ; sinon pas de bouton fantôme.
- **`g/[garageSlug]/vehicules/[vehicleSlug]/page.tsx`** — Charge 360 et visite intérieure ; affiche viewers seulement quand données publiées.
- **`public-vehicle-mapper.ts`** — Tri galerie par `display_order`.

### Mobile (Phase 9)

- Cibles tactiles larges, grilles responsives, modales plein écran, `capture="environment"`, viewers avec `touchAction: none` pour éviter le scroll parasite.
- Titres véhicule tronqués (`truncate`) dans les barres d’outils viewers.

### Sécurité / tenant (Phase 10)

- Toutes les actions serveur modifiées vérifient `getActiveGarageSession()` + appartenance véhicule/garage.
- Chemins Storage : `{garageId}/{vehicleId}/…` — pas de `garage_id` spoofable côté client.
- Suppressions : DB puis Storage (ou rollback inverse sur échec upload).
- RPC `reorder_vehicle_images` en `security invoker` — RLS appliquée.
- Lectures publiques via vues `public_live_*` et builders restrictifs (véhicule publié + média publié).

### Tests (Phase 11)

| Suite | Tests | Résultat |
|---|---:|---|
| `npm run test:media-studio` | 3 | PASS |
| `npm run test:vehicle-media` | 5 | PASS |
| `npm run test:vehicle-360` | 10 | PASS |
| `npm run test:interior-tour` | 10 | PASS |
| `npm run test:vehicle-detail` | 12 | PASS |
| `npm run test:media` | 11 | PASS |
| `npm run test:live-stock` | 13 | PASS |
| **`npm test`** (suite complète) | — | **PASS** |

Invariants couverts : isolation tenant, ownership véhicule, ordre photos, lifecycle 360, validation scènes/hotspots, visibilité publique, chemins Storage, rollback upload.

---

## Migrations créées (non appliquées — revue humaine requise)

| Fichier | Description |
|---|---|
| `supabase/migrations/20260827000050_add_vehicle_image_display_order.sql` | Colonne `display_order`, backfill, RPC reorder, vue publique |

**Action requise :** `supabase db push` ou application manuelle sur l’environnement cible avant démo photo reorder.

---

## Dépendances ajoutées

| Package | Version | Raison |
|---|---|---|
| `@photo-sphere-viewer/core` | ^5.15.1 | Viewer equirectangulaire mature, maintenu, sans licence propriétaire ; projection sphérique correcte pour panoramas intérieurs 2:1 |
| `@photo-sphere-viewer/markers-plugin` | ^5.15.1 | Hotspots cliquables sur le panorama (navigation inter-scènes V1) |

Import dynamique côté client uniquement — pas d’impact SSR ; bundle chargé à l’ouverture du viewer intérieur.

Scripts npm ajoutés : `test:media-studio`, `test:vehicle-media`.

---

## Ce qui existait vs ce qui a été implémenté

### Conservé tel quel (architecture saine)

- Schéma `vehicle_360_*`, `interior_tour_*`, buckets Storage, policies RLS existantes
- Repositories 360 et interior-tour, builders publics, Media Platform
- Validation lifecycle 360 (min 12 frames, continuité)
- Flux publication checklist

### Nouveau ou complété

- Module Media Studio unifié
- Réordonnancement photos + migration
- Upload/galerie photos client avec UX mobile
- Suppression frame 360, upload feedback
- Viewer 360 : preload + touch/keyboard
- Panorama intérieur Photo Sphere (remplace CSS hack)
- Suppression scène intérieure
- Hotspots avec position sphérique
- Contrat public 360 corrigé (CONTRACT vs PLACEHOLDER)
- 8 nouveaux fichiers tests/invariants

---

## Blockers restants (configuration humaine)

1. **Appliquer la migration `20260827000050`** — sans elle, le reorder photos et `display_order` échoueront en runtime.
2. **Images intérieures equirectangulaires 2:1** — le viewer affiche un message d’erreur gracieux si l’image n’est pas un panorama valide ; la qualité démo dépend des prises réelles.
3. **Validation manuelle mobile** — capture caméra, swipe viewers, ~360–390px : non testé sur appareils physiques dans ce ticket.
4. **Données SAP legacy** — réconciliation média GO-0084 reste un chantier séparé ; Media Studio fonctionne avec uploads manuels immédiats.
5. **Supabase Storage** — buckets et policies doivent être déployés (déjà définis dans migrations antérieures du projet).

---

## Validation exécutée

```text
npx tsc --noEmit          → PASS
npm run lint              → PASS
npm test                  → PASS (suite complète)
npm run build             → PASS
git diff --check          → PASS (avertissements CRLF uniquement)

Ciblés média :
npm run test:media-studio → PASS (3/3)
npm run test:vehicle-media → PASS (5/5)
npm run test:vehicle-360  → PASS (10/10)
npm run test:interior-tour → PASS (10/10)
npm run test:vehicle-detail → PASS (12/12)
npm run test:media        → PASS (11/11)
npm run test:live-stock   → PASS (13/13)
```

---

## Fichiers principaux touchés (GO-0086)

```
supabase/migrations/20260827000050_add_vehicle_image_display_order.sql
src/features/media-studio/
src/features/vehicles/image-actions.ts
src/features/vehicles/components/vehicle-image-*-client.tsx
src/features/vehicle-360/actions/vehicle-360-actions.ts
src/features/vehicle-360/components/Vehicle360UploadClient.tsx
src/features/vehicle-360/components/Vehicle360ViewerClient.tsx
src/features/interior-tour/components/InteriorPanoramaViewer.tsx
src/features/interior-tour/components/InteriorTourViewerClient.tsx
src/features/interior-tour/components/InteriorTourUploadClient.tsx
src/features/interior-tour/actions/interior-tour-actions.ts
src/app/(dashboard)/stock/[id]/page.tsx
src/app/(dashboard)/stock/[id]/360/page.tsx
src/app/(dashboard)/stock/[id]/interior-tour/page.tsx
src/app/(public)/g/[garageSlug]/vehicules/[vehicleSlug]/page.tsx
src/features/public-site/vehicle-detail/
src/features/live-stock/mappers/public-vehicle-mapper.ts
package.json / package-lock.json
```

**Non touché par GO-0086 :** `src/features/legacy-import/`, migrations SAP 48/49, bundles d’exécution GO-0084, checkpoints import, reset SAP.

---

## Parcours démo recommandé

1. Ouvrir un véhicule stock → section **Studio média**.
2. Onglet **Photos** : ajouter 3+ photos (mobile ou desktop), définir principale, réordonner.
3. Onglet **360° extérieur** → lien page dédiée : capturer ≥12 photos en marchant autour, supprimer une frame erronée, marquer prêt, publier.
4. Onglet **Visite intérieure** → uploader panorama 2:1, ajouter scène + hotspot vers autre scène, publier.
5. Publier le véhicule → vérifier fiche publique : galerie ordonnée, 360 interactif, visite immersive.

---

*Fin du rapport GO-0086.*
