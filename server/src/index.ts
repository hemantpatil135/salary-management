import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { openDatabase } from './db/connection.js';
import { seedIfEmpty } from './db/seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbFile = process.env.DATABASE_FILE ?? path.resolve(here, '../data/salary.db');
const port = Number(process.env.PORT ?? 4000);

const db = openDatabase(dbFile);
// Convenient for fresh deployments: populate the 10k demo dataset on first boot.
const inserted = seedIfEmpty(db);
if (inserted) console.log(`Seeded ${inserted} employees`);

const app = createApp(db, { staticDir: path.resolve(here, '../../client/dist') });
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
