import type { LegacyBooking, LegacyDecision, LegacyLead, LegacyPayment, SqlLegacyDiscovery } from "./types";

const technical = /(?:actionscheduler|options|yoast|cache|wordfence|security|logs?|sessions?|elementor_css)/i;
const tablesFromSql = (sql: string): readonly string[] => [...new Set([...sql.matchAll(/(?:INSERT\s+INTO|CREATE\s+TABLE)\s+`?([a-z0-9_]+)`?/gi)].map((match) => match[1]))];

export function discoverLegacySql(sql: string): SqlLegacyDiscovery {
  const tables = tablesFromSql(sql);
  const business = tables.filter((table) => !technical.test(table));
  return {
    tables: business,
    customerSources: business.filter((table) => /users|usermeta|customer|(?:woocommerce|wc)_orders?/i.test(table)),
    bookingSources: business.filter((table) => /yith.*book|booking/i.test(table)),
    paymentSources: business.filter((table) => /(?:woocommerce|wc).*orders?|payplug|payment/i.test(table)),
    leadSources: business.filter((table) => /(?:elementor.*|(?:^|_)e_)submissions?(?:_|$)|form/i.test(table)),
    ignoredTechnicalTables: tables.length - business.length,
  };
}

export function classifyLegacyBooking(externalId: string, status: string, paid: boolean): LegacyBooking {
  const normalized = status.trim().toUpperCase();
  const unsuccessful = /CANCEL|UNPAID|PENDING|UNCONFIRMED|FAILED/.test(normalized);
  const successful = paid && /PAID|CONFIRM|COMPLETE|COMPLETED|PROCESSING/.test(normalized);
  const decision: LegacyDecision = successful ? "IMPORT" : unsuccessful || !paid ? "IGNORE" : "REVIEW";
  return { externalId, status, paid, decision };
}

export function classifyHistoricalPayment(input: Omit<LegacyPayment, "historical" | "decision">): LegacyPayment {
  const status = input.status.trim().toUpperCase();
  const decision: LegacyDecision = input.amountCents !== null && input.amountCents > 0 && /PAID|COMPLETED|PROCESSING|REFUNDED/.test(status)
    ? "IMPORT" : /FAILED|CANCELLED|PENDING|UNPAID/.test(status) ? "IGNORE" : "REVIEW";
  return { ...input, historical: true, decision };
}

export function classifyElementorLead(externalId: string, formName: string): LegacyLead {
  const normalized = formName.trim().toLocaleLowerCase("fr");
  const recognized = /^(formulaire\s+)?renseignement(?:\s+service)?$|^(formulaire\s+)?location$/.test(normalized);
  return { externalId, formName, decision: recognized ? "IMPORT" : "REVIEW" };
}
