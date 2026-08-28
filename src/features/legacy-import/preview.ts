import { z } from "zod";
import type { CustomerMatch } from "./customer-matcher";
import type { LegacyBooking, LegacyCustomer, LegacyImportPreview, LegacyLead, LegacyPayment, LegacyVehicle, SqlLegacyDiscovery } from "./types";

const inputSchema = z.object({ garageId: z.uuid(), wxrParsed: z.boolean(), sqlParsed: z.boolean(), mediaArchivePresent: z.boolean() });

export function buildLegacyImportPreview(input: {
  readonly garageId: string; readonly wxrParsed: boolean; readonly sqlParsed: boolean; readonly mediaArchivePresent: boolean;
  readonly vehicles: readonly LegacyVehicle[]; readonly customers: readonly LegacyCustomer[]; readonly customerMatches: readonly CustomerMatch[];
  readonly bookings: readonly LegacyBooking[]; readonly payments: readonly LegacyPayment[]; readonly leads: readonly LegacyLead[];
  readonly sqlDiscovery: SqlLegacyDiscovery | null;
}): LegacyImportPreview {
  const parsed = inputSchema.parse(input);
  const uniqueCustomers = new Set(input.customers.map((customer) => `${customer.normalizedEmail ?? ""}|${customer.normalizedPhone ?? ""}|${customer.externalId}`));
  return {
    garageId: parsed.garageId,
    source: { wxrParsed: parsed.wxrParsed, sqlParsed: parsed.sqlParsed, mediaArchive: parsed.mediaArchivePresent ? "PENDING" : "MISSING" },
    vehicles: {
      detected: input.vehicles.length, importable: input.vehicles.filter((item) => item.decision === "IMPORT").length,
      ignored: input.vehicles.filter((item) => item.decision === "IGNORE").length, conflicts: 0,
      invalid: input.vehicles.filter((item) => item.decision === "INVALID").length,
    },
    customers: {
      detected: input.customers.length, unique: uniqueCustomers.size,
      matches: input.customerMatches.filter((item) => item.decision === "MATCH").length,
      creates: input.customerMatches.filter((item) => item.decision === "CREATE").length,
      reviews: input.customerMatches.filter((item) => item.decision === "REVIEW").length,
    },
    appointments: {
      detected: input.bookings.length, eligible: input.bookings.filter((item) => item.decision === "IMPORT").length,
      ignored: input.bookings.filter((item) => item.decision === "IGNORE").length,
      reviews: input.bookings.filter((item) => item.decision === "REVIEW").length,
    },
    payments: {
      detected: input.payments.length, eligible: input.payments.filter((item) => item.decision === "IMPORT").length,
      ignored: input.payments.filter((item) => item.decision === "IGNORE").length,
      conflicts: input.payments.filter((item) => item.decision === "REVIEW" || item.decision === "INVALID").length,
    },
    leads: {
      detected: input.leads.length, importable: input.leads.filter((item) => item.decision === "IMPORT").length,
      reviews: input.leads.filter((item) => item.decision === "REVIEW").length,
    },
    media: {
      attachments: input.vehicles.reduce((sum, item) => sum + item.media.length, 0),
      vehicleRelationships: input.vehicles.filter((item) => item.media.length > 0).length,
      pendingPhysicalFiles: input.vehicles.reduce((sum, item) => sum + item.media.filter((media) => media.status === "PENDING").length, 0),
    },
    databaseMutations: 0, storageMutations: 0,
  };
}
export function formatLegacyImportPreview(report: LegacyImportPreview): string {
  return [
    "SAP LEGACY IMPORT PREVIEW", "", "Source",
    `- WXR parsed: ${report.source.wxrParsed}`, `- SQL parsed: ${report.source.sqlParsed}`, `- media archive: ${report.source.mediaArchive.toLowerCase()}`,
    "", "Vehicles", `- detected: ${report.vehicles.detected}`, `- importable: ${report.vehicles.importable}`, `- ignored: ${report.vehicles.ignored}`,
    "", "Customers", `- identities detected: ${report.customers.detected}`, `- unique normalized identities: ${report.customers.unique}`, `- reviews: ${report.customers.reviews}`,
    "", "Appointments", `- detected: ${report.appointments.detected}`, `- eligible historical appointments: ${report.appointments.eligible}`, `- ignored unsuccessful bookings: ${report.appointments.ignored}`,
    "", "Payments", `- historical payments detected: ${report.payments.detected}`, `- eligible: ${report.payments.eligible}`,
    "", "Leads", `- detected: ${report.leads.detected}`, `- importable: ${report.leads.importable}`, `- review: ${report.leads.reviews}`,
    "", "Media", `- attachments detected: ${report.media.attachments}`, `- pending physical files: ${report.media.pendingPhysicalFiles}`,
    "", `Database mutations: ${report.databaseMutations}`, `Storage mutations: ${report.storageMutations}`,
  ].join("\n");
}
