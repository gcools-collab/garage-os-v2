import { createHash } from "node:crypto";
import { z } from "zod";
import { normalizeLegacyCustomer } from "../customer-matcher";
import { normalizeEmail, normalizeFrenchPhone } from "../normalization";
import { parseWordPressWxr } from "../wxr-parser";
import type { ControlledImportEntity, ControlledImportOperation } from "../controlled-import";

export type LegacyExecutionBundle = Readonly<{ garageId: string; operations: readonly ControlledImportOperation[] }>;

type SqlValue = string | null;
type SqlRow = Readonly<Record<string, SqlValue>>;
type SqlTables = ReadonlyMap<string, readonly SqlRow[]>;

const entityOrder: readonly ControlledImportEntity[] = ["CUSTOMER", "CUSTOMER_VEHICLE", "VEHICLE", "APPOINTMENT", "HISTORICAL_PAYMENT", "LEAD", "MEDIA_REFERENCE"];
const targetByEntity: Readonly<Record<Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, string>> = {
  CUSTOMER: "customers", CUSTOMER_VEHICLE: "customer_vehicles", VEHICLE: "vehicles",
  APPOINTMENT: "appointments", HISTORICAL_PAYMENT: "historical_payments", LEAD: "leads",
};
const excludedVehicleIds = new Set(["4915", "4927", "6054"]);
const excludedCustomerIds = new Set(["5", "6"]);

const bundleOperationSchema = z.object({
  garageId: z.uuid(), source: z.enum(["WORDPRESS", "WOOCOMMERCE", "YITH", "ELEMENTOR"]),
  entity: z.enum(["CUSTOMER", "CUSTOMER_VEHICLE", "VEHICLE", "APPOINTMENT", "HISTORICAL_PAYMENT", "LEAD"]),
  externalId: z.string().min(1).max(200), fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  targetTable: z.string().min(1), payload: z.record(z.string(), z.unknown()),
}).strict();
const bundleSchema = z.object({ garageId: z.uuid(), operations: z.array(bundleOperationSchema) }).strict();

