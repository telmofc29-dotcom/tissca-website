// src/lib/currency.ts
//
// Canonical currency configuration and formatting for the entire Web app.
// All currency display should go through formatCurrency() from this module.
// Default currency is stored in document_pdf_info.default_currency per workspace.

export type CurrencyCode = 'GBP' | 'EUR' | 'USD';

export const SUPPORTED_CURRENCIES: ReadonlyArray<{
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}> = [
  { code: 'GBP', symbol: '£', label: 'British Pound', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', label: 'Euro',          locale: 'de-DE' },
  { code: 'USD', symbol: '$', label: 'US Dollar',      locale: 'en-US' },
] as const;

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

/** Get the display symbol for a currency code. */
export function currencySymbol(code: string | null | undefined): string {
  const entry = SUPPORTED_CURRENCIES.find(
    (c) => c.code === (code ?? DEFAULT_CURRENCY).toUpperCase(),
  );
  return entry?.symbol ?? '£';
}

/** Get the locale string for a currency code. */
export function currencyLocale(code: string | null | undefined): string {
  const entry = SUPPORTED_CURRENCIES.find(
    (c) => c.code === (code ?? DEFAULT_CURRENCY).toUpperCase(),
  );
  return entry?.locale ?? 'en-GB';
}

/**
 * Format a monetary amount with the correct symbol and locale.
 *
 * @param amount  — the value in major units (e.g. 150.00, not pence)
 * @param code    — ISO currency code (defaults to GBP)
 * @returns formatted string, e.g. "£150.00", "€150.00", "$150.00"
 */
export function formatCurrency(
  amount: number,
  code?: string | null,
): string {
  const sym = currencySymbol(code);
  const loc = currencyLocale(code);
  return `${sym}${amount.toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format pence/cents as a currency string.
 *
 * @param minor  — value in minor units (pence/cents)
 * @param code   — ISO currency code (defaults to GBP)
 */
export function formatMinorCurrency(
  minor: number,
  code?: string | null,
): string {
  return formatCurrency(minor / 100, code);
}
