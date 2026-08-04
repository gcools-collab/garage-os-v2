# Checklist de validation V1

## Configuration minimale

- [ ] Un utilisateur de démonstration peut se connecter.
- [ ] Son appartenance au garage actif est valide.
- [ ] Le branding, le thème, le slug public et les coordonnées sont renseignés.
- [ ] Au moins un véhicule possède un prix, une photo de couverture et le statut publié.
- [ ] Le site `/g/[garageSlug]` affiche uniquement les véhicules publiés.

## Parcours privés

- [ ] Connexion, sélection du garage et déconnexion sans erreur serveur.
- [ ] Tableau de bord, priorités et notifications avec données réelles.
- [ ] Recherche, filtres, tri et pagination du stock.
- [ ] Fiche véhicule et retours depuis médias, 360°, visite intérieure, annonces et publication.
- [ ] Acquisition et analyse de marché avec états indisponible et sans comparable.
- [ ] Demandes clients et boîte commerciale avec états vides utiles.

## Parcours publics

- [ ] Accueil, stock, contact et fiche véhicule sur mobile et desktop.
- [ ] Branding cohérent et aucune donnée fictive.
- [ ] Galerie, visite 360° et visite intérieure avec fallback.
- [ ] Envoi d'une demande avec confirmation et gestion d'erreur compréhensible.

## Validation technique

```bash
npm test
npm run test:v1-readiness
npm run lint
npx tsc --noEmit
npm run build
git diff --check
npx supabase migration list
npx supabase db push --dry-run
```