const postgresInteger = z.number().int().min(-2_147_483_648).max(2_147_483_647);
const nullableText = z.string().nullable().optional();
const isoTimestamp = z.string().datetime({ offset: true });
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const source = z.enum(["GARAGE_OS", "WORDPRESS", "WOOCOMMERCE", "YITH", "ELEMENTOR", "MANUAL", "OTHER"]);
const payloadSchemas = {
  CUSTOMER: z.object({ id: z.uuid(), first_name: nullableText, last_name: nullableText, email: nullableText, normalized_email: nullableText, phone: nullableText, normalized_phone: nullableText, postal_code: nullableText, city: nullableText, source, created_at: isoTimestamp.optional() }).passthrough().superRefine((value, context) => {
    if (![value.normalized_email, value.normalized_phone, value.first_name, value.last_name].some((item) => typeof item === "string" && item.length > 0)) context.addIssue({ code: "custom", message: "customer identity required" });
    if (value.normalized_email && value.normalized_email !== value.normalized_email.trim().toLowerCase()) context.addIssue({ code: "custom", message: "normalized email must be lower-case and trimmed", path: ["normalized_email"] });
  }),
  CUSTOMER_VEHICLE: z.object({ id: z.uuid(), customer_id: z.uuid(), stock_vehicle_id: z.uuid().nullable().optional(), source }).passthrough(),
  VEHICLE: z.object({ id: z.uuid(), brand: z.string().min(1), model: z.string().min(1), year: postgresInteger.min(1886).max(2100).nullable().optional(), mileage: postgresInteger.nonnegative().nullable().optional(), selling_price: z.number().finite().nonnegative().nullable().optional(), doors: postgresInteger.min(2).max(6).nullable().optional(), seats: postgresInteger.min(1).max(9).nullable().optional(), power_din: postgresInteger.min(0).max(3000).nullable().optional(), fiscal_power: postgresInteger.min(0).max(1000).nullable().optional(), first_registration_date: isoDate.nullable().optional(), status: z.enum(["PURCHASED", "PREPARATION", "READY_TO_PUBLISH", "PUBLISHED", "RESERVED", "SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"]), created_at: isoTimestamp.optional(), updated_at: isoTimestamp.optional() }).passthrough(),
  APPOINTMENT: z.object({ id: z.uuid(), type: z.enum(["TEST_DRIVE", "ENGINE_CLEANING", "REGISTRATION", "CONSIGNMENT", "TRADE_IN", "WORKSHOP", "MAINTENANCE", "BODYWORK", "DIAGNOSTIC", "TYRES", "RENTAL", "OTHER"]), status: z.enum(["PENDING", "AWAITING_PAYMENT", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]), starts_at: isoTimestamp, ends_at: isoTimestamp, timezone: z.string().min(1), payment_required: z.boolean(), is_historical: z.literal(true), customer_id: z.uuid().nullable().optional(), details: z.record(z.string(), z.unknown()).refine((value) => Buffer.byteLength(JSON.stringify(value), "utf8") <= 8192, "appointment details exceed database limit"), created_at: isoTimestamp.optional(), updated_at: isoTimestamp.optional() }).passthrough().superRefine((value, context) => {
    if (Date.parse(value.starts_at) >= Date.parse(value.ends_at)) context.addIssue({ code: "custom", message: "appointment period invalid", path: ["ends_at"] });
  }),
  HISTORICAL_PAYMENT: z.object({ id: z.uuid(), customer_id: z.uuid().nullable().optional(), external_payment_id: nullableText, provider: nullableText, amount_cents: postgresInteger.positive(), currency: z.string().regex(/^[A-Z]{3}$/), source_status: z.string().min(1), occurred_at: isoTimestamp.nullable().optional() }).passthrough(),
  LEAD: z.object({ id: z.uuid(), source: z.literal("MANUAL"), type: z.enum(["VEHICLE_INQUIRY", "TEST_DRIVE", "TRADE_IN", "FINANCING", "GENERAL_CONTACT", "SERVICE_REQUEST", "RENTAL"]), status: z.enum(["NEW", "QUALIFIED", "CONTACTED", "APPOINTMENT", "NEGOTIATION", "WON", "LOST", "ARCHIVED"]), customer_name: z.string().min(2).max(100), customer_phone: z.string().min(6).max(30).nullable().optional(), customer_email: z.string().max(254).nullable().optional(), message: z.string().max(2000).nullable().optional(), public_page_url: z.string().max(500).nullable().optional(), public_garage_slug: z.string().min(1), customer_id: z.uuid().nullable().optional(), created_at: isoTimestamp.optional(), updated_at: isoTimestamp.optional() }).passthrough().superRefine((value, context) => {
    if (!value.customer_phone && !value.customer_email) context.addIssue({ code: "custom", message: "lead contact required" });
  }),
} satisfies Readonly<Record<Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, z.ZodType>>;

const assertFiniteNumbers = (value: unknown, path: string): void => {
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`EXECUTION_BUNDLE_NUMERIC_NON_FINITE:${path}`);
  if (Array.isArray(value)) value.forEach((item, index) => assertFiniteNumbers(item, `${path}[${index}]`));
  else if (value && typeof value === "object") Object.entries(value as Record<string, unknown>).forEach(([key, item]) => assertFiniteNumbers(item, `${path}.${key}`));
};

export function validateBundlePayload(entity: Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, externalId: string, payload: Readonly<Record<string, unknown>>): void {
  assertFiniteNumbers(payload, `${entity}:${externalId}`);
  const result = payloadSchemas[entity].safeParse(payload);
  if (!result.success) throw new Error(`EXECUTION_BUNDLE_SCHEMA_INCOMPATIBLE:${entity}:${externalId}:${result.error.issues.map((issue) => `${issue.path.join(".")}:${issue.code}`).join(",")}`);
}

