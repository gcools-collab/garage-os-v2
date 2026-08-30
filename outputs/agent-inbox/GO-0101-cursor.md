# GO-0101 — Lisibilité du logo SAP sur fond sombre

- Agent: Cursor
- Branche: `agent/cursor-go0101`
- Base: `6c965a2` (dernier `main`, GO-0099)
- Statut: commit local uniquement, aucun push ni merge

## Correction

Le recadrage des marges blanches extérieures est conservé. Le fond blanc intérieur n’est plus rendu transparent. `mix-blend-multiply` est retiré.

Le logo s’affiche dans un médaillon circulaire (`rounded-full`, `overflow-hidden`, `bg-white`) identique dans le header, le menu mobile et le footer. `object-contain` évite toute déformation. La bordure dorée du fichier n’est pas recadrée. Si l’image échoue, le nom du garage reste le fallback.

## Hors périmètre

Location, Services, Leboncoin, migrations, médias véhicules: non touchés.

## Validations

- `npm run test:public-site` — 82 OK
- `npm run test:branding` — 37 OK
- `npx tsc --noEmit` — OK
- `npm run build` — OK

## Fichiers

- `src/features/public-site/components/PublicSiteBrand.tsx`
- `src/features/public-site/presentation/logo-crop.ts`
- `src/features/public-site/tests/logo-crop.test.ts`
- `src/features/public-site/tests/public-media-acceptance.test.tsx`
- `outputs/agent-inbox/GO-0101-cursor.md`
- `outputs/agent-inbox/GO-0101-cursor.done`
