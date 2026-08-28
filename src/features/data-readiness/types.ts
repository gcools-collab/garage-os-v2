export type DataDisposition = "KEEP" | "RESET" | "REVIEW";

export type ResetTable = Readonly<{
  name: string;
  disposition: DataDisposition;
  deleteOrder: number | null;
  garageScope: "DIRECT" | "INDIRECT" | "NONE";
  reason: string;
}>;

export type ResetStorageBucket = Readonly<{
  name: string;
  prefix: (garageId: string) => string;
}>;

export type ResetCount = Readonly<{ resource: string; count: number }>;

export type TenantResetReport = Readonly<{
  garageId: string;
  mode: "DRY_RUN" | "EXECUTE";
  database: readonly ResetCount[];
  storage: readonly ResetCount[];
  blockers: readonly string[];
}>;

export type ImportSource = "WORDPRESS" | "WOOCOMMERCE" | "YITH" | "ELEMENTOR";
export type ImportOutcome = "CREATED" | "UPDATED" | "SKIPPED" | "CONFLICT" | "FAILED";
export type ImportStage = "IMPORT" | "PARSE" | "VALIDATE" | "PREVIEW" | "RESOLVE_CONFLICTS" | "COMMIT";

export type ImportIdentity = Readonly<{
  garageId: string;
  source: ImportSource;
  externalId: string;
}>;

export type ImportCandidate<T> = ImportIdentity & Readonly<{
  payload: T;
  fingerprint: string;
}>;