const sorted = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sorted);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, item]) => [key, sorted(item)]));
  return value;
};

export const stableJson = (value: unknown): string => `${JSON.stringify(sorted(value), null, 2)}\n`;
export const sha256Bytes = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const deterministicUuid = (identity: string): string => {
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 32).split("");
  digest[12] = "5";
  digest[16] = ((Number.parseInt(digest[16], 16) & 3) | 8).toString(16);
  const value = digest.join("");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
};

const operationFingerprint = (operation: Omit<ControlledImportOperation, "fingerprint">): string =>
  sha256Bytes(Buffer.from(stableJson(operation), "utf8"));

const operation = (input: Omit<ControlledImportOperation, "fingerprint">): ControlledImportOperation => ({ ...input, fingerprint: operationFingerprint(input) });

const parseTuple = (line: string): readonly SqlValue[] => {
  const source = line.trim().replace(/[;,]$/, "").replace(/^\(/, "").replace(/\)$/, "");
  const values: SqlValue[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const character of source) {
    if (escaped) { current += character === "n" ? "\n" : character === "r" ? "\r" : character === "t" ? "\t" : character; escaped = false; continue; }
    if (quoted && character === "\\") { escaped = true; continue; }
    if (character === "'") { quoted = !quoted; continue; }
    if (character === "," && !quoted) { values.push(current.trim() === "NULL" ? null : current.trim()); current = ""; continue; }
    current += character;
  }
  if (quoted || escaped) throw new Error("LEGACY_SQL_TUPLE_INVALID");
  values.push(current.trim() === "NULL" ? null : current.trim());
  return values;
};

export function parseLegacySqlTables(sql: string, selectedTables: readonly string[]): SqlTables {
  const selected = new Set(selectedTables);
  const columns = new Map<string, readonly string[]>();
  for (const table of selected) {
    const match = sql.match(new RegExp(`CREATE TABLE \\x60${table}\\x60 \\(([\\s\\S]*?)\\) ENGINE=`, "i"));
    if (!match) throw new Error(`LEGACY_SQL_SCHEMA_MISSING:${table}`);
    columns.set(table, [...match[1].matchAll(/^\s*`([^`]+)`/gm)].map((item) => item[1]));
  }
  const rows = new Map<string, SqlRow[]>();
  let currentTable: string | null = null;
  for (const line of sql.split(/\r?\n/)) {
    if (line.startsWith("INSERT INTO ")) { currentTable = line.match(/^INSERT INTO `([^`]+)`/)?.[1] ?? null; continue; }
    if (!currentTable || !selected.has(currentTable) || !line.startsWith("(")) continue;
    const values = parseTuple(line);
    const names = columns.get(currentTable)!;
    if (values.length !== names.length) throw new Error(`LEGACY_SQL_COLUMN_DRIFT:${currentTable}:${values.length}:${names.length}`);
    const tableRows = rows.get(currentTable) ?? [];
    tableRows.push(Object.fromEntries(names.map((name, index) => [name, values[index]])));
    rows.set(currentTable, tableRows);
  }
  for (const table of selected) if (!rows.has(table)) rows.set(table, []);
  return rows;
}

const clean = (value: SqlValue | undefined): string | null => value?.trim() || null;
const sqlTimestamp = (value: SqlValue | undefined): string | null => {
  const text = clean(value);
  if (!text || text === "0000-00-00 00:00:00") return null;
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)) throw new Error(`LEGACY_SQL_DATE_INVALID:${text}`);
  return `${text.replace(" ", "T")}Z`;
};
const eurosToCents = (value: SqlValue | undefined): number | null => {
  const amount = Number(clean(value));
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};
const compact = (value: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""));
export type PreservedLegacyText = Readonly<{
  operationalValue: string | null;
  originalValue: string | null;
  originalLength: number | null;
  originalSha256: string | null;
}>;

