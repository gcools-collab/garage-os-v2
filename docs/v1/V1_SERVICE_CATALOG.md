# Catalogue de prestations V1

Le catalogue est privé, isolé par garage et distinct de `garage_services`. Ce dernier active une famille de services ; `service_offers` décrit les prestations réellement commercialisables et `service_offer_options` leurs options.

Les montants sont stockés en centimes. Les tarifications disponibles sont `FIXED`, `FROM`, `QUOTE` et `VARIABLE`. Les stratégies de paiement sont `NO_PAYMENT`, `FULL_PAYMENT`, `DEPOSIT` et `PAY_ON_SITE`. Un acompte n’est jamais présenté comme le prix total : si celui-ci est inconnu, `totalAmount` et `remainingAmount` restent nuls.

Le garage SAP `363f2dc0-bfd3-48d6-a1cc-96e113e96094` reçoit explicitement les seules données confirmées : décalaminage -2L à 3 990 centimes, décalaminage +2L à 4 990 centimes et carte grise avec acompte de 2 000 centimes sans prix total. Aucun diagnostic, traitement choc ou tarif inconnu n’est créé.

Une offre reste conservée lorsque son service parent est désactivé mais disparaît de la projection publique. Les options peuvent être activées, publiées, ordonnées et modifier prix ou durée. Le serveur résout toujours l’offre et les options et ignore tout montant envoyé par le navigateur.

Lors de la réservation, `appointments.commercial_snapshot` doit conserver les conditions calculées afin qu’une modification ultérieure du catalogue ne change jamais l’historique. GO-0081.3B utilisera `paymentStrategy` et `amountDueNowCents` pour PayPlug ; aucun paiement n’est exécuté ici.

Pour un rendez-vous lié à une offre, le catalogue et son snapshot sont l’unique source de vérité financière. `appointment_type_settings.payment_required` reste compatible avec les rendez-vous sans offre, mais ne remplace jamais `FULL_PAYMENT`, `DEPOSIT`, `PAY_ON_SITE` ou `NO_PAYMENT`. La RPC publique reçoit uniquement le slug de l’offre et les identifiants d’options, puis résout le garage Live, le service parent et recalcule les montants dans la transaction.
