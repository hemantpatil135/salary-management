const formatters = new Map<string, Intl.NumberFormat>();

/** Formats an amount in its own currency, e.g. 1800000 INR → "₹18,00,000". Cached per currency. */
export function formatMoney(amount: number, currency: string): string {
  let f = formatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      });
    } catch {
      // Unknown ISO code: fall back to a plain number with the code appended.
      return `${Math.round(amount).toLocaleString('en-US')} ${currency}`;
    }
    formatters.set(currency, f);
  }
  return f.format(amount);
}

export const EMPLOYMENT_LABEL = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
} as const;

/** Default currency for the countries we know about; used to prefill the form. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  India: 'INR',
  'United States': 'USD',
  'United Kingdom': 'GBP',
  Germany: 'EUR',
  Canada: 'CAD',
  Singapore: 'SGD',
  Australia: 'AUD',
};