export const preserveLegacyText = (value: string | null, maximum: number): PreservedLegacyText => {
  if (!value) return { operationalValue: value, originalValue: null, originalLength: null, originalSha256: null };
  const codePoints = [...value];
  if (codePoints.length <= maximum) return { operationalValue: value, originalValue: null, originalLength: null, originalSha256: null };
  return {
    operationalValue: codePoints.slice(0, maximum).join(""),
    originalValue: value,
    originalLength: codePoints.length,
    originalSha256: sha256Bytes(Buffer.from(value, "utf8")),
  };
};

const credibleLeadName = (candidates: readonly (string | null)[], email: string | null, phone: string | null): Readonly<{ value: string; rejectedLength: number | null; rejectedSha256: string | null }> => {
  for (const candidate of candidates) {
    const length = candidate ? [...candidate].length : 0;
    if (candidate && length >= 2 && length <= 100) return { value: candidate, rejectedLength: null, rejectedSha256: null };
  }
  const rejected = candidates.find((candidate) => candidate && [...candidate].length > 100) ?? null;
  const fallback = email ?? phone;
  const fallbackLength = fallback ? [...fallback].length : 0;
  if (!fallback || fallbackLength < 2 || fallbackLength > 100) throw new Error("LEGACY_LEAD_NAME_UNRESOLVED");
  return { value: fallback, rejectedLength: rejected ? [...rejected].length : null, rejectedSha256: rejected ? sha256Bytes(Buffer.from(rejected, "utf8")) : null };
};

export type AppointmentContactInvariant = Readonly<{
  isHistorical: boolean;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}>;

export function appointmentContactIsValid(input: AppointmentContactInvariant): boolean {
  if (input.isHistorical) return true;
  const name = input.customerName?.trim() ?? "";
  return name.length >= 2 && name.length <= 160 && (input.customerEmail !== null || input.customerPhone !== null);
}

const vehicleIdentity = (title: string): Readonly<{ brand: string; model: string; trim: string | null }> => {
  const normalized = title.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const known = ["FONT VENDÔME", "VOLKSWAGEN", "MERCEDES", "CITROËN", "CITROEN", "RENAULT", "PEUGEOT", "JAGUAR", "IVECO", "AUDI", "BMW", "FIAT", "MG"];
  const brandToken = known.find((brand) => normalized.toLocaleUpperCase("fr").startsWith(`${brand} `));
  if (!brandToken) throw new Error(`LEGACY_VEHICLE_IDENTITY_UNRESOLVED:${title}`);
  const brand = brandToken === "CITROEN" ? "Citroën" : brandToken.split(" ").map((part) => part[0] + part.slice(1).toLocaleLowerCase("fr")).join(" ");
  const remainder = normalized.slice(brandToken.length).trim();
  const modelMatch = brandToken === "JAGUAR" && /^TYPE\s+E\b/i.test(remainder) ? remainder.match(/^TYPE\s+E\b/i) : remainder.match(/^[^\s-]+/);
  const model = modelMatch?.[0]?.trim();
  if (!model) throw new Error(`LEGACY_VEHICLE_MODEL_UNRESOLVED:${title}`);
  const trim = remainder.slice(model.length).replace(/^\s*[-–—]\s*/, "").trim() || null;
  return { brand, model: model.split(" ").map((part) => part[0] + part.slice(1).toLocaleLowerCase("fr")).join(" "), trim };
};

const statusFromLegacy = (status: "SOLD" | "RESERVED" | "AVAILABLE" | "UNKNOWN"): string =>
  status === "SOLD" ? "SOLD" : status === "RESERVED" ? "RESERVED" : "PUBLISHED";

