const PHONE_TOKEN_RE = /(?:\+?84|0)\s*[\d .()/-]{7,}\d/g;

export function normalizeVietnamPhone(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (digits.startsWith("0084")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("84")) digits = `0${digits.slice(2)}`;

  digits = digits.replace(/[^\d]/g, "");
  if (!digits.startsWith("0") || digits.length < 9 || digits.length > 11) {
    return null;
  }
  return digits;
}

export function extractNormalizedPhones(input: string | null | undefined): string[] {
  if (!input) return [];
  const matches = input.match(PHONE_TOKEN_RE) ?? [input];
  const phones = matches
    .map((value) => normalizeVietnamPhone(value))
    .filter((value): value is string => Boolean(value));

  return [...new Set(phones)];
}

export function maskPhone(input: string | null | undefined): string | null {
  const phones = extractNormalizedPhones(input);
  const first = phones[0];
  if (!first) return null;
  return `${first.slice(0, 3)}****${first.slice(-3)}`;
}

export function normalizeCustomerCode(input: string): string {
  return input.trim().replace(/\s+/g, "").toUpperCase();
}

