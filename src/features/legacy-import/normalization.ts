import type { LegacyPower, LegacyPrice, LegacyRegistrationDate } from "./types";

const decodeEntities = (value: string): string => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#039;|&apos;/gi, "'");

export function sanitizeLegacyHtml(value: string): { rawHtml: string; plainText: string } {
  const decoded = decodeEntities(value);
  const plainText = decoded.replace(/<\s*br\s*\/?\s*>/gi, "\n").replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  return { rawHtml: decoded, plainText };
}

const moneyToCents = (value: string): number | null => {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};

export function parseLegacyPrice(value: string | null | undefined): LegacyPrice {
  if (!value) return { grossCents: null, netCents: null, vatMentioned: false };
  const text = sanitizeLegacyHtml(value).plainText;
  const amounts = [...text.matchAll(/(\d[\d\s]*(?:[,.]\d{1,2})?)\s*€?\s*(HT|TTC)/gi)];
  let grossCents: number | null = null;
  let netCents: number | null = null;
  for (const match of amounts) {
    const cents = moneyToCents(match[1]);
    if (match[2].toUpperCase() === "TTC") grossCents = cents;
    if (match[2].toUpperCase() === "HT") netCents = cents;
  }
  if (grossCents === null && amounts.length === 0) {
    const fallback = text.match(/\d[\d\s]*(?:[,.]\d{1,2})?/);
    grossCents = fallback ? moneyToCents(fallback[0]) : null;
  }
  return { grossCents, netCents, vatMentioned: /\b(?:HT|TTC|TVA)\b/i.test(text) };
}

export function parseLegacyMileage(value: string | null | undefined): number | null {
  if (!value) return null;
  const text = sanitizeLegacyHtml(value).plainText.trim();
  const numericTokens = text.match(/\d[\d\s.,]*/g)?.map((token) => token.replace(/[^\d]/g, "")).filter(Boolean) ?? [];
  if (numericTokens.length !== 1) return null;
  const mileage = Number.parseInt(numericTokens[0], 10);
  return Number.isSafeInteger(mileage) ? mileage : null;
}

export function parseLegacyRegistrationDate(value: string | null | undefined): LegacyRegistrationDate | null {
  if (!value) return null;
  const full = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (full) return { value: `${full[3]}-${full[2]}-${full[1]}`, precision: "DAY" };
  const month = value.trim().match(/^(\d{2})\/(\d{4})$/);
  return month ? { value: `${month[2]}-${month[1]}`, precision: "MONTH" } : null;
}

export function parseLegacyPower(value: string | null | undefined): LegacyPower {
  if (!value) return { fiscalHp: null, dinHp: null };
  const fiscal = value.match(/(\d+)\s*(?:cv|ch)?\s*fisc/i);
  const din = value.match(/(\d+)\s*(?:cv|ch)?\s*DIN/i);
  return { fiscalHp: fiscal ? Number(fiscal[1]) : null, dinHp: din ? Number(din[1]) : null };
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLocaleLowerCase("fr") ?? "";
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function normalizeFrenchPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("0033")) digits = `+33${digits.slice(4)}`;
  if (digits.startsWith("0") && digits.length === 10) digits = `+33${digits.slice(1)}`;
  return /^\+33\d{9}$/.test(digits) ? digits : null;
}

export function normalizePersonName(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr") ?? "";
  return normalized || null;
}
