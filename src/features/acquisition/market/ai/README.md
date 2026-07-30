# Acquisition Market AI Insights

Cette couche interprète facultativement les résultats déterministes. Elle ne calcule
jamais les prix, marges, scores ou niveaux de risque financier.

## Activation

L’enrichissement est désactivé par défaut. Il exige :

- `AI_INSIGHTS_ENABLED=true`
- `AI_INSIGHTS_API_KEY`
- `AI_INSIGHTS_MODEL`
- `AI_INSIGHTS_API_URL` facultatif pour un endpoint OpenAI-compatible

Les variables `COPILOT_API_KEY`, `COPILOT_MODEL` et `COPILOT_API_URL` servent de
fallback technique uniquement après activation explicite.

## Données transmises

Le contexte est limité aux caractéristiques utiles du véhicule, aux statistiques
déterministes et à dix annonces publiques au maximum. Les descriptions sont
tronquées à 2 000 caractères. Identité, téléphone, e-mail, notes internes et
documents privés du vendeur ne sont pas transmis.

L’adaptateur OpenAI-compatible actuel ne déclare pas de capacité vision. Les URLs
d’images ne lui sont donc pas envoyées. Un futur provider vision devra annoncer
explicitement cette capacité.

## Dégradation

Sans configuration, sur timeout ou en cas de sortie invalide, aucun insight n’est
créé. L’analyse statistique et la recommandation économique restent disponibles.
