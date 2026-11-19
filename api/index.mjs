// Vercel serverless entry: wraps the same Express app used locally.
// Vercel's filesystem is read-only except /tmp, so the SQLite database lives there
// and is seeded with the 10,000 demo employees on each cold start.
import { createApp } from '../server/dist/app.js';
import { openDatabase } from '../server/dist/db/connection.js';
import { seedIfEmpty } from '../server/dist/db/seed.js';

const db = openDatabase(process.env.DATABASE_FILE ?? '/tmp/salary.db');
seedIfEmpty(db);

export default createApp(db);
