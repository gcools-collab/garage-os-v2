# GO-0099 — Finaliser les corrections vitrine après vérification Vercel

- Agent: Cursor
- Branche: `agent/cursor-go0099`
- Base: `4d51f4a` (dernier `main`, GO-0100 Leboncoin — non modifié)
- Statut: commit local uniquement, aucun push ni merge

## Corrections

### Location
- Paragraphe « Réservez en ligne chez Cargo, notre partenaire location à Raismes. » retiré.
- Légende « Visuel CarGo » retirée.
- Conservés: image CarGo, « Réserver en ligne », « Demander un devis ».

### Logo
- Recadrage plus agressif du blanc JPEG + conversion en PNG transparent.
- Taille utile header / menu / footer (`h-14` / `sm:h-16`, `object-contain`).
- `mix-blend-multiply` tant que le recadrage n’est pas prêt (masque le carré blanc).
- Fallback: nom du garage.

### Services / formulaire
- Carte Décalaminage compacte (liste de tarifs, plus de `sm:col-span-2`), alignée sur Immatriculation.
- Tarifs conservés: jusqu’à 1,9 L 39,90 € TTC ; 2 L et plus 49,90 € TTC ; choc +19,90 € / +29,90 € ; diagnostic option 30 €.
- Formulaire: diagnostic + traitement choc 2 L et plus toujours visibles (repli catalogue si offres vides).

## Hors périmètre
Connecteur Leboncoin, migrations, filtres véhicules: non touchés.

## Validations
- `npm run test:public-site` — 82 OK
- `npm run test:public-leads` — 20 OK
- `npx tsc --noEmit` — OK
- `npm run build` — OK

## Fichiers

- `src/features/public-site/presentation/logo-crop.ts`
- `src/features/public-site/components/PublicSiteBrand.tsx`
- `src/features/public-site/components/PublicNavigation.tsx`
- `src/features/public-site/components/PublicPartnerMedia.tsx`
- `src/features/public-site/components/PublicServicesPage.tsx`
- `src/features/public-site/builders/public-site-builders.ts`
- `src/features/public-site/types/public-site.ts`
- `src/features/public-leads/components/PublicOfferSelector.tsx`
- `src/features/public-leads/components/PublicRequestForm.tsx`
- `src/features/public-leads/actions/public-request-actions.ts`
- `src/features/service-catalog/config/sap-engine-cleaning-catalog.ts`
- `src/features/service-catalog/builders/public-offer-presentation-builder.ts`
- `src/features/public-site/tests/logo-crop.test.ts`
- `src/features/public-site/tests/public-booking-ux.test.ts`
- `src/features/public-site/tests/public-journey.test.tsx`
- `src/features/public-site/tests/public-media-acceptance.test.tsx`
- `src/features/public-leads/tests/public-leads.test.tsx`
- `outputs/agent-inbox/GO-0099-cursor.md`
- `outputs/agent-inbox/GO-0099-cursor.done`
