import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name       TEXT    NOT NULL,
  email           TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  job_title       TEXT    NOT NULL,
  department      TEXT    NOT NULL,
  country         TEXT    NOT NULL,
  currency        TEXT    NOT NULL CHECK (length(currency) = 3),
  salary          INTEGER NOT NULL CHECK (salary > 0),
  employment_type TEXT    NOT NULL DEFAULT 'FULL_TIME'
                  CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT')),
  hired_on        TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employees_country    ON employees(country);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_job_title  ON employees(job_title);
CREATE INDEX IF NOT EXISTS idx_employees_full_name  ON employees(full_name);
`;

/** Opens (or creates) a database and ensures the schema exists. Use ':memory:' in tests. */
export function openDatabase(filename: string): DB {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}
