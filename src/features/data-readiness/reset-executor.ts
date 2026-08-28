import { RESET_STORAGE_BUCKETS, RESET_TABLE_MANIFEST } from "./reset-manifest";
import { requireGarageId } from "./reset-engine";
import type { ApprovedResetExpectation, ImportExecutionContext } from "@/features/legacy-import/execution/types";
import { assertResetAuthorization } from "@/features/legacy-import/execution/safety";

export type StorageInventory = Readonly<{ objects: number; bytes: number; paths: readonly string[] }>;
export type ControlledResetPlan = Readonly<{
  garageId: string;
  database: readonly Readonly<{ table: string; count: number; disposition: "RESET" | "REVIEW" }>[];
  storage: readonly Readonly<{ bucket: string; prefix: string; inventory: StorageInventory }>[];
  databaseRows: number;
  storageObjects: number;
  storageBytes: number;
  livePayments: number;
  blockers: readonly string[];
}>;

export interface ControlledResetGateway {
  countTable(table: string, garageId: string, scope: "DIRECT" | "INDIRECT"): Promise<number>;
  deleteTable(table: string, garageId: string, scope: "DIRECT" | "INDIRECT"): Promise<number>;
  inventoryStorage(bucket: string, prefix: string): Promise<StorageInventory>;
  deleteStorage(bucket: string, paths: readonly string[]): Promise<number>;
  countLivePayments(garageId: string): Promise<number>;
  executeAtomicDatabaseReset?(garageId: string, items: readonly Readonly<{ table: string; scope: "DIRECT" | "INDIRECT"; expected: number }>[]): Promise<number>;
}

export function assertResetResourceAllowed(table: string, scope: "DIRECT" | "INDIRECT"): void {
  const resource = RESET_TABLE_MANIFEST.find((item) => item.name === table);
  if (!resource || resource.disposition !== "RESET" || resource.garageScope !== scope) {
    throw new Error(`RESET_RESOURCE_FORBIDDEN:${table}`);
  }
}

export async function planControlledReset(gateway: ControlledResetGateway, garageIdInput: unknown): Promise<ControlledResetPlan> {
  const garageId = requireGarageId(garageIdInput);
  const tables = RESET_TABLE_MANIFEST.filter((item) => item.disposition !== "KEEP" && item.garageScope !== "NONE");
  const database = [] as Array<{ table: string; count: number; disposition: "RESET" | "REVIEW" }>;
  for (const item of tables) database.push({ table: item.name, count: await gateway.countTable(item.name, garageId, item.garageScope as "DIRECT" | "INDIRECT"), disposition: item.disposition as "RESET" | "REVIEW" });
  const storage = [] as Array<{ bucket: string; prefix: string; inventory: StorageInventory }>;
  for (const bucket of RESET_STORAGE_BUCKETS) {
    const prefix = bucket.prefix(garageId);
    storage.push({ bucket: bucket.name, prefix, inventory: await gateway.inventoryStorage(bucket.name, prefix) });
  }
  const livePayments = await gateway.countLivePayments(garageId);
  const blockers = [
    ...database.filter((item) => item.disposition === "REVIEW" && item.count > 0).map((item) => `REVIEW_ROWS:${item.table}:${item.count}`),
    ...(livePayments > 0 ? [`LIVE_PAYMENTS:${livePayments}`] : []),
  ];
  return {
    garageId, database, storage,
    databaseRows: database.filter((item) => item.disposition === "RESET").reduce((sum, item) => sum + item.count, 0),
    storageObjects: storage.reduce((sum, item) => sum + item.inventory.objects, 0),
    storageBytes: storage.reduce((sum, item) => sum + item.inventory.bytes, 0),
    livePayments, blockers,
  };
}

