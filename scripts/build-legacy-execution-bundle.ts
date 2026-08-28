import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildSapExecutionBundle,
  bundleBreakdown,
  SAP_APPROVED_GARAGE_ID,
  serializeExecutionBundle,
  sha256Bytes,
} from "../src/features/legacy-import";

const wxrPath = resolve(".local/legacy/serviceautoauxparticuliers.WordPress.2026-08-14.xml");
const sqlPath = resolve(".local/legacy/serviceautoauxparticuliers-migrate-20260814143926.sql");
const outputPath = resolve(".local/legacy/go-0084b2-execution-bundle.json");

const source = { garageId: SAP_APPROVED_GARAGE_ID, wxr: readFileSync(wxrPath, "utf8"), sql: readFileSync(sqlPath, "utf8") } as const;
const first = serializeExecutionBundle(buildSapExecutionBundle(source));
const second = serializeExecutionBundle(buildSapExecutionBundle(source));
if (first !== second) throw new Error("EXECUTION_BUNDLE_NON_DETERMINISTIC");

const bytes = Buffer.from(first, "utf8");
const hash = sha256Bytes(bytes);
const bundle = buildSapExecutionBundle(source);
writeFileSync(outputPath, bytes, { flag: "w" });

process.stdout.write(`${JSON.stringify({ outputPath, sha256: hash, operations: bundle.operations.length, counts: bundleBreakdown(bundle) }, null, 2)}\n`);
