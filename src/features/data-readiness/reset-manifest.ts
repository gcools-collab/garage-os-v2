import type { ResetStorageBucket, ResetTable } from "./types";

const keep = (name: string, reason: string): ResetTable => ({ name, disposition: "KEEP", deleteOrder: null, garageScope: "DIRECT", reason });
const reset = (name: string, deleteOrder: number, scope: "DIRECT" | "INDIRECT" = "DIRECT"): ResetTable => ({
  name, disposition: "RESET", deleteOrder, garageScope: scope, reason: "Donnée opérationnelle ou de démonstration rattachée au garage.",
});

export const RESET_TABLE_MANIFEST = [
  keep("garages", "Identité du tenant."), keep("profiles", "Identité utilisateur, hors périmètre tenant."),
  keep("garage_members", "Accès et rôles du tenant."), keep("garage_branding", "Configuration publique du garage."),
  keep("garage_services", "Services activés."), keep("garage_scheduling_settings", "Configuration du planning."),
  keep("garage_business_hours", "Horaires métier."), keep("garage_calendar_exceptions", "Configuration du planning."),
  keep("appointment_type_settings", "Types de rendez-vous configurés."), keep("service_offers", "Catalogue de services."),
  keep("service_offer_options", "Options du catalogue."), keep("registration_procedures", "Référentiel carte grise."),
  keep("registration_procedure_requirements", "Référentiel documentaire."),
  keep("legacy_import_checkpoints", "Checkpoint d’exécution contrôlée; jamais supprimé par le reset métier."),
  { name: "legacy_import_records", disposition: "REVIEW", deleteOrder: 5, garageScope: "DIRECT", reason: "Traçabilité d'import réel; suppression automatique interdite." },
  { name: "historical_payments", disposition: "REVIEW", deleteOrder: 6, garageScope: "DIRECT", reason: "Historique financier réel distinct des paiements live." },
  { name: "legacy_media_references", disposition: "REVIEW", deleteOrder: 7, garageScope: "DIRECT", reason: "Références médias legacy réelles en attente de migration physique." },
  { name: "customer_vehicles", disposition: "REVIEW", deleteOrder: 8, garageScope: "DIRECT", reason: "Historique client réel potentiel; validation humaine obligatoire." },
  { name: "customers", disposition: "REVIEW", deleteOrder: 9, garageScope: "DIRECT", reason: "Identités et données personnelles réelles potentielles; validation humaine obligatoire." },
  reset("registration_documents", 10), reset("registration_case_events", 11), reset("registration_case_requirements", 12), reset("registration_cases", 13),
  reset("payment_events", 20),
  { name: "payments", disposition: "REVIEW", deleteOrder: 21, garageScope: "DIRECT", reason: "Seuls les paiements de test (is_live=false) peuvent être purgés; les paiements live bloquent l'exécution." },
  reset("appointment_events", 30), reset("appointments", 31),
  reset("copilot_action_logs", 40), reset("copilot_messages", 41), reset("copilot_conversations", 42),
  reset("lead_notes", 50), reset("commercial_tasks", 51), reset("lead_events", 52), reset("notifications", 53), reset("leads", 54),
  reset("intelligence_recommendations", 60),
  reset("acquisition_documents", 70), reset("acquisition_opportunities", 71), reset("acquisition_sellers", 72),
  reset("interior_tour_hotspots", 80), reset("interior_tour_scenes", 81), reset("interior_tours", 82),
  reset("vehicle_360_frames", 90), reset("vehicle_360_sequences", 91), reset("vehicle_listing_versions", 92),
  reset("vehicle_documents", 93), reset("vehicle_images", 94, "INDIRECT"), reset("vehicle_market_analyses", 95, "INDIRECT"),
  reset("marketplace_links", 96, "INDIRECT"), reset("vehicle_costs", 97, "INDIRECT"), reset("vehicle_events", 98, "INDIRECT"), reset("vehicles", 99),
] as const satisfies readonly ResetTable[];

export const RESET_STORAGE_BUCKETS = [
  "vehicle-images", "vehicle-documents", "acquisition-documents", "vehicle-360", "vehicle-interior-tours", "registration-documents",
].map((name): ResetStorageBucket => ({ name, prefix: (garageId) => `${garageId}/` }));