export function assertApprovedResetPlan(plan: ControlledResetPlan, expected: ApprovedResetExpectation): void {
  if (plan.blockers.length) throw new Error(`RESET_BLOCKED:${plan.blockers.join(",")}`);
  if (plan.databaseRows !== expected.databaseRows) throw new Error(`RESET_DATABASE_COUNT_DRIFT:${plan.databaseRows}:${expected.databaseRows}`);
  if (plan.storageObjects !== expected.storageObjects) throw new Error(`RESET_STORAGE_COUNT_DRIFT:${plan.storageObjects}:${expected.storageObjects}`);
  if (plan.storageBytes !== expected.storageBytes) throw new Error(`RESET_STORAGE_BYTES_DRIFT:${plan.storageBytes}:${expected.storageBytes}`);
}

export async function executeControlledDatabaseReset(gateway: ControlledResetGateway, plan: ControlledResetPlan, expectedRows: number): Promise<number> {
  if (plan.databaseRows !== expectedRows) throw new Error(`RESET_DATABASE_COUNT_DRIFT:${plan.databaseRows}:${expectedRows}`);
  const resetEntries = [...RESET_TABLE_MANIFEST].filter((entry) => entry.disposition === "RESET" && entry.deleteOrder !== null).sort((a, b) => a.deleteOrder! - b.deleteOrder!);
  if (gateway.executeAtomicDatabaseReset) {
    const counts = new Map(plan.database.map((item) => [item.table,item.count]));
    const items = resetEntries.map((item)=>({table:item.name,scope:item.garageScope as "DIRECT"|"INDIRECT",expected:counts.get(item.name)??0}));
    for (const item of items) assertResetResourceAllowed(item.table, item.scope);
    const deleted = await gateway.executeAtomicDatabaseReset(plan.garageId,items);
    if(deleted!==expectedRows)throw new Error(`RESET_DATABASE_DELETE_MISMATCH:${deleted}`);
    return deleted;
  }
  let deleted = 0;
  for (const item of resetEntries) {
    deleted += await gateway.deleteTable(item.name, plan.garageId, item.garageScope as "DIRECT" | "INDIRECT");
  }
  if (deleted !== expectedRows) throw new Error(`RESET_DATABASE_DELETE_MISMATCH:${deleted}`);
  return deleted;
}

export async function executeControlledStorageReset(gateway: ControlledResetGateway, plan: ControlledResetPlan, expectedObjects: number, expectedBytes: number): Promise<number> {
  if (plan.storageObjects !== expectedObjects || plan.storageBytes !== expectedBytes) throw new Error("RESET_STORAGE_APPROVED_COUNTER_DRIFT");
  let deleted = 0;
  for (const item of plan.storage) {
    if (item.inventory.paths.some((path) => !path.startsWith(item.prefix))) throw new Error("RESET_STORAGE_CROSS_TENANT_PATH");
    deleted += await gateway.deleteStorage(item.bucket, item.inventory.paths);
  }
  if (deleted !== expectedObjects) throw new Error(`RESET_STORAGE_DELETE_MISMATCH:${deleted}`);
  return deleted;
}

export async function executeControlledReset(input: {
  readonly gateway: ControlledResetGateway;
  readonly context: ImportExecutionContext;
  readonly expected: ApprovedResetExpectation;
}): Promise<Readonly<{ databaseDeleted: number; storageDeleted: number; storageBytesDeleted: number }>> {
  assertResetAuthorization(input.context);
  const plan = await planControlledReset(input.gateway, input.context.garageId);
  assertApprovedResetPlan(plan, input.expected);
  const databaseDeleted = await executeControlledDatabaseReset(input.gateway, plan, input.expected.databaseRows);
  const afterDatabase = await planControlledReset(input.gateway, plan.garageId);
  if (afterDatabase.databaseRows !== 0) throw new Error(`RESET_DATABASE_VERIFY_FAILED:${afterDatabase.databaseRows}`);
  const storageDeleted = await executeControlledStorageReset(input.gateway, plan, input.expected.storageObjects, input.expected.storageBytes);
  const afterStorage = await Promise.all(RESET_STORAGE_BUCKETS.map(async (item) => input.gateway.inventoryStorage(item.name, item.prefix(plan.garageId))));
  if (afterStorage.some((item) => item.objects !== 0)) throw new Error("RESET_STORAGE_VERIFY_FAILED");
  return { databaseDeleted, storageDeleted, storageBytesDeleted: plan.storageBytes };
}
