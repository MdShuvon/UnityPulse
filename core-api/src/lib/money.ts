// core-api/src/lib/money.ts
// NEW FILE — supports issue #7 (Float money → Int paisa)
//
// One rule: every amount crossing the database boundary is an integer number of
// paisa. Floats only exist at the presentation edge, and only via fromPaisa().

/** Taka (possibly fractional, from user input) → integer paisa. */
export function toPaisa(taka: number | string): number {
  const n = typeof taka === 'string' ? Number(taka) : taka;
  if (!Number.isFinite(n)) throw new Error('Invalid amount');
  if (n < 0) throw new Error('Amount cannot be negative');
  return Math.round(n * 100);
}

/** Integer paisa → taka as a number, for JSON responses. */
export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

/** Integer paisa → display string, e.g. "১,২৩৪.৫০" style grouping in en-BD. */
export function formatPaisa(paisa: number, currency = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(paisa / 100);
}

/** Guard for values read from the DB that must already be integers. */
export function assertPaisa(value: number, field = 'amount'): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${field} must be an integer number of paisa, got ${value}`);
  }
  return value;
}