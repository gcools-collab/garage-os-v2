export type LegacyDecision = "IMPORT" | "REVIEW" | "IGNORE" | "INVALID";
export type CustomerResolution = "CREATE" | "MATCH" | "REVIEW" | "IGNORE";

export type LegacyPrice = Readonly<{ grossCents: number | null; netCents: number | null; vatMentioned: boolean }>;
export type LegacyRegistrationDate = Readonly<{ value: string; precision: "DAY" | "MONTH" }>;
export type LegacyPower = Readonly<{ fiscalHp: number | null; dinHp: number | null }>;
export type LegacyMedia = Readonly<{ attachmentId: string; legacyUrl: string | null; relativePath: string | null; originalRelativePath: string | null; position: number; role: "COVER" | "GALLERY"; status: "PENDING" }>;

export type LegacyVehicle = Readonly<{
  externalId: string; slug: string | null; originalUrl: string | null; title: string;
  rawHtml: string; plainText: string; wordpressStatus: string; category: string | null;
  createdAt: string | null; updatedAt: string | null; fields: Readonly<Record<string, string>>;
  price: LegacyPrice; mileageKm: number | null; firstRegistration: LegacyRegistrationDate | null;
  power: LegacyPower; lifecycle: "SOLD" | "RESERVED" | "AVAILABLE" | "UNKNOWN";
  media: readonly LegacyMedia[]; decision: LegacyDecision;
}>;

export type LegacyCustomer = Readonly<{
  garageId: string; source: "WORDPRESS" | "WOOCOMMERCE" | "YITH" | "ELEMENTOR";
  externalId: string; firstName: string | null; lastName: string | null;
  email: string | null; phone: string | null; normalizedEmail: string | null; normalizedPhone: string | null;
  city: string | null;
}>;

export type LegacyBooking = Readonly<{ externalId: string; status: string; paid: boolean; decision: LegacyDecision }>;
export type LegacyPayment = Readonly<{ externalId: string; externalPaymentId: string | null; provider: string | null; amountCents: number | null; status: string; historical: true; decision: LegacyDecision }>;
export type LegacyLead = Readonly<{ externalId: string; formName: string; decision: LegacyDecision }>;

export type SqlLegacyDiscovery = Readonly<{
  tables: readonly string[]; customerSources: readonly string[]; bookingSources: readonly string[];
  paymentSources: readonly string[]; leadSources: readonly string[]; ignoredTechnicalTables: number;
}>;

export type LegacyImportPreview = Readonly<{
  garageId: string; source: Readonly<{ wxrParsed: boolean; sqlParsed: boolean; mediaArchive: "MISSING" | "PENDING" }>;
  vehicles: Readonly<Record<"detected" | "importable" | "ignored" | "conflicts" | "invalid", number>>;
  customers: Readonly<Record<"detected" | "unique" | "matches" | "creates" | "reviews", number>>;
  appointments: Readonly<Record<"detected" | "eligible" | "ignored" | "reviews", number>>;
  payments: Readonly<Record<"detected" | "eligible" | "ignored" | "conflicts", number>>;
  leads: Readonly<Record<"detected" | "importable" | "reviews", number>>;
  media: Readonly<Record<"attachments" | "vehicleRelationships" | "pendingPhysicalFiles", number>>;
  databaseMutations: 0; storageMutations: 0;
}>;