export function buildSapExecutionBundle(input: { readonly garageId: string; readonly wxr: string; readonly sql: string }): LegacyExecutionBundle {
  const tables = parseLegacySqlTables(input.sql, ["wpbe_wc_customer_lookup", "wpbe_yith_wcbk_booking_meta_lookup", "wpbe_wc_orders", "wpbe_wc_order_addresses", "wpbe_e_submissions", "wpbe_e_submissions_values"]);
  const customerRows = tables.get("wpbe_wc_customer_lookup") ?? [];
  const bookingRows = tables.get("wpbe_yith_wcbk_booking_meta_lookup") ?? [];
  const orderRows = tables.get("wpbe_wc_orders") ?? [];
  const orderAddressRows = tables.get("wpbe_wc_order_addresses") ?? [];
  const submissionRows = tables.get("wpbe_e_submissions") ?? [];
  const submissionValueRows = tables.get("wpbe_e_submissions_values") ?? [];
  const customerIds = new Map<string, string>();
  const customersByLegacyId = new Map(customerRows.map((row) => [clean(row.customer_id)!, row]));
  const customersByUserId = new Map(customerRows.flatMap((row) => clean(row.user_id) && clean(row.user_id) !== "0" ? [[clean(row.user_id)!, row] as const] : []));

  const customerOperations = customerRows.filter((row) => !excludedCustomerIds.has(clean(row.customer_id) ?? "")).map((row) => {
    const legacyId = clean(row.customer_id);
    if (!legacyId) throw new Error("LEGACY_CUSTOMER_EXTERNAL_ID_MISSING");
    const externalId = `CUSTOMER_LOOKUP:${legacyId}`;
    const normalized = normalizeLegacyCustomer({
      garageId: input.garageId, source: "WOOCOMMERCE", externalId,
      firstName: clean(row.first_name), lastName: clean(row.last_name), email: clean(row.email), phone: null, city: clean(row.city),
    });
    if (!normalized.firstName && !normalized.lastName && !normalized.normalizedEmail) throw new Error(`LEGACY_CUSTOMER_IDENTITY_MISSING:${externalId}`);
    const id = deterministicUuid(`${input.garageId}|WOOCOMMERCE|CUSTOMER|${externalId}`);
    customerIds.set(legacyId, id);
    if (clean(row.user_id) && clean(row.user_id) !== "0") customerIds.set(`USER:${clean(row.user_id)!}`, id);
    const payload = compact({
      id, first_name: normalized.firstName, last_name: normalized.lastName, email: normalized.email,
      normalized_email: normalized.normalizedEmail, phone: normalized.phone, normalized_phone: normalized.normalizedPhone,
      postal_code: clean(row.postcode), city: normalized.city, source: "WOOCOMMERCE", created_at: sqlTimestamp(row.date_registered),
    });
    return operation({ garageId: input.garageId, source: "WOOCOMMERCE", entity: "CUSTOMER", externalId, targetTable: targetByEntity.CUSTOMER, payload });
  });

  const vehicles = parseWordPressWxr(input.wxr, input.garageId).filter((item) => item.decision === "IMPORT" && !excludedVehicleIds.has(item.externalId));
  const vehicleOperations = vehicles.map((vehicle) => {
    const identity = vehicleIdentity(vehicle.title);
    const id = deterministicUuid(`${input.garageId}|WORDPRESS|VEHICLE|${vehicle.externalId}`);
    const registration = vehicle.firstRegistration?.precision === "DAY" ? vehicle.firstRegistration.value : null;
    const payload = compact({
      id, brand: identity.brand, model: identity.model, version: identity.trim, trim: identity.trim,
      year: vehicle.firstRegistration ? Number(vehicle.firstRegistration.value.slice(0, 4)) : null,
      fuel: vehicle.fields["veh-carburant"], gearbox: vehicle.fields["veh-boite"], mileage: vehicle.mileageKm,
      selling_price: vehicle.price.grossCents === null ? null : vehicle.price.grossCents / 100,
      status: statusFromLegacy(vehicle.lifecycle), color: vehicle.fields["veh-couleur-exterieur"],
      power_din: vehicle.power.dinHp, fiscal_power: vehicle.power.fiscalHp, first_registration_date: registration,
      description: vehicle.plainText, notes: `Import WordPress contrôlé — ${vehicle.title}`,
      created_at: sqlTimestamp(vehicle.createdAt), updated_at: sqlTimestamp(vehicle.updatedAt),
    });
    return operation({ garageId: input.garageId, source: "WORDPRESS", entity: "VEHICLE", externalId: vehicle.externalId, targetTable: targetByEntity.VEHICLE, payload });
  });

  const ordersById = new Map(orderRows.map((row) => [clean(row.id)!, row]));
  const billingByOrderId = new Map(orderAddressRows.filter((row) => clean(row.address_type) === "billing").map((row) => [clean(row.order_id)!, row]));
  const eligibleBookings = bookingRows.filter((row) => ["bk-paid", "bk-completed"].includes(clean(row.status) ?? ""));
  const appointmentOperations = eligibleBookings.map((booking) => {
    const bookingId = clean(booking.booking_id);
    if (!bookingId) throw new Error("LEGACY_BOOKING_EXTERNAL_ID_MISSING");
    const order = ordersById.get(clean(booking.order_id) ?? "");
    const billing = billingByOrderId.get(clean(booking.order_id) ?? "");
    const customer = customersByUserId.get(clean(booking.user_id) ?? "") ?? customersByLegacyId.get(clean(order?.customer_id) ?? "");
    const customerId = customer ? customerIds.get(clean(customer.customer_id) ?? "") : undefined;
    const email = normalizeEmail(clean(order?.billing_email) ?? clean(billing?.email) ?? clean(customer?.email));
    const phone = normalizeFrenchPhone(clean(billing?.phone));
    const name = [clean(customer?.first_name) ?? clean(billing?.first_name), clean(customer?.last_name) ?? clean(billing?.last_name)].filter(Boolean).join(" ");
    if (!appointmentContactIsValid({ isHistorical: true, customerName: name || null, customerEmail: email, customerPhone: phone })) throw new Error(`LEGACY_APPOINTMENT_CONTACT_MISSING:${bookingId}`);
    const startsAt = sqlTimestamp(booking.from);
    const endsAt = sqlTimestamp(booking.to);
    if (!startsAt || !endsAt || startsAt >= endsAt) throw new Error(`LEGACY_APPOINTMENT_PERIOD_INVALID:${bookingId}`);
    const externalId = `BOOKING:${bookingId}`;
    const payload = compact({
      id: deterministicUuid(`${input.garageId}|YITH|APPOINTMENT|${externalId}`), type: "OTHER", status: "COMPLETED",
      starts_at: startsAt, ends_at: endsAt, timezone: "Europe/Paris", customer_name: name || null,
      customer_email: email, customer_phone: phone, payment_required: false, customer_id: customerId,
      is_historical: true,
      details: { legacy_booking_status: clean(booking.status), legacy_order_id: clean(booking.order_id) },
      created_at: startsAt, updated_at: endsAt,
    });
    return operation({ garageId: input.garageId, source: "YITH", entity: "APPOINTMENT", externalId, targetTable: targetByEntity.APPOINTMENT, payload });
  });

  const eligibleOrderIds = new Set(eligibleBookings.map((row) => clean(row.order_id)).filter((id): id is string => Boolean(id)));
  const paymentOperations = [...eligibleOrderIds].flatMap((orderId) => {
    const order = ordersById.get(orderId);
    const amountCents = eurosToCents(order?.total_amount);
    if (!order || orderId === "5112" || !["wc-completed", "wc-processing"].includes(clean(order.status) ?? "") || amountCents === null || amountCents <= 0) return [];
    const customer = customersByLegacyId.get(clean(order.customer_id) ?? "") ?? customersByUserId.get(clean(order.customer_id) ?? "");
    const customerId = customer ? customerIds.get(clean(customer.customer_id) ?? "") : undefined;
    const externalId = `ORDER:${orderId}`;
    const payload = compact({
      id: deterministicUuid(`${input.garageId}|WOOCOMMERCE|HISTORICAL_PAYMENT|${externalId}`), customer_id: customerId,
      external_payment_id: clean(order.transaction_id), provider: clean(order.payment_method), amount_cents: amountCents,
      currency: clean(order.currency) ?? "EUR", source_status: clean(order.status), occurred_at: sqlTimestamp(order.date_created_gmt),
    });
    return [operation({ garageId: input.garageId, source: "WOOCOMMERCE", entity: "HISTORICAL_PAYMENT", externalId, targetTable: targetByEntity.HISTORICAL_PAYMENT, payload })];
  });

  const valuesBySubmission = new Map<string, Record<string, string>>();
  for (const row of submissionValueRows) {
    const submissionId = clean(row.submission_id);
    const key = clean(row.key);
    if (!submissionId || !key) continue;
    const values = valuesBySubmission.get(submissionId) ?? {};
    values[key] = clean(row.value) ?? "";
    valuesBySubmission.set(submissionId, values);
  }
  const customerIdsByEmail = new Map<string, string[]>();
  for (const row of customerRows) {
    const id = customerIds.get(clean(row.customer_id) ?? "");
    const email = normalizeEmail(clean(row.email));
    if (id && email) customerIdsByEmail.set(email, [...(customerIdsByEmail.get(email) ?? []), id]);
  }
  const leadOperations = submissionRows.map((submission) => {
    const submissionId = clean(submission.id);
    if (!submissionId) throw new Error("LEGACY_LEAD_EXTERNAL_ID_MISSING");
    const formName = clean(submission.form_name) ?? "";
    if (!/RENSEIGNEMENT|LOCATION/i.test(formName)) throw new Error(`LEGACY_LEAD_FORM_REVIEW:${submissionId}`);
    const values = valuesBySubmission.get(submissionId) ?? {};
    const email = normalizeEmail(values.email);
    const phone = normalizeFrenchPhone(values.telephone ?? values.field_ce62b64);
    const fullName = [clean(values.prenom), clean(values.nom)].filter(Boolean).join(" ") || null;
    const name = credibleLeadName([fullName, clean(values.name), clean(values.societe)], email, phone);
    if (!email && !phone) throw new Error(`LEGACY_LEAD_IDENTITY_MISSING:${submissionId}`);
    const message = preserveLegacyText(clean(values.message), 2000);
    const matchingCustomers = email ? customerIdsByEmail.get(email) ?? [] : [];
    const externalId = `SUBMISSION:${submissionId}`;
    const payload = compact({
      id: deterministicUuid(`${input.garageId}|ELEMENTOR|LEAD|${externalId}`), source: "MANUAL",
      type: /LOCATION/i.test(formName) ? "RENTAL" : "GENERAL_CONTACT", status: "NEW",
      customer_name: name.value, customer_phone: phone, customer_email: email, message: message.operationalValue,
      public_page_url: clean(submission.referer), public_garage_slug: "sap", customer_id: matchingCustomers.length === 1 ? matchingCustomers[0] : null,
      metadata: compact({ legacy_form_name: formName, legacy_original_message: message.originalValue, legacy_message_original_length: message.originalLength, legacy_message_original_sha256: message.originalSha256, legacy_rejected_name_length: name.rejectedLength, legacy_rejected_name_sha256: name.rejectedSha256 }), created_at: sqlTimestamp(submission.created_at_gmt), updated_at: sqlTimestamp(submission.updated_at_gmt),
    });
    return operation({ garageId: input.garageId, source: "ELEMENTOR", entity: "LEAD", externalId, targetTable: targetByEntity.LEAD, payload });
  });

  const operations = [...customerOperations, ...vehicleOperations, ...appointmentOperations, ...paymentOperations, ...leadOperations].sort((left, right) =>
    entityOrder.indexOf(left.entity) - entityOrder.indexOf(right.entity) || left.source.localeCompare(right.source, "en") || left.externalId.localeCompare(right.externalId, "en", { numeric: true })
  );
  validateBundleOperations(input.garageId, operations);
  return { garageId: input.garageId, operations };
}

