import { readFileSync } from "node:fs";

const sqlPath = ".local/legacy/serviceautoauxparticuliers-migrate-20260814143926.sql";
const lines = readFileSync(sqlPath, "utf8").split(/\r?\n/);
const selected = new Set(["wpbe_wc_customer_lookup", "wpbe_yith_wcbk_booking_meta_lookup", "wpbe_wc_orders", "wpbe_e_submissions"]);
const rows = new Map<string, Array<readonly (string | null)[]>>();

function parseTuple(line: string): readonly (string | null)[] {
  const source = line.trim().replace(/[;,]$/, "").replace(/^\(/, "").replace(/\)$/, "");
  const values: (string | null)[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const character of source) {
    if (escaped) { current += character; escaped = false; continue; }
    if (quoted && character === "\\") { escaped = true; continue; }
    if (character === "'") { quoted = !quoted; continue; }
    if (character === "," && !quoted) {
      values.push(current.trim() === "NULL" ? null : current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  values.push(current.trim() === "NULL" ? null : current.trim());
  return values;
}

let currentTable = "";
for (const line of lines) {
  if (line.startsWith("INSERT INTO ")) {
    const delimiter = String.fromCharCode(96);
    currentTable = line.split(delimiter)[1] ?? "";
    continue;
  }
  if (!selected.has(currentTable) || !line.startsWith("(")) continue;
  const tableRows = rows.get(currentTable) ?? [];
  rows.set(currentTable, [...tableRows, parseTuple(line)]);
}

const customers = rows.get("wpbe_wc_customer_lookup") ?? [];
const customerImportable = customers.filter((row) => Boolean(row[5] || (row[3] && row[4]))).length;
const bookings = rows.get("wpbe_yith_wcbk_booking_meta_lookup") ?? [];
const bookingStatuses = bookings.reduce<Record<string, number>>((counts, row) => {
  const status = row[4] ?? "UNKNOWN";
  return { ...counts, [status]: (counts[status] ?? 0) + 1 };
}, {});
const orders = rows.get("wpbe_wc_orders") ?? [];
const historicalPayments = orders.filter((row) => row[3] === "shop_order" && row[1] === "wc-completed" && Number(row[5] ?? 0) > 0).length;
const ordersById = new Map(orders.map((row) => [row[0], row]));
const eligibleBookingOrderIds = new Set(bookings.filter((row) => ["bk-paid", "bk-completed"].includes(row[4] ?? "") && Number(row[2] ?? 0) > 0).map((row) => row[2]));
const eligibleBookingOrderStatuses = [...eligibleBookingOrderIds].reduce<Record<string, number>>((counts, id) => {
  const status = ordersById.get(id)?.[1] ?? "MISSING_ORDER";
  return { ...counts, [status]: (counts[status] ?? 0) + 1 };
}, {});
const submissions = rows.get("wpbe_e_submissions") ?? [];
const formCounts = submissions.reduce<Record<string, number>>((counts, row) => {
  const form = row[8] || "UNKNOWN";
  return { ...counts, [form]: (counts[form] ?? 0) + 1 };
}, {});
const knownLeadPattern = /RENSEIGNEMENT|CONTACT|LOCATION|SERVICE/i;

process.stdout.write(`${JSON.stringify({
  customers: { detected: customers.length, importableIdentity: customerImportable, ignoredEmptyIdentity: customers.length - customerImportable },
  appointments: { detected: bookings.length, eligible: (bookingStatuses["bk-paid"] ?? 0) + (bookingStatuses["bk-completed"] ?? 0), statuses: bookingStatuses },
  historicalPayments: {
    detectedOrders: orders.length,
    eligibleCompletedPositiveOrders: historicalPayments,
    eligibleBookingOrderRelations: bookings.filter((row) => ["bk-paid", "bk-completed"].includes(row[4] ?? "") && Number(row[2] ?? 0) > 0).length,
    uniqueEligibleBookingOrders: eligibleBookingOrderIds.size,
    eligibleBookingOrderStatuses,
  },
  leads: { detected: submissions.length, importableKnownForms: submissions.filter((row) => knownLeadPattern.test(row[8] ?? "")).length, reviewUnknownForms: submissions.filter((row) => !knownLeadPattern.test(row[8] ?? "")).length, forms: formCounts },
  databaseMutations: 0,
  storageMutations: 0,
}, null, 2)}\n`);
