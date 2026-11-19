import { describe, expect, it } from 'vitest';
import { employeeInputSchema } from '../src/domain/employee.js';
import { COUNTRIES, createRng, generateEmployees } from '../src/domain/seedData.js';
import { reseed, seedIfEmpty } from '../src/db/seed.js';
import { freshDb } from './helpers.js';

describe('seed data', () => {
  it('is deterministic for the same seed', () => {
    expect(generateEmployees(50, 7)).toEqual(generateEmployees(50, 7));
    expect(generateEmployees(50, 7)).not.toEqual(generateEmployees(50, 8));
  });

  it('produces records that pass the same validation as the API', () => {
    for (const e of generateEmployees(500)) {
      expect(() => employeeInputSchema.parse(e)).not.toThrow();
    }
  });

  it('generates unique emails and the currency that matches each country', () => {
    const rows = generateEmployees(10_000);
    expect(new Set(rows.map((r) => r.email)).size).toBe(10_000);
    const currencyOf = new Map(COUNTRIES.map((c) => [c.value.name, c.value.currency]));
    expect(rows.every((r) => currencyOf.get(r.country) === r.currency)).toBe(true);
  });

  it('rng.int stays within inclusive bounds', () => {
    const rng = createRng(1);
    const values = Array.from({ length: 1000 }, () => rng.int(3, 5));
    expect(Math.min(...values)).toBe(3);
    expect(Math.max(...values)).toBe(5);
  });

  it('seedIfEmpty seeds once, reseed replaces the data', () => {
    const db = freshDb();
    expect(seedIfEmpty(db, 100)).toBe(100);
    expect(seedIfEmpty(db, 100)).toBe(0);
    expect(reseed(db, 20)).toBe(20);
    expect((db.prepare('SELECT COUNT(*) AS n FROM employees').get() as { n: number }).n).toBe(20);
  });
});