export function validateBundleOperations(garageId: string, operations: readonly ControlledImportOperation[]): void {
  const ledger = new Set<string>();
  const business = new Set<string>();
  const customerIds = new Set(operations.filter((item) => item.entity === "CUSTOMER").map((item) => item.payload.id).filter((id): id is string => typeof id === "string"));
  for (const item of operations) {
    if (item.garageId !== garageId) throw new Error("EXECUTION_BUNDLE_CROSS_TENANT");
    if (item.targetTable !== targetByEntity[item.entity as Exclude<ControlledImportEntity, "MEDIA_REFERENCE">]) throw new Error(`EXECUTION_BUNDLE_TARGET_INVALID:${item.externalId}`);
    if (operationFingerprint({ garageId: item.garageId, source: item.source, entity: item.entity, externalId: item.externalId, targetTable: item.targetTable, payload: item.payload }) !== item.fingerprint) throw new Error(`EXECUTION_BUNDLE_FINGERPRINT_INVALID:${item.externalId}`);
    validateBundlePayload(item.entity as Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, item.externalId, item.payload);
    if (["CUSTOMER_VEHICLE", "APPOINTMENT", "HISTORICAL_PAYMENT", "LEAD"].includes(item.entity) && typeof item.payload.customer_id === "string" && !customerIds.has(item.payload.customer_id)) throw new Error(`EXECUTION_BUNDLE_CUSTOMER_REFERENCE_INVALID:${item.entity}:${item.externalId}`);
    if (item.entity === "APPOINTMENT") {
      const historical = item.payload.is_historical === true;
      const name = typeof item.payload.customer_name === "string" ? item.payload.customer_name : null;
      const email = typeof item.payload.customer_email === "string" ? item.payload.customer_email : null;
      const phone = typeof item.payload.customer_phone === "string" ? item.payload.customer_phone : null;
      if (!appointmentContactIsValid({ isHistorical: historical, customerName: name, customerEmail: email, customerPhone: phone })) throw new Error(`EXECUTION_BUNDLE_APPOINTMENT_CONTACT_INVALID:${item.externalId}`);
    }
    const ledgerKey = `${item.source}|${item.entity}|${item.externalId}`;
    const businessKey = `${item.targetTable}|${item.externalId}`;
    if (ledger.has(ledgerKey)) throw new Error(`EXECUTION_BUNDLE_LEDGER_DUPLICATE:${ledgerKey}`);
    if (business.has(businessKey)) throw new Error(`EXECUTION_BUNDLE_BUSINESS_DUPLICATE:${businessKey}`);
    ledger.add(ledgerKey); business.add(businessKey);
  }
}

export function serializeExecutionBundle(bundle: LegacyExecutionBundle): string {
  return stableJson(bundle);
}

export function parseExecutionBundle(bytes: Uint8Array, expectedGarageId: string, expectedHash?: string): LegacyExecutionBundle {
  if (expectedHash && sha256Bytes(bytes) !== expectedHash) throw new Error("OPERATION_BUNDLE_HASH_MISMATCH");
  const parsed = bundleSchema.parse(JSON.parse(Buffer.from(bytes).toString("utf8")));
  if (parsed.garageId !== expectedGarageId) throw new Error("EXECUTION_BUNDLE_TENANT_MISMATCH");
  validateBundleOperations(expectedGarageId, parsed.operations);
  return parsed as LegacyExecutionBundle;
}

export function bundleBreakdown(bundle: LegacyExecutionBundle): Readonly<Record<Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, number>> {
  return Object.fromEntries((Object.keys(targetByEntity) as Array<Exclude<ControlledImportEntity, "MEDIA_REFERENCE">>).map((entity) => [entity, bundle.operations.filter((item) => item.entity === entity).length])) as Readonly<Record<Exclude<ControlledImportEntity, "MEDIA_REFERENCE">, number>>;
}
