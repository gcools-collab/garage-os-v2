import { normalizeEmail, normalizeFrenchPhone, normalizePersonName } from "./normalization";
import type { CustomerResolution, LegacyCustomer } from "./types";

export type CustomerMatch = Readonly<{ decision: CustomerResolution; customerId: string | null; reasons: readonly string[] }>;
export type ExistingCustomerIdentity = Readonly<{ id: string; garageId: string; firstName: string | null; lastName: string | null; normalizedEmail: string | null; normalizedPhone: string | null }>;

const sameName = (legacy: LegacyCustomer, existing: ExistingCustomerIdentity): boolean =>
  normalizePersonName(legacy.firstName) === normalizePersonName(existing.firstName) &&
  normalizePersonName(legacy.lastName) === normalizePersonName(existing.lastName);

export function normalizeLegacyCustomer(input: Omit<LegacyCustomer, "normalizedEmail" | "normalizedPhone">): LegacyCustomer {
  return { ...input, normalizedEmail: normalizeEmail(input.email), normalizedPhone: normalizeFrenchPhone(input.phone) };
}
export function resolveLegacyCustomer(candidate: LegacyCustomer, existing: readonly ExistingCustomerIdentity[]): CustomerMatch {
  const tenantCustomers = existing.filter((item) => item.garageId === candidate.garageId);
  const emailMatches = candidate.normalizedEmail ? tenantCustomers.filter((item) => item.normalizedEmail === candidate.normalizedEmail) : [];
  if (emailMatches.length === 1) {
    return sameName(candidate, emailMatches[0]) || (!candidate.firstName && !candidate.lastName)
      ? { decision: "MATCH", customerId: emailMatches[0].id, reasons: ["EMAIL_EXACT"] }
      : { decision: "REVIEW", customerId: emailMatches[0].id, reasons: ["EMAIL_EXACT_IDENTITY_CONFLICT"] };
  }
  if (emailMatches.length > 1) return { decision: "REVIEW", customerId: null, reasons: ["EMAIL_NOT_UNIQUE"] };
  const phoneMatches = candidate.normalizedPhone ? tenantCustomers.filter((item) => item.normalizedPhone === candidate.normalizedPhone) : [];
  if (phoneMatches.length === 1 && sameName(candidate, phoneMatches[0])) return { decision: "MATCH", customerId: phoneMatches[0].id, reasons: ["PHONE_EXACT_NAME_CONSISTENT"] };
  if (phoneMatches.length > 0) return { decision: "REVIEW", customerId: null, reasons: ["PHONE_SHARED_OR_IDENTITY_UNCONFIRMED"] };
  if (!candidate.normalizedEmail && !candidate.normalizedPhone && !candidate.firstName && !candidate.lastName) return { decision: "IGNORE", customerId: null, reasons: ["NO_IDENTITY"] };
  return { decision: "CREATE", customerId: null, reasons: ["NO_STRONG_MATCH"] };
}
