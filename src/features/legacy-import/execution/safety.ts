import { z } from "zod";
import type { ImportExecutionContext } from "./types";

const uuid = z.uuid();

export function assertExecutionContext(context: ImportExecutionContext): void {
  const garageId = uuid.parse(context.garageId);
  const authorized = uuid.parse(context.authorizedGarageId);
  if (garageId !== authorized) throw new Error("AUTHORIZED_TENANT_MISMATCH");
  if (context.mode === "DRY_RUN") return;
  if (context.mode !== "EXECUTE" && context.mode !== "EXECUTE_MEDIA") return;
  if (process.env.NODE_ENV === "production") throw new Error("LEGACY_EXECUTION_FORBIDDEN_ENVIRONMENT");
  if (process.env.GARAGE_OS_ENABLE_LEGACY_IMPORT !== "true") throw new Error("LEGACY_IMPORT_OPT_IN_MISSING");
  if (context.importConfirmation !== `IMPORT:${garageId}`) throw new Error("LEGACY_IMPORT_CONFIRMATION_INVALID");
}

export function assertResetAuthorization(context: ImportExecutionContext): void {
  assertExecutionContext(context);
  if (context.mode !== "EXECUTE") throw new Error("RESET_REQUIRES_EXECUTE_MODE");
  if (process.env.GARAGE_OS_ENABLE_TENANT_RESET !== "true") throw new Error("TENANT_RESET_OPT_IN_MISSING");
  if (context.resetConfirmation !== `RESET:${context.garageId}`) throw new Error("TENANT_RESET_CONFIRMATION_INVALID");
}
