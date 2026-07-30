# Garage OS Copilot

Le Copilote est exécuté exclusivement côté serveur. Son domaine dépend de
`CopilotProvider`, pas d'un SDK fournisseur.

## Configuration

- `COPILOT_API_KEY` : clé du fournisseur OpenAI-compatible ;
- `COPILOT_MODEL` : modèle utilisé, `gpt-4.1-mini` par défaut ;
- `COPILOT_API_URL` : endpoint compatible Chat Completions facultatif.

`OPENAI_API_KEY` est accepté comme repli serveur pour les environnements qui
utilisent déjà cette convention.

Sans clé, l'interface reste accessible et retourne une erreur de configuration
compréhensible. Les tests automatisés utilisent `FakeCopilotProvider` et
n'effectuent aucun appel payant.

Le contexte est reconstruit pour chaque question depuis le garage actif. Les
conversations sont privées par utilisateur et les réponses ne peuvent proposer
que des liens internes reconstruits ou explicitement autorisés.
