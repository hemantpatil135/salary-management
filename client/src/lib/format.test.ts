import { describe, expect, it } from 'vitest';
import { formatMoney } from './format';

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR', () => {
    expect(formatMoney(1_800_000, 'INR')).toBe('₹18,00,000');
  });

  it('formats other currencies without decimals', () => {
    expect(formatMoney(110_000, 'USD')).toBe('$110,000');
    expect(formatMoney(65_000, 'EUR')).toBe('€65,000');
  });

  it('falls back gracefully for an unknown currency code', () => {
    expect(formatMoney(1000, 'ZZ')).toBe('1,000 ZZ');
  });
});
