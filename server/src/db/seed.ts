import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateEmployees } from '../domain/seedData.js';
import { createEmployeeRepository } from '../repositories/employeeRepository.js';
import { openDatabase, type DB } from './connection.js';

export const SEED_COUNT = 10_000;

/** Replaces all employees with the deterministic demo dataset. */
export function reseed(db: DB, count = SEED_COUNT): number {
  db.exec('DELETE FROM employees; DELETE FROM sqlite_sequence WHERE name = \'employees\';');
  return createEmployeeRepository(db).bulkInsert(generateEmployees(count));
}

/** Seeds only when the table is empty (used on server boot). Returns rows inserted. */
export function seedIfEmpty(db: DB, count = SEED_COUNT): number {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM employees').get() as { n: number };
  return n === 0 ? reseed(db, count) : 0;
}

// CLI: `npm run seed` → wipe and reseed the local database.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = process.env.DATABASE_FILE ?? path.resolve(here, '../../data/salary.db');
  const started = performance.now();
  const n = reseed(openDatabase(file));
  console.log(`Seeded ${n} employees into ${file} in ${Math.round(performance.now() - started)} ms`);
}
