# PayPlug V1

Garage OS calcule le montant depuis `appointments.commercial_snapshot`. PayPlug encaisse uniquement ce montant via sa Hosted Payment Page. Le domaine `payments` reste indépendant du provider.

Variables serveur pour l’acceptation V1 : `PAYPLUG_ENABLED`, `PAYPLUG_MODE=test`, `PAYPLUG_TEST_KEY`, `PAYPLUG_API_URL=https://api.payplug.com`, `PAYPLUG_API_VERSION=2019-08-06`, `NEXT_PUBLIC_APP_URL` et `SUPABASE_SERVICE_ROLE_KEY`. Une clé test commence par `sk_test_`. Le secret ne doit jamais utiliser un préfixe `NEXT_PUBLIC_`. Le mode LIVE est explicitement bloqué pendant cette phase d’acceptation.

La création utilise `POST /v1/payments`, puis redirige vers `hosted_payment.payment_url`. Garage OS ne reçoit aucune donnée bancaire. La notification `/api/payments/payplug/notification` n’est jamais fiable seule : elle fournit un identifiant, puis le serveur appelle `GET /v1/payments/{id}` et contrôle montant, devise, environnement, rendez-vous, garage et metadata avant la transaction atomique.

Le retour navigateur affiche uniquement un état interne et ne confirme rien. Un paiement intégral ou un acompte payé confirme le rendez-vous ; l’acompte ne représente jamais le prix final. Un échec laisse le rendez-vous en attente. Une expiration libère le créneau sans supprimer l’historique. Les notifications répétées sont idempotentes.

En local, les tests utilisent `FakePaymentProvider`. Une notification PayPlug TEST réelle exige une URL HTTPS publique dans `NEXT_PUBLIC_APP_URL`; `localhost` ne convient pas. L’activation LIVE fera l’objet d’un ticket et d’un garde-fou distincts. Les remboursements sont préparés dans le contrat provider mais aucune action UI dangereuse n’est exposée.
